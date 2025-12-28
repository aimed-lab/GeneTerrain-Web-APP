import React from "react";
import { Point } from "../../GaussianPlots/types";
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

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface GeneSelectionSummaryProps {
  selectedPoints: Point[];
  regions: { points: Point[]; label: string }[];
  filteredPoints: Point[];
  datasetId?: string;
}

type EnrichrRow = {
  category: string;      // term
  fold: number;          // Combined score (rounded)
  fdr: number;           // -log10(adj p)
  genes: number;         // overlap count
  overlapGenes: string[]; // parsed overlap gene list
};

// ────────────────────────────────────────────────────────────
const ENRICHR_BASE = "https://maayanlab.cloud/Enrichr";
const ENRICHR_LIBRARY = "GO_Biological_Process_2023";
const ENRICHMENT_STORAGE_KEY = "ENRICHMENT_SELECTED_GENES";

// ────────────────────────────────────────────────────────────
// Utils
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// Enrichr integration
// ────────────────────────────────────────────────────────────
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

  // [rank, term, pval, z, combined_score, overlapping_genes, adjusted_pvalue, ...]
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
    .replace(/^(positive |negative )?regulation of |involved in| process$|^cellular /, '')
    .replace(/pathway$/, '')
    .trim();
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function wrapLabel(s: string, lineLen = 18, maxLines = 3): string {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = (line ? line + ' ' : '') + w;
    if (test.length > lineLen) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines.join('\n');
}


// ────────────────────────────────────────────────────────────
// Lollipop mini chart (Pathways)
// ────────────────────────────────────────────────────────────
function LollipopMini({ data }: { data: EnrichrRow[] }) {
  // Match Unified defaults:
  // - Sort by fold (desc)
  // - x-axis = fold (with 10% headroom, rounded up to nearest 10)
  // - Color by fdr (-log10(FDR))
  // - Head size by genes (normalized by maxGenes), with circleSize=4 → r ∈ [4..16]
  const sorted = [...data].sort((a, b) => (b.fold ?? 0) - (a.fold ?? 0));
  const rows = sorted.slice(0, 10);

  const maxX = Math.max(1, ...rows.map(r => r.fold ?? 0));
  const scaledMax = Math.ceil((maxX * 1.1) / 10) * 10; // same domain style as Unified
  const domain: [number, number] = [0, scaledMax];

  const circleSize = 2; // UnifiedPathway default
  const maxGenes = Math.max(1, ...rows.map(r => r.genes ?? 0));
  const radiusFrom = (payload: any) => {
    const genes = Math.max(0, Number(payload?.genes ?? 0));
    const minR = Math.max(3, circleSize);           // 4
    const maxR = minR + circleSize * 3;             // 16
    const t = maxGenes > 0 ? genes / maxGenes : 0;  // 0..1
    return minR + t * (maxR - minR);                // 4..16
  };

  return (
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", marginLeft: "-40px", height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          layout="vertical"
          data={rows}
          margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
          barCategoryGap="8%"
          barGap={0}
        >
          <CartesianGrid stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" domain={domain as any} tick={{ fill: "#4a5568", fontSize: 12 }} />
          <YAxis dataKey="category" type="category" width={260} tick={{ fill: "#2d3748", fontSize: 12 }} />

          {/* stems (x-axis = fold) */}
          <Bar dataKey="fold" barSize={8} radius={[2, 2, 2, 2]}>
            {rows.map((d, i) => (
              <Cell key={`stem-${i}`} fill={colorScale(d.fdr, "fdr")} />
            ))}
          </Bar>

          {/* heads — size by genes, color by fdr */}
          <Scatter
            dataKey="fold"
            isAnimationActive={false}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const r = radiusFrom(payload);
              const fill = colorScale(payload.fdr, "fdr"); // −log10(FDR)
              return <circle cx={cx} cy={cy} r={r} fill={fill} />;
            }}
          />

          <ReTooltip />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}






