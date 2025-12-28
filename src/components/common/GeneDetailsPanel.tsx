import React, { CSSProperties, FC, PointerEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Point } from "../../types";
import { BeatLoader, ClipLoader } from "react-spinners";

/** Fallbacks (replace with your app constants/components later) */
const FONT_STACK = `'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
const TEXT_PRIMARY = "#0f172a";
const TEXT_SECONDARY = "#6b7280";
const DIVIDER_COLOR = "rgba(0,0,0,0.08)";
const HOVER_BG = "rgba(60,64,67,0.06)";

const RAIL_LEFT = 1;
const RAIL_W = 0;
const INFO_GAP = 0;
const INFO_W = 320;
const PANEL_PAD = 12;

const IconProtein = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "#6a1b9a" }}
    aria-hidden="true"
  >
    <path d="M6 2h12" />
    <path d="M8 2v6a4 4 0 0 0 8 0V2" />
    <path d="M7 20h10" />
    <path d="M10 14h4" />
  </svg>
);

const IconPathway = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "#1a73e8" }}
    aria-hidden="true"
  >
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="12" cy="18" r="2" />
    <path d="M8 6h8" />
    <path d="M6 8l5 8" />
    <path d="M18 8l-5 8" />
  </svg>
);

const IconTissue = (
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ color: "#2b8a3e" }} aria-hidden="true">
    <path d="M4 20c6-4 10-4 16 0" />
    <path d="M4 14c6-4 10-4 16 0" />
    <path d="M4 8c6-4 10-4 16 0" />
  </svg>
);

const IconVariants = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ color: "#d81b60" }} aria-hidden="true">
    <path d="M12 3v18" />
    <path d="M8 7l8 0" />
    <path d="M6 12l12 0" />
    <path d="M8 17l8 0" />
  </svg>
);


// inline divider
const Divider = () => <div style={{ height: 1, background: DIVIDER_COLOR, margin: "8px 0" }} />;

// GeneArt
const GeneArt = ({ gene }: { gene: string }) => (
  <div style={{ width: "100%", height: "100%", background: "linear-gradient(#1cbc0038, #e0f2fe, #e9d5ff)" }} aria-label={`${gene} art`} />
);

// text row with icon and link
type TextLinkRowProps = {
  href: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  title?: string;
};

/* -------------------- TopSearch -------------------- */
function TopSearch({
  genes,
  onSelect,
  onClear,
  recents: recentsProp = [],
}: {
  genes: string[];
  onSelect?: (gene: string) => void;   // called when a gene is chosen
  onClear?: () => void;
  recents?: string[];
}) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Search options
  type Mode = "contains" | "startsWith" | "exact";
  const [mode, setMode] = useState<Mode>("contains");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [limit, setLimit] = useState(12);
  const [showOptions, setShowOptions] = useState(false);

  // Keep some local recents if none provided
  const [recentsLocal, setRecentsLocal] = useState<string[]>([]);
  const recents = recentsProp.length ? recentsProp : recentsLocal;

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const normalize = useCallback(
    (s: string) => (caseSensitive ? s : s.toLowerCase()),
    [caseSensitive]
  );

  const matches = useCallback(
    (g: string, q: string) => {
      const G = normalize(g);
      const Q = normalize(q);
      if (!Q) return false;
      if (mode === "exact") return G === Q;
      if (mode === "startsWith") return G.startsWith(Q);
      return G.includes(Q); // contains
    },
    [mode, normalize]
  );

  const suggestions = React.useMemo(() => {
    const q = term.trim();
    if (!q) return [];
    const unique = Array.from(new Set(genes.filter(Boolean)));
    const filtered = unique.filter((g) => matches(g, q));
    return filtered.slice(0, limit);
  }, [genes, term, matches, limit]);

  const commit = (name: string) => {
    // update local recents
    setRecentsLocal((prev) => {
      const next = [name, ...prev.filter((x) => x !== name)];
      return next.slice(0, 8);
    });
    setOpen(false);
    setShowOptions(false);
    setTerm(name);
    onSelect?.(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions[active]) {
        commit(suggestions[active]);
      } else if (term.trim()) {
        // pick the best match given the mode
        const exact = suggestions.find((g) => matches(g, term.trim()));
        commit(exact ?? term.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setShowOptions(false);
    }
  };

  // Click outside to close
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ---- position constants preserved (unchanged) ----
  const columnLeft = RAIL_LEFT + RAIL_W + INFO_GAP;
  const contentLeft = columnLeft + PANEL_PAD;
  const contentWidth = INFO_W - 2 * PANEL_PAD;

  // highlight helper
  const Highlight = ({ text, query }: { text: string; query: string }) => {
    if (!query) return <>{text}</>;
    const G = caseSensitive ? text : text.toLowerCase();
    const Q = caseSensitive ? query : query.toLowerCase();
    const idx = mode === "exact" ? (G === Q ? 0 : -1)
      : mode === "startsWith" ? G.indexOf(Q) === 0 ? 0 : -1
        : G.indexOf(Q);
    if (idx < 0) return <>{text}</>;
    const before = text.slice(0, idx);
    const mid = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return (
      <>
        {before}
        <mark style={{ background: "rgba(255, 238, 88, 0.6)", padding: 0 }}>{mid}</mark>
        {after}
      </>
    );
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        top: 60,
        left: contentLeft,
        width: contentWidth,
        zIndex: 70,
      }}
    >
      {/* Search bar */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.98)",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 999,
          padding: "12px 90px 12px 44px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
        }}
      >
        {/* icon */}
        <div
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.85,
          }}
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="M20 20l-3-3" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search genes…"
          onFocus={() => setOpen(!!term || recents.length > 0)}
          style={{
            width: "100%",
            outline: "none",
            border: "none",
            background: "transparent",
            fontSize: 15,
            letterSpacing: 0.2,
          }}
          aria-label="Search genes"
        />

        {/* Clear */}
        {term ? (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              setOpen(false);
              onClear?.();
            }}
            title="Clear"
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: 44,
              top: "50%",
              transform: "translateY(-50%)",
              height: 28,
              width: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}


      </div>

      {/* Options popover */}
      {showOptions && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            width: 300,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            boxShadow: "0 16px 36px rgba(0,0,0,0.14)",
            padding: 10,
          }}
        >
          <div style={{ fontSize: 12, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6, fontWeight: 600 }}>
            Search options
          </div>

          <div style={{ display: "grid", rowGap: 8 }}>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Mode</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["contains", "startsWith", "exact"] as Mode[]).map((m) => (
                  <label key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 999, padding: "4px 10px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="search-mode"
                      value={m}
                      checked={mode === m}
                      onChange={() => setMode(m)}
                    />
                    <span style={{ fontSize: 13 }}>{m}</span>
                  </label>
                ))}
              </div>
            </div>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Case sensitive</span>
            </label>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13 }}>Max results</span>
                <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>{limit}</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Suggestions / Recents dropdown */}
      {(open && (suggestions.length > 0 || (!term && recents.length > 0))) && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            boxShadow: "0 16px 36px rgba(0,0,0,0.14)",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {/* Recents */}
          {!term && recents.length > 0 && (
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 11, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: 0.3, margin: "2px 0 6px 0", fontWeight: 600 }}>
                Recent
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {recents.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); commit(r); }}
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "#fff",
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    title={`Search ${r}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.map((name, i) => {
            const activeRow = i === active;
            return (
              <div
                key={name + i}
                role="option"
                aria-selected={activeRow}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); commit(name); }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: activeRow ? HOVER_BG : "transparent",
                  fontFamily: FONT_STACK,
                  fontSize: 14,
                }}
              >
                <Highlight text={name} query={term.trim()} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


