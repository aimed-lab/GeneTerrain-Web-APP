import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    Box,
    Flex,
    Text,
    Heading,
    Button,
    HStack,
    VStack,
    Badge,
    IconButton,
    Icon,
    Divider,
    useTheme,
    ButtonGroup,
    Center,
    Switch,
    FormControl,
    FormLabel,
    SimpleGrid,
    Card,
    CardBody,
    CardHeader,
    Spinner,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Select,
    Checkbox,
    AccordionItem,
    Accordion,
    AccordionPanel,
    AccordionButton,
    AccordionIcon,
} from "@chakra-ui/react";
import { MdClose, MdCenterFocusStrong, MdShowChart } from "react-icons/md";
import { ZoomIn, ZoomOut, Layers, Lasso, Activity, BarChart2, Share2, Dna, AlertCircle, Download, FileText, FileCode, Trash2, GripVertical, Box as BoxIcon, List as ListIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    ComposedChart,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Bar,
    Scatter,
    ResponsiveContainer,
    Cell,
    Tooltip as ReTooltip,
    ReferenceLine,
    Legend,
    LabelList,
} from "recharts";
import { DataSet, Network } from "vis-network/standalone";
import { Point, ViewportState } from "../GaussianPlots/types";
import { Sample } from "../types";
import { vertexShader, fragmentShader, discreteFragmentShader, waterFragmentShader, skyFragmentShader } from "../shaders/gaussian";
import { normalizePoints } from "../GaussianPlots/GaussianMap";
import { getSigmaForZoom, isPointInPolygon } from "../GaussianPlots/utils";
import AnalyticsDashboard from "../components/analytics/AnalyticsDashboard";
import DemaNetworkPanel from "../components/visualization/DemaNetworkPanel";
import { processJSONData } from "../components/analytics/utils";

// Lazy load Plotly using standard React.lazy
const Plot = React.lazy(() => import('react-plotly.js'));
const PlotlySuspense = ({ children }: { children: React.ReactNode }) => (
    <React.Suspense fallback={<Center p={10}><Spinner /></Center>}>
        {children}
    </React.Suspense>
);

// Types
interface LassoData {
    label: string;
    sampleIds: string[];
    points: Point[];
    samples?: Sample[]; // Optional for backwards compatibility
}

type LayerType = "gaussian" | "discrete" | "water" | "sky";

type EnrichrRow = {
    category: string;
    fold: number;
    fdr: number;
    genes: number;
    overlapGenes: string[];
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const ENRICHR_BASE = "https://maayanlab.cloud/Enrichr";
const ENRICHR_LIBRARY = "GO_Biological_Process_2023";

const defaultViewport: ViewportState = {
    scale: 2.5,
    offset: { x: CANVAS_WIDTH / 2 - (CANVAS_WIDTH * 2.5) / 2, y: CANVAS_HEIGHT / 2 - (CANVAS_HEIGHT * 2.5) / 2 },
    dragging: false,
    lastMousePos: null,
};

// Utils
const hexToRgbArray = (hex: string): number[] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
};

const loadShader = (gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

// --- Summary Utils ---
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

// ─── Statistical Utilities ────────────────────────────────────────────────────

/** Regularised incomplete beta via Lentz continued-fraction. Used for t-dist CDF. */
function betaIncomplete(a: number, b: number, x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    function lgamma(z: number): number {
        const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
            -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
        let y = z, tmp = z + 5.5;
        tmp -= (z + 0.5) * Math.log(tmp);
        let ser = 1.000000000190015;
        for (let j = 0; j < 6; j++) ser += c[j] / ++y;
        return -tmp + Math.log(2.5066282746310005 * ser / z);
    }
    const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c2 = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
        const m2 = 2 * m;
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
        c2 = 1 + aa / c2; if (Math.abs(c2) < FPMIN) c2 = FPMIN;
        d = 1 / d; h *= d * c2;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
        c2 = 1 + aa / c2; if (Math.abs(c2) < FPMIN) c2 = FPMIN;
        d = 1 / d;
        const del = d * c2;
        h *= del;
        if (Math.abs(del - 1) < EPS) break;
    }
    return Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) +
        a * Math.log(x) + b * Math.log(1 - x)) * h / a;
}

/**
 * Two-tailed Welch's t-test p-value.
 * x1/x2 = group means, std1/std2 = group std-devs, n1/n2 = group sizes.
 */
function welchPValue(
    x1: number, x2: number,
    std1: number, std2: number,
    n1: number, n2: number,
): number {
    const se2a = (std1 * std1) / n1;
    const se2b = (std2 * std2) / n2;
    const se = Math.sqrt(se2a + se2b);
    if (se === 0) return 1;
    const df = Math.pow(se2a + se2b, 2) /
        (Math.pow(se2a, 2) / (n1 - 1) + Math.pow(se2b, 2) / (n2 - 1));
    if (!isFinite(df) || df < 1) return 1;
    const t = Math.abs(x1 - x2) / se;
    const xBeta = df / (df + t * t);
    return Math.min(1, Math.max(0, betaIncomplete(df / 2, 0.5, xBeta)));
}

/**
 * Compute per-gene Welch p-values.
 * Uses the std-dev across all genes in each lasso selection as within-group variance.
 */
/**
 * Compute per-gene Welch p-values.
 * Now uses the actual per-sample values (sampleValues) for each gene if available.
 */
function computeGenePValues(leftGenes: Point[], rightGenes: Point[]): Map<string, number> {
    const pMap = new Map<string, number>();
    const allNames = Array.from(new Set([
        ...leftGenes.map((g) => g.geneName),
        ...rightGenes.map((g) => g.geneName),
    ]));

    const getStats = (gene?: Point) => {
        const vals = gene?.sampleValues || (gene ? [gene.value] : []);
        const n = vals.length;
        if (n < 2) return { mu: gene?.value ?? 0, std: 0, n: Math.max(1, n) };
        const mu = vals.reduce((a, b) => a + b, 0) / n;
        const std = Math.sqrt(vals.reduce((a, b) => a + (b - mu) ** 2, 0) / (n - 1));
        return { mu, std, n };
    };

    const leftRef = new Map(leftGenes.map(g => [g.geneName, g]));
    const rightRef = new Map(rightGenes.map(g => [g.geneName, g]));

    for (const name of allNames) {
        const s1 = getStats(leftRef.get(name));
        const s2 = getStats(rightRef.get(name));
        pMap.set(name, welchPValue(s1.mu, s2.mu, s1.std, s2.std, s1.n, s2.n));
    }
    return pMap;
}

// ─── Gene Bar Chart ────────────────────────────────────────────────────


/**
 * GeneBarChart – grouped horizontal bar chart with significance stars.
 * Every gene row gets TWO side-by-side bars:
 *   • Cohort 1 (left)  → blue  (#3182CE)
 *   • Cohort 2 (right) → orange (#ED8936)
 * Stars appended after the bar: ★ p < 0.05, ★★ p < 0.01.
 */
function GeneBarChart({
    leftGenes,
    rightGenes,
    isSynced,
}: {
    leftGenes: Point[];
    rightGenes: Point[];
    isSynced: boolean;
}) {
    const leftMap = useMemo(
        () => new Map(leftGenes.map((g) => [g.geneName, g.value])),
        [leftGenes]
    );
    const rightMap = useMemo(
        () => new Map(rightGenes.map((g) => [g.geneName, g.value])),
        [rightGenes]
    );
    const pValues = useMemo(
        () => computeGenePValues(leftGenes, rightGenes),
        [leftGenes, rightGenes]
    );

    const chartData = useMemo(() => {
        const sortByAbs = (arr: Point[]) =>
            [...arr].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

        const getSEM = (gene?: Point) => {
            if (!gene?.sampleValues || gene.sampleValues.length < 2) return 0;
            const vals = gene.sampleValues;
            const n = vals.length;
            const mu = vals.reduce((a, b) => a + b, 0) / n;
            const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mu) ** 2, 0) / (n - 1));
            return sd / Math.sqrt(n);
        };

        const leftLookup = new Map(leftGenes.map(g => [g.geneName, g]));
        const rightLookup = new Map(rightGenes.map(g => [g.geneName, g]));

        let geneNames: string[];
        if (isSynced) {
            geneNames = sortByAbs(leftGenes).slice(0, 10).map((g) => g.geneName);
        } else {
            const leftNames = sortByAbs(leftGenes).slice(0, 5).map((g) => g.geneName);
            const rightNames = sortByAbs(rightGenes).slice(0, 5).map((g) => g.geneName);
            geneNames = Array.from(new Set([...leftNames, ...rightNames]));
        }

        return geneNames.map((name) => {
            const p = pValues.get(name) ?? 1;
            const g1 = leftLookup.get(name);
            const g2 = rightLookup.get(name);
            return {
                name,
                "Cohort 1": +(g1?.value ?? 0).toFixed(3),
                "Cohort 2": +(g2?.value ?? 0).toFixed(3),
                sem1: getSEM(g1),
                sem2: getSEM(g2),
                pValue: p,
                stars: p < 0.01 ? "★★" : p < 0.05 ? "★" : "",
            };
        });
    }, [leftGenes, rightGenes, isSynced, pValues]);

    if (chartData.length === 0) {
        return <Text fontSize="xs" color="gray.500" p={2}>No genes selected.</Text>;
    }

    const allVals = chartData.flatMap((d) => [d["Cohort 1"], d["Cohort 2"]]);
    const maxAbs = Math.max(0.1, ...allVals.map(Math.abs));
    // Extra right margin to fit star labels
    const domain: [number, number] = [-(maxAbs * 1.2), maxAbs * 1.4];

    const rowHeight = 38;
    const chartHeight = Math.max(180, chartData.length * rowHeight + 70);

    /** Tooltip showing values + p-value */
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const row = chartData.find((d) => d.name === label);
        const pVal = row?.pValue ?? 1;
        const pLabel = pVal < 0.001 ? "< 0.001" : pVal.toFixed(3);
        return (
            <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" px={3} py={2} shadow="md">
                <Text fontWeight="bold" fontSize="xs" mb={1}>{label}</Text>
                {payload.map((p: any, i: number) => {
                    const error = p.name === "Cohort 1" ? row?.sem1 : row?.sem2;
                    return (
                        <Text key={i} fontSize="xs" color={p.fill}>
                            {p.name}: {(p.value as number).toFixed(3)}
                            {error ? ` ± ${error.toFixed(3)} (SEM)` : ""}
                        </Text>
                    );
                })}
                <Text fontSize="xs" color="gray.500" mt={1}>
                    p = {pLabel}{row?.stars ? `  ${row.stars}` : ""}
                </Text>
            </Box>
        );
    };

    /** SVG label rendered after Cohort-2 bars showing the significance stars */
    const StarLabel = (props: any) => {
        const { x, y, width, height, index } = props;
        const row = chartData[index];
        if (!row?.stars) return null;
        // x is the end of the bar. width is the bar length. handle positive/negative.
        const labelX = x + (width >= 0 ? width + 5 : -5);
        const labelY = y + height / 2;
        const color = row.pValue < 0.01 ? "#c53030" : "#b7791f";
        const textAnchor = width >= 0 ? "start" : "end";
        return (
            <text x={labelX} y={labelY} dominantBaseline="central" textAnchor={textAnchor}
                fontSize={11} fontWeight="bold" fill={color}>
                {row.stars}
            </text>
        );
    };

    /** Error bar custom label for grouped bars */
    const ErrorBarLabel = (props: any) => {
        const { x, y, width, height, index, dataKey, chartWidth } = props;
        const row = chartData[index];
        const sem = dataKey === "Cohort 1" ? row.sem1 : row.sem2;
        if (!sem || sem === 0) return null;

        // Calculate pixel width of the SEM using the chart's scale
        // domain is -(maxAbs * 1.2) to maxAbs * 1.4
        // The x prop passed to LabelList content is the AFTER-position of the bar's value.
        // We need to draw a horizontal line centered at x, extending +/- sem.
        const scale = (maxWidth: number) => (maxWidth / (domain[1] - domain[0]));
        const pixelSem = sem * scale(chartWidth || 600); // 600 is a rough guess if container width not passed

        const barY = y + height / 2;
        const color = "#555";
        return (
            <g>
                {/* Horizontal line */}
                <line x1={x - pixelSem} x2={x + pixelSem} y1={barY} y2={barY} stroke={color} strokeWidth={1.5} />
                {/* Vertical caps */}
                <line x1={x - pixelSem} x2={x - pixelSem} y1={barY - 3} y2={barY + 3} stroke={color} strokeWidth={1.5} />
                <line x1={x + pixelSem} x2={x + pixelSem} y1={barY - 3} y2={barY + 3} stroke={color} strokeWidth={1.5} />
            </g>
        );
    };

    return (
        <Box w="100%">
            <Box w="100%" h={`${chartHeight}px`}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 8, right: 52, bottom: 20, left: 0 }}
                        barCategoryGap="25%"
                        barGap={2}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis
                            type="number"
                            domain={domain}
                            tick={{ fill: "#4a5568", fontSize: 10 }}
                            tickFormatter={(v) => v.toFixed(1)}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={82}
                            tick={{ fill: "#2d3748", fontSize: 10 }}
                            tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 11) + "…" : v}
                        />
                        <ReferenceLine x={0} stroke="#718096" strokeWidth={1.5} />
                        <ReTooltip content={<CustomTooltip />} />
                        <Legend
                            iconType="square"
                            iconSize={9}
                            wrapperStyle={{ fontSize: "10px", paddingTop: "6px" }}
                            formatter={(value) => (
                                <span style={{ color: value === "Cohort 1" ? "#3182CE" : "#ED8936" }}>{value}</span>
                            )}
                        />
                        <Bar dataKey="Cohort 1" barSize={11} fill="#3182CE" radius={[2, 2, 2, 2]}>
                            <LabelList content={<ErrorBarLabel />} />
                        </Bar>
                        <Bar dataKey="Cohort 2" barSize={11} fill="#ED8936" radius={[2, 2, 2, 2]}>
                            <LabelList content={<ErrorBarLabel />} />
                            <LabelList content={<StarLabel />} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Box>
            {/* Significance legend footnote */}
            <Box px={2} pt={1}>
                <Text fontSize="2xs" color="gray.400" fontStyle="italic">
                    <Box as="span" color="#b7791f" fontWeight="bold">★</Box> p &lt; 0.05{"\u2002\u2002"}
                    <Box as="span" color="#c53030" fontWeight="bold">★★</Box> p &lt; 0.01
                    {"\u2003"}(Welch’s t-test)
                    {"\u2003"}Error bars indicate Standard Error of the Mean (SEM).
                </Text>
            </Box>
        </Box>
    );
}