// ────────────────────────────────────────────────────────────
// Mini Network (centered) using vis-network
// ────────────────────────────────────────────────────────────
function NetworkMiniPaths({
  rows,
  height = 360,
}: {
  rows: EnrichrRow[];
  height?: number;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const netRef = React.useRef<Network | null>(null);

  React.useEffect(() => {
    if (!wrapRef.current) return;

    // destroy previous
    netRef.current?.destroy();
    netRef.current = null;

    // top pathways (cap keeps it readable)
const items = rows.slice(0, Math.min(10, rows.length));

    const palette = [
      "#7c3aed", "#2563eb", "#059669", "#dc2626", "#d97706",
      "#0891b2", "#6b21a8", "#15803d", "#e11d48", "#7c2d12",
      "#0ea5e9", "#22c55e",
    ];

    const nodes = new DataSet(
  items.map((r, i) => {
    const fill = colorScale(r.fdr, "fdr"); // ← same palette rule as Unified
    const size = Math.max(16, Math.min(40, 10 + r.genes * 1.1)); // ← size by genes
    return {
      id: i + 1,
      label: wrapLabel(cleanDescription(r.category)),
      title: `${r.category}\n- log10(FDR): ${r.fdr}  •  Combined: ${r.fold}  •  Genes: ${r.genes}`,
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
      interaction: { zoomView: true, dragView: true, hover: true },
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
      edges: {
        selectionWidth: 2.25,
        smooth: false,
      },
    };

    const network = new Network(wrapRef.current, { nodes, edges }, options);
    netRef.current = network;

    // Center & stop jitter
    network.once("stabilized", () => {
      network.setOptions({ physics: false });
      network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
    });

    // refit on container resize
    const ro = new ResizeObserver(() => network.fit({ animation: false }));
    ro.observe(wrapRef.current);

    return () => {
      ro.disconnect();
      netRef.current?.destroy();
      netRef.current = null;
    };
  }, [rows]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 760,       // centered “screen portion”
        height,
        margin: "0 auto",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "white",
      }}
      ref={wrapRef}
    />
  );
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
const GeneSelectionSummary: React.FC<GeneSelectionSummaryProps> = ({
  selectedPoints,
  regions,
  filteredPoints,
  datasetId,
}) => {
  const selectedPathways = Array.from(
    new Set(selectedPoints.flatMap((point) => point.pathways))
  ).sort();

  console.log("GeneSelectionSummary: filteredPoints =", filteredPoints);
  console.log("GeneSelectionSummary: datasetId =", datasetId);
  const avgValue =
    selectedPoints.length > 0
      ? (
        selectedPoints.reduce((sum, p) => sum + p.value, 0) /
        selectedPoints.length
      ).toFixed(2)
      : "0.00";

  // Per-region enrichment (lazy; once when section becomes visible)
  const [enrich, setEnrich] = React.useState<
    Record<number, { status: "idle" | "loading" | "ready" | "error"; rows: EnrichrRow[]; err?: string }>
  >({});

  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  React.useEffect(() => {
    setEnrich({});
  }, [selectedPoints, filteredPoints, regions]);

  const fetchRegionEnrichment = React.useCallback(async (regionIdx: number, genesInRegion: Point[]) => {
    const s = enrich[regionIdx]?.status;
    if (s === "loading" || s === "ready") return; // prevent duplicates
    const genes = uniq(genesInRegion.map(g => g.geneName).filter(Boolean) as string[]);
    if (!genes.length) {
      setEnrich(prev => ({ ...prev, [regionIdx]: { status: "ready", rows: [] } }));
      return;
    }
    setEnrich(prev => ({ ...prev, [regionIdx]: { status: "loading", rows: [] } }));
    try {
      const rows = await runEnrichr(genes, ENRICHR_LIBRARY);
      setEnrich(prev => ({ ...prev, [regionIdx]: { status: "ready", rows } }));
    } catch (e: any) {
      setEnrich(prev => ({ ...prev, [regionIdx]: { status: "error", rows: [], err: String(e?.message || e) } }));
    }
  }, [enrich]);

  React.useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const idx = Number(el.dataset.regionIdx);
        if (Number.isNaN(idx)) return;

        const status = enrich[idx]?.status ?? "idle";
        if (status !== "idle") return;

        const genesInRegion = filteredPoints.filter((p) => isPointInPolygon(p, regions[idx].points));
        fetchRegionEnrichment(idx, genesInRegion);
      });
    }, { root: null, threshold: 0.45 });
    observerRef.current = obs;

    cardRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [regions, filteredPoints, enrich, fetchRegionEnrichment]);

  const openFullAnalysis = React.useCallback((genesInRegion: Point[]) => {
    const geneList = Array.from(
      new Set(genesInRegion.map(g => g.geneName).filter(Boolean))
    ) as string[];

    try {
      localStorage.setItem(
        ENRICHMENT_STORAGE_KEY,
        JSON.stringify({ genes: geneList, datasetId: datasetId, at: Date.now() })
      );
    } catch {
      // ignore storage write failures
    }

    window.open("/enrichment-analysis", "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div
      className="container-fluid px-2"
      style={{ color: "#333333", maxWidth: "900px", margin: "0 auto" }}
    >
      {/* Title Bar */}
      <div
        className="py-2 px-3 rounded mb-3"
        style={{ backgroundColor: "#1E6B52", color: "white" }}
      >
        <h5 className="mb-0">Selection Summary</h5>
      </div>

      {/* Overall Selection Statistics */}
      <div
        className="row g-2 mb-3 justify-content-center"
        style={{ maxWidth: "800px", margin: "0 auto" }}
      >
        <div className="col-md-3 col-6">
          <div className="border rounded p-2 h-100" style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}>
            <div className="small" style={{ color: "#666666" }}>Total Selections</div>
            <div className="fw-bold" style={{ color: "#333333" }}>{regions.length}</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="border rounded p-2 h-100" style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}>
            <div className="small" style={{ color: "#666666" }}>Total Genes</div>
            <div className="fw-bold" style={{ color: "#333333" }}>{selectedPoints.length}</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="border rounded p-2 h-100" style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}>
            <div className="small" style={{ color: "#666666" }}>Total Pathways</div>
            <div className="fw-bold" style={{ color: "#333333" }}>{selectedPathways.length}</div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="border rounded p-2 h-100" style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}>
            <div className="small" style={{ color: "#666666" }}>Avg. Gene Value</div>
            <div className="fw-bold" style={{ color: parseFloat(avgValue) >= 0 ? "#80BC00" : "#3182CE" }}>{avgValue}</div>
          </div>
        </div>
      </div>

      {/* Selections */}
      <div className="regions-container">
        {regions.length > 0 && (
          <div className="d-flex align-items-center mb-2">
            <h5 className="h6 mb-0 me-2" style={{ color: "#444444" }}>Selections:</h5>
            <div className="d-flex gap-1">
              {regions.map((region, i) => (
                <button
                  key={i}
                  className="btn btn-sm px-2 py-0"
                  style={{ borderColor: "#1E6B52", color: "#1E6B52", backgroundColor: "transparent" }}
                  onClick={() => document.getElementById(`region-${i}`)?.scrollIntoView({ behavior: "smooth" })}
                >
                  {region.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className="regions-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "1rem",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {regions.map((region, idx) => {
            const genesInRegion = filteredPoints.filter((point) =>
              isPointInPolygon(point, region.points)
            );

            const pathwaysInRegion = Array.from(
              new Set(genesInRegion.flatMap((p) => p.pathways))
            ).sort();

            const regionAvgValue = (
              genesInRegion.reduce((sum, p) => sum + p.value, 0) /
              Math.max(1, genesInRegion.length)
            ).toFixed(2);

            const valueColor = parseFloat(regionAvgValue) >= 0 ? "#80BC00" : "#3182CE";
            const eState = enrich[idx]?.status ?? "idle";
            const eRows = enrich[idx]?.rows ?? [];

            return (
              <div
                id={`region-${idx}`}
                className="card mb-1 border"
                key={idx}
                data-region-idx={idx}
                ref={(el) => (cardRefs.current[idx] = el)}
                style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}
              >
                <div className="card-header py-2" style={{ backgroundColor: "#F7FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <h4 className="h6 mb-0 d-flex justify-content-between" style={{ color: "#333333" }}>
                    <span><i className="bi bi-grid-3x3 me-1"></i>{region.label}</span>
                    <span className="badge" style={{ backgroundColor: "#80BC00", color: "white" }}>
                      {genesInRegion.length} genes
                    </span>
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
                        id={`genes-tab-${idx}`}
                        data-bs-toggle="tab"
                        data-bs-target={`#genes-${idx}`}
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
                        id={`pathways-tab-${idx}`}
                        data-bs-toggle="tab"
                        data-bs-target={`#pathways-${idx}`}
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
                        id={`network-tab-${idx}`}
                        data-bs-toggle="tab"
                        data-bs-target={`#network-${idx}`}
                        type="button"
                        role="tab"
                        aria-selected="false"
                      >
                        Network
                      </button>
                    </li>
                  </ul>

                  <div className="tab-content">
                    {/* Genes tab (mini diverging bars) */}
                    <div className="tab-pane fade show active small" id={`genes-${idx}`} role="tabpanel">
                      <div className="mb-1" style={{ color: "#666666" }}>Gene values (bar chart)</div>
                      {(() => {
  const items = [...genesInRegion].sort(
    (a, b) => Math.abs((b.value ?? 0)) - Math.abs((a.value ?? 0))
  );
  console.log(items)
  const MAX_ABS = 4;                   // fixed domain [-4, +4]
  const EPS = 0.05;                    // “very small” threshold ⇒ no error bar
  const clamp = (v: number) => Math.max(-MAX_ABS, Math.min(MAX_ABS, v));
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  if (!items.length) return null;

  // ---- stats across ALL genes in this region ----
  const vals = items.map(g => g.value ?? 0);
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1
    ? vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (n - 1)
    : 0;
  const sd = Math.sqrt(variance);
  const se = n > 0 ? sd / Math.sqrt(n) : 0;
  const ciMag = 2 * se;                // ≈ 95% CI half-width
  const canShowAnyError = n > 1 && ciMag > 0;
  const toPct = (v: number) => ((clamp(v) + MAX_ABS) / (2 * MAX_ABS)) * 100;

  return (
    <div style={{ maxHeight: 120, overflowY: "auto", paddingRight: 6 }}>
      {/* {canShowAnyError && (
        <div className="small mb-1" style={{ color: "#64748B" }}>
          Error bars: one-sided 95% CI (±2·SE, SE = SD/√n), n = {n}
        </div>
      )} */}
      {items.map((gene, i) => {
        const v = gene.value ?? 0;
        const ratio = clamp01(Math.abs(v) / MAX_ABS);
        const isPositive = v >= 0;

        const negWidthPct = isPositive ? 0 : Math.round(ratio * 100);
        const posWidthPct = isPositive ? Math.round(ratio * 100) : 0;
        const color = isPositive ? "#d13a3aff" : "#3182CE";

        // ----- one-sided error bar -----
        const showThisError = canShowAnyError && Math.abs(v) > EPS;
        let lo = v, hi = v;
        if (showThisError) {
          if (isPositive) { lo = v;         hi = v + ciMag; }
          else            { lo = v - ciMag; hi = v;         }
        }
        const pctStart = toPct(Math.min(lo, hi));
        const pctEnd   = toPct(Math.max(lo, hi));
        const widthPct = Math.max(0, pctEnd - pctStart);

        return (
          <div key={i} className="d-flex align-items-center mb-1" style={{ gap: "6px" }}>
            <div style={{
              width: 120, whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis", color: "#333",
            }} title={gene.geneName}>
              {gene.geneName}
            </div>

            <div style={{
              flex: 1, position: "relative", display: "grid",
              gridTemplateColumns: "1fr 1fr", height: 12,
              background: "#F1F5F9", borderRadius: 4, overflow: "hidden",
            }}>
              {/* center axis */}
              <div aria-hidden style={{
                position: "absolute", left: "50%", top: 0, bottom: 0,
                width: 1, background: "#CBD5E1", zIndex: 1,
              }} />

              {/* left (negative) and right (positive) bars */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  position: "absolute", right: 0, top: 0, bottom: 0,
                  width: `${negWidthPct}%`, background: "#3182CE",
                  transition: "width 0.2s ease",
                }} />
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${posWidthPct}%`, background: "#d13a3aff",
                  transition: "width 0.2s ease",
                }} />
              </div>

              {/* one-sided error bar segment */}
              {showThisError && widthPct > 0 && (
                <>
                  <div aria-hidden style={{
                    position: "absolute", left: `${pctStart}%`,
                    width: `${widthPct}%`, top: 4, height: 4,
                    background: "rgba(15, 23, 42, 0.35)", borderRadius: 2, zIndex: 2,
                  }} />
                  {/* caps */}
                  <div aria-hidden style={{
                    position: "absolute", left: `${pctStart}%`,
                    top: 1, bottom: 1, width: 1,
                    background: "rgba(15, 23, 42, 0.55)", zIndex: 2,
                  }} />
                  <div aria-hidden style={{
                    position: "absolute", left: `${pctEnd}%`,
                    transform: "translateX(-1px)",
                    top: 1, bottom: 1, width: 1,
                    background: "rgba(15, 23, 42, 0.55)", zIndex: 2,
                  }} />
                </>
              )}
            </div>

            <div style={{ width: 110, textAlign: "right" }}>
  <div style={{ color }}>{v.toFixed(2)}</div>
  <div className="small" style={{ color: "#64748B" }}>
    ±{ciMag.toFixed(3)}
  </div>
</div>
          </div>
        );
      })}
    </div>
  );
})()}

                    </div>

                    {/* Pathways tab (mini lollipop) */}
                    <div className="tab-pane fade" id={`pathways-${idx}`} role="tabpanel">
                      <div className="d-flex justify-content-end mb-2">
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          title="view full analysis"
                          aria-label="See full analysis"
                          onClick={() => openFullAnalysis(genesInRegion)}
                        >
                          view full analysis <i className="bi bi-box-arrow-up-right"></i>
                        </button>
                      </div>

                      {eState === "idle" && <div className="small text-muted">Preparing enrichment…</div>}
                      {eState === "loading" && <div className="small text-muted">Running enrichment…</div>}
                      {eState === "error" && <div className="alert alert-danger py-1">Failed to load enrichment for this selection.</div>}
                      {eState === "ready" && eRows?.length > 0 && (
                        <div className="mb-2">
                          <LollipopMini data={eRows} />
                        </div>
                      )}
                      {eState === "ready" && (!eRows || eRows.length === 0) && (
                        <div className="small text-muted">No enriched pathways found.</div>
                      )}
                    </div>

                    {/* Network tab (centered mini network of pathways) */}
                    <div className="tab-pane fade" id={`network-${idx}`} role="tabpanel">
                      <div className="d-flex justify-content-end mb-2">
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          title="view full analysis"
                          aria-label="See full analysis"
                          onClick={() => openFullAnalysis(genesInRegion)}
                        >
                          view full analysis <i className="bi bi-box-arrow-up-right"></i>
                        </button>
                      </div>

                      {eState !== "ready" && (
                        <div className="small text-muted">Network will appear after enrichment is ready…</div>
                      )}
                      {eState === "ready" && eRows?.length > 0 && (
                        <NetworkMiniPaths rows={eRows} height={360} />
                      )}
                      {eState === "ready" && (!eRows || eRows.length === 0) && (
                        <div className="small text-muted">No enriched pathways to render.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Geometry helper
// ────────────────────────────────────────────────────────────
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export default GeneSelectionSummary;