const TextLinkRow: FC<TextLinkRowProps> = ({ href, icon, label, value, title }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    title={title}
    style={{
      display: "block",
      padding: "8px 10px",
      borderRadius: 10,
      color: TEXT_PRIMARY,
      textDecoration: "none",
      transition: "background 120ms ease",
      fontFamily: FONT_STACK,
      fontSize: 13,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = HOVER_BG)}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    onFocus={(e) => (e.currentTarget.style.background = HOVER_BG)}
    onBlur={(e) => (e.currentTarget.style.background = "transparent")}
  >
    <div style={{ display: "grid", gridTemplateColumns: "18px 1fr", columnGap: 8, alignItems: "start" }}>
      <div aria-hidden="true" style={{ lineHeight: 0 }}>{icon}</div>
      <div>
        <div
          style={{
            fontSize: 11,
            color: TEXT_SECONDARY,
            textTransform: "uppercase",
            letterSpacing: 0.3,
            marginBottom: 2,
            fontWeight: 600,    // lighter
          }}
        >
          {label}
        </div>
        <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{value}</div> {/* lighter */}
      </div>
    </div>
  </a>
);

/**  Component  */
type GeneDetailsPanelProps = {
  selectedGene: Point | null;
  allPoints: Point[];
  connected?: string[];
  onJumpTo?: (gene: string) => void;
  onClose?: () => void;
};