/**
 * GeneViolinPlot - interactive distribution of gene expression using Plotly.
 */
function GeneViolinPlot({
    leftGenes,
    rightGenes,
    isSynced,
}: {
    leftGenes: Point[];
    rightGenes: Point[];
    isSynced: boolean;
}) {
    const geneNames = useMemo(() => {
        const sortByAbs = (arr: Point[]) =>
            [...arr].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        if (isSynced) return sortByAbs(leftGenes).slice(0, 10).map(g => g.geneName);
        const leftNames = sortByAbs(leftGenes).slice(0, 5).map(g => g.geneName);
        const rightNames = sortByAbs(rightGenes).slice(0, 5).map(g => g.geneName);
        return Array.from(new Set([...leftNames, ...rightNames]));
    }, [leftGenes, rightGenes, isSynced]);

    const leftLookup = useMemo(() => new Map(leftGenes.map(g => [g.geneName, g])), [leftGenes]);
    const rightLookup = useMemo(() => new Map(rightGenes.map(g => [g.geneName, g])), [rightGenes]);

    const data: any[] = [];
    geneNames.forEach(name => {
        // Cohort 1 (Red)
        const g1 = leftLookup.get(name);
        if (g1?.sampleValues?.length) {
            data.push({
                type: 'violin',
                x: [name],
                y: g1.sampleValues,
                name: 'Cohort 1',
                legendgroup: 'Cohort 1',
                showlegend: name === geneNames[0],
                side: 'negative',
                line: { color: '#000000', width: 1 },
                fillcolor: '#F8766D',
                opacity: 0.8,
                points: 'all',
                jitter: 0.7,
                pointpos: -0.5,
                marker: {
                    color: 'rgba(50,50,50,0.3)',
                    size: 4,
                },
                box: {
                    visible: true,
                    width: 0.15,
                    fillcolor: '#000000',
                    line: { color: '#000000', width: 1 }
                },
                meanline: { visible: true, color: '#000000', width: 2 },
            });
        }
        // Cohort 2 (Teal)
        const g2 = rightLookup.get(name);
        if (g2?.sampleValues?.length) {
            data.push({
                type: 'violin',
                x: [name],
                y: g2.sampleValues,
                name: 'Cohort 2',
                legendgroup: 'Cohort 2',
                showlegend: name === geneNames[0],
                side: 'positive',
                line: { color: '#000000', width: 1 },
                fillcolor: '#00BFC4',
                opacity: 0.8,
                points: 'all',
                jitter: 0.7,
                pointpos: 0.5,
                marker: {
                    color: 'rgba(50,50,50,0.3)',
                    size: 4,
                },
                box: {
                    visible: true,
                    width: 0.15,
                    fillcolor: '#000000',
                    line: { color: '#000000', width: 1 }
                },
                meanline: { visible: true, color: '#000000', width: 2 },
            });
        }
    });

    return (
        <Box w="100%" h="500px">
            <PlotlySuspense>
                <Plot
                    data={data}
                    layout={{
                        autosize: true,
                        margin: { l: 60, r: 20, t: 20, b: 60 },
                        yaxis: {
                            title: { text: 'Expression Value', font: { size: 14 } },
                            gridcolor: '#E2E8F0',
                            zeroline: true,
                            zerolinecolor: '#718096',
                        },
                        xaxis: {
                            title: { text: 'Genes', font: { size: 14 } },
                            gridcolor: '#E2E8F0',
                        },
                        violinmode: 'group',
                        violingap: 0.3,
                        legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
                        paper_bgcolor: 'white',
                        plot_bgcolor: 'white',
                        shapes: [
                            {
                                type: 'line',
                                xref: 'paper',
                                yref: 'y',
                                x0: 0,
                                x1: 1,
                                y0: 1.0,
                                y1: 1.0,
                                line: {
                                    color: '#000000',
                                    width: 1.5,
                                    dash: 'solid'
                                }
                            }
                        ]
                    } as any}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                />
            </PlotlySuspense>
        </Box>
    );
}

/**
 * GeneBoxPlot - box plot distribution of gene expression.
 */
function GeneBoxPlot({
    leftGenes,
    rightGenes,
    isSynced,
}: {
    leftGenes: Point[];
    rightGenes: Point[];
    isSynced: boolean;
}) {
    const geneNames = useMemo(() => {
        const sortByAbs = (arr: Point[]) =>
            [...arr].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        if (isSynced) return sortByAbs(leftGenes).slice(0, 10).map(g => g.geneName);
        const leftNames = sortByAbs(leftGenes).slice(0, 5).map(g => g.geneName);
        const rightNames = sortByAbs(rightGenes).slice(0, 5).map(g => g.geneName);
        return Array.from(new Set([...leftNames, ...rightNames])).reverse();
    }, [leftGenes, rightGenes, isSynced]);

    const leftLookup = useMemo(() => new Map(leftGenes.map(g => [g.geneName, g])), [leftGenes]);
    const rightLookup = useMemo(() => new Map(rightGenes.map(g => [g.geneName, g])), [rightGenes]);

    const data: any[] = [];
    geneNames.forEach(name => {
        const g1 = leftLookup.get(name);
        if (g1?.sampleValues?.length) {
            data.push({
                type: 'box',
                x: g1.sampleValues,
                y: [name],
                name: 'Cohort 1',
                marker: { color: '#3182CE' },
                orientation: 'h',
                boxpoints: 'suspectedoutliers',
                legendgroup: 'c1',
                showlegend: name === geneNames[0],
            });
        }
        const g2 = rightLookup.get(name);
        if (g2?.sampleValues?.length) {
            data.push({
                type: 'box',
                x: g2.sampleValues,
                y: [name],
                name: 'Cohort 2',
                marker: { color: '#ED8936' },
                orientation: 'h',
                boxpoints: 'suspectedoutliers',
                legendgroup: 'c2',
                showlegend: name === geneNames[0],
            });
        }
    });

    return (
        <Box w="100%" h={`${Math.max(300, geneNames.length * 50)}px`}>
            <PlotlySuspense>
                <Plot
                    data={data}
                    layout={{
                        autosize: true,
                        margin: { l: 100, r: 20, t: 10, b: 40 },
                        xaxis: { title: { text: 'Expression Value' }, zeroline: true },
                        boxmode: 'group',
                        legend: { orientation: 'h', y: -0.2 },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                    } as any}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                />
            </PlotlySuspense>
        </Box>
    );
}

function LollipopMini({ data }: { data: EnrichrRow[] }) {
    const sorted = [...data].sort((a, b) => (b.fold ?? 0) - (a.fold ?? 0));
    const rows = sorted.slice(0, 10);
    const maxX = Math.max(1, ...rows.map(r => r.fold ?? 0));
    const scaledMax = Math.ceil((maxX * 1.1) / 10) * 10;
    const domain: [number, number] = [0, scaledMax];
    const maxGenes = Math.max(1, ...rows.map(r => r.genes ?? 0));

    return (
        <Box w="100%" h="250px">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={rows} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" domain={domain} tick={{ fill: "#4a5568", fontSize: 11 }} />
                    <YAxis
                        dataKey="category"
                        type="category"
                        width={140}
                        tick={{ fill: "#2d3748", fontSize: 10 }}
                        tickFormatter={(val) => cleanDescription(val).substring(0, 15) + "..."}
                    />
                    <Bar dataKey="fold" barSize={4} radius={[2, 2, 2, 2]}>
                        {rows.map((d, i) => (
                            <Cell key={`stem-${i}`} fill={colorScale(d.fdr, "fdr")} />
                        ))}
                    </Bar>
                    <Scatter
                        dataKey="fold"
                        shape={(props: any) => {
                            const { cx, cy, payload } = props;
                            const r = 4 + (payload.genes / maxGenes) * 8;
                            return <circle cx={cx} cy={cy} r={r} fill={colorScale(payload.fdr, "fdr")} />;
                        }}
                    />
                    <ReTooltip />
                </ComposedChart>
            </ResponsiveContainer>
        </Box>
    );
}

