import React from "react";
import { Point } from "./types";
import { isPointInPolygon } from "./utils";
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  Scatter,
  ResponsiveContainer,
  Cell,
  Tooltip as ReTooltip,
} from "recharts";
import { DataSet, Network, Options } from "vis-network/standalone";
import UnifiedPathwayNetwork from "../components/common/UnifiedPathwayNetwork";
import KnowledgeGraph from "../components/common/KnowledgeGraph";
import { createPortal } from "react-dom";
import {
  Grid3X3,
  ArrowUpRight,
  LayoutList
} from "lucide-react";


// ────────────────────────────────────────────────────────────
// Sidebar design constants (UNCHANGED)
// ────────────────────────────────────────────────────────────
const FONT_STACK =
  `'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
const TEXT_PRIMARY = "#0f172a";
const DIVIDER_COLOR = "rgba(0,0,0,0.08)";

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────
type LassoRegionPanelProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  width?: number; // default 320

  // ✅ data needed to show the clicked selection
  activeRegionIndex: number | null;
  regions: { points: Point[]; label: string }[];
  filteredPoints: Point[];
  datasetId?: string;
};

// ────────────────────────────────────────────────────────────
// Enrichr Types + Helpers (same behavior as your summary)
// ────────────────────────────────────────────────────────────
type EnrichrRow = {
  category: string;
  fold: number;
  fdr: number; // -log10(adj p)
  genes: number;
  overlapGenes: string[];
};

const ENRICHR_BASE = "https://maayanlab.cloud/Enrichr";
const ENRICHR_LIBRARY = "GO_Biological_Process_2023";
const ENRICHMENT_STORAGE_KEY = "ENRICHMENT_SELECTED_GENES";

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function colorScale(value: number, metric: "fdr" | "fold" | "genes") {
  if (metric === "fdr") {
    if (value > 14) return "#e51f25";
    if (value > 10) return "#d9265f";
    if (value > 6) return "#a846b1";
    if (value > 3) return "#8b54c7";
    return "#6f5fcf";
  } else if (metric === "fold") {
    if (value > 100) return "#e51f25";
    if (value > 70) return "#d9265f";
    if (value > 50) return "#a846b1";
    if (value > 25) return "#8b54c7";
    return "#6f5fcf";
  } else {
    if (value > 20) return "#e51f25";
    if (value > 15) return "#d9265f";
    if (value > 10) return "#a846b1";
    if (value > 5) return "#8b54c7";
    return "#6f5fcf";
  }
}

function intersectCount(a: string[], b: string[]) {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a);
  let c = 0;
  for (const g of b) if (setA.has(g)) c++;
  return c;
}

async function runEnrichr(genes: string[], library = ENRICHR_LIBRARY): Promise<EnrichrRow[]> {
  if (!genes.length) return [];

  const fd = new FormData();
  fd.append("list", genes.join("\n"));
  fd.append("description", "Selection genes");

  const addRes = await fetch(`${ENRICHR_BASE}/addList`, { method: "POST", body: fd });
  if (!addRes.ok) throw new Error("Enrichr addList failed");

  const addJson = await addRes.json();
  const userListId = addJson.userListId;
  if (!userListId) throw new Error("userListId missing");

  const enrRes = await fetch(
    `${ENRICHR_BASE}/enrich?userListId=${userListId}&backgroundType=${encodeURIComponent(library)}`
  );
  if (!enrRes.ok) throw new Error("Enrichr enrich failed");

  const enrJson = await enrRes.json();
  const table: any[] = enrJson[library] || [];

  const parsed: EnrichrRow[] = table.map((r: any[]) => {
    const term = String(r?.[1] ?? "");
    const combined = Number(r?.[4] ?? 0);
    const overlapRaw = r?.[5];
    const adjP = Number(r?.[6] ?? 1);

    const overlapArr = Array.isArray(overlapRaw)
      ? overlapRaw.filter(Boolean)
      : (typeof overlapRaw === "string"
        ? overlapRaw.split(/[;,\s/]+/).filter(Boolean)
        : []);

    const fdrNegLog10 = adjP > 0 ? +(-Math.log10(adjP)).toFixed(2) : 0;

    return {
      category: term,
      fold: Math.round(combined),
      fdr: fdrNegLog10,
      genes: overlapArr.length,
      overlapGenes: overlapArr as string[],
    };
  });

  parsed.sort((a, b) => (b.fold - a.fold) || a.category.localeCompare(b.category));
  return parsed;
}

function cleanDescription(desc: string): string {
  const c = desc
    .toLowerCase()
    .replace(/^(positive |negative )?regulation of |involved in| process$|^cellular /, "")
    .replace(/pathway$/, "")
    .trim();
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function wrapLabel(s: string, lineLen = 18, maxLines = 3): string {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = (line ? line + " " : "") + w;
    if (test.length > lineLen) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines.join("\n");
}

type PortalTooltipProps = {
  active?: boolean;
  payload?: any[];
  coordinate?: { x: number; y: number };
  hostRef: React.RefObject<HTMLDivElement | null>;
  compact: boolean;
};

function PortalTooltip({
  active,
  payload,
  coordinate,
  hostRef,
  compact,
}: PortalTooltipProps) {
  if (
    !active ||
    !payload?.length ||
    !coordinate ||
    !hostRef.current ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const row = payload?.[0]?.payload as EnrichrRow | undefined;

  const rect = hostRef.current.getBoundingClientRect();
  const maxW = compact ? 260 : 360;

  const leftRaw = rect.left + (coordinate.x ?? 0) + 12;
  const topRaw = rect.top + (coordinate.y ?? 0) - 10;

  // clamp inside viewport so tooltip never gets cut off
  const left = Math.min(Math.max(8, leftRaw), window.innerWidth - maxW - 8);
  const top = Math.min(Math.max(8, topRaw), window.innerHeight - 140);

  const title = cleanDescription(String(row?.category ?? ""));

  return createPortal(
    <div
      style={{
        position: "fixed",
        left,
        top,
        transform: "translateY(-100%)",
        zIndex: 50000,
        maxWidth: maxW,
        background: "rgba(15, 23, 42, 0.92)",
        color: "white",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 12,
        lineHeight: 1.35,
        pointerEvents: "none",
        boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
        whiteSpace: "normal",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto",
          columnGap: 10,
          rowGap: 2,
          fontVariantNumeric: "tabular-nums",
          opacity: 0.95,
        }}
      >
        <div style={{ opacity: 0.75 }}>-log10(FDR)</div>
        <div>{row?.fdr ?? "-"}</div>

        <div style={{ opacity: 0.75 }}>Combined</div>
        <div>{row?.fold ?? "-"}</div>

        <div style={{ opacity: 0.75 }}>Genes</div>
        <div>{row?.genes ?? "-"}</div>
      </div>
    </div>,
    document.body
  );
}

// ────────────────────────────────────────────────────────────
// Lollipop mini (same as your summary)
// ────────────────────────────────────────────────────────────
function LollipopMini({ data }: { data: EnrichrRow[] }) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [w, setW] = React.useState(0);

  React.useEffect(() => {
    if (!hostRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries?.[0]?.contentRect?.width ?? 0;
      setW(cw);
    });
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, []);

  const sorted = React.useMemo(
    () => [...data].sort((a, b) => (b.fold ?? 0) - (a.fold ?? 0)),
    [data]
  );
  const rows = React.useMemo(() => sorted.slice(0, 10), [sorted]);

  // "compact" mode for sidebar widths
  const compact = w > 0 && w < 520;

  const maxX = Math.max(1, ...rows.map((r) => r.fold ?? 0));
  const scaledMax = Math.ceil((maxX * 1.1) / 10) * 10;
  const domain: [number, number] = [0, scaledMax];

  const circleSize = 2;
  const maxGenes = Math.max(1, ...rows.map((r) => r.genes ?? 0));
  const radiusFrom = (payload: any) => {
    const genes = Math.max(0, Number(payload?.genes ?? 0));
    const minR = Math.max(3, circleSize);
    const maxR = minR + circleSize * 3;
    const t = maxGenes > 0 ? genes / maxGenes : 0;
    return minR + t * (maxR - minR);
  };

  // Custom Y tick that wraps nicely on wide screens
  // Single-line truncated tick + hover shows full text
  const renderYTick = (props: any) => {
    const { x, y, payload } = props;

    const full = cleanDescription(String(payload?.value ?? "")); // full name for hover
    const maxChars = compact ? 16 : 24; // show only a small portion
    const short =
      full.length > maxChars ? full.slice(0, Math.max(0, maxChars - 1)) + "…" : full;


    return (
      <text
        x={x - 6}
        y={y}
        textAnchor="end"
        dominantBaseline="central"
        fill="#2d3748"
        fontSize={compact ? 11 : 12}
      // style={{ cursor: "help" }}
      >
        <title>{full}</title>
        {short}
      </text>
    );
  };


  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: compact ? 360 : 420,
        margin: "0 auto",
        // ✅ remove negative margin so it doesn't get pushed off-screen
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          layout="vertical"
          data={rows}
          margin={{ top: 10, right: 16, bottom: 10, left: compact ? 4 : 10 }}
          barCategoryGap={compact ? "18%" : "8%"}
          barGap={0}
        >

          <CartesianGrid stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={domain as any}
            tick={{ fill: "#4a5568", fontSize: compact ? 11 : 12 }}
          />
          <YAxis
            dataKey="category"
            type="category"
            width={compact ? 110 : 150}   // ✅ smaller so bars have room
            tick={renderYTick}            // ✅ truncated + hover full
          />


          <Bar dataKey="fold" barSize={compact ? 12 : 8} radius={[2, 2, 2, 2]}>
            {rows.map((d, i) => (
              <Cell key={`stem-${i}`} fill={colorScale(d.fdr, "fdr")} />
            ))}
          </Bar>

          <Scatter
            dataKey="fold"
            isAnimationActive={false}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const r = radiusFrom(payload);
              const fill = colorScale(payload.fdr, "fdr");
              return <circle cx={cx} cy={cy} r={r} fill={fill} />;
            }}
          />

          <ReTooltip
            content={(props) => (
              <PortalTooltip {...props} hostRef={hostRef} compact={compact} />
            )}
          />        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}


// ────────────────────────────────────────────────────────────
// Network mini (same as your summary)
// ────────────────────────────────────────────────────────────
// function NetworkMiniPaths({ rows, height = 360 }: { rows: EnrichrRow[]; height?: number }) {
//   const wrapRef = React.useRef<HTMLDivElement | null>(null);
//   const netRef = React.useRef<Network | null>(null);

//   React.useEffect(() => {
//     if (!wrapRef.current) return;

//     netRef.current?.destroy();
//     netRef.current = null;

//     const items = rows.slice(0, Math.min(10, rows.length));

//     const nodes = new DataSet(
//       items.map((r, i) => {
//         const fill = colorScale(r.fdr, "fdr");
//         const size = Math.max(16, Math.min(40, 10 + r.genes * 1.1));
//         return {
//           id: i + 1,
//           label: wrapLabel(cleanDescription(r.category)),
//           title: `${r.category}\n- log10(FDR): ${r.fdr}  •  Combined: ${r.fold}  •  Genes: ${r.genes}`,
//           shape: "dot",
//           size,
//           borderWidth: 2,
//           color: {
//             background: fill,
//             border: fill,
//             highlight: { background: fill, border: fill },
//             hover: { background: fill, border: fill },
//           },
//           font: {
//             color: "#111827",
//             face: "Inter, ui-sans-serif, system-ui",
//             size: 14,
//             strokeWidth: 3,
//             strokeColor: "#ffffff",
//           },
//         };
//       })
//     );

//     const edgesArr: any[] = [];
//     for (let i = 0; i < items.length; i++) {
//       for (let j = i + 1; j < items.length; j++) {
//         const c = intersectCount(items[i].overlapGenes, items[j].overlapGenes);
//         if (c > 0) {
//           edgesArr.push({
//             from: i + 1,
//             to: j + 1,
//             width: Math.min(5, 1 + Math.log2(1 + c)),
//             color: { color: "#CBD5E1", highlight: "#0ea5e9" },
//             shadow: false,
//             smooth: false,
//           });
//         }
//       }
//     }
//     const edges = new DataSet(edgesArr);

//     const options: Options = {
//       autoResize: true,
//       layout: { improvedLayout: true },
//       interaction: { zoomView: true, dragView: true, hover: true },
//       physics: {
//         solver: "forceAtlas2Based",
//         stabilization: { iterations: 220, updateInterval: 25 },
//         forceAtlas2Based: {
//           gravitationalConstant: -32,
//           centralGravity: 0.015,
//           springLength: 120,
//           springConstant: 0.08,
//           damping: 0.45,
//           avoidOverlap: 1,
//         },
//       },
//       nodes: { shape: "dot" },
//       edges: { selectionWidth: 2.25, smooth: false },
//     };

//     const network = new Network(wrapRef.current, { nodes, edges }, options);
//     netRef.current = network;

//     network.once("stabilized", () => {
//       network.setOptions({ physics: false });
//       network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
//     });

//     const ro = new ResizeObserver(() => network.fit({ animation: false }));
//     ro.observe(wrapRef.current);

//     return () => {
//       ro.disconnect();
//       netRef.current?.destroy();
//       netRef.current = null;
//     };
//   }, [rows]);

//   return (
//     <div
//       style={{
//         width: "100%",
//         maxWidth: 760,
//         height,
//         margin: "0 auto",
//         border: "1px solid #e2e8f0",
//         borderRadius: 12,
//         background: "white",
//       }}
//       ref={wrapRef}
//     />
//   );
// }
function NetworkMiniPaths({
  rows,
  height = 360,
}: {
  rows: EnrichrRow[];
  height?: number;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const netRef = React.useRef<Network | null>(null);

  const [tooltip, setTooltip] = React.useState<null | {
    x: number;
    y: number;
    row: EnrichrRow;
  }>(null);

  const hideTooltip = React.useCallback(() => setTooltip(null), []);

  React.useEffect(() => {
    if (!wrapRef.current) return;

    // reset previous network
    netRef.current?.destroy();
    netRef.current = null;
    hideTooltip();

    const items = rows.slice(0, Math.min(10, rows.length));

    // Map nodeId -> row (so click can show correct info)
    const rowById = new Map<number, EnrichrRow>();

    const nodes = new DataSet(
      items.map((r, i) => {
        const id = i + 1;
        rowById.set(id, r);

        const fill = colorScale(r.fdr, "fdr");
        const size = Math.max(16, Math.min(40, 10 + r.genes * 1.1));

        return {
          id,
          label: wrapLabel(cleanDescription(r.category)),
          // ❌ remove "title" so vis-network doesn't render its clipped tooltip
          // title: "...",
          shape: "dot",
          size,
          borderWidth: 2,
          color: {
            background: fill,
            border: fill,
            highlight: { background: fill, border: fill },
            hover: { background: fill, border: fill },
          },
          font: {
            color: "#111827",
            face: "Inter, ui-sans-serif, system-ui",
            size: 14,
            strokeWidth: 3,
            strokeColor: "#ffffff",
          },
        };
      })
    );

    const edgesArr: any[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const c = intersectCount(items[i].overlapGenes, items[j].overlapGenes);
        if (c > 0) {
          edgesArr.push({
            from: i + 1,
            to: j + 1,
            width: Math.min(5, 1 + Math.log2(1 + c)),
            color: { color: "#CBD5E1", highlight: "#0ea5e9" },
            shadow: false,
            smooth: false,
          });
        }
      }
    }
    const edges = new DataSet(edgesArr);

    const options: Options = {
      autoResize: true,
      layout: { improvedLayout: true },
      // ✅ we do click tooltip ourselves; turn off hover tooltip behavior
      interaction: { zoomView: true, dragView: true, hover: false },
      physics: {
        solver: "forceAtlas2Based",
        stabilization: { iterations: 220, updateInterval: 25 },
        forceAtlas2Based: {
          gravitationalConstant: -32,
          centralGravity: 0.015,
          springLength: 120,
          springConstant: 0.08,
          damping: 0.45,
          avoidOverlap: 1,
        },
      },
      nodes: { shape: "dot" },
      edges: { selectionWidth: 2.25, smooth: false },
    };

    const network = new Network(wrapRef.current, { nodes, edges }, options);
    netRef.current = network;

    network.once("stabilized", () => {
      network.setOptions({ physics: false });
      network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
    });

    const onClick = (params: any) => {
      const nodeId = params?.nodes?.[0];
      if (!nodeId) {
        setTooltip(null);
        return;
      }

      const row = rowById.get(nodeId);
      if (!row) {
        setTooltip(null);
        return;
      }

      const rect = wrapRef.current?.getBoundingClientRect();
      const dom = params?.pointer?.DOM;

      if (!rect || !dom) {
        setTooltip(null);
        return;
      }

      // Convert vis DOM coords (relative to container) -> viewport coords
      const x = rect.left + dom.x;
      const y = rect.top + dom.y;

      setTooltip({ x, y, row });
    };

    const onDragStart = () => hideTooltip();
    const onZoom = () => hideTooltip();

    network.on("click", onClick);
    network.on("dragStart", onDragStart);
    network.on("zoom", onZoom);

    const ro = new ResizeObserver(() => {
      hideTooltip();
      network.fit({ animation: false });
    });
    ro.observe(wrapRef.current);

    return () => {
      ro.disconnect();
      network.off("click", onClick);
      network.off("dragStart", onDragStart);
      network.off("zoom", onZoom);
      hideTooltip();
      netRef.current?.destroy();
      netRef.current = null;
    };
  }, [rows, hideTooltip]);

  // ✅ Portal tooltip (same vibe as Pathways tab)
  const tooltipPortal =
    tooltip &&
      typeof window !== "undefined" &&
      typeof document !== "undefined"
      ? (() => {
        const maxW = 360;

        const leftRaw = tooltip.x + 12;
        const topRaw = tooltip.y - 10;

        const left = Math.min(Math.max(8, leftRaw), window.innerWidth - maxW - 8);
        const top = Math.min(Math.max(8, topRaw), window.innerHeight - 140);

        const title = cleanDescription(String(tooltip.row.category ?? ""));

        return createPortal(
          <div
            style={{
              position: "fixed",
              left,
              top,
              transform: "translateY(-100%)",
              zIndex: 50000,
              maxWidth: maxW,
              background: "rgba(15, 23, 42, 0.92)",
              color: "white",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 12,
              lineHeight: 1.35,
              pointerEvents: "none",
              boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              whiteSpace: "normal",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto auto",
                columnGap: 10,
                rowGap: 2,
                fontVariantNumeric: "tabular-nums",
                opacity: 0.95,
              }}
            >
              <div style={{ opacity: 0.75 }}>-log10(FDR)</div>
              <div>{tooltip.row.fdr ?? "-"}</div>

              <div style={{ opacity: 0.75 }}>Combined</div>
              <div>{tooltip.row.fold ?? "-"}</div>

              <div style={{ opacity: 0.75 }}>Genes</div>
              <div>{tooltip.row.genes ?? "-"}</div>
            </div>
          </div>,
          document.body
        );
      })()
      : null;

  return (
    <>
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          height,
          margin: "0 auto",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "white",
        }}
        ref={wrapRef}
      />
      {tooltipPortal}
    </>
  );
}


// ────────────────────────────────────────────────────────────
// Region Card (same look as your A/B/C/D card)
// ────────────────────────────────────────────────────────────
function RegionCard({
  region,
  regionIndex,
  filteredPoints,
  datasetId,
  onOpenFullAnalysis, // ✅ NEW
}: {
  region: { points: Point[]; label: string };
  regionIndex: number;
  filteredPoints: Point[];
  datasetId?: string;

  // ✅ NEW: parent handler to open modal
  onOpenFullAnalysis: (args: { regionLabel: string; datasetId?: string; genes: string[] }) => void;
}) {

  const genesInRegion = React.useMemo(() => {
    return filteredPoints.filter((p) => isPointInPolygon(p, region.points));
  }, [filteredPoints, region.points]);

  const pathwaysInRegion = React.useMemo(() => {
    return Array.from(new Set(genesInRegion.flatMap((p) => p.pathways))).sort();
  }, [genesInRegion]);

  const regionAvgValue = React.useMemo(() => {
    const v =
      genesInRegion.reduce((sum, p) => sum + p.value, 0) / Math.max(1, genesInRegion.length);
    return v.toFixed(2);
  }, [genesInRegion]);

  const valueColor = parseFloat(regionAvgValue) >= 0 ? "#80BC00" : "#3182CE";

  // enrichment state for THIS region
  const [enrich, setEnrich] = React.useState<{
    status: "idle" | "loading" | "ready" | "error";
    rows: EnrichrRow[];
    err?: string;
  }>({ status: "idle", rows: [] });

  // run enrichment when card mounts / region changes
  React.useEffect(() => {
    let mounted = true;

    const genes = uniq(genesInRegion.map((g) => g.geneName).filter(Boolean) as string[]);
    if (!genes.length) {
      setEnrich({ status: "ready", rows: [] });
      return;
    }

    setEnrich({ status: "loading", rows: [] });

    runEnrichr(genes, ENRICHR_LIBRARY)
      .then((rows) => {
        if (!mounted) return;
        setEnrich({ status: "ready", rows });
      })
      .catch((e: any) => {
        if (!mounted) return;
        setEnrich({ status: "error", rows: [], err: String(e?.message || e) });
      });

    return () => {
      mounted = false;
    };
  }, [genesInRegion]);

  const openFullAnalysis = React.useCallback(() => {
    const genes = uniq(
      genesInRegion
        .map((g) => g.geneName)
        .filter(Boolean) as string[]
    );

    // optional: keep your localStorage write (safe to keep)
    try {
      localStorage.setItem(
        ENRICHMENT_STORAGE_KEY,
        JSON.stringify({ genes, datasetId, at: Date.now(), regionLabel: region.label })
      );
    } catch {
      // ignore
    }

    // ✅ NEW: open modal via parent
    onOpenFullAnalysis({
      regionLabel: region.label,
      datasetId,
      genes,
    });
  }, [genesInRegion, datasetId, region.label, onOpenFullAnalysis]);



  // unique tab ids (avoid conflicts)
  const tabKey = `lasso-panel-${regionIndex}`;

  return (
    <div className="card mb-1 border" style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}>
      <div className="card-header py-2" style={{ backgroundColor: "#F7FAFC", borderBottom: "1px solid #E2E8F0" }}>
        <h4 className="h6 mb-0 d-flex justify-content-between align-items-center" style={{ color: "#333333" }}>
          <span>
            <Grid3X3 className="me-1 d-inline" size={16} />
            {region.label}
          </span>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm p-1 d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: "4px",
                color: "#1E6B52"
              }}
              title="Open Summary"
              onClick={() => {
                const geneList = uniq(genesInRegion.map(g => g.geneName).filter(Boolean) as string[]);
                try {
                  localStorage.setItem(
                    "SELECTION_SUMMARY_DATA",
                    JSON.stringify({
                      genes: geneList,
                      datasetId,
                      regionLabel: region.label,
                      at: Date.now()
                    })
                  );
                  window.open("/selection-summary", "_blank", "noopener,noreferrer");
                } catch (e) {
                  console.error("Failed to store selection summary data", e);
                }
              }}
            >
              <LayoutList size={14} />
              <span className="ms-1" style={{ fontSize: "12px", fontWeight: 600 }}>Summary</span>
            </button>
            <span className="badge" style={{ backgroundColor: "#80BC00", color: "white" }}>
              {genesInRegion.length} genes
            </span>
          </div>
        </h4>
      </div>

      <div className="card-body py-2 px-3">
        {/* Stats Row */}
        <div className="row g-2 mb-2">
          <div className="col-6">
            <div className="border rounded p-2" style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}>
              <div className="small" style={{ color: "#666666" }}>Avg. Value</div>
              <div className="fw-bold" style={{ color: valueColor }}>{regionAvgValue}</div>
            </div>
          </div>
          <div className="col-6">
            <div className="border rounded p-2" style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}>
              <div className="small" style={{ color: "#666666" }}>Pathways</div>
              <div className="fw-bold" style={{ color: "#333333" }}>{pathwaysInRegion.length}</div>
            </div>
          </div>
        </div>

        {/* Tabs: Genes | Pathways | Network */}
        <ul className="nav nav-tabs nav-tabs-sm mb-2" style={{ borderBottom: "1px solid #E2E8F0" }} role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className="nav-link active py-1 px-2 small"
              style={{ color: "#1E6B52" }}
              id={`genes-tab-${tabKey}`}
              data-bs-toggle="tab"
              data-bs-target={`#genes-${tabKey}`}
              type="button"
              role="tab"
              aria-selected="true"
            >
              Genes
            </button>
          </li>

          <li className="nav-item" role="presentation">
            <button
              className="nav-link py-1 px-2 small"
              style={{ color: "#444444" }}
              id={`pathways-tab-${tabKey}`}
              data-bs-toggle="tab"
              data-bs-target={`#pathways-${tabKey}`}
              type="button"
              role="tab"
              aria-selected="false"
            >
              Pathways
            </button>
          </li>

          <li className="nav-item" role="presentation">
            <button
              className="nav-link py-1 px-2 small"
              style={{ color: "#444444" }}
              id={`network-tab-${tabKey}`}
              data-bs-toggle="tab"
              data-bs-target={`#network-${tabKey}`}
              type="button"
              role="tab"
              aria-selected="false"
            >
              Network
            </button>
          </li>
        </ul>

        <div className="tab-content">
          {/* Genes tab */}
          <div className="tab-pane fade show active small" id={`genes-${tabKey}`} role="tabpanel">
            <div className="mb-1" style={{ color: "#666666" }}>Gene values (bar chart)</div>

            {(() => {
              const items = [...genesInRegion].sort(
                (a, b) => Math.abs((b.value ?? 0)) - Math.abs((a.value ?? 0))
              );

              const MAX_ABS = 4;
              const EPS = 0.05;
              const clampV = (v: number) => Math.max(-MAX_ABS, Math.min(MAX_ABS, v));
              const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
              if (!items.length) return null;

              const vals = items.map((g) => g.value ?? 0);
              const n = vals.length;
              const mean = vals.reduce((a, b) => a + b, 0) / n;
              const variance =
                n > 1 ? vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (n - 1) : 0;
              const sd = Math.sqrt(variance);
              const se = n > 0 ? sd / Math.sqrt(n) : 0;
              const ciMag = 2 * se;
              const canShowAnyError = n > 1 && ciMag > 0;
              const toPct = (v: number) => ((clampV(v) + MAX_ABS) / (2 * MAX_ABS)) * 100;

              return (
                <div style={{ maxHeight: 460, overflowY: "auto", paddingRight: 6 }}>
                  {items.map((gene, i) => {
                    const v = gene.value ?? 0;
                    const ratio = clamp01(Math.abs(v) / MAX_ABS);
                    const isPositive = v >= 0;

                    const negWidthPct = isPositive ? 0 : Math.round(ratio * 100);
                    const posWidthPct = isPositive ? Math.round(ratio * 100) : 0;
                    const color = isPositive ? "#d13a3aff" : "#3182CE";

                    const showThisError = canShowAnyError && Math.abs(v) > EPS;
                    let lo = v, hi = v;
                    if (showThisError) {
                      if (isPositive) { lo = v; hi = v + ciMag; }
                      else { lo = v - ciMag; hi = v; }
                    }
                    const pctStart = toPct(Math.min(lo, hi));
                    const pctEnd = toPct(Math.max(lo, hi));
                    const widthPct = Math.max(0, pctEnd - pctStart);

                    return (
                      <div
                        key={i}
                        style={{
                          paddingBottom: 10,
                          // marginBottom: 10,
                          // borderBottom: "1px dashed #E2E8F0",
                        }}
                      >
                        {/* Gene label + Bar side-by-side */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "60px 1fr", // label | bar area
                            gap: 10,
                            alignItems: "start",
                          }}
                        >
                          {/* Gene name (left) */}
                          <div
                            style={{
                              minWidth: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: "#333",
                              fontWeight: 600,
                              lineHeight: "18px",
                              paddingTop: 1, // small alignment tweak
                            }}
                            title={gene.geneName}
                          >
                            {gene.geneName}
                          </div>

                          {/* Bar + numbers (right) */}
                          <div style={{ minWidth: 0 }}>
                            {/* Bar */}
                            <div
                              style={{
                                position: "relative",
                                height: 12, // keeps bar visible
                                background: "#F1F5F9",
                                borderRadius: 6,
                                overflow: "hidden",
                                border: "1px solid #E2E8F0",
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                              }}
                            >
                              {/* Center line */}
                              <div
                                aria-hidden
                                style={{
                                  position: "absolute",
                                  left: "50%",
                                  top: 0,
                                  bottom: 0,
                                  width: 1,
                                  background: "#CBD5E1",
                                  zIndex: 2,
                                }}
                              />

                              {/* Negative side */}
                              <div style={{ position: "relative" }}>
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${negWidthPct}%`,
                                    background: "#3182CE", // unchanged
                                    transition: "width 0.2s ease",
                                    zIndex: 1,
                                  }}
                                />
                              </div>

                              {/* Positive side */}
                              <div style={{ position: "relative" }}>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${posWidthPct}%`,
                                    background: "#d13a3aff", // unchanged
                                    transition: "width 0.2s ease",
                                    zIndex: 1,
                                  }}
                                />
                              </div>

                              {/* Error indicator */}
                              {showThisError && widthPct > 0 && (
                                <>
                                  <div
                                    aria-hidden
                                    style={{
                                      position: "absolute",
                                      left: `${pctStart}%`,
                                      width: `${widthPct}%`,
                                      top: 7,
                                      height: 4,
                                      background: "rgba(15, 23, 42, 0.35)",
                                      borderRadius: 2,
                                      zIndex: 3,
                                    }}
                                  />
                                  <div
                                    aria-hidden
                                    style={{
                                      position: "absolute",
                                      left: `${pctStart}%`,
                                      top: 2,
                                      bottom: 2,
                                      width: 1,
                                      background: "rgba(15, 23, 42, 0.55)",
                                      zIndex: 3,
                                    }}
                                  />
                                  <div
                                    aria-hidden
                                    style={{
                                      position: "absolute",
                                      left: `${pctEnd}%`,
                                      transform: "translateX(-1px)",
                                      top: 2,
                                      bottom: 2,
                                      width: 1,
                                      background: "rgba(15, 23, 42, 0.55)",
                                      zIndex: 3,
                                    }}
                                  />
                                </>
                              )}
                            </div>

                            {/* Value + ± side-by-side under the bar, right-aligned */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 10,
                                marginTop: 4,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              <div style={{ color }}>{v.toFixed(2)}</div>
                              <div style={{ color: "#64748B" }}>±{ciMag.toFixed(3)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                  })}

                </div>
              );
            })()}
          </div>

          {/* Pathways tab */}
          <div className="tab-pane fade" id={`pathways-${tabKey}`} role="tabpanel">
            <div className="d-flex justify-content-end mb-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                title="view full analysis"
                aria-label="See full analysis"
                onClick={openFullAnalysis}
              >
                view full analysis <ArrowUpRight className="ms-1 d-inline" size={14} />
              </button>
            </div>

            {enrich.status === "loading" && <div className="small text-muted">Running enrichment…</div>}
            {enrich.status === "error" && (
              <div className="alert alert-danger py-1">
                Failed to load enrichment for this selection.
              </div>
            )}
            {enrich.status === "ready" && enrich.rows?.length > 0 && (
              <div className="mb-2">
                <LollipopMini data={enrich.rows} />
              </div>
            )}
            {enrich.status === "ready" && (!enrich.rows || enrich.rows.length === 0) && (
              <div className="small text-muted">No enriched pathways found.</div>
            )}
          </div>

          {/* Network tab */}
          <div className="tab-pane fade" id={`network-${tabKey}`} role="tabpanel">
            <div className="d-flex justify-content-end mb-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                title="view full analysis"
                aria-label="See full analysis"
                onClick={openFullAnalysis}
              >
                view full analysis <ArrowUpRight className="ms-1 d-inline" size={14} />
              </button>
            </div>

            {enrich.status !== "ready" && (
              <div className="small text-muted">Network will appear after enrichment is ready…</div>
            )}
            {enrich.status === "ready" && enrich.rows?.length > 0 && (
              <NetworkMiniPaths rows={enrich.rows} height={360} />
            )}
            {enrich.status === "ready" && (!enrich.rows || enrich.rows.length === 0) && (
              <div className="small text-muted">No enriched pathways to render.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Sidebar Component (design unchanged)
// ────────────────────────────────────────────────────────────
export default function LassoRegionPanel({
  isOpen,
  title,
  onClose,
  width = 320,
  activeRegionIndex,
  regions,
  filteredPoints,
  datasetId,
}: LassoRegionPanelProps) {

  const activeRegion = activeRegionIndex !== null ? regions[activeRegionIndex] : null;
  // ✅ Modal state (big modal that will replace "open new page")
  const [isFullAnalysisModalOpen, setIsFullAnalysisModalOpen] = React.useState(false);
  const [modalView, setModalView] = React.useState<"analysis" | "kg">("analysis");
  const [kgPayload, setKgPayload] = React.useState<{ genes: string[]; datasetId: string } | null>(null);


  // ✅ keep payload for later (modal content will use this)
  const [fullAnalysisPayload, setFullAnalysisPayload] = React.useState<{
    regionLabel: string;
    datasetId?: string;
    genes: string[];
  } | null>(null);

  const closeFullModal = () => {
    setIsFullAnalysisModalOpen(false);
    setModalView("analysis");
    setKgPayload(null);
  };


  const handleOpenFullAnalysisModal = React.useCallback(
    (args: { regionLabel: string; datasetId?: string; genes: string[] }) => {
      setFullAnalysisPayload(args);

      // always start in analysis view when opening full modal
      setModalView("analysis");
      setKgPayload(null);

      onClose();
      setIsFullAnalysisModalOpen(true);
    },
    [onClose]
  );



  return (
    <>
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width,
          zIndex: 9999,
          background: "rgba(255,255,255,0.98)",
          color: TEXT_PRIMARY,
          borderRight: `1px solid ${DIVIDER_COLOR}`,
          boxShadow: "0 16px 36px rgba(0,0,0,0.14)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: FONT_STACK,
          fontSize: 13,

          transform: isOpen ? "translateX(0)" : `translateX(-${width + 16}px)`,
          transition: "transform 220ms ease",
        }}
        aria-hidden={!isOpen}
      >
        {/* Header (unchanged) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: "rgb(30 107 55 / 62%)",
            borderBottom: `1px solid ${DIVIDER_COLOR}`,
            userSelect: "none",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              paddingRight: 8,
            }}
            title={title}
          >
            {title}
          </div>

          <button
            title="Close"
            onClick={onClose}
            style={{
              border: `1px solid ${DIVIDER_COLOR}`,
              background: "#fff",
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: "28px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 12, flex: 1, overflowY: "auto" }}>
          {!activeRegion || activeRegionIndex === null ? (
            <div style={{ color: "#64748B", fontSize: 13 }}>
              Click a lasso selection to view details.
            </div>
          ) : (
            <RegionCard
              region={activeRegion}
              regionIndex={activeRegionIndex}
              filteredPoints={filteredPoints}
              datasetId={datasetId}
              onOpenFullAnalysis={handleOpenFullAnalysisModal} // ✅ NEW
            />
          )}
        </div>
      </aside>

      {/* ✅ BIG EMPTY MODAL */}
      {isFullAnalysisModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 20000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
          onClick={closeFullModal}
        >
          <div
            style={{
              width: "min(1400px, 96vw)",
              height: "min(90vh, 980px)",
              background: "#fff",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "12px 14px",
                borderBottom: `1px solid ${DIVIDER_COLOR}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {modalView === "kg" && (
                  <button
                    onClick={() => setModalView("analysis")}
                    style={{
                      border: `1px solid ${DIVIDER_COLOR}`,
                      background: "#fff",
                      borderRadius: 8,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                    title="Back to Pathways"
                  >
                    ← Back
                  </button>
                )}

                <div style={{ fontWeight: 800 }}>
                  {modalView === "analysis" ? "Full Analysis" : "Knowledge Graph"}
                </div>
              </div>

              <button
                onClick={closeFullModal}
                style={{
                  border: `1px solid ${DIVIDER_COLOR}`,
                  background: "#000000ff",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 800,
                  lineHeight: "32px",
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Body (fills modal; no extra padding) */}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              {modalView === "analysis" ? (
                <UnifiedPathwayNetwork
                  embedded
                  onOpenKnowledgeGraph={(payload) => {
                    setKgPayload(payload);
                    setModalView("kg");
                  }}
                />
              ) : (
                <KnowledgeGraph embedded payload={kgPayload ?? undefined} />
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );


}