interface Pathways {
  kegg?: string[];
  reactome?: string[];
}

export interface GeneInfo {
  gene?: string;
  functionSummary?: string;
  protein?: string;
  pathways?: Pathways;
}

// Safe parser
export function parseGeneInfo(data: any): GeneInfo {
  try {
    if (typeof data === "string") data = JSON.parse(data);
  } catch (err) {
    console.error("Invalid JSON:", err);
    return {};
  }

  // Defensive parsing
  const geneInfo: GeneInfo = {
    gene: data?.gene ?? undefined,
    functionSummary: data?.functionSummary ?? undefined,
    protein: data?.protein ?? undefined,
    pathways: {
      kegg: data?.pathways?.kegg ?? [],
      reactome: data?.pathways?.reactome ?? []
    }
  };

  return geneInfo;
}

export default function GeneDetailsPanel({ selectedGene, allPoints, connected = [], onJumpTo, onClose }: GeneDetailsPanelProps) {
  const [tab, setTab] = useState("overview");
  const [hover, setHover] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true);

  const trackRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [geneInfo, setGeneInfo] = useState<GeneInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  // layout constants
  const getColumnMetricsSafe =
    typeof window !== "undefined" && typeof (window as any).getColumnMetrics === "function"
      ? (window as any).getColumnMetrics
      : () => {
        const left =
          (typeof RAIL_LEFT === "number" ? RAIL_LEFT : 0) +
          (typeof RAIL_W === "number" ? RAIL_W : 96) +
          (typeof INFO_GAP === "number" ? INFO_GAP : 0);
        const width = typeof INFO_W === "number" ? INFO_W : 360;
        const pad = typeof PANEL_PAD === "number" ? PANEL_PAD : 12;
        return {
          columnLeft: left,
          columnWidth: width,
          contentLeft: left + pad,
          contentWidth: width - 2 * pad,
          pad,
        };
      };
  const { columnLeft, columnWidth, pad, contentWidth } = getColumnMetricsSafe();

  // ── DRAGGING (Pointer events) with viewport clamp + edge snap
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: columnLeft, top: 0 });
  const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0, dragging: false });
  const EDGE_SNAP = 12;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  useEffect(() => {
    if (!selectedGene?.geneName) return;
    else {
      getGeneDetails();
    }
  }, [selectedGene?.geneName]);

  const getGeneDetails = async () => {
    console.log("genedetails called");
    // const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    // const apiKey = "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";
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) return;
    setIsLoading(true);

    const prompt = `
  Provide gene data for "${selectedGene?.geneName}" using this JSON structure:
  {
    "functionSummary": "",
    "protein": "",
    "pathways": { "kegg": [], "reactome": [] }
  }
  Return the result strictly in valid JSON.
  Make "functionSummary" a single concise sentence (no more than 20 words).
  The "pathways" fields should be arrays of short, tag-like names (1–2 words each), not long sentences or IDs.
  For example: ["cell cycle", "apoptosis", "DNA repair"].
  `;

    try {
      console.log("fetching details for gene:", selectedGene?.geneName);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are a bioinformatics assistant that outputs structured JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Gene details:", data);
        const content = data.choices[0]?.message?.content;
        const geneInfo = parseGeneInfo(content);
        setGeneInfo(geneInfo);
        console.log(geneInfo.gene ?? "Gene name missing");
        // if (content) setSummary(content.trim());
      }
    } catch (error) {
      console.error("Error getting details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // clamp position on resize
  useEffect(() => {
    const onResize = () => {
      const el = panelRef.current;
      if (!el) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      setPos((p) => ({
        left: clamp(p.left, 0, Math.max(0, vw - w)),
        top: clamp(p.top, 0, Math.max(0, vh - h)),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onDragStart = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button,a,[role='button']")) return;
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.startLeft = pos.left;
    dragRef.current.startTop = pos.top;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  const onDragMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging || !panelRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const el = panelRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxLeft = Math.max(0, vw - rect.width);
    const maxTop = Math.max(0, vh - rect.height);

    const left = clamp(dragRef.current.startLeft + dx, 0, maxLeft);
    const top = clamp(dragRef.current.startTop + dy, 0, maxTop);

    setPos({ left, top });
  };

  const onDragEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging || !panelRef.current) return;
    dragRef.current.dragging = false;

    const el = panelRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let { left, top } = pos;
    // Snap to edges if within EDGE_SNAP
    if (left <= EDGE_SNAP) left = 0;
    else if (vw - (left + rect.width) <= EDGE_SNAP) left = vw - rect.width;

    if (top <= EDGE_SNAP) top = 0;
    else if (vh - (top + rect.height) <= EDGE_SNAP) top = vh - rect.height;

    setPos({ left, top });

    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    try { (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); } catch { }
  };

  // carousel arrows logic
  const updateArrows = useCallback(() => {
    const el = trackRef.current; if (!el) return;
    const sl = el.scrollLeft; const max = el.scrollWidth - el.clientWidth;
    setCanLeft(sl > 2); setCanRight(sl < max - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current; if (!el) return;
    const onScroll = () => updateArrows(); el.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => updateArrows(); window.addEventListener("resize", onResize);
    return () => { el.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, [updateArrows, contentWidth, connected?.length]);

  if (!selectedGene) return null;

  // carousel sizing
  const GAP = 8;
  const VISIBLE = 5;
  const tileW = Math.max(96, Math.floor((contentWidth - GAP * (VISIBLE - 1)) / VISIBLE));
  const tileH = 84;

  type GeneTileProps = { name: string; onClick: () => void };
  const GeneTile = ({ name, onClick }: GeneTileProps) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      title={`Jump to ${name}`}
      style={{
        flex: `0 0 ${tileW}px`,
        width: tileW,
        height: tileH,
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.10)",
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        transition: "transform 120ms ease, box-shadow 150ms ease",
        background: "transparent",
        fontSize: 11,
        fontWeight: 700,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 10px 26px rgba(0,0,0,0.18)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ position: "absolute", inset: 0 }}><GeneArt gene={name} /></div>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "linear-gradient(to top, rgba(0,0,0,0.68), rgba(0,0,0,0.0))" }} />
      <div style={{ position: "absolute", left: 10, right: 10, bottom: 8, color: "#fff", fontWeight: 800, fontSize: 13, lineHeight: 1.15, textShadow: "0 1px 2px rgba(0,0,0,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: FONT_STACK }}>
        {name}
      </div>
    </div>
  );

  const scrollByTiles = (n: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: (tileW + GAP) * n, behavior: "smooth" });
  };
  const arrowBtnStyle = (enabled: boolean) => ({
    position: "absolute" as const, top: "50%", transform: "translateY(-50%)",
    height: 32, width: 32, display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: "999px", border: "1px solid rgba(0,0,0,0.12)",
    background: enabled ? "rgba(60,64,67,0.86)" : "rgba(95,99,104,0.4)",
    color: "#fff", cursor: enabled ? "pointer" : "not-allowed",
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)", zIndex: 2, pointerEvents: (enabled ? "auto" : "none") as CSSProperties["pointerEvents"],
  });

  // header external icon
  const ExternalIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 3h7v7" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 14L21 3" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 14v7h-7" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 10L14 21" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  // deterministic faux data
  const h32 = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619; return h >>> 0; };
  const pick = (arr: string | any[], n = 1) => { const out = []; const seed = h32(selectedGene.geneName); let i = 0; while (out.length < Math.min(n, arr.length)) { out.push(arr[(seed + i * 13) % arr.length]); i++; } return out; };

  // external links
  const uniprotUrl = `https://www.uniprot.org/uniprotkb?query=gene:${encodeURIComponent(selectedGene.geneName)}`;
  const reactomeUrl = `https://reactome.org/content/query?q=${encodeURIComponent(selectedGene.geneName)}`;
  const keggUrl = `https://www.kegg.jp/dbget-bin/www_bfind_sub?dbkey=hsa&keywords=${encodeURIComponent(selectedGene.geneName)}`;
  const gtexUrl = `https://gtexportal.org/home/searchGene?page=1&searchTerm=${encodeURIComponent(selectedGene.geneName)}`;
  const hpaUrl = `https://www.proteinatlas.org/search/${encodeURIComponent(selectedGene.geneName)}`;
  const atlasUrl = `https://www.ebi.ac.uk/gxa/search?geneQuery=${encodeURIComponent(selectedGene.geneName)}`;
  const clinvarUrl = `https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(selectedGene.geneName)}[gene]`;
  const dbsnpUrl = `https://www.ncbi.nlm.nih.gov/snp/?term=${encodeURIComponent(selectedGene.geneName)}%5Bgene%5D`;
  const cbioUrl = `https://www.cbioportal.org/results/mutations?gene_list=${encodeURIComponent(selectedGene.geneName)}`;
  const cosmicUrl = `https://cancer.sanger.ac.uk/cosmic/search?genename=${encodeURIComponent(selectedGene.geneName)}`;
  const amigoUrl = `https://amigo.geneontology.org/amigo/search/annotation?q=${encodeURIComponent(selectedGene.geneName)}`;
  const ensemblUrl = `https://www.ensembl.org/Multi/Search/Results?q=${encodeURIComponent(selectedGene.geneName)}`;

  return (
    <aside
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: columnWidth,
        height: isMaximized ? "100vh" : "auto",
        maxHeight: isMaximized ? "100vh" : "35vh",
        zIndex: 9999,
        background: "rgba(255,255,255,0.98)",
        color: TEXT_PRIMARY,
        border: `1px solid ${DIVIDER_COLOR}`,
        // borderLeft: "none",
        // borderTopRightRadius: 12,
        // borderBottomRightRadius: 12,
        borderRadius: 12,
        boxShadow: "0 16px 36px rgba(0,0,0,0.14)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: FONT_STACK,
        fontSize: 13,
        transition: "height 0.25s ease, max-height 0.25s ease",
      }}
    >
      {/*  Header (drag handle + buttons)  */}
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: dragRef.current.dragging ? "grabbing" : "grab",
          padding: "8px 10px",
          background: "rgb(30 107 55 / 62%) ",
          borderBottom: `1px solid ${DIVIDER_COLOR}`,
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>

        </div>

        {/* <TopSearch selected={""} genes={[]}
        /> */}
        <TopSearch
          genes={Array.from(new Set(allPoints.map((p) => p.geneName).filter(Boolean)))}
          onSelect={(geneName) => onJumpTo?.(geneName)}   // selects → focus/zoom via parent handler
          onClear={() => {/* optional: clear actions */ }}
        />


        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            title={isMaximized ? "Minimize" : "Maximize"}
            // onClick={() => setIsMaximized((v) => !v)}
            onClick={() => {
              setIsMaximized((prev) => {
                const next = !prev;
                if (next) {
                  // when expanding, snap to top and allow full viewport height
                  setPos((p) => ({ ...p, top: 0 }));
                }
                return next;
              });
            }}
            style={{
              border: `1px solid ${DIVIDER_COLOR}`,
              background: "#fff",
              borderRadius: 6,
              width: 26,
              height: 26,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {isMaximized ? "⤢" : "⤡"}
          </button>
          <button
            title="Close"
            onClick={onClose}
            style={{
              border: `1px solid ${DIVIDER_COLOR}`,
              background: "#fff",
              borderRadius: 6,
              width: 26,
              height: 26,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* header art */}
      <div style={{ position: "relative", height: "10vh", minHeight: 60, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, filter: "saturate(1.35) contrast(1.08)" }}>
          <GeneArt gene={selectedGene.geneName} />
        </div>
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(255,255,255,0) 30%, rgba(255,255,255,0.9) 70%, #ffffff 100%)"
        }} />

      </div>

      {/* content */}
      <div style={{ padding: PANEL_PAD, display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto" }}>
        {/* title & metrics */}
        <section style={{ padding: 0, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700, fontSize: 16, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis", color: TEXT_PRIMARY, fontFamily: FONT_STACK,
                }}
                title={selectedGene.geneName}
              >
                {selectedGene.geneName}
              </div>

              <a
                href={`https://www.ncbi.nlm.nih.gov/gene/?term=${selectedGene.geneName}`}
                target="_blank"
                rel="noreferrer"
                aria-label="View on NCBI"
                title="View on NCBI"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  height: 28, width: 28, lineHeight: 0, borderRadius: 8,
                  border: `1px solid ${DIVIDER_COLOR}`, background: "#fff", color: "#1a73e8", textDecoration: "none", cursor: "pointer",
                }}
              >
                {ExternalIcon}
              </a>
            </div>
          </div>

          <div style={{ fontFamily: FONT_STACK, fontSize: 13, color: TEXT_SECONDARY }}>
            <strong style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>ID:</strong>{" "}
            {selectedGene.geneId || "N/A"}
            <span style={{ margin: "0 6px", color: "rgba(0,0,0,0.18)" }}>•</span>
            <strong style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>Value:</strong>{" "}
            {selectedGene.value.toFixed(2)}
          </div>

          <div style={{ lineHeight: 1.45 }}>
            <strong style={{ fontWeight: 600 }}>Function summary:</strong>{" "}
            {isLoading ? (
              <BeatLoader color="green" size={8} />
            ) : (
              (geneInfo?.functionSummary || "Not available")
            )}
          </div>
        </section>

        {/* When minimized: stop here (header + metrics + function summary). */}
        {!isMaximized ? null : (
          <>
            {/* <Divider /> */}

            {/* Tabs */}
            <div style={{ marginTop: 6 }}>
              <nav aria-label="Gene info tabs"
                style={{ display: "inline-flex", gap: 6, borderRadius: 999, padding: 3, background: "#fff", fontFamily: FONT_STACK, fontSize: 13 }}>
                <button
                  type="button"
                  onClick={() => setTab("overview")}
                  style={{
                    padding: "6px 12px", border: 0, borderRadius: 999, cursor: "pointer",
                    background: tab === "overview" ? "#e8f0fe" : "transparent",
                    color: tab === "overview" ? "#1a73e8" : TEXT_PRIMARY, fontWeight: 600,
                  }}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setTab("details")}
                  style={{
                    padding: "6px 12px", border: 0, borderRadius: 999, cursor: "pointer",
                    background: tab === "details" ? "#e8f0fe" : "transparent",
                    color: tab === "details" ? "#1a73e8" : TEXT_PRIMARY, fontWeight: 600,
                  }}
                >
                  Details
                </button>
              </nav>

              <div style={{ height: 1, background: DIVIDER_COLOR, margin: "8px 0" }} />

              {/* OVERVIEW */}
              {tab === "overview" ? (
                <div role="tabpanel" aria-labelledby="tab-overview"
                  style={{ display: "grid", gap: 8, fontFamily: FONT_STACK, fontSize: 13, color: TEXT_PRIMARY }}>
                  {/* Protein product */}
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600, marginTop: 2 }}>
                    Protein product (UniProt)
                  </div>
                  <TextLinkRow
                    href={uniprotUrl}
                    icon={IconProtein}
                    label="Protein"

                    value={isLoading ? (
                      <BeatLoader color="green" size={8} />
                    ) : (
                      (geneInfo?.protein || "Not available")
                    )}
                    title="Open UniProt"
                  />

                  {/* Pathways */}
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600, marginTop: 2 }}>
                    Pathways
                  </div>
                  <TextLinkRow
                    href={keggUrl}
                    icon={IconPathway}
                    label="KEGG"
                    // value={(keggList || []).join(", ")}
                    // value={(geneInfo?.pathways?.kegg || []).join(", ")}
                    value={isLoading ? (
                      <BeatLoader color="green" size={8} />
                    ) : (
                      (geneInfo?.pathways?.kegg || []).join(", ")
                    )}
                    title={`Search KEGG for ${selectedGene.geneName}`}
                  />

                  <TextLinkRow
                    href={reactomeUrl}
                    icon={IconPathway}
                    label="Reactome"
                    // value={(geneInfo?.pathways?.reactome || []).join(", ")}
                    value={isLoading ? (
                      <BeatLoader color="green" size={8} />
                    ) : (
                      (geneInfo?.pathways?.reactome || []).join(", ")
                    )}
                    title={`Search Reactome for ${selectedGene.geneName}`}
                  />

                  {/* Related genes */}
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600, marginTop: 2 }}>
                    Related genes ({connected.length})
                  </div>
                  <div style={{ overflow: "auto" }}>
                    {connected.length === 0 ? (
                      <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>No related genes.</div>
                    ) : (
                      <div style={{ position: "relative" }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                        <div
                          ref={trackRef}
                          style={{
                            overflowX: "auto", overflowY: "hidden",
                            display: "flex", gap: GAP, paddingBottom: 2,
                            scrollBehavior: "smooth", scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch"
                          }}
                          onScroll={updateArrows}
                        >
                          {connected.map((name) => (
                            <div key={name} style={{ scrollSnapAlign: "start" }}>
                              <GeneTile name={name} onClick={() => onJumpTo && onJumpTo(name)} />
                            </div>
                          ))}
                        </div>

                        {hover && canLeft && (
                          <button type="button" onClick={() => scrollByTiles(-1)} title="Previous" aria-label="Previous" style={{ ...arrowBtnStyle(true), left: 4 } as CSSProperties}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        )}
                        {hover && canRight && (
                          <button type="button" onClick={() => scrollByTiles(1)} title="Next" aria-label="Next" style={{ ...arrowBtnStyle(true), right: 4 } as CSSProperties}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 6l6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tissue-specific expression */}
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600, marginTop: 2 }}>
                    Tissue-specific expression
                  </div>
                  <TextLinkRow
                    href={gtexUrl}
                    icon={IconTissue}
                    label="GTEx"
                    value="Expression across tissues (GTEx)"
                    title={`Open GTEx for ${selectedGene.geneName}`}
                  />
                  <TextLinkRow
                    href={hpaUrl}
                    icon={IconTissue}
                    label="Human Protein Atlas"
                    value="Tissue/Cell type expression (HPA)"
                    title={`Open HPA for ${selectedGene.geneName}`}
                  />

                  {/* Variants / SNPs */}
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600, marginTop: 2 }}>
                    Variants / SNPs
                  </div>
                  <TextLinkRow
                    href={clinvarUrl}
                    icon={IconVariants}
                    label="ClinVar"
                    value="Clinically significant variants"
                    title={`Open ClinVar for ${selectedGene.geneName}`}
                  />
                  <TextLinkRow
                    href={dbsnpUrl}
                    icon={IconVariants}
                    label="dbSNP"
                    value="Known polymorphisms (dbSNP)"
                    title={`Open dbSNP for ${selectedGene.geneName}`}
                  />
                </div>
              ) : (
                // DETAILS
                <div role="tabpanel" aria-labelledby="tab-details"
                  style={{ display: "grid", gap: 8, fontFamily: FONT_STACK, fontSize: 13, color: TEXT_PRIMARY }}>
                  {/* Expression under conditions */}
                  Dtails content coming soon...
                </div>
              )}
            </div>

            {/* <Divider /> */}
          </>
        )}
      </div>
    </aside>
  );
}