function NetworkMiniPaths({ rows, side }: { rows: EnrichrRow[]; side: "left" | "right" }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!wrapRef.current || !rows.length) return;
        const items = rows.slice(0, 10);
        const nodes = new DataSet(
            items.map((r, i) => ({
                id: i + 1,
                label: wrapLabel(cleanDescription(r.category)),
                shape: "dot",
                size: 15 + (r.genes / Math.max(1, ...items.map(d => d.genes))) * 20,
                color: colorScale(r.fdr, "fdr"),
                font: { size: 10, face: "Inter" },
            }))
        );
        const edgesArr: any[] = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const c = intersectCount(items[i].overlapGenes, items[j].overlapGenes);
                if (c > 0) edgesArr.push({ from: i + 1, to: j + 1, width: 1 + Math.log2(1 + c), color: "#ddd" });
            }
        }
        const network = new Network(
            wrapRef.current,
            { nodes, edges: new DataSet(edgesArr) },
            {
                physics: { solver: "forceAtlas2Based" },
                interaction: { zoomView: true, dragView: true },
            }
        );
        return () => network.destroy();
    }, [rows]);
    return <Box ref={wrapRef} id={`network-container-${side}`} w="100%" h="250px" />;
}

const StatCard = ({ label, value, subtext }: { label: string; value: string | number; subtext?: string; }) => (
    <Card variant="outline" borderColor="geneTerrain.border" shadow="sm">
        <CardBody p={2}>
            <Flex justify="space-between" align="start" mb={1}>
                <Heading size="sm" color="geneTerrain.textPrimary">{value}</Heading>
                <Box w="30px" h="40px" bg="geneTerrain.primary" opacity={0.1} borderRadius="md" pos="absolute" right={2} top={2} />
            </Flex>
            <Text fontSize="xs" color="gray.500" noOfLines={1}>{label}</Text>
            {subtext && <Text fontSize="2xs" fontWeight="bold" color="geneTerrain.primary" mt={0}>{subtext}</Text>}
        </CardBody>
    </Card>
);

const initShaderProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string) => {
    const vs = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return null;
    }
    return program;
};

