import React, { useState, useEffect, useMemo } from "react";
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
import { motion, Reorder, AnimatePresence } from "framer-motion";
import {
    Dna,
    GitBranch,
    Share2,
    Trash2,
    CheckCircle2,
    Circle,
    Database,
    Clock,
    LayoutPanelLeft,
    AlertCircle,
    Layout,
    Settings,
    Grid,
    Table,
    Filter,
    BarChart2,
    Activity,
    Maximize2,
    ChevronDown,
    LayoutDashboard
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";

// ────────────────────────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────────────────────────
const ENRICHR_BASE = "https://maayanlab.cloud/Enrichr";
const ENRICHR_LIBRARY = "GO_Biological_Process_2023";

type EnrichrRow = {
    category: string;
    fold: number;
    fdr: number;
    genes: number;
    overlapGenes: string[];
};

interface SelectionData {
    genes: string[];
    datasetId?: string;
    regionLabel: string;
    at: number;
}

// ────────────────────────────────────────────────────────────
// Utilities (Copied from LassoRegionPanel.tsx to ensure same behavior)
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
    const addJson = await addRes.json();
    const userListId = addJson.userListId;

    const enrRes = await fetch(
        `${ENRICHR_BASE}/enrich?userListId=${userListId}&backgroundType=${encodeURIComponent(library)}`
    );
    const enrJson = await enrRes.json();
    const table: any[] = enrJson[library] || [];

    const parsed: EnrichrRow[] = table.map((r: any[]) => {
        const term = String(r?.[1] ?? "");
        const combined = Number(r?.[4] ?? 0);
        const overlapRaw = r?.[5];
        const adjP = Number(r?.[6] ?? 1);

        const overlapArr = Array.isArray(overlapRaw)
            ? overlapRaw.filter(Boolean)
            : typeof overlapRaw === "string"
                ? overlapRaw.split(/[;,\s/]+/).filter(Boolean)
                : [];

        const fdrNegLog10 = adjP > 0 ? +(-Math.log10(adjP)).toFixed(2) : 0;
        return {
            category: term,
            fold: Math.round(combined),
            fdr: fdrNegLog10,
            genes: overlapArr.length,
            overlapGenes: overlapArr as string[],
        };
    });

    parsed.sort((a, b) => b.fold - a.fold || a.category.localeCompare(b.category));
    return parsed;
}

// ────────────────────────────────────────────────────────────
// Reused Mini Components from LassoRegionPanel.tsx
// ────────────────────────────────────────────────────────────

// 1. Genes Bar Chart Component (Internal logic from RegionCard)
const GenesMini = ({ genes }: { genes: string[] }) => {
    // Mock values if they aren't available in simplified selection data
    // In a real scenario, we'd pass the full Point objects
    const items = genes.map(g => ({ geneName: g, value: Math.random() * 8 - 4 }));
    const sortedItems = [...items].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const MAX_ABS = 4;
    const EPS = 0.05;
    const clampV = (v: number) => Math.max(-MAX_ABS, Math.min(MAX_ABS, v));
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const toPct = (v: number) => ((clampV(v) + MAX_ABS) / (2 * MAX_ABS)) * 100;

    return (
        <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 6 }}>
            {sortedItems.map((gene, i) => {
                const v = gene.value;
                const ratio = clamp01(Math.abs(v) / MAX_ABS);
                const isPositive = v >= 0;
                const negWidthPct = isPositive ? 0 : Math.round(ratio * 100);
                const posWidthPct = isPositive ? Math.round(ratio * 100) : 0;
                const color = isPositive ? "#d13a3aff" : "#3182CE";

                return (
                    <div key={i} style={{ paddingBottom: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10, alignItems: "start" }}>
                            <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#333", fontWeight: 600, fontSize: "12px" }} title={gene.geneName}>
                                {gene.geneName}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ position: "relative", height: 12, background: "#F1F5F9", borderRadius: 6, overflow: "hidden", border: "1px solid #E2E8F0", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                                    <div aria-hidden style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#CBD5E1", zIndex: 2 }} />
                                    <div style={{ position: "relative" }}><div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${negWidthPct}%`, background: "#3182CE", zIndex: 1 }} /></div>
                                    <div style={{ position: "relative" }}><div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${posWidthPct}%`, background: "#d13a3aff", zIndex: 1 }} /></div>
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, fontSize: "11px" }}>
                                    <div style={{ color }}>{v.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// 2. Lollipop Mini (Original implementation)
function LollipopMini({ data }: { data: EnrichrRow[] }) {
    const sorted = [...data].sort((a, b) => (b.fold ?? 0) - (a.fold ?? 0));
    const rows = sorted.slice(0, 10);
    const maxX = Math.max(1, ...rows.map(r => r.fold ?? 0));
    const scaledMax = Math.ceil((maxX * 1.1) / 10) * 10;
    const domain: [number, number] = [0, scaledMax];
    const maxGenes = Math.max(1, ...rows.map(r => r.genes ?? 0));

    return (
        <div style={{ width: "100%", height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" domain={domain} tick={{ fill: "#4a5568", fontSize: 11 }} />
                    <YAxis dataKey="category" type="category" width={140} tick={{ fill: "#2d3748", fontSize: 10 }} tickFormatter={(val) => cleanDescription(val).substring(0, 20) + "..."} />
                    <Bar dataKey="fold" barSize={8} radius={[2, 2, 2, 2]}>
                        {rows.map((d, i) => <Cell key={`stem-${i}`} fill={colorScale(d.fdr, "fdr")} />)}
                    </Bar>
                    <Scatter dataKey="fold" shape={(props: any) => {
                        const { cx, cy, payload } = props;
                        const r = 4 + (payload.genes / maxGenes) * 8;
                        return <circle cx={cx} cy={cy} r={r} fill={colorScale(payload.fdr, "fdr")} />;
                    }} />
                    <ReTooltip />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

// 3. Network Mini (Original implementation)
function NetworkMiniPaths({ rows }: { rows: EnrichrRow[] }) {
    const wrapRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!wrapRef.current || !rows.length) return;
        const items = rows.slice(0, 10);
        const nodes = new DataSet(items.map((r, i) => ({
            id: i + 1,
            label: wrapLabel(cleanDescription(r.category)),
            shape: "dot",
            size: 15 + (r.genes / Math.max(1, ...items.map(d => d.genes))) * 20,
            color: colorScale(r.fdr, "fdr"),
            font: { size: 10, face: "Inter" },
        })));
        const edgesArr: any[] = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const c = intersectCount(items[i].overlapGenes, items[j].overlapGenes);
                if (c > 0) edgesArr.push({ from: i + 1, to: j + 1, width: 1 + Math.log2(1 + c), color: "#ddd" });
            }
        }
        const network = new Network(wrapRef.current, { nodes, edges: new DataSet(edgesArr) }, {
            physics: { solver: "forceAtlas2Based" },
            interaction: { zoomView: true, dragView: true }
        });
        return () => network.destroy();
    }, [rows]);
    return <div ref={wrapRef} style={{ width: "100%", height: 400 }} />;
}