// Sub-component for individual terrain
interface TerrainViewProps {
    points: Point[];
    viewport: ViewportState;
    setViewport: (v: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
    currentLayer: LayerType;
    lineThickness: number;
    isolineSpacing: number;
    isLassoMode: boolean;
    activeLasso: Point[];
    setActiveLasso: (points: Point[]) => void;
    onLassoComplete: (selectedPoints: Point[], lassoPath: Point[]) => void;
    persistentLasso?: Point[];
    onInteractionStart: () => void;
}

const TerrainView: React.FC<TerrainViewProps> = ({
    points,
    viewport,
    setViewport,
    currentLayer,
    lineThickness,
    isolineSpacing,
    isLassoMode,
    activeLasso,
    setActiveLasso,
    onLassoComplete,
    persistentLasso,
    onInteractionStart,
}) => {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programsRef = useRef<Record<LayerType, WebGLProgram | null>>({
        gaussian: null,
        discrete: null,
        water: null,
        sky: null,
    });
    const pointsTextureRef = useRef<WebGLTexture | null>(null);
    const valuesTextureRef = useRef<WebGLTexture | null>(null);
    const vertexBufferRef = useRef<WebGLBuffer | null>(null);


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
        if (!gl) return;
        glRef.current = gl;

        // Load extension for float textures
        gl.getExtension("OES_texture_float");
        gl.getExtension("OES_texture_half_float");

        // Init programs
        const shaderMap = {
            gaussian: fragmentShader,
            discrete: discreteFragmentShader,
            water: waterFragmentShader,
            sky: skyFragmentShader,
        };

        Object.entries(shaderMap).forEach(([key, fs]) => {
            programsRef.current[key as LayerType] = initShaderProgram(gl, vertexShader, fs);
        });

        // Vertex buffer
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        vertexBufferRef.current = buffer;

        // Textures
        pointsTextureRef.current = gl.createTexture();
        valuesTextureRef.current = gl.createTexture();

        return () => {
            Object.values(programsRef.current).forEach((p) => p && gl.deleteProgram(p));
            if (vertexBufferRef.current) gl.deleteBuffer(vertexBufferRef.current);
            if (pointsTextureRef.current) gl.deleteTexture(pointsTextureRef.current);
            if (valuesTextureRef.current) gl.deleteTexture(valuesTextureRef.current);
        };
    }, []);

    const drawWebGL = useCallback(() => {
        const gl = glRef.current;
        const program = programsRef.current[currentLayer];
        if (!gl || !program || points.length === 0) return;

        gl.useProgram(program);

        // Uniforms
        const resLoc = gl.getUniformLocation(program, "resolution");
        const offLoc = gl.getUniformLocation(program, "offset");
        const scaleLoc = gl.getUniformLocation(program, "scale");
        const sigmaLoc = gl.getUniformLocation(program, "sigma");
        const countLoc = gl.getUniformLocation(program, "pointCount");
        const thickLoc = gl.getUniformLocation(program, "lineThickness");
        const spaceLoc = gl.getUniformLocation(program, "isolineSpacing");

        gl.uniform2f(resLoc, CANVAS_WIDTH, CANVAS_HEIGHT);
        gl.uniform2f(offLoc, viewport.offset.x, viewport.offset.y);
        gl.uniform1f(scaleLoc, viewport.scale);
        gl.uniform1f(sigmaLoc, getSigmaForZoom(viewport.scale));
        gl.uniform1i(countLoc, points.length);
        if (thickLoc) gl.uniform1f(thickLoc, lineThickness);
        if (spaceLoc) gl.uniform1f(spaceLoc, isolineSpacing);

        // Colors
        const themeColors = {
            expressionLow: theme.colors?.geneTerrain?.primary || "#1E6B52",
            expressionMed: theme.colors?.geneTerrain?.neutral || "#606060",
            expressionHigh: theme.colors?.geneTerrain?.accent1 || "#80BC00",
            background: theme.colors?.geneTerrain?.bg || "#FFFFFF",
        };

        ["expressionLowColor", "expressionMedColor", "expressionHighColor", "backgroundColor"].forEach((name, i) => {
            const loc = gl.getUniformLocation(program, name);
            if (loc) {
                const hex = Object.values(themeColors)[i];
                gl.uniform3fv(loc, hexToRgbArray(hex));
            }
        });

        // Texture data
        const pointsData = new Float32Array(points.length * 4);
        const valuesData = new Float32Array(points.length * 4);
        points.forEach((p, i) => {
            pointsData[i * 4] = p.x;
            pointsData[i * 4 + 1] = p.y;
            valuesData[i * 4] = p.value;
        });

        // Setup attributes
        const posLoc = gl.getAttribLocation(program, "position");
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferRef.current);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // Points Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pointsTextureRef.current);
        const texWidth = 1024;
        const paddedPoints = new Float32Array(texWidth * 4);
        paddedPoints.set(pointsData);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texWidth, 1, 0, gl.RGBA, gl.FLOAT, paddedPoints);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.getUniformLocation(program, "pointsTexture") && gl.uniform1i(gl.getUniformLocation(program, "pointsTexture"), 0);

        // Values Texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, valuesTextureRef.current);
        const paddedValues = new Float32Array(texWidth * 4);
        paddedValues.set(valuesData);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texWidth, 1, 0, gl.RGBA, gl.FLOAT, paddedValues);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.getUniformLocation(program, "valuesTexture") && gl.uniform1i(gl.getUniformLocation(program, "valuesTexture"), 1);

        gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }, [points, viewport, currentLayer, lineThickness, isolineSpacing, theme]);

    const drawOverlay = useCallback(() => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- Draw Gray-Out Filter (If Persistent Lasso exists) ---
        // This must be drawn BEFORE labels so labels are visible on top.
        if (persistentLasso && persistentLasso.length > 0) {
            ctx.save();
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Cut a hole for the selected region
            ctx.globalCompositeOperation = 'destination-out';
            ctx.save();
            ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offset.x, viewport.offset.y);

            ctx.beginPath();
            ctx.moveTo(persistentLasso[0].x, persistentLasso[0].y);
            persistentLasso.forEach((p) => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.fillStyle = "white";
            ctx.fill();

            ctx.restore();
            ctx.restore();
        }

        // --- Draw Gene Labels ---
        if (viewport.scale > 1.5) {
            ctx.save();
            ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offset.x, viewport.offset.y);

            const fontSize = 10;
            ctx.font = `bold ${fontSize / viewport.scale}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const usedPositions = new Set<string>();
            const gridSize = 40 / viewport.scale;

            points.forEach((point) => {
                if (!point.geneName) return;

                const posKey = `${Math.floor(point.x / gridSize)},${Math.floor(point.y / gridSize)}`;
                if (usedPositions.has(posKey)) return;
                usedPositions.add(posKey);

                const textWidth = ctx.measureText(point.geneName).width;
                const padding = 4 / viewport.scale;
                const rectHeight = 14 / viewport.scale;
                const labelY = point.y - (rectHeight + 5 / viewport.scale);

                ctx.fillStyle = "black";
                ctx.fillText(point.geneName, point.x, labelY);
            });
            ctx.restore();
        }

        // --- Draw Active Lasso ---
        if (activeLasso.length > 0) {
            ctx.save();
            ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offset.x, viewport.offset.y);

            ctx.beginPath();
            ctx.moveTo(activeLasso[0].x, activeLasso[0].y);
            activeLasso.forEach((p) => ctx.lineTo(p.x, p.y));

            ctx.strokeStyle = theme.colors?.geneTerrain?.primary || "#1E6B52";
            ctx.lineWidth = 2 / viewport.scale;
            ctx.stroke();

            ctx.fillStyle = "rgba(30, 107, 82, 0.1)";
            ctx.fill();
            ctx.restore();
        }

        // --- Draw Persistent Lasso ---
        if (persistentLasso && persistentLasso.length > 0) {
            ctx.save();
            ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offset.x, viewport.offset.y);

            ctx.beginPath();
            ctx.moveTo(persistentLasso[0].x, persistentLasso[0].y);
            persistentLasso.forEach((p) => ctx.lineTo(p.x, p.y));
            ctx.closePath();

            ctx.strokeStyle = theme.colors?.geneTerrain?.primary || "#1E6B52";
            ctx.lineWidth = 2 / viewport.scale;
            ctx.stroke();

            ctx.fillStyle = "rgba(30, 107, 82, 0.15)";
            ctx.fill();
            ctx.restore();
        }
    }, [points, viewport, activeLasso, persistentLasso, theme]);

    useEffect(() => {
        drawWebGL();
        drawOverlay();
    }, [drawWebGL, drawOverlay]);

    const getWorldCoords = (clientX: number, clientY: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };

        const scaleX = rect.width / CANVAS_WIDTH;
        const scaleY = rect.height / CANVAS_HEIGHT;
        const scale = Math.max(scaleX, scaleY);

        const renderedWidth = CANVAS_WIDTH * scale;
        const renderedHeight = CANVAS_HEIGHT * scale;
        const offsetX = (rect.width - renderedWidth) / 2;
        const offsetY = (rect.height - renderedHeight) / 2;

        const canvasX = (clientX - rect.left - offsetX) / scale;
        const canvasY = (clientY - rect.top - offsetY) / scale;

        return {
            x: (canvasX - viewport.offset.x) / viewport.scale,
            y: (canvasY - viewport.offset.y) / viewport.scale,
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        onInteractionStart();
        const { x, y } = getWorldCoords(e.clientX, e.clientY);

        if (isLassoMode) {
            setActiveLasso([{ x, y, geneId: "", geneName: "", pathways: [], description: "", value: 0 }]);
        } else {
            setViewport((prev) => ({
                ...prev,
                dragging: true,
                lastMousePos: { x: e.clientX, y: e.clientY },
            }));
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isLassoMode && activeLasso.length > 0) {
            const { x, y } = getWorldCoords(e.clientX, e.clientY);
            const lastPoint = activeLasso[activeLasso.length - 1];
            const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
            if (dist > 5 / viewport.scale) {
                setActiveLasso([...activeLasso, { x, y, geneId: "", geneName: "", pathways: [], description: "", value: 0 }]);
            }
        } else if (viewport.dragging && viewport.lastMousePos) {
            const dx = e.clientX - viewport.lastMousePos.x;
            const dy = e.clientY - viewport.lastMousePos.y;
            setViewport((prev) => ({
                ...prev,
                offset: { x: prev.offset.x + dx, y: prev.offset.y + dy },
                lastMousePos: { x: e.clientX, y: e.clientY },
            }));
        }
    };

    const handleMouseUp = () => {
        if (isLassoMode && activeLasso.length > 2) {
            // Find points inside lasso
            const selectedOriginalPoints = points.filter(p => isPointInPolygon(p, activeLasso));
            // Close the polygon for visual persistence
            const closedLasso = [...activeLasso, activeLasso[0]];
            onLassoComplete(selectedOriginalPoints, closedLasso);
        }
        setViewport((prev) => ({ ...prev, dragging: false, lastMousePos: null }));
    };

    const handleWheel = (e: React.WheelEvent) => {
        onInteractionStart();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Logical mouse position mapped to internal resolution
        const mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
        const mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

        setViewport((prev) => {
            const newScale = Math.max(0.1, Math.min(20, prev.scale * zoomFactor));
            const dx = mouseX - prev.offset.x;
            const dy = mouseY - prev.offset.y;
            return {
                ...prev,
                scale: newScale,
                offset: {
                    x: mouseX - dx * (newScale / prev.scale),
                    y: mouseY - dy * (newScale / prev.scale),
                },
            };
        });
    };

    return (
        <Box position="relative" w="100%" h="100%" overflow="hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <canvas ref={overlayCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        </Box>
    );
};

// Main Page Component
export default function LassoComparisonPage() {
    const [data, setData] = useState<LassoData[]>([]);
    const [viewport, setViewport] = useState<ViewportState>(defaultViewport);
    const [currentLayer, setCurrentLayer] = useState<LayerType>("gaussian");
    const [isLassoMode, setIsLassoMode] = useState(false);

    // Synced lassos for both sides
    const [isLassoSynced, setIsLassoSynced] = useState(true);
    const [leftActiveLassoPath, setLeftActiveLassoPath] = useState<Point[]>([]);
    const [rightActiveLassoPath, setRightActiveLassoPath] = useState<Point[]>([]);
    const [leftPersistentLassoPath, setLeftPersistentLassoPath] = useState<Point[]>([]);
    const [rightPersistentLassoPath, setRightPersistentLassoPath] = useState<Point[]>([]);
    const [leftSelectedPoints, setLeftSelectedPoints] = useState<Point[]>([]);
    const [rightSelectedPoints, setRightSelectedPoints] = useState<Point[]>([]);

    // Summary States
    const [showDashboard, setShowDashboard] = useState(false);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [leftEnrichRows, setLeftEnrichRows] = useState<EnrichrRow[]>([]);
    const [rightEnrichRows, setRightEnrichRows] = useState<EnrichrRow[]>([]);
    const [activeCards, setActiveCards] = useState(["genes", "pathways", "network"]);
    const [sectionOrder, setSectionOrder] = useState(["genes", "violin", "box", "pathways", "network"]);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [aiSummary, setAiSummary] = useState<string>("");
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Gene Mini Settings
    const [geneSortBy, setGeneSortBy] = useState<"value" | "name">("value");
    const [geneTopN, setGeneTopN] = useState<number | "all">("all");
    const [selectedCommonGenes, setSelectedCommonGenes] = useState<string[]>([]);
    const [showOnlySelected, setShowOnlySelected] = useState(false);

    const handleToggleCommonGene = (geneName: string) => {
        setSelectedCommonGenes(prev => {
            const next = prev.includes(geneName) ? prev.filter(g => g !== geneName) : [...prev, geneName];
            if (next.length === 0) setShowOnlySelected(false);
            return next;
        });
    };

    // Demographics Summary States
    const [demographicsSummary, setDemographicsSummary] = useState<string>("");
    const [isDemographicsLoading, setIsDemographicsLoading] = useState(false);

    // Export state
    const [isExporting, setIsExporting] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const theme = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        const raw = localStorage.getItem("LASSO_COMPARISON_DATA");
        if (raw) {
            try {
                const parsedData = JSON.parse(raw);

                // Enrich samples with clinical data from cache
                const enrichedData = parsedData.map((item: LassoData) => {
                    if (!item.sampleIds || item.sampleIds.length === 0) return item;

                    // Try to find cached clinical data for any dataset
                    let clinicalCache: Record<string, any> = {};
                    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('CLINICAL_DATA_'));

                    for (const cacheKey of cacheKeys) {
                        try {
                            const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
                            clinicalCache = { ...clinicalCache, ...cache };
                        } catch (e) {
                            console.error('Error parsing clinical cache:', e);
                        }
                    }

                    // Enrich samples with clinical data
                    const enrichedSamples = item.sampleIds.map((sampleId: string) => {
                        const clinicalData = clinicalCache[sampleId];
                        if (clinicalData) {
                            return {
                                ...clinicalData, // Preserve all original clinical keys (race, tumor_stage, etc.)
                                id: sampleId,
                                name: sampleId,
                                description: '',
                                condition: clinicalData.condition || clinicalData.disease_type || '',
                                date: '',
                                points: [],
                                age: clinicalData.age || clinicalData.age_at_diagnosis,
                                gender: clinicalData.gender || clinicalData.sex,
                                subtype: clinicalData.subtype || clinicalData.molecular_subtype,
                                grade: clinicalData.grade || clinicalData.tumor_grade,
                                idh_status: clinicalData.idh_status || clinicalData.idh_mutation_status,
                                mgmt_status: clinicalData.mgmt_status || clinicalData.mgmt_promoter_status
                            };
                        }
                        return {
                            id: sampleId,
                            name: sampleId,
                            description: '',
                            condition: '',
                            date: '',
                            points: []
                        };
                    });

                    return {
                        ...item,
                        samples: enrichedSamples
                    };
                });

                setData(enrichedData);
            } catch (e) {
                console.error("Failed to parse lasso comparison data", e);
            }
        }
    }, []);

    // Generate demographics summary on data load
    useEffect(() => {
        if (data.length >= 2 && data[0].samples && data[1].samples) {
            generateDemographicsSummary();
        }
    }, [leftSelectedPoints, rightSelectedPoints]);

    // Automatic Summary Synchronizer
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Only update if we have a persistent lasso selection. 
            // Pan/zoom (viewport bounds) no longer trigger this.
            if (leftPersistentLassoPath.length === 0 && rightPersistentLassoPath.length === 0) {
                setShowDashboard(false);
                return;
            }

            if (leftSelectedPoints.length === 0 || rightSelectedPoints.length === 0) {
                setShowDashboard(false);
                return;
            }

            setShowDashboard(true);
            setIsDashboardLoading(true);
            const leftGenes = leftSelectedPoints.map(g => g.geneName);
            const rightGenes = rightSelectedPoints.map(g => g.geneName);

            try {
                const [leftResult, rightResult] = await Promise.all([
                    runEnrichr(leftGenes),
                    runEnrichr(rightGenes)
                ]);
                setLeftEnrichRows(leftResult);
                setRightEnrichRows(rightResult);
                generateDemographicsSummary();
            } catch (e) {
                console.error("Auto enrichment failed", e);
            } finally {
                setIsDashboardLoading(false);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [leftSelectedPoints, rightSelectedPoints, leftPersistentLassoPath, rightPersistentLassoPath]);

    // Data synchronization for AnalyticsDashboard (Convert wide format from Lasso to long format for Dashboard)
    const syncedData1 = useMemo(() => {
        if (data.length === 0 || leftSelectedPoints.length === 0) return [];
        const samples = data[0].samples || [];
        const longData: any[] = [];

        samples.forEach((sample, sIdx) => {
            // 1. Add clinical-only row for this sample
            longData.push({
                ...sample,
                gene_symbol: "_CLINICAL_ONLY_",
                value: null
            });

            // 2. Add gene expression rows for this sample
            leftSelectedPoints.forEach(p => {
                const val = p.sampleValues && p.sampleValues[sIdx] !== undefined ? p.sampleValues[sIdx] : p.value;
                if (val !== undefined && val !== null) {
                    longData.push({
                        ...sample,
                        gene_symbol: p.geneName,
                        value: val
                    });
                }
            });
        });
        return longData;
    }, [data, leftSelectedPoints]);

    const syncedData2 = useMemo(() => {
        if (data.length === 0 || rightSelectedPoints.length === 0) return [];
        // Use data[1] if available (true two-dataset comparison), else fallback to data[0] (two-lasso comparison on same dataset)
        const samples = (data.length > 1 ? data[1].samples : data[0].samples) || [];
        const longData: any[] = [];

        samples.forEach((sample, sIdx) => {
            // 1. Add clinical-only row
            longData.push({
                ...sample,
                gene_symbol: "_CLINICAL_ONLY_",
                value: null
            });

            // 2. Add gene rows
            rightSelectedPoints.forEach(p => {
                const val = p.sampleValues && p.sampleValues[sIdx] !== undefined ? p.sampleValues[sIdx] : p.value;
                if (val !== undefined && val !== null) {
                    longData.push({
                        ...sample,
                        gene_symbol: p.geneName,
                        value: val
                    });
                }
            });
        });
        return longData;
    }, [data, rightSelectedPoints]);

    const syncedHeaders = useMemo(() => {
        if (syncedData1.length === 0) return [];
        // Extract all unique keys from long data
        const allData = [...syncedData1, ...syncedData2];
        const keys = new Set<string>();
        allData.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
        return Array.from(keys);
    }, [syncedData1, syncedData2]);

    const syncedProfile = useMemo(() => {
        if (syncedData1.length === 0) return null;
        try {
            const { profile } = processJSONData([...syncedData1, ...syncedData2]);
            return profile;
        } catch (e) {
            console.error("Failed to generate synced profile:", e);
            return {
                rows: syncedData1.length + syncedData2.length,
                cols: syncedHeaders.length,
                columnStats: {}
            };
        }
    }, [syncedData1, syncedData2, syncedHeaders]);

    // Stable, deduplicated gene name arrays for DEMA.
    // selectedPoints may contain the same gene at multiple canvas positions (rendering clusters),
    // so we deduplicate by geneName before sending to the DEMA server.
    const leftDemaGenes = useMemo(
        () => Array.from(new Set(leftSelectedPoints.map(p => p.geneName))),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [leftSelectedPoints.map(p => p.geneName).join(",")]
    );
    const rightDemaGenes = useMemo(
        () => Array.from(new Set(rightSelectedPoints.map(p => p.geneName))),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [rightSelectedPoints.map(p => p.geneName).join(",")]
    );

    const generateDemographicsSummary = async () => {
        if (data.length < 2 || !data[0].samples || !data[1].samples) {
            return;
        }

        setIsDemographicsLoading(true);
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

        const leftSamples = data[0].samples;
        const rightSamples = data[1].samples;

        // Extract demographics
        const extractDemographics = (samples: Sample[]) => {
            const ages = samples.map(s => s.age).filter(a => a !== undefined) as number[];
            const genders = samples.map(s => s.gender).filter(g => g);
            const conditions = samples.map(s => s.condition).filter(c => c);
            const subtypes = samples.map(s => s.subtype).filter(st => st);
            const grades = samples.map(s => s.grade).filter(g => g);

            return {
                count: samples.length,
                ageRange: ages.length > 0 ? `${Math.min(...ages)}-${Math.max(...ages)}` : "N/A",
                avgAge: ages.length > 0 ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : "N/A",
                genderDist: genders.length > 0 ? `${genders.filter(g => g && g.toLowerCase() === 'male').length}M/${genders.filter(g => g && g.toLowerCase() === 'female').length}F` : "N/A",
                conditions: Array.from(new Set(conditions)).join(", ") || "N/A",
                subtypes: Array.from(new Set(subtypes)).join(", ") || "N/A",
                grades: Array.from(new Set(grades)).join(", ") || "N/A"
            };
        };

        const leftDemo = extractDemographics(leftSamples);
        const rightDemo = extractDemographics(rightSamples);

        const prompt = `Compare these two patient cohorts and provide a 2-3 sentence summary highlighting key similarities and differences:

Left Selection (${leftDemo.count} patients):
- Age: ${leftDemo.avgAge} years (range: ${leftDemo.ageRange})
- Gender: ${leftDemo.genderDist}
- Condition: ${leftDemo.conditions}
- Subtype: ${leftDemo.subtypes}
- Grade: ${leftDemo.grades}

Right Selection (${rightDemo.count} patients):
- Age: ${rightDemo.avgAge} years (range: ${rightDemo.ageRange})
- Gender: ${rightDemo.genderDist}
- Condition: ${rightDemo.conditions}
- Subtype: ${rightDemo.subtypes}
- Grade: ${rightDemo.grades}

Provide a concise clinical comparison focusing on the most important demographic and clinical differences.`;

        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are a clinical research expert. Provide concise, factual comparisons of patient cohorts." },
                        { role: "user", content: prompt }
                    ]
                })
            });
            const result = await response.json();
            setDemographicsSummary(result.choices[0]?.message?.content || "Unable to generate summary.");
        } catch (e) {
            console.error(e);
            setDemographicsSummary("Error generating demographics summary.");
        } finally {
            setIsDemographicsLoading(false);
        }
    };

    const toggleCard = (id: string) => {
        setActiveCards((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
    };

    const handleDragStart = (e: React.DragEvent, sectionId: string) => {
        setDraggedItem(sectionId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', sectionId);
        // Create a custom drag image if needed, or rely on browser default
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
        e.preventDefault();
        const draggedSectionId = e.dataTransfer.getData('text/plain');

        if (draggedSectionId === targetSectionId) return;

        const newOrder = [...sectionOrder];
        const draggedIndex = newOrder.indexOf(draggedSectionId);
        const targetIndex = newOrder.indexOf(targetSectionId);

        // Remove dragged item and insert at target position
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedSectionId);

        setSectionOrder(newOrder);
    };

    const handleExportPDF = async () => {
        setIsExporting(true);

        try {
            const { toPng } = await import('html-to-image');
            const jsPDF = (await import('jspdf')).default;

            const reportElement = document.getElementById('scientific-report-container');
            if (!reportElement) throw new Error('Report container not found');

            // 1. Store original styles and move to VIEWPORT
            // Positioning it off-screen (left: -9999px) can cause browsers to skip rendering.
            // Moving it to fixed but behind everything (zIndex: -100) is more robust.
            const originalStyles = {
                position: reportElement.style.position,
                top: reportElement.style.top,
                left: reportElement.style.left,
                opacity: reportElement.style.opacity,
                visibility: reportElement.style.visibility,
                pointerEvents: reportElement.style.pointerEvents,
                zIndex: reportElement.style.zIndex,
            };

            reportElement.style.display = 'block';
            reportElement.style.position = 'fixed';
            reportElement.style.top = '0';
            reportElement.style.left = '0';
            reportElement.style.opacity = '1';
            reportElement.style.visibility = 'visible';
            reportElement.style.pointerEvents = 'auto';
            reportElement.style.zIndex = '-100';

            // 2. Wait for layout and Recharts animations to settle
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 3. CAPTURE LOGIC: Robust In-Place Swap of Canvases
            // We must handle stacked canvases (WebGL + Overlay) correctly.
            const canvases = Array.from(reportElement.querySelectorAll("canvas"));
            const originalStates: { parent: Node, nextSibling: Node | null, canvas: HTMLCanvasElement }[] = [];
            const imagesToDecode: Promise<void>[] = [];

            canvases.forEach((canvas) => {
                const img = document.createElement("img");
                try {
                    img.src = canvas.toDataURL('image/png');

                    // CRITICAL: Copy styles to perfectly maintain stacking/positioning
                    img.style.cssText = canvas.style.cssText;
                    img.style.width = canvas.getAttribute('width') + 'px' || '100%';
                    img.style.height = canvas.getAttribute('height') + 'px' || '100%';

                    if (img.decode) {
                        imagesToDecode.push(img.decode());
                    }

                    if (canvas.parentNode) {
                        originalStates.push({
                            parent: canvas.parentNode,
                            nextSibling: canvas.nextSibling,
                            canvas: canvas
                        });
                        canvas.parentNode.replaceChild(img, canvas);
                    }
                } catch (e) {
                    console.warn("Canvas capture failed:", e);
                }
            });

            // 4. Wait for all injected images to be decoded by the browser
            await Promise.all(imagesToDecode).catch(e => console.warn("Image sync failed:", e));

            // 5. Capture the actual report element
            const dataUrl = await toPng(reportElement, {
                quality: 1.0,
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: '#ffffff',
                style: {
                    overflow: 'visible',
                }
            });

            // 6. RESTORE original state
            originalStates.forEach(({ parent, nextSibling, canvas }) => {
                const img = (parent as HTMLElement).querySelector(`img[src^="data:image/png"]`);
                if (img) {
                    parent.replaceChild(canvas, img);
                }
            });

            Object.assign(reportElement.style, originalStyles);
            reportElement.style.display = 'none';

            // 7. Generate PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const imgWidth = 190;
            const imgHeight = (reportElement.offsetHeight * imgWidth) / 800;
            pdf.addImage(dataUrl, 'PNG', 10, 10, imgWidth, imgHeight);
            pdf.save(`GeneTerrain_Scientific_Report_${new Date().toISOString().slice(0, 10)}.pdf`);

        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportHTML = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);

        try {
            // Clone the node to manipulate without affecting UI
            const clone = reportRef.current.cloneNode(true) as HTMLElement;

            // Remove Export Button/Menu from clone
            // Remove Export Button/Menu from clone manually by ID, or by text if ID fails
            const exportContainer = clone.querySelector("#export-menu-container");
            if (exportContainer) {
                exportContainer.remove();
            } else {
                // Fallback: remove by text content if ID not found (just in case)
                const exportBtns = Array.from(clone.querySelectorAll("button"));
                exportBtns.forEach(btn => {
                    if (btn.textContent?.includes("Export")) {
                        const menuContainer = btn.closest(".chakra-menu__group") || btn.closest(".chakra-menu__menu") || btn.parentElement?.parentElement;
                        if (menuContainer) (menuContainer as HTMLElement).style.display = 'none';
                    }
                });
            }

            // Handle Canvases (Terrain & others, but SKIP Networks)
            const originals = reportRef.current.querySelectorAll("canvas");
            const clones = clone.querySelectorAll("canvas");

            originals.forEach((canvas, i) => {
                // If this canvas belongs to a network container, we skip converting it to image
                // because we will re-render it interactively via script.
                if (canvas.closest('[id^="network-container-"]')) {
                    // Clear the cloned container's content so the script can append fresh
                    const container = clones[i].closest('[id^="network-container-"]');
                    if (container) container.innerHTML = '';
                    return;
                }

                // For Terrain and other canvases, convert to image
                const img = document.createElement("img");
                try {
                    img.src = canvas.toDataURL();
                } catch (e) {
                    console.warn("Canvas export failed", e);
                }
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.display = "block";
                clones[i].parentNode?.replaceChild(img, clones[i]);
            });

            // Gather styles
            let styles = "";
            document.querySelectorAll("style, link[rel='stylesheet']").forEach(node => {
                styles += node.outerHTML;
            });

            // Prepare Data for Interactive Networks
            const networkDataScript = `
                <link rel="stylesheet" href="https://unpkg.com/vis-network/styles/vis-network.min.css" />
                <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
                <script>
                    const leftData = ${JSON.stringify(leftEnrichRows)};
                    const rightData = ${JSON.stringify(rightEnrichRows)};

                    // Helper Functions
                    function colorScale(value, metric) {
                         if (value > 14) return "#e51f25";
                         if (value > 10) return "#d9265f";
                         if (value > 6) return "#a846b1";
                         if (value > 3) return "#8b54c7";
                         return "#6f5fcf";
                    }
                    function cleanDescription(desc) {
                        const c = desc.toLowerCase()
                            .replace(/^(positive |negative )?regulation of |involved in| process$|^cellular /, "")
                            .replace(/pathway$/, "")
                            .trim();
                        return c.charAt(0).toUpperCase() + c.slice(1);
                    }
                    function wrapLabel(s, lineLen = 18) {
                        const words = s.split(/\\s+/);
                        const lines = [];
                        let line = "";
                        for (const w of words) {
                            const test = (line ? line + " " : "") + w;
                            if (test.length > lineLen) {
                                lines.push(line);
                                line = w;
                            } else {
                                line = test;
                            }
                        }
                        if (line) lines.push(line);
                        return lines.join("\\n");
                    }
                    function intersectCount(a, b) {
                        if (!a?.length || !b?.length) return 0;
                        const setA = new Set(a);
                        let c = 0;
                        for (const g of b) if (setA.has(g)) c++;
                        return c;
                    }

                    // Render Function
                    function renderNetwork(containerId, rows) {
                        const container = document.getElementById(containerId);
                        if (!container || !rows.length) return;

                        const items = rows.slice(0, 10);
                        const maxGenes = Math.max(1, ...items.map(d => d.genes));

                        const nodes = new vis.DataSet(
                            items.map((r, i) => ({
                                id: i + 1,
                                label: wrapLabel(cleanDescription(r.category)),
                                shape: "dot",
                                size: 15 + (r.genes / maxGenes) * 20,
                                color: colorScale(r.fdr, "fdr"),
                                font: { size: 10, face: "Inter" },
                            }))
                        );

                        const edgesArr = [];
                        for (let i = 0; i < items.length; i++) {
                            for (let j = i + 1; j < items.length; j++) {
                                const c = intersectCount(items[i].overlapGenes, items[j].overlapGenes);
                                if (c > 0) edgesArr.push({ from: i + 1, to: j + 1, width: 1 + Math.log2(1 + c), color: "#ddd" });
                            }
                        }

                        const options = {
                            physics: { solver: "forceAtlas2Based" },
                            interaction: { zoomView: true, dragView: true },
                        };

                        new vis.Network(container, { nodes, edges: new vis.DataSet(edgesArr) }, options);
                    }

                    // Init
                    document.addEventListener("DOMContentLoaded", () => {
                        renderNetwork("network-container-left", leftData);
                        renderNetwork("network-container-right", rightData);
                    });
                </script>
            `;

            // Construct HTML
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>GeneTerrain Comparison Report</title>
                    ${styles}
                    <style>
                        body { margin: 0; padding: 0; background-color: #f7fafc; }
                        #report-container { height: auto !important; overflow: visible !important; }
                        canvas { display: block; } 
                    </style>
                </head>
                <body>
                    <div id="report-container">
                        ${clone.innerHTML}
                    </div>
                    ${networkDataScript}
                </body>
                </html>
            `;

            // Download
            const blob = new Blob([htmlContent], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "comparison-view.html";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('HTML export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetView = () => setViewport(defaultViewport);
    const handleClose = () => window.close();

    const generateAISummary = async () => {
        setIsAiLoading(true);
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
        const leftAvg = leftSelectedPoints.length > 0 ? leftSelectedPoints.reduce((sum, g) => sum + g.value, 0) / leftSelectedPoints.length : 0;
        const rightAvg = rightSelectedPoints.length > 0 ? rightSelectedPoints.reduce((sum, g) => sum + g.value, 0) / rightSelectedPoints.length : 0;

        const prompt = `Interpret gene comparison:
        Left: ${leftSelectedPoints.length} genes, Avg: ${leftAvg.toFixed(2)}. Top Pathways: ${leftEnrichRows.slice(0, 3).map(r => r.category).join(", ")}
        Right: ${rightSelectedPoints.length} genes, Avg: ${rightAvg.toFixed(2)}. Top Pathways: ${rightEnrichRows.slice(0, 3).map(r => r.category).join(", ")}
        Summarize biological state differences. Keep it concise (2-3 paragraphs).`;

        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Bioinformatics expert analysis." },
                        { role: "user", content: prompt }
                    ]
                })
            });
            const result = await response.json();
            setAiSummary(result.choices[0]?.message?.content || "Interpretation error.");
        } catch (e) {
            console.error(e);
            setAiSummary("Interpretation error.");
        } finally {
            setIsAiLoading(false);
        }
    };

    if (data.length < 2) {
        return (
            <Center h="100vh">
                <VStack spacing={4}>
                    <Badge colorScheme="red" fontSize="md">Error</Badge>
                    <Text>Insufficient data for comparison. Please select 2 lassos in the scatter plot.</Text>
                    <Button onClick={handleClose}>Close Tab</Button>
                </VStack>
            </Center>
        );
    }

    return (
        <Box ref={reportRef} h="100vh" bg="gray.50" display="flex" flexDirection="column" overflowY="auto">
            {/* Header */}
            {/* <Box bg="geneTerrain.primary" px={6} py={3} shadow="md" zIndex={10} position="sticky" top={0}>
                <Flex justify="space-between" align="center">
                    <HStack spacing={4}>
                        <Heading color="white" size="md">GeneTerrain Comparison</Heading>
                        <Badge colorScheme="green" variant="solid" borderRadius="full" px={3}>
                            {data.length} lasso regions
                        </Badge>
                    </HStack>
                    <IconButton aria-label="Close" icon={<MdClose />} variant="ghost" color="white" fontSize="24px" onClick={handleClose} _hover={{ bg: "whiteAlpha.200" }} />
                </Flex>
            </Box> */}
            {/* Patient Demographics Summary */}
            {(demographicsSummary || isDemographicsLoading) && (
                <Box px={2} py={0} mt={1}>
                    <Card bg="blue.50" border="1px" borderColor="blue.200" shadow="sm">
                        <CardBody py={1} px={2}>
                            <Flex align="start" gap={2}>
                                <Icon as={AlertCircle} color="blue.600" mt={0.5} boxSize={3} />
                                <VStack align="start" spacing={0} flex={1}>
                                    <Text fontWeight="bold" fontSize="xs" color="blue.800">Patient Cohort Comparison</Text>
                                    {isDemographicsLoading ? (
                                        <HStack spacing={2}>
                                            <Spinner size="xs" color="blue.600" />
                                            <Text fontSize="sm" color="gray.600">Analyzing patient demographics...</Text>
                                        </HStack>
                                    ) : (
                                        <Text fontSize="xs" color="gray.700" lineHeight="1.4">
                                            {demographicsSummary}
                                        </Text>
                                    )}
                                </VStack>
                            </Flex>
                        </CardBody>
                    </Card>
                </Box>
            )}
            {/* Control Bar */}
            <Box bg="white" px={4} py={1} shadow="sm" borderBottom="1px" borderColor="gray.100" position="sticky" top={0} zIndex={10}>
                <Flex justify="space-between" align="center">
                    <HStack spacing={2}>
                        <Text color="green.600" fontWeight="bold" fontSize="xs">Synchronized view:</Text>
                        <Text color="gray.600" fontSize="2xs">Pan or zoom any terrain together</Text>
                    </HStack>

                    <HStack spacing={4}>
                        <ButtonGroup isAttached size="xs" variant="outline">
                            <Button
                                onClick={() => setCurrentLayer("gaussian")}
                                bg={currentLayer === "gaussian" ? "green.500" : "white"}
                                color={currentLayer === "gaussian" ? "white" : "green.600"}
                                borderColor="green.500"
                                _hover={{ bg: currentLayer === "gaussian" ? "green.600" : "green.50" }}
                            >
                                Gaussian
                            </Button>
                            <Button
                                onClick={() => setCurrentLayer("discrete")}
                                bg={currentLayer === "discrete" ? "green.500" : "white"}
                                color={currentLayer === "discrete" ? "white" : "green.600"}
                                borderColor="green.500"
                                _hover={{ bg: currentLayer === "discrete" ? "green.600" : "green.50" }}
                            >
                                Contour
                            </Button>
                            <Button
                                onClick={() => setCurrentLayer("water")}
                                bg={currentLayer === "water" ? "green.500" : "white"}
                                color={currentLayer === "water" ? "white" : "green.600"}
                                borderColor="green.500"
                                _hover={{ bg: currentLayer === "water" ? "green.600" : "green.50" }}
                            >
                                Peak
                            </Button>
                            <Button
                                onClick={() => setCurrentLayer("sky")}
                                bg={currentLayer === "sky" ? "green.500" : "white"}
                                color={currentLayer === "sky" ? "white" : "green.600"}
                                borderColor="green.500"
                                _hover={{ bg: currentLayer === "sky" ? "green.600" : "green.50" }}
                            >
                                Valley
                            </Button>
                        </ButtonGroup>

                        <Button
                            size="xs"
                            variant={isLassoMode ? "solid" : "outline"}
                            colorScheme="green"
                            leftIcon={<Icon as={Lasso} />}
                            onClick={() => {
                                setIsLassoMode(!isLassoMode);
                                if (isLassoMode) {
                                    // if turning off lasso mode, clear selection
                                    setLeftPersistentLassoPath([]);
                                    setRightPersistentLassoPath([]);
                                    setLeftActiveLassoPath([]);
                                    setRightActiveLassoPath([]);
                                    setLeftSelectedPoints([]);
                                    setRightSelectedPoints([]);
                                    setShowDashboard(false);
                                }
                            }}
                            fontWeight="bold"
                        >
                            Lasso Mode
                        </Button>
                        <Select
                            size="xs"
                            w="auto"
                            variant="filled"
                            borderRadius="md"
                            value={isLassoSynced ? "synced" : "separate"}
                            onChange={(e) => setIsLassoSynced(e.target.value === "synced")}
                        >
                            <option value="synced">Synced Lasso</option>
                            <option value="separate">Separate Lasso</option>
                        </Select>
                    </HStack>
                </Flex>
            </Box>



            {/* Main Comparison Area */}
            <Box p={2}>
                <Flex h="300px" gap={4} mb={2}>
                    {[0, 1].map((idx) => {
                        const item = data.length > idx ? data[idx] : data[0];
                        if (!item) return null;

                        return (
                            <Box key={idx} flex={1} bg="white" borderRadius="lg" border="1px" borderColor="gray.200" shadow="sm" overflow="hidden" display="flex" flexDirection="column">
                                <Box px={3} py={1} borderBottom="1px" borderColor="gray.100" bg={idx === 0 ? "blue.50" : "orange.50"}>
                                    <Flex justify="space-between" align="center">
                                        <HStack spacing={2}>
                                            <Heading fontSize="2xs" color="gray.500">{item.sampleIds.length} samples • {item.points.length} genes</Heading>
                                        </HStack>
                                        {(idx === 0 ? leftSelectedPoints : rightSelectedPoints).length > 0 && (
                                            <Badge variant="subtle" colorScheme="green" fontSize="2xs">
                                                {(idx === 0 ? leftSelectedPoints : rightSelectedPoints).length} selected
                                            </Badge>
                                        )}
                                        <Badge variant="subtle" colorScheme="green" fontSize="2xs">
                                            {data.length > 1 ? `Cohort ${idx + 1}` : (idx === 0 ? "Selection A" : "Selection B")}
                                        </Badge>
                                    </Flex>
                                </Box>
                                <Box flex={1}>
                                    <TerrainView
                                        points={item.points}
                                        viewport={viewport}
                                        setViewport={setViewport}
                                        currentLayer={currentLayer}
                                        lineThickness={0.12}
                                        isolineSpacing={1.0}
                                        isLassoMode={isLassoMode}
                                        activeLasso={idx === 0 ? leftActiveLassoPath : rightActiveLassoPath}
                                        setActiveLasso={idx === 0 ? setLeftActiveLassoPath : setRightActiveLassoPath}
                                        persistentLasso={idx === 0 ? leftPersistentLassoPath : rightPersistentLassoPath}
                                        onLassoComplete={(_points, path) => {
                                            if (isLassoSynced) {
                                                setLeftPersistentLassoPath(path);
                                                setRightPersistentLassoPath(path);
                                                setLeftSelectedPoints(data[0].points.filter(p => isPointInPolygon(p, path)));
                                                setRightSelectedPoints((data.length > 1 ? data[1] : data[0]).points.filter(p => isPointInPolygon(p, path)));
                                                setLeftActiveLassoPath([]);
                                                setRightActiveLassoPath([]);
                                            } else {
                                                if (idx === 0) {
                                                    setLeftPersistentLassoPath(path);
                                                    setLeftSelectedPoints(data[0].points.filter(p => isPointInPolygon(p, path)));
                                                    setLeftActiveLassoPath([]);
                                                } else {
                                                    setRightPersistentLassoPath(path);
                                                    setRightSelectedPoints((data.length > 1 ? data[1] : data[0]).points.filter(p => isPointInPolygon(p, path)));
                                                    setRightActiveLassoPath([]);
                                                }
                                            }
                                        }}
                                        onInteractionStart={() => { }}
                                    />
                                </Box>
                            </Box>
                        );
                    })}
                </Flex>


                {/* Summary Dashboard Section */}
                <Box
                    id="analytics-dashboard-container"
                    display={showDashboard ? "block" : "none"}
                    mt={4}
                >
                    <Accordion allowToggle mb={4}>
                        <AccordionItem border="none" bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" shadow="sm">
                            <h2>
                                <AccordionButton _expanded={{ bg: "gray.50", color: "blue.600" }} borderRadius="xl">
                                    <Box flex="1" textAlign="left" fontWeight="bold">
                                        Show Legacy Comparison Dashboard
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4}>
                                <Box id="summary-dashboard" borderRadius="xl" p={4}>
                                    <Flex justify="space-between" align="center" mb={4}>
                                        <VStack align="start" spacing={0}>
                                            <Heading size="md" color="geneTerrain.primary">Comparison Dashboard</Heading>
                                            <Text fontSize="xs" color="gray.500">Biological insights based on your selections</Text>
                                        </VStack>
                                        <Box id="export-menu-container">
                                            <Menu>
                                                <MenuButton as={Button} size="sm" colorScheme="blue" variant="outline" leftIcon={<Download size={16} />} isLoading={isExporting}>
                                                    Export
                                                </MenuButton>
                                                <MenuList>
                                                    <MenuItem icon={<FileText size={16} />} onClick={handleExportPDF}>Export PDF Report</MenuItem>
                                                    <MenuItem icon={<FileCode size={16} />} onClick={handleExportHTML}>Export Interactive HTML</MenuItem>
                                                </MenuList>
                                            </Menu>
                                        </Box>
                                    </Flex>

                                    {isDashboardLoading ? (
                                        <Center py={20}>
                                            <VStack spacing={4}>
                                                <Spinner size="xl" color="geneTerrain.primary" thickness="4px" />
                                                <Text fontWeight="bold" color="gray.600">Analyzing biological pathways...</Text>
                                            </VStack>
                                        </Center>
                                    ) : (
                                        <Flex gap={6}>
                                            {/* Left Sidebar - Section Toggle Menu */}
                                            <VStack
                                                w="200px"
                                                spacing={2}
                                                align="stretch"
                                                bg="gray.50"
                                                p={4}
                                                borderRadius="md"
                                                position="sticky"
                                                top="120px"
                                                alignSelf="flex-start"
                                            >
                                                <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={2}>ACTIVE SECTIONS</Text>
                                                {sectionOrder.map(sectionId => {
                                                    const section = [
                                                        { id: 'genes', label: 'Gene Exp', icon: Activity },
                                                        { id: 'pathways', label: 'Pathways', icon: BarChart2 },
                                                        { id: 'network', label: 'Network', icon: Share2 }
                                                    ].find(s => s.id === sectionId);

                                                    if (!section) return null;

                                                    return (
                                                        <Flex
                                                            key={section.id}
                                                            align="center"
                                                            p={1}
                                                            borderRadius="md"
                                                            bg={activeCards.includes(section.id) ? "white" : "transparent"}
                                                            opacity={draggedItem === section.id ? 0.4 : 1}
                                                            border="1px solid"
                                                            borderColor={activeCards.includes(section.id) ? "gray.200" : "transparent"}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, section.id)}
                                                            onDragEnd={handleDragEnd}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, section.id)}
                                                            cursor="grab"
                                                            _hover={{ bg: "gray.100" }}
                                                            transition="all 0.2s"
                                                        >
                                                            <Icon as={GripVertical} color="gray.400" boxSize={4} mr={1} cursor="grab" />
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                colorScheme={activeCards.includes(section.id) ? "green" : "gray"}
                                                                leftIcon={<Icon as={section.icon} boxSize={4} />}
                                                                onClick={() => toggleCard(section.id)}
                                                                justifyContent="flex-start"
                                                                fontWeight="medium"
                                                                w="full"
                                                            >
                                                                {section.label}
                                                            </Button>
                                                        </Flex>
                                                    );
                                                })}
                                            </VStack>

                                            {/* Main Content Area */}
                                            <VStack spacing={4} align="stretch" flex={1} ref={contentRef}>
                                                {/* Stats Cards */}
                                                {/* <SimpleGrid columns={[1, 2, 3]} gap={6}>
                                        <StatCard
                                            label="Left Selection"
                                            value={leftSelectedPoints.length}
                                            subtext={`Avg Expr: ${(leftSelectedPoints.reduce((s, g) => s + g.value, 0) / (leftSelectedPoints.length || 1)).toFixed(2)}`}
                                        />
                                        <StatCard
                                            label="Right Selection"
                                            value={rightSelectedPoints.length}
                                            subtext={`Avg Expr: ${(rightSelectedPoints.reduce((s, g) => s + g.value, 0) / (rightSelectedPoints.length || 1)).toFixed(2)}`}
                                        />
                                        {(() => {
                                            const overlap = leftSelectedPoints.filter(lp => rightSelectedPoints.some(rp => rp.geneId === lp.geneId)).length;
                                            return <StatCard label="Overlapping Genes" value={overlap} subtext="Common to both lassos" />;
                                        })()}
                                    </SimpleGrid> */}

                                                {/* Main Comparison Grid */}
                                                {sectionOrder
                                                    .filter(cardId => activeCards.includes(cardId))
                                                    .map(cardId => (
                                                        <Card key={cardId} variant="outline" borderColor="gray.200">
                                                            <CardHeader bg="gray.50" py={2} px={3} borderBottom="1px" borderColor="gray.100">
                                                                <Flex justify="space-between" align="center">
                                                                    <HStack spacing={4}>
                                                                        <Heading fontSize="xs" color="gray.700" fontWeight="bold">
                                                                            {cardId === "genes" && "GENE EXPRESSION"}
                                                                            {cardId === "violin" && "EXPRESSION DISTRIBUTION (VIOLIN)"}
                                                                            {cardId === "box" && "EXPRESSION DISTRIBUTION (BOX)"}
                                                                            {cardId === "pathways" && "BIOLOGICAL PATHWAYS"}
                                                                            {cardId === "network" && "INTERACTION NETWORK"}
                                                                        </Heading>
                                                                        {(cardId === "genes" || cardId === "violin" || cardId === "box") && (
                                                                            <HStack spacing={2}>
                                                                                <Text fontSize="2xs" color="gray.500">
                                                                                    {isLassoSynced
                                                                                        ? "Top 10 by |expression| · same lasso"
                                                                                        : "Top 5 from each selection"}
                                                                                </Text>
                                                                            </HStack>
                                                                        )}
                                                                    </HStack>
                                                                    <IconButton
                                                                        aria-label="Remove section"
                                                                        icon={<Icon as={Trash2} boxSize={3} />}
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        h="20px"
                                                                        minW="20px"
                                                                        onClick={() => toggleCard(cardId)}
                                                                    />
                                                                </Flex>
                                                            </CardHeader>
                                                            <CardBody p={2}>
                                                                {cardId === "genes" ? (
                                                                    <GeneBarChart
                                                                        leftGenes={leftSelectedPoints}
                                                                        rightGenes={rightSelectedPoints}
                                                                        isSynced={isLassoSynced}
                                                                    />
                                                                ) : cardId === "violin" ? (
                                                                    <GeneViolinPlot
                                                                        leftGenes={leftSelectedPoints}
                                                                        rightGenes={rightSelectedPoints}
                                                                        isSynced={isLassoSynced}
                                                                    />
                                                                ) : cardId === "box" ? (
                                                                    <GeneBoxPlot
                                                                        leftGenes={leftSelectedPoints}
                                                                        rightGenes={rightSelectedPoints}
                                                                        isSynced={isLassoSynced}
                                                                    />
                                                                ) : isLassoSynced ? (
                                                                    <Box>
                                                                        <Text fontWeight="bold" color="green.700" mb={2} fontSize="xs">SYNCED SELECTION</Text>
                                                                        {cardId === "pathways" && <LollipopMini data={leftEnrichRows} />}
                                                                        {cardId === "network" && <NetworkMiniPaths rows={leftEnrichRows} side="left" />}
                                                                    </Box>
                                                                ) : (
                                                                    <SimpleGrid columns={[1, 2]} gap={2}>
                                                                        <Box>
                                                                            <Text fontWeight="bold" color="blue.700" mb={2} fontSize="xs">LEFT SELECTION</Text>
                                                                            {cardId === "pathways" && <LollipopMini data={leftEnrichRows} />}
                                                                            {cardId === "network" && <NetworkMiniPaths rows={leftEnrichRows} side="left" />}
                                                                        </Box>
                                                                        <Box pl={4} borderLeft="1px" borderColor="gray.100">
                                                                            <Text fontWeight="bold" color="orange.700" mb={2} fontSize="xs">RIGHT SELECTION</Text>
                                                                            {cardId === "pathways" && <LollipopMini data={rightEnrichRows} />}
                                                                            {cardId === "network" && <NetworkMiniPaths rows={rightEnrichRows} side="right" />}
                                                                        </Box>
                                                                    </SimpleGrid>
                                                                )}
                                                            </CardBody>
                                                        </Card>
                                                    ))}

                                                {/* AI Summary Section */}
                                                <Card variant="filled" bg="blue.50" border="1px" borderColor="blue.100">
                                                    <CardBody>
                                                        <Flex justify="space-between" align="center" mb={4}>
                                                            <HStack>
                                                                <Heading size="sm" color="blue.800">AI Biological Interpretation</Heading>
                                                            </HStack>
                                                            {!aiSummary && (
                                                                <Button size="sm" colorScheme="blue" onClick={generateAISummary} isLoading={isAiLoading} leftIcon={<Dna size={14} />}>
                                                                    Generate AI Analysis
                                                                </Button>
                                                            )}
                                                        </Flex>

                                                        {isAiLoading ? (
                                                            <Center py={6}><Spinner size="sm" mr={3} /> <Text>Expert AI is analyzing the biological context...</Text></Center>
                                                        ) : aiSummary ? (
                                                            <Text whiteSpace="pre-wrap" fontSize="sm" color="gray.700" lineHeight="1.8">
                                                                {aiSummary}
                                                            </Text>
                                                        ) : (
                                                            <Text fontSize="sm" color="gray.500" fontStyle="italic">Click the button to generate a scientific summary of the differences.</Text>
                                                        )}
                                                    </CardBody>
                                                </Card>
                                            </VStack>
                                        </Flex>
                                    )}
                                </Box>
                            </AccordionPanel>
                        </AccordionItem>
                    </Accordion>

                    <Box minH="800px" flex="1" borderRadius="xl" overflow="hidden" shadow="lg" border="1px" borderColor="gray.200">

                        <AnalyticsDashboard
                            externalData1={syncedData1}
                            externalData2={syncedData2}
                            externalHeaders1={syncedHeaders}
                            externalProfile={syncedProfile}
                            externalIsLoading={isDashboardLoading}
                            dataset1Label={data.length > 1 ? "Cohort 1" : "Selection A"}
                            dataset2Label={data.length > 1 ? "Cohort 2" : "Selection B"}
                        />
                    </Box>

                    {/* DEMA Network Layout */}
                    {isLassoSynced
                        ? /* Synced: one shared DEMA network, one terrain per cohort side by side */
                          leftDemaGenes.length >= 3 && (
                              <DemaNetworkPanel
                                  genes={leftDemaGenes}
                                  networkLabel="Synced Lasso"
                                  cohorts={[
                                      {
                                          points: leftSelectedPoints,
                                          label: data[0]?.label ?? "Cohort 1",
                                          datasetId: data[0]?.label ?? "dema",
                                      },
                                      ...(rightSelectedPoints.length > 0 ? [{
                                          points: rightSelectedPoints,
                                          label: (data.length > 1 ? data[1] : data[0])?.label ?? "Cohort 2",
                                          datasetId: (data.length > 1 ? data[1] : data[0])?.label ?? "dema",
                                      }] : []),
                                  ]}
                              />
                          )
                        : /* Separate: two independent DEMA networks, each with its own terrain */
                          (leftDemaGenes.length >= 3 || rightDemaGenes.length >= 3) && (
                              <HStack align="start" spacing={4} w="full">
                                  {leftDemaGenes.length >= 3 && (
                                      <Box flex={1} minW={0}>
                                          <DemaNetworkPanel
                                              genes={leftDemaGenes}
                                              networkLabel={data.length > 1 ? "Cohort 1" : "Left Selection"}
                                              cohorts={[{
                                                  points: leftSelectedPoints,
                                                  label: data[0]?.label ?? "Cohort 1",
                                                  datasetId: data[0]?.label ?? "dema",
                                              }]}
                                          />
                                      </Box>
                                  )}
                                  {rightDemaGenes.length >= 3 && (
                                      <Box flex={1} minW={0}>
                                          <DemaNetworkPanel
                                              genes={rightDemaGenes}
                                              networkLabel={data.length > 1 ? "Cohort 2" : "Right Selection"}
                                              cohorts={[{
                                                  points: rightSelectedPoints,
                                                  label: (data.length > 1 ? data[1] : data[0])?.label ?? "Cohort 2",
                                                  datasetId: (data.length > 1 ? data[1] : data[0])?.label ?? "dema",
                                              }]}
                                          />
                                      </Box>
                                  )}
                              </HStack>
                          )
                    }
                </Box>
            </Box>

            {/* Hidden Scientific Report for PDF Export */}
            <Box id="scientific-report-container" display="none" position="absolute" left="-9999px" top="0" visibility="visible" opacity="0.01" bg="white" p={8} w="800px" pointerEvents="none">
                <VStack spacing={8} align="stretch" color="black" fontFamily="serif">
                    {/* Header */}
                    <Flex justify="space-between" align="baseline" borderBottom="2px solid black" pb={2}>
                        <VStack align="flex-start" spacing={0}>
                            <Heading size="lg" fontWeight="black" letterSpacing="tight">GENETERRAIN ANALYSIS REPORT</Heading>
                            <Text fontSize="sm" color="gray.600">Spatial Transcriptomics Landscape Comparison</Text>
                        </VStack>
                        <Text fontSize="xs" fontWeight="bold">DATE: {new Date().toLocaleDateString()}</Text>
                    </Flex>

                    {/* Meta Section */}
                    <SimpleGrid columns={3} spacing={4} bg="gray.50" p={4} borderRadius="sm" border="1px solid" borderColor="gray.200">
                        <VStack align="flex-start" spacing={1}>
                            <Text fontSize="xs" fontWeight="black" color="gray.500">EXPERIMENT METADATA</Text>
                            <Text fontSize="xs"><b>Layers:</b> {currentLayer}</Text>
                            <Text fontSize="xs"><b>Sigma:</b> 0.5</Text>
                        </VStack>
                        <VStack align="flex-start" spacing={1}>
                            <Text fontSize="xs" fontWeight="black" color="blue.600">COHORT 1 (LEFT)</Text>
                            <Text fontSize="xs"><b>Samples (N):</b> {data[0]?.sampleIds?.length || 0}</Text>
                            <Text fontSize="xs"><b>Selected Genes:</b> {leftSelectedPoints.length}</Text>
                        </VStack>
                        <VStack align="flex-start" spacing={1}>
                            <Text fontSize="xs" fontWeight="black" color="orange.600">COHORT 2 (RIGHT)</Text>
                            <Text fontSize="xs"><b>Samples (N):</b> {data[1]?.sampleIds?.length || 0}</Text>
                            <Text fontSize="xs"><b>Selected Genes:</b> {rightSelectedPoints.length}</Text>
                        </VStack>
                    </SimpleGrid>

                    {/* Panel A: Landscapes */}
                    <Box>
                        <HStack spacing={2} mb={2}>
                            <Text fontSize="md" fontWeight="black" bg="black" color="white" px={2} borderRadius="sm">A</Text>
                            <Heading size="xs">Comparison of Gene Expression Landscapes</Heading>
                        </HStack>
                        <SimpleGrid columns={2} spacing={4}>
                            <Box h="300px" border="1px solid lightgray" borderRadius="sm" overflow="hidden" position="relative">
                                <Text position="absolute" top={1} left={2} fontSize="10px" fontWeight="bold" zIndex={1} bg="rgba(255,255,255,0.8)" px={1}>LEFT COHORT</Text>
                                <TerrainView
                                    points={data[0]?.points || []}
                                    viewport={viewport}
                                    setViewport={setViewport}
                                    currentLayer={currentLayer}
                                    onInteractionStart={() => { }}
                                    isLassoMode={false}
                                    activeLasso={[]}
                                    setActiveLasso={() => { }}
                                    onLassoComplete={() => { }}
                                    persistentLasso={leftPersistentLassoPath}
                                    lineThickness={0.12}
                                    isolineSpacing={1.0}
                                />
                            </Box>
                            <Box h="300px" border="1px solid lightgray" borderRadius="sm" overflow="hidden" position="relative">
                                <Text position="absolute" top={1} left={2} fontSize="10px" fontWeight="bold" zIndex={1} bg="rgba(255,255,255,0.8)" px={1}>RIGHT COHORT</Text>
                                <TerrainView
                                    points={data[1]?.points || []}
                                    viewport={viewport}
                                    setViewport={setViewport}
                                    currentLayer={currentLayer}
                                    onInteractionStart={() => { }}
                                    isLassoMode={false}
                                    activeLasso={[]}
                                    setActiveLasso={() => { }}
                                    onLassoComplete={() => { }}
                                    persistentLasso={rightPersistentLassoPath}
                                    lineThickness={0.12}
                                    isolineSpacing={1.0}
                                />
                            </Box>
                        </SimpleGrid>
                    </Box>

                    {/* Panel B: Top Genes */}
                    <Box>
                        <HStack spacing={2} mb={2}>
                            <Text fontSize="md" fontWeight="black" bg="black" color="white" px={2} borderRadius="sm">B</Text>
                            <Heading size="xs">Top Differentially Expressed Genes</Heading>
                        </HStack>
                        <Box h="250px" border="1px solid lightgray" p={2}>
                            <GeneBarChart
                                leftGenes={leftSelectedPoints}
                                rightGenes={rightSelectedPoints}
                                isSynced={isLassoSynced}
                            />
                        </Box>
                    </Box>

                    {/* Panel C: Pathway Enrichment */}
                    <Box>
                        <HStack spacing={2} mb={2}>
                            <Text fontSize="md" fontWeight="black" bg="black" color="white" px={2} borderRadius="sm">C</Text>
                            <Heading size="xs">Differential Biological Pathway Enrichment</Heading>
                        </HStack>
                        <SimpleGrid columns={2} spacing={4}>
                            <Box border="1px solid lightgray" p={2}>
                                <Text fontSize="x-small" fontWeight="bold" mb={2} color="blue.700">LEFT ENRICHMENT</Text>
                                <LollipopMini data={leftEnrichRows.slice(0, 8)} />
                            </Box>
                            <Box border="1px solid lightgray" p={2}>
                                <Text fontSize="x-small" fontWeight="bold" mb={2} color="orange.700">RIGHT ENRICHMENT</Text>
                                <LollipopMini data={rightEnrichRows.slice(0, 8)} />
                            </Box>
                        </SimpleGrid>
                    </Box>

                    {/* Panel D: Interaction Networks */}
                    <Box>
                        <HStack spacing={2} mb={2}>
                            <Text fontSize="md" fontWeight="black" bg="black" color="white" px={2} borderRadius="sm">D</Text>
                            <Heading size="xs">Functional Interaction Networks</Heading>
                        </HStack>
                        <SimpleGrid columns={2} spacing={4}>
                            <Box h="200px" border="1px solid lightgray" borderRadius="sm">
                                <NetworkMiniPaths rows={leftEnrichRows} side="left" />
                            </Box>
                            <Box h="200px" border="1px solid lightgray" borderRadius="sm">
                                <NetworkMiniPaths rows={rightEnrichRows} side="right" />
                            </Box>
                        </SimpleGrid>
                    </Box>

                    {/* AI Interpretation */}
                    {aiSummary && (
                        <Box bg="blue.50" p={4} borderRadius="sm" border="1px solid" borderColor="blue.100">
                            <Heading size="xs" color="blue.800" mb={2}>AI Biological Interpretation</Heading>
                            <Text fontSize="10px" fontStyle="serif" lineHeight="1.6" textAlign="justify">
                                {aiSummary}
                            </Text>
                        </Box>
                    )}

                    {/* Footer */}
                    <Center borderTop="1px solid lightgray" pt={2}>
                        <Text fontSize="8px" color="gray.400">GeneTerrain Visualization Platform • Generated for Research Purposes</Text>
                    </Center>
                </VStack>
            </Box>

            {/* Footer / Status Bar */}
            <Box bg="gray.100" px={6} py={3} borderTop="1px" borderColor="gray.200">
                <Flex justify="space-between" align="center">
                    <HStack spacing={4}>
                        <Text fontSize="sm" color="gray.600">Zoom: {Math.round(viewport.scale * 100)}%</Text>
                        {isLassoMode && <Badge colorScheme="orange">Lasso Tool Active</Badge>}
                    </HStack>
                    <HStack spacing={4}>
                        <Button size="sm" variant="outline" borderColor="gray.300" color="gray.600" onClick={handleResetView} leftIcon={<Icon as={MdCenterFocusStrong} />}>
                            Reset View
                        </Button>
                        <Button size="sm" bg="green.500" color="white" onClick={handleClose} _hover={{ bg: "green.600" }}>
                            Close
                        </Button>
                    </HStack>
                </Flex>
            </Box>
        </Box>
    );
}