// ────────────────────────────────────────────────────────────
// Layout Components
// ────────────────────────────────────────────────────────────

const Sidebar = ({ activeCards, toggleCard }: { activeCards: string[], toggleCard: (id: string) => void }) => {
    return (
        <div className="bg-white border-end vh-100 sticky-top" style={{ width: "240px", zIndex: 1000 }}>
            <div className="p-4 border-bottom">
                <div className="d-flex align-items-center mb-0">
                    {/* <LayoutDashboard className="text-primary me-2" size={24} /> */}
                    <h5 className="mb-0 fw-bold">Summary</h5>
                </div>
            </div>

            <div className="p-3">
                <div className="mb-4">
                    <p className="text-uppercase text-muted fw-bold small mb-2 px-2">Setup</p>
                    <div className="list-group list-group-flush">
                        <button className="list-group-item list-group-item-action border-0 rounded px-2 py-2 d-flex align-items-center">
                            <Grid size={18} className="me-2 text-muted" /> Layout
                        </button>
                        <button className="list-group-item list-group-item-action border-0 rounded px-2 py-2 d-flex align-items-center">
                            <Settings size={18} className="me-2 text-muted" /> Theme
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-uppercase text-muted fw-bold small mb-2 px-2">Components</p>
                    <div className="list-group list-group-flush">
                        <button className="list-group-item list-group-item-action border-0 rounded px-2 py-2 d-flex align-items-center">
                            <Filter size={18} className="me-2 text-muted" /> Filter Component
                        </button>
                        <button className="list-group-item list-group-item-action border-0 rounded px-2 py-2 d-flex align-items-center">
                            <Database size={18} className="me-2 text-muted" /> Data Cards
                        </button>
                        <button className="list-group-item list-group-item-action border-0 rounded px-2 py-2 d-flex align-items-center">
                            <Table size={18} className="me-2 text-muted" /> Data Table
                        </button>
                    </div>
                </div>

                <div>
                    <div className="d-flex justify-content-between align-items-center px-2 mb-2">
                        <p className="text-uppercase text-muted fw-bold small mb-0">Charts</p>
                        <button className="btn btn-link p-0 text-primary small">+ Add</button>
                    </div>
                    <div className="list-group list-group-flush">
                        {[
                            { id: "genes", label: "Gene Activity", icon: Activity, color: "text-danger" },
                            { id: "pathways", label: "Pathways Distribution", icon: BarChart2, color: "text-success" },
                            { id: "network", label: "Interaction Network", icon: Share2, color: "text-info" },
                        ].map((card) => (
                            <button
                                key={card.id}
                                className={`list-group-item list-group-item-action border-0 rounded px-2 py-2 d-flex align-items-center justify-content-between ${activeCards.includes(card.id) ? "bg-light text-primary fw-bold" : "text-muted"
                                    }`}
                                onClick={() => toggleCard(card.id)}
                            >
                                <div className="d-flex align-items-center overflow-hidden">
                                    <card.icon size={18} className={`me-2 flex-shrink-0 ${activeCards.includes(card.id) ? "text-primary" : "text-muted"}`} />
                                    <span className="text-truncate">{card.label}</span>
                                </div>
                                {activeCards.includes(card.id) && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--bs-primary)" }}></div>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, subtext }: { label: string, value: string | number, subtext?: string }) => (
    <div className="col">
        <div className="card border-0 shadow-sm p-4 h-100">
            <div className="d-flex justify-content-between align-items-start mb-3">
                <h3 className="fw-bold mb-0">{value}</h3>
                <div className="bg-primary opacity-75 rounded" style={{ width: 40, height: 60 }}></div>
            </div>
            <p className="text-muted small mb-0 text-nowrap">{label}</p>
            {subtext && <p className="text-primary fw-bold small mb-0">{subtext}</p>}
        </div>
    </div>
);

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────
export default function SelectionSummaryPage() {
    const [data, setData] = useState<SelectionData | null>(null);
    const [enrichRows, setEnrichRows] = useState<EnrichrRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCards, setActiveCards] = useState(["genes", "pathways", "network"]);

    useEffect(() => {
        const raw = localStorage.getItem("SELECTION_SUMMARY_DATA");
        if (raw) {
            const parsed = JSON.parse(raw) as SelectionData;
            setData(parsed);
            runEnrichr(parsed.genes)
                .then(setEnrichRows)
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const toggleCard = (id: string) => {
        setActiveCards(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    if (isLoading) return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
        </div>
    );

    if (!data) return (
        <div className="container mt-5 py-5 text-center">
            <div className="card shadow-sm p-5 border-0 bg-white">
                <AlertCircle className="text-warning mb-4 mx-auto" size={80} />
                <h2 className="fw-bold">No selection data found</h2>
                <p className="text-muted">Please select a region in GeneTerrain and click "Summary".</p>
            </div>
        </div>
    );

    return (
        <div className="d-flex bg-light min-vh-100" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sidebar activeCards={activeCards} toggleCard={toggleCard} />

            <div className="flex-grow-1 p-5 overflow-auto">
                {/* Header Stats */}
                <div className="mb-4 d-flex justify-content-between align-items-center">
                    <h5 className="text-muted fw-bold mb-0">{data.genes.length} / {data.genes.length} rows</h5>
                </div>

                <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-4 mb-5">
                    <StatCard label="Total Genes" value={data.genes.length} />
                    <StatCard label="Average Value" value="0.75" />
                    <StatCard label="Pathways" value={enrichRows.length} />
                    <StatCard label="Unique Arrays" value="10" />
                    <StatCard label="Avg Protein Signal" value="142.3" />
                </div>

                {/* Draggable Grid */}
                <Reorder.Group axis="y" values={activeCards} onReorder={setActiveCards} className="p-0 row row-cols-1 row-cols-lg-2 g-4">
                    <AnimatePresence>
                        {activeCards.map((cardId) => (
                            <div key={cardId} className="col">
                                <Reorder.Item
                                    value={cardId}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ listStyle: "none", cursor: "grab" }}
                                    whileDrag={{ scale: 1.02, zIndex: 1000 }}
                                >
                                    <div className="card border-0 shadow-sm h-100 overflow-hidden">
                                        <div className="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                                            <h6 className="fw-bold mb-0">
                                                {cardId === "genes" && "Genes"}
                                                {cardId === "pathways" && "Drug Treatment Response Comparison"}
                                                {cardId === "network" && "Interaction Network"}
                                            </h6>
                                            <div className="d-flex gap-2">
                                                <button className="btn btn-link p-0 text-muted"><Maximize2 size={16} /></button>
                                                <button className="btn btn-link p-0 text-danger" onClick={() => toggleCard(cardId)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="card-body p-4 pt-0">
                                            {cardId === "genes" && (
                                                <>
                                                    <div className="d-flex justify-content-between mb-4 mt-2">
                                                        <div className="small">
                                                            <label className="text-muted d-block small fw-bold">Selection:</label>
                                                            <select className="form-select form-select-sm" style={{ width: 140 }}><option>All Genes</option></select>
                                                        </div>
                                                        {/* <div className="small">
                                                            <label className="text-muted d-block small fw-bold">Normalize by:</label>
                                                            <div className="form-check"><input className="form-check-input" type="checkbox" /><label className="form-check-label small">Exposure Time</label></div>
                                                        </div> */}
                                                    </div>
                                                    <GenesMini genes={data.genes} />
                                                </>
                                            )}
                                            {cardId === "pathways" && <LollipopMini data={enrichRows} />}
                                            {cardId === "network" && <NetworkMiniPaths rows={enrichRows} />}
                                        </div>
                                    </div>
                                </Reorder.Item>
                            </div>
                        ))}
                    </AnimatePresence>
                </Reorder.Group>
            </div>
        </div>
    );
}
