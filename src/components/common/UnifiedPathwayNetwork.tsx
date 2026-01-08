// UnifiedPathwayNetwork.tsx — Onboarding center view → Full view on Generate
// - If no stored genes, show message to go to GeneTerrain and select genes (or paste genes below)
// - Left panel unchanged (not slimmed)
// - Generate/CSV buttons unchanged
// - Network tab mini-chart keeps smaller bubbles

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Box,
  Grid,
  Heading,
  Text,
  Select,
  Button,
  Input,
  Textarea,
  Badge,
  Spinner,
  HStack,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Checkbox,
  CheckboxGroup,
  SimpleGrid,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Link,
} from '@chakra-ui/react';

import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  Tooltip as ReTooltip,
  Scatter,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import Chart from 'chart.js/auto';
import { toPng, toSvg } from 'html-to-image';

// ▼ vis-network
import { Network, DataSet } from 'vis-network/standalone';
import 'vis-network/styles/vis-network.css';

// ──────────────────────────────────────────────────────────────
// Types & helpers
// ──────────────────────────────────────────────────────────────
interface EnrichrRow {
  category: string;
  fold: number;
  fdr: number;              // existing (-log10(FDR)) used elsewhere
  genes: number;
  overlapGenes: string[];
  pneg?: number;            // NEW: -log10(raw p) for the legend only (not used now)
}
interface GProfResultItem {
  description: string;
  p_value: number;
  intersection_size: number;
  term_size: number;
  native: string;
  source: string;
  significant: boolean;
  group_id: string | number;
  intersections: string[][];
}
interface GProfResponse { result: GProfResultItem[] }


const DATA_SOURCES = [
  { id: 'GO:BP', label: 'GO:BP' },
  { id: 'GO:CC', label: 'GO:CC' },
  { id: 'GO:MF', label: 'GO:MF' },
  { id: 'KEGG',  label: 'KEGG' },
  { id: 'REAC',  label: 'Reactome' },
];

const ENRICHR_MAP: Record<string, string> = {
  'GO:BP': 'GO_Biological_Process_2023',
  'GO:MF': 'GO_Molecular_Function_2023',
  'GO:CC': 'GO_Cellular_Component_2023',
  'KEGG':  'KEGG_2021_Human',
  'REAC':  'Reactome_2022',
};

const ENRICHMENT_STORAGE_KEY = 'ENRICHMENT_SELECTED_GENES';

function parseGenes(raw: string): string[] {
  return raw.split(/[\n,;\t ]+/).map((g) => g.trim()).filter(Boolean);
}
function colorScale(value: number, metric: 'fdr'|'fold'|'genes') {
  if (metric === 'fdr') {
    if (value > 14) return '#e51f25';
    if (value > 10) return '#d9265f';
    if (value > 6)  return '#a846b1';
    if (value > 3)  return '#8b54c7';
    return '#6f5fcf';
  } else if (metric === 'fold') {
    if (value > 100) return '#e51f25';
    if (value > 70)  return '#d9265f';
    if (value > 50)  return '#a846b1';
    if (value > 25)  return '#8b54c7';
    return '#6f5fcf';
  } else {
    if (value > 20) return '#e51f25';
    if (value > 15) return '#d9265f';
    if (value > 10) return '#a846b1';
    if (value > 5)  return '#8b54c7';
    return '#6f5fcf';
  }
}
function toCSV(rows: EnrichrRow[]) {
  const header = ['Category','CombinedScore','-log10(FDR)','Genes'];
  const lines = rows.map(d => [`"${d.category}"`, d.fold, d.fdr, d.genes].join(','));
  return [header.join(','), ...lines].join('\n');
}
function downloadBlob(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a);
  a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
function cleanDescription(desc: string): string {
  const c = desc
    .toLowerCase()
    .replace(/^(positive |negative )?regulation of |involved in| process$|^cellular /, '')
    .replace(/pathway$/, '')
    .trim();
  return c.charAt(0).toUpperCase() + c.slice(1);
}
// ---- helpers for node labels/colors in vis-network
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
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function fdrToColor(fdr: number) {
  // Map -log10(FDR) 0..20 → hue 140 (green) .. 0 (red)
  const v = clamp(fdr, 0, 20);
  const h = 140 - (v / 20) * 140; // 140→0
  const bg = `hsl(${h} 85% 60%)`;
  const border = `hsl(${h} 90% 42%)`;
  const hover = `hsl(${h} 88% 55%)`;
  return { bg, border, hover };
}
function intersectCount(a: string[], b: string[]) {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a);
  let c = 0; for (const g of b) if (setA.has(g)) c++; return c;
}
// Robust getter: supports several possible field names for "genes"
const getGeneCount = (d: any) =>
  d?.genes ?? d?.geneCount ?? d?.nGenes ?? d?.Genes ?? 0;

// HTML-equivalent sizing (kept for reference):
// diameter = (genes / 10) * circleSize  → radius = diameter / 2
const computeHeadRadius = (genes: number, circleSize: number) => {
  const diameter = (genes / 10) * circleSize;
  return Math.max(2, diameter / 2); // small floor so tiny counts are still visible
};

// Custom circle "head" that Recharts Scatter will draw per point
const LollipopHead: React.FC<any> = ({
  cx, cy, payload, fill, stroke, circleSize = 4, maxGenes
}) => {
  const genes = getGeneCount(payload);
  // Dynamic, data-aware head sizing:
  // Map genes ∈ [0, maxGenes] --> radius ∈ [minR, maxR]
  const minR = Math.max(3, circleSize);          // visible floor
  const maxR = minR + circleSize * 3;            // amplify head range
  const t = maxGenes > 0 ? genes / maxGenes : 0; // 0..1
  const r = minR + t * (maxR - minR);
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke ?? 'none'} />;
};

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export default function UnifiedPathwayNetwork(
  {
    embedded = false,
    onOpenKnowledgeGraph,
  }: {
    embedded?: boolean;
    onOpenKnowledgeGraph?: (payload: { genes: string[]; datasetId: string }) => void;
  } = {}
): React.ReactElement {

  // Start with onboarding if no stored genes; user can paste genes and Generate
  const [isOnboarding, setIsOnboarding] = useState<boolean>(true);
  const [geneText, setGeneText] = useState<string>(''); // empty at start
  const [pathwaysToShow, setPathwaysToShow] = useState<number>(10);
  const [selectedSources, setSelectedSources] = useState<string[]>(['GO:BP']);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  
  const [datasetId, setDatasetId] = useState("");


  const hasGenes = useMemo(() => parseGenes(geneText).length > 0, [geneText]);

  // Pathways (Enrichr)
  const [rows, setRows] = useState<EnrichrRow[]>([]);
  const [loadingEnrichr, setLoadingEnrichr] = useState(false);
  const [sortBy, setSortBy] = useState<'fold' | 'fdr' | 'genes' | 'category'>('fold');
  const [xAxis, setXAxis] = useState<'fold' | 'fdr' | 'genes'>('fold');
  const [colorBy, setColorBy] = useState<'fold' | 'fdr' | 'genes'>('fdr');
  const [sizeBy, setSizeBy] = useState<'fold' | 'fdr' | 'genes'>('genes'); // present but heads are genes-based per spec
  const [fontSize, setFontSize] = useState<number>(14);
  const [circleSize, setCircleSize] = useState<number>(4);
  const [chartType, setChartType] = useState<'lollipop'|'dotplot'|'barplot'|'barplot_inside'>('lollipop');

  const displayData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      const av = (a as any)[sortBy] ?? 0; const bv = (b as any)[sortBy] ?? 0; return bv - av;
    });
    return sorted.slice(0, pathwaysToShow);
  }, [rows, sortBy, pathwaysToShow]);

  const xDomain = useMemo(() => {
    const vals = displayData.map((d) => (d as any)[xAxis] ?? 0);
    const max = Math.max(1, ...vals);
    const scaledMax = Math.ceil((max * 1.1) / 10) * 10; return [0, scaledMax];
  }, [displayData, xAxis]);

  const chartData = useMemo(() => displayData.map((d, i) => ({ ...d, __idx: i })), [displayData]);

  // For head sizing that adapts to the current dataset
  const maxGenes = useMemo(
    () => Math.max(1, ...chartData.map((d: any) => d.genes || 0)),
    [chartData]
  );

  // Shows how many genes are currently selected (for the small summary line)
const selectedGeneTotal = useMemo(() => parseGenes(geneText).length, [geneText]);

// Tick labels for the size legend (min, ~1/3, ~2/3, max of observed gene counts)
const geneTicks = useMemo(() => {
  const counts = chartData.map((d: any) => d.genes || 0);
  const gmin = Math.min(...counts, 0);
  const gmax = Math.max(...counts, 0);
  if (gmax <= 0) return [0, 1, 2, 3];
  const t1 = Math.round(gmin + (gmax - gmin) * 0.33);
  const t2 = Math.round(gmin + (gmax - gmin) * 0.66);
  return Array.from(new Set([gmin, t1, t2, gmax])).filter((n) => n > 0);
}, [chartData]);



// Match the lollipop head sizing exactly for legend circles
const diameterForGenes = useCallback((g: number) => {
  const minR = Math.max(3, circleSize);
  const maxR = minR + circleSize * 3;
  const t = maxGenes > 0 ? g / maxGenes : 0;
  return 2 * (minR + t * (maxR - minR));
}, [maxGenes, circleSize]);

const genesLegendMaxDiameter = useMemo(() => {
  if (!geneTicks.length) return 12;
  return Math.max(12, ...geneTicks.map((g) => Math.round(diameterForGenes(g))));
}, [geneTicks, diameterForGenes]);



  const colorAccessor = useCallback(
    (d: EnrichrRow) => colorScale((d as any)[colorBy] ?? 0, colorBy),
    [colorBy]
  );

  // (kept for legacy; not used by Scatter anymore)
  const sizeAccessor = useCallback((d: EnrichrRow) => {
    if (sizeBy === 'genes') {
      const genes = d.genes ?? 0;
      const diameter = (genes / 10) * circleSize;
      return Math.max(2, diameter / 2);
    }
    const v = (d as any)[sizeBy] ?? 0;
    const base = 4;
    let scaled = v;
    if (sizeBy === 'fdr')  scaled = clamp(v, 0, 20);
    if (sizeBy === 'fold') scaled = clamp(v, 0, 100) / 5;
    return base + (scaled * (circleSize / 6));
  }, [sizeBy, circleSize]);

  const customTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d: EnrichrRow = payload[0].payload;
    return (
      <Box bg="rgba(26,32,44,0.95)" color="white" p={3} rounded="md" boxShadow="lg">
        <Text fontWeight="bold" borderBottom="1px" borderColor="whiteAlpha.300" pb={1} mb={2}>
          {d.category}
        </Text>
        <HStack justify="space-between"><Text opacity={0.8}>Combined:</Text><Text fontWeight="semibold">{d.fold}</Text></HStack>
        <HStack justify="space-between"><Text opacity={0.8}>-log10(FDR):</Text><Text fontWeight="semibold">{d.fdr}</Text></HStack>
        <HStack justify="space-between"><Text opacity={0.8}>Genes:</Text><Text fontWeight="semibold">{d.genes}</Text></HStack>
      </Box>
    );
  }, []);

  // g:Profiler (kept for future)
  const [gData, setGData] = useState<GProfResponse | null>(null);
  const [loadingGProf, setLoadingGProf] = useState(false);

  const getPrimaryEnrichrLibrary = useCallback((): string => {
    const src = (selectedSources.length ? selectedSources : ['GO:BP']).find((s) => ENRICHR_MAP[s]);
    return ENRICHR_MAP[src || 'GO:BP'];
  }, [selectedSources]);

  const openKnowledgeGraph = (row: EnrichrRow) => {
  console.log('Opening Knowledge Graph for', row);
  const payload = {
    genes: row.overlapGenes || [],
    datasetId: datasetId,  // or use real datasetId if available
  };
  localStorage.setItem("KNOWLEDGE_GRAPH_DATA", JSON.stringify(payload));
  window.open("/knowledge-graph", "_blank", "noopener,noreferrer");
};

  // ────────────────────────────────────────────────────────────
  // NetworkPane — shows labels in nodes & colored fills
  // ──────────────────────────────────────────────────────────────
  function NetworkPane() {
    const [visibleNodes, setVisibleNodes] = useState<{ id: string; label: string }[]>([]);
    const [query, setQuery] = useState('');

    const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const [netChartType, setNetChartType] = useState<'dot' | 'bar'>('dot');

    const containerRef = useRef<HTMLDivElement | null>(null);
    const networkRef = useRef<Network | null>(null);
    const nodesRef = useRef(new DataSet<any>([]));
    const edgesRef = useRef(new DataSet<any>([]));

    const buildVisGraph = useCallback((items: EnrichrRow[]) => {
      const capped = items.slice(0, Math.min(pathwaysToShow, items.length));

      const visNodes = capped.map((r, i) => {
        const name = wrapLabel(cleanDescription(r.category));

        // ✨ Use the SAME palette function as Pathways
        const fill = colorScale((r as any)[colorBy] ?? 0, colorBy);

        const size = Math.max(16, Math.min(40, 10 + r.genes * 1.1));
        return {
          id: i + 1,
          label: name,
          title: `${r.category}\n- log10(FDR): ${r.fdr}  •  Combined: ${r.fold}  •  Genes: ${r.genes}`,
          shape: 'dot',
          size,
          borderWidth: 2,
          color: {
            background: fill,
            border: fill,
            highlight: { background: fill, border: fill },
            hover: { background: fill, border: fill },
          },
          font: {
            color: '#111827',
            face: 'Inter, ui-sans-serif, system-ui',
            size: 14,
            strokeWidth: 3,
            strokeColor: '#ffffff',
          },
        };
      });

      const edges: any[] = [];
      for (let i = 0; i < capped.length; i++) {
        for (let j = i + 1; j < capped.length; j++) {
          const c = intersectCount(capped[i].overlapGenes, capped[j].overlapGenes);
          if (c > 0) {
            edges.push({
              from: i + 1,
              to: j + 1,
              width: Math.min(5, 1 + Math.log2(1 + c)),
              color: { color: '#94a3b8', highlight: '#0ea5e9' },
              // straight edges only
              shadow: false,
              smooth: false,
            });
          }
        }
      }

      nodesRef.current = new DataSet(visNodes);
      edgesRef.current = new DataSet(edges);

      if (!containerRef.current) return;
      networkRef.current?.destroy();
      networkRef.current = new Network(
        containerRef.current,
        { nodes: nodesRef.current, edges: edgesRef.current },
        {
          autoResize: true,
          layout: { improvedLayout: true },
          interaction: { zoomView: true, dragView: true, hover: true, navigationButtons: true },
          physics: {
            solver: 'forceAtlas2Based',
            stabilization: { iterations: 220, updateInterval: 25 },
            forceAtlas2Based: { gravitationalConstant: -32, centralGravity: 0.015, springLength: 120, springConstant: 0.08, damping: 0.45, avoidOverlap: 1 },
          },
          nodes: { shape: 'dot' },
          edges: {
            selectionWidth: 2.25,
            color: { color: '#CBD5E1' },
            smooth: false
          },
        }
      );

      networkRef.current.once('stabilized', () => {
        networkRef.current?.setOptions({ physics: false });
        networkRef.current?.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
      });

      setVisibleNodes(
        visNodes.map((n, i) => ({ id: String(i + 1), label: cleanDescription(capped[i].category) }))
                .sort((a, b) => a.label.localeCompare(b.label))
      );

      const ro = new ResizeObserver(() => networkRef.current?.fit({ animation: false }));
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }, [pathwaysToShow, colorBy]);

    // Mini chart (smaller bubbles) — left as-is
    const buildChart = useCallback((items: EnrichrRow[]) => {
      const ctx = chartCanvasRef.current?.getContext('2d'); if (!ctx) return;
      if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null; }
      const top = items.slice(0, Math.max(1, Math.min(pathwaysToShow, items.length)));
      const labels = top.map(d => {
        const s = cleanDescription(d.category);
        return s.length > 35 ? s.slice(0,32) + '…' : s;
        });
      if (netChartType === 'dot') {
        const dataset = top.map((d, idx) => ({
          x: d.fdr,
          y: idx,
          r: Math.max(2, Math.min(12, 3 + d.genes * 0.4)),
          raw: d
        }));
        const colors = top.map((d) => colorScale((d as any)[colorBy] ?? 0, colorBy)); // ✨ same palette
        chartInstanceRef.current = new Chart(ctx, {
          type: 'bubble',
          data: { labels, datasets: [{ label: 'Pathway', data: dataset as any, backgroundColor: colors, borderColor: colors, borderWidth: 1 }] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { beginAtZero: true, title: { display: true, text: '-log10(FDR)' }, grid: { color: '#efefef' } },
              y: { type: 'category', offset: true, ticks: { font: { size: 9 } }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
          },
        });
      } else {
        const data = top.map(d => d.fdr);
        const colors = top.map(d => colorScale((d as any)[colorBy] ?? 0, colorBy)); // ✨ same palette
        chartInstanceRef.current = new Chart(ctx, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Pathway', data, backgroundColor: colors, borderColor: colors, borderWidth: 1 }] },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { beginAtZero: true, title: { display: true, text: '-log10(FDR)' }, grid: { color: '#efefef' } },
              y: { ticks: { font: { size: 9 } }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
          },
        });
      }
    }, [netChartType, pathwaysToShow, colorBy]);

    useEffect(() => {
      if (!displayData.length) return;
      const cleanup = buildVisGraph(displayData);
      buildChart(displayData);
      return cleanup;
    }, [displayData, netChartType, buildVisGraph, buildChart]);

    const filteredList = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return visibleNodes;
      return visibleNodes.filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
    }, [query, visibleNodes]);

    const focusNode = (id: string) => {
      if (!networkRef.current) return;
      networkRef.current.selectNodes([id], false);
      networkRef.current.focus(id, { scale: 1.6, animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
    };

    const savePng = async () => {
      if (!containerRef.current) return;
      const dataUrl = await toPng(containerRef.current, { backgroundColor: 'white' });
      const a = document.createElement('a');
      a.download = 'network.png';
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    const saveSvg = async () => {
      if (!containerRef.current) return;
      const dataUrl = await toSvg(containerRef.current);
      const a = document.createElement('a');
      a.download = 'network.svg';
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    // ⬇️ Right column rebuilt as a flex column:
    //    - Search panel grows (more height)
    //    - Save buttons live in a footer pinned to the bottom of the column
    return (
      // ...inside NetworkPane() return:

<Grid templateColumns={{ base: '1fr', xl: '1fr 320px' }} gap={4}>
  <Box
    ref={containerRef}
    style={{ height: 560, width: '100%', cursor: 'grab' }}
    border="1px solid #e2e8f0"
    rounded="xl"
    overflow="hidden"
    bg="#fff"
    boxShadow="0 8px 24px rgba(2,6,23,0.06)"
  />

  {/* ⬇️ Right column: sticky, capped height, keeps room for footer buttons */}
    <Box
    display="flex"
    flexDirection="column"
    position={embedded ? "relative" : "sticky"}
    top={embedded ? undefined : 0}
    maxH={embedded ? "560px" : "calc(100vh - 200px)"}
    minH="560px"
    overflow="hidden"
  >

    {/* Search Nodes panel — fills available space, but won’t exceed the cap */}
    <Box
      bg="white"
      border="1px solid #e2e8f0"
      rounded="xl"
      p={3}
      boxShadow="0 8px 24px rgba(2,6,23,0.06)"
      display="flex"
      flexDirection="column"
      flex="1"
      minH={0}                   // ← required for inner scroll areas in flex columns
    >
      <Text fontWeight="semibold" color="#2d3748" mb={2}>Search Nodes</Text>
      <Input size="sm" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Type to filter…" />

      {/* ⬇️ This list is now the scroller */}
      <Box
        mt={2}
        flex="1"
        minH={0}                 // ← enables scrolling instead of growing
        overflowY="auto"         // ← the actual scroll
        border="1px solid #e2e8f0"
        rounded="md"
      >
        {filteredList.map(n => (
          <Button
            key={n.id}
            size="sm"
            variant="ghost"
            justifyContent="space-between"
            onClick={() => focusNode(n.id)}
            width="100%"
          >
            <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.label}</span>
            <Badge ml={2} colorScheme="gray">{n.id}</Badge>
          </Button>
        ))}
        {!filteredList.length && <Text p={3} fontSize="sm" color="#6b7280">No matches.</Text>}
      </Box>
    </Box>

    {/* Footer with Save buttons stays visible */}
    <Box mt="auto" pt={3}>
      <HStack>
        <Button size="sm" variant="outline" onClick={savePng}>Save PNG</Button>
        <Button size="sm" variant="outline" onClick={saveSvg}>Save SVG</Button>
      </HStack>
    </Box>
  </Box>
</Grid>

    );
  }

  // APIs
  const runEnrichr = useCallback(async (genesOverride?: string[]) => {
    const genes = genesOverride ?? parseGenes(geneText);
    if (!genes.length) { toast({ status: 'warning', title: 'Please paste at least one gene.' }); return; }
    const enrichrLibrary = getPrimaryEnrichrLibrary();
    setLoadingEnrichr(true);
    try {
      const formData = new FormData();
      formData.append('list', genes.join('\n'));
      formData.append('description', 'Unified Enrichr query');
      const addRes = await fetch('https://maayanlab.cloud/Enrichr/addList', { method: 'POST', body: formData });
      if (!addRes.ok) throw new Error('Failed to add list to Enrichr');
      const addJson = await addRes.json();
      const userListId = addJson.userListId;

      const enrRes = await fetch(`https://maayanlab.cloud/Enrichr/enrich?userListId=${userListId}&backgroundType=${encodeURIComponent(enrichrLibrary)}`);
      if (!enrRes.ok) throw new Error('Failed to fetch enrichment results');
      const enrJson = await enrRes.json();
      const table = enrJson[enrichrLibrary] || [];

      const parsed: EnrichrRow[] = table.map((r: any[]) => {
        const term = String(r?.[1] ?? '');
        const combined = Number(r?.[4] ?? 0);
        const overlapRaw: any = r?.[5];
        const adjP = Number(r?.[6] ?? 1);       // keep FDR as-is for existing UI
        const rawP = Number(r?.[2] ?? 1);       // NEW: raw p (not used now)

        const overlapArr = Array.isArray(overlapRaw)
          ? overlapRaw.filter(Boolean)
          : (typeof overlapRaw === 'string' ? overlapRaw.split(/[;,\s/]+/).filter(Boolean) : []);

        const fdrNegLog10 = adjP > 0 ? +(-Math.log10(adjP)).toFixed(2) : 0;
        const pNegLog10   = rawP > 0 ? +(-Math.log10(rawP)).toFixed(2) : 0;   // NEW (not used now)

        return {
          category: term,
          fold: Math.round(combined),
          fdr: fdrNegLog10,
          genes: overlapArr.length,
          overlapGenes: overlapArr as string[],
          pneg: pNegLog10,      // NEW (not used now)
        };
      });

      setRows(parsed);
    } finally {
      setLoadingEnrichr(false);
    }
  }, [geneText, toast, getPrimaryEnrichrLibrary]);

  const runGProfiler = useCallback(async (genesOverride?: string[]) => {
    const genes = genesOverride ?? parseGenes(geneText);
    const sources = selectedSources.length ? selectedSources : ['GO:BP'];
    if (!genes.length) { toast({ status: 'warning', title: 'Please paste at least one gene.' }); return; }
    setLoadingGProf(true);
    try {
      const resp = await fetch('https://biit.cs.ut.ee/gprofiler/api/gost/profile/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organism: 'hsapiens', query: genes, sources }),
      });
      if (!resp.ok) throw new Error(`API Error: ${resp.statusText}`);
      const data: GProfResponse = await resp.json();
      if (!data.result) throw new Error('No results from g:Profiler.');
      setGData(data);
    } finally {
      setLoadingGProf(false);
    }
  }, [geneText, selectedSources, toast]);

  const onGenerate = useCallback(async (genesOverride?: string[]) => {
    setBusy(true);
    try {
      await Promise.all([runEnrichr(genesOverride), runGProfiler(genesOverride)]);
      toast({ status: 'success', title: 'Analysis complete.' });
    } catch (e: any) {
      toast({ status: 'error', title: e?.message || 'Failed to analyze.' });
    } finally {
      setBusy(false);
    }
  }, [runEnrichr, runGProfiler, toast]);

  // Bootstrap stored genes (if present, go straight to full view and run)
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    try {
      const raw = localStorage.getItem(ENRICHMENT_STORAGE_KEY);
      if (!raw) { bootstrappedRef.current = true; return; }
      const parsed = JSON.parse(raw);
      const arr: string[] = Array.isArray(parsed?.genes)
        ? parsed.genes.filter((g: any) => typeof g === 'string')
        : [];
      setDatasetId(parsed?.datasetId);
      console.log('Bootstrapping stored genes from dataset:', datasetId);
      // localStorage.removeItem(ENRICHMENT_STORAGE_KEY);
      bootstrappedRef.current = true;

      if (arr.length) {
        setGeneText(arr.join('\n'));
        setIsOnboarding(false); // jump to full UI
        (async () => {
          setBusy(true);
          try {
            await Promise.all([runEnrichr(arr), runGProfiler(arr)]);
            toast({ status: 'success', title: `Loaded ${arr.length} gene(s) and analyzed.` });
          } catch (e: any) {
            toast({ status: 'error', title: e?.message || 'Failed to analyze stored genes.' });
          } finally {
            setBusy(false);
          }
        })();
      }
    } catch {
      bootstrappedRef.current = true;
    }
  }, [runEnrichr, runGProfiler, toast]);

  // ──────────────────────────────────────────────────────────────
  // Onboarding (center) view — updated message
  // ──────────────────────────────────────────────────────────────
  const showOnboarding = isOnboarding;

  if (showOnboarding) {
    const handleGenerateFromOnboarding = async () => {
      if (!hasGenes) return;
      setIsOnboarding(false);               // move to full view immediately
      await onGenerate();                   // run analysis in full UI
    };

    return (
  <Box
    bg={embedded ? "transparent" : "#f7fafc"}
    minH={embedded ? "100%" : "100vh"}
    h={embedded ? "100%" : undefined}
    p={embedded ? 0 : 4}
    overflow={embedded ? "auto" : undefined}
    display="flex"
    alignItems="center"
    justifyContent="center"
  >        <Box
          bg="white"
          border="1px solid #e2e8f0"
          rounded="xl"
          p={{ base: 5, md: 7 }}
          width={{ base: '100%', sm: '520px', md: '720px' }}
          textAlign="center"
          boxShadow="0 12px 30px rgba(2,6,23,0.08)"
        >
          <Heading size="md" color="#1f2937" mb={3}>No genes selected</Heading>
          <Text fontSize="md" color="#4b5563">
            Please go to{' '}
            <Link href="/" color="green.600" fontWeight="semibold" textDecoration="underline">
              GeneTerrain
            </Link>{' '}
            and select your genes. Then return here to view pathways and the network.
          </Text>
        </Box>
      </Box>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // Main UI (left panel + tabs) after onboarding
  // ──────────────────────────────────────────────────────────────
  return (
<Box
    bg={embedded ? "transparent" : "#f7fafc"}
    minH={embedded ? "100%" : "100vh"}
    h={embedded ? "100%" : undefined}
    p={embedded ? 0 : { base: 3, md: 5 }}
    overflow={embedded ? "auto" : undefined}
  >      <Grid templateColumns={{ base: '1fr', lg: '320px 1fr' }} gap={4}>
        {/* LEFT CONTROL PANEL */}
        <Box bg="white" border="1px solid #e2e8f0" rounded="xl" p={4} position="sticky" top={4} h="auto">
          <Heading size="sm" color="#334155" mb={3}>Controls</Heading>

          <Box mb={4}>
            <Text fontSize="xs" fontWeight="semibold" color="#64748b" mb={2} textTransform="uppercase" letterSpacing="0.5px">Gene List</Text>
            <Textarea value={geneText} onChange={(e) => setGeneText(e.target.value)} minH="140px" placeholder="One gene per line, comma, or space separated" />
          </Box>

          <Box mb={4}>
            <Text fontSize="xs" fontWeight="semibold" color="#64748b" mb={2} textTransform="uppercase" letterSpacing="0.5px">Data Sources</Text>
            <CheckboxGroup colorScheme="green" value={selectedSources} onChange={(v) => setSelectedSources(v as string[])}>
              <SimpleGrid columns={2} spacing={2}>{DATA_SOURCES.map(s => (<Checkbox key={s.id} value={s.id}>{s.label}</Checkbox>))}</SimpleGrid>
            </CheckboxGroup>
          </Box>

          {/* Pathways to Show (slider) */}
          <Box mb={3}>
            <Text fontSize="xs" color="#64748b" mb={1}>Pathways to Show</Text>
            <HStack>
              <Slider
                aria-label="pathways-to-show"
                flex="1"
                value={pathwaysToShow}
                min={5}
                max={80}
                step={5}
                onChange={(v)=>setPathwaysToShow(v)}
              >
                <SliderTrack height="6px" bg="gray.100">
                  <SliderFilledTrack bg="purple.400" />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Box as="span" w="10" textAlign="right" fontSize="sm" color="gray.700">
                {pathwaysToShow}
              </Box>
            </HStack>
          </Box>

          {/* Generate (wider) + Export CSV (narrower), same height */}
          <HStack mb={4} spacing={3} align="center">
            <Button
              colorScheme="green"
              size="md"
              h="44px"
              onClick={() => onGenerate()}
              isLoading={busy}
              flex="1"                 // wider
              isDisabled={!hasGenes}
            >
              Generate
            </Button>

            <Button
              variant="outline"
              size="md"
              h="44px"
              minW="140px"            // narrower, fixed-ish
              onClick={() => downloadBlob(toCSV(rows), 'enrichment.csv', 'text/csv')}
              isDisabled={!hasGenes}
            >
              Export CSV
            </Button>
          </HStack>
        </Box>

        {/* RIGHT CONTENT */}
        <Box>
          <Tabs colorScheme="green" variant="enclosed" defaultIndex={0}>
            <TabList>
              <Tab>Pathways</Tab>
              <Tab>Network</Tab>
            </TabList>
            <TabPanels>
              {/* PATHWAYS */}
              <TabPanel>
                {loadingEnrichr && <HStack><Spinner size="sm" /><Text>Running Enrichr…</Text></HStack>}
                {!loadingEnrichr && !rows.length && <Text color="#64748b">Paste genes on the left and click <b>Generate</b> to see results.</Text>}
                {!!rows.length && (
                  <Box>
                    <Box mb={3}>
                      <HStack spacing={3}>
                        <Box>
                          <Text fontSize="xs" color="#64748b">Sort Pathway by</Text>
                          <Select size="sm" value={sortBy} onChange={(e)=>setSortBy(e.target.value as any)}>
                            <option value="fdr">-log10(FDR)</option>
                            <option value="fold">Fold Enrichment</option>
                            <option value="genes">Genes</option>
                            <option value="category">Category Name</option>
                          </Select>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="#64748b">x-axis</Text>
                          <Select size="sm" value={xAxis} onChange={(e)=>setXAxis(e.target.value as any)}>
                            <option value="fdr">-log10(FDR)</option>
                            <option value="fold">Fold Enrichment</option>
                            <option value="genes">Genes</option>
                          </Select>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="#64748b">Color</Text>
                          <Select size="sm" value={colorBy} onChange={(e)=>setColorBy(e.target.value as any)}>
                            <option value="fdr">-log10(FDR)</option>
                            <option value="fold">Fold Enrichment</option>
                            <option value="genes">Genes</option>
                          </Select>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="#64748b">Size</Text>
                          <Select size="sm" value={sizeBy} onChange={(e)=>setSizeBy(e.target.value as any)}>
                            <option value="fdr">-log10(FDR)</option>
                            <option value="fold">Fold Enrichment</option>
                            <option value="genes">Genes</option>
                          </Select>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="#64748b">Font</Text>
                          <Input size="sm" type="number" min={10} max={20} value={fontSize} onChange={(e)=>setFontSize(parseInt(e.target.value||'14',10))} width="70px" />
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="#64748b">Dot size</Text>
                          <Input size="sm" type="number" min={2} max={10} value={circleSize} onChange={(e)=>setCircleSize(parseInt(e.target.value||'4',10))} width="70px" />
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="#64748b">Chart type</Text>
                          <Select size="sm" value={chartType} onChange={(e)=>setChartType(e.target.value as any)}>
                            <option value="lollipop">lollipop</option>
                            <option value="dotplot">dotplot</option>
                            <option value="barplot">barplot</option>
                            <option value="barplot_inside">barplot_inside</option>
                          </Select>
                        </Box>

                      </HStack>
                    </Box>

                    <Grid templateColumns={{ base: '1fr', xl: '1fr 220px' }} gap={4}>
                      {/* Left = the existing chart */}
                      <Box>
<div style={{ width: '100%', height: 560, position: 'relative' }}>
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart
      layout="vertical"
      data={chartData}
      margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
    >
      <CartesianGrid stroke="#e2e8f0" horizontal={false} />
      <XAxis
        type="number"
        domain={xDomain as any}
        tick={{ fill: '#4a5568', fontSize }}
      />
      <YAxis
        dataKey="category"
        type="category"
        width={360}
        tick={{ fill: '#2d3748', fontSize }}
      />

      {/* Bars (stems) */}
      {(chartType === 'lollipop' ||
        chartType === 'barplot' ||
        chartType === 'barplot_inside') && (
        <Bar
          dataKey={xAxis}
          barSize={
            chartType === 'barplot'
              ? 14
              : chartType === 'barplot_inside'
              ? 10
              : 3
          }
          radius={[2, 2, 2, 2]}
        >
          {chartData.map((d, i) => (
            <Cell key={`stem-${i}`} fill={colorAccessor(d)} />
          ))}
        </Bar>
      )}

      {/* Heads (dots) */}
      {(chartType === 'lollipop' ||
        chartType === 'dotplot' ||
        chartType === 'barplot_inside') && (
        <Scatter
          dataKey={xAxis}
          shape={(props:any) => (
            <LollipopHead
              {...props}
              circleSize={circleSize}
              maxGenes={maxGenes}
              fill={colorAccessor(props.payload)}
              stroke={colorAccessor(props.payload)}
            />
          )}
        />
      )}

      <ReTooltip cursor={{ fill: 'transparent' }} content={customTooltip} />
    </ComposedChart>
  </ResponsiveContainer>

  {/* Y-axis Hover Overlay */}
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '360px',           // same as YAxis width
      height: '100%',
      pointerEvents: 'none',    // so chart remains interactive
    }}
  >
    {chartData.map((row: any, i: number) => {
      const total = chartData.length || 1;
      const chartHeight = 560;              // matches outer div
      const rowHeight = chartHeight / total;
      const rowTop = i * rowHeight;

      // approximate top of the Y-axis label
      const labelTop = rowTop + rowHeight / 2 - fontSize / 2;
      // position the button a bit ABOVE that label
      const buttonTop = Math.max(0, labelTop - fontSize - 4);

      return (
        <div
          key={row.category ?? i}
          style={{
            position: 'absolute',
            top: `${buttonTop}px`,  // button appears above the label
            left: 0,
            width: '360px',
            height: `${rowHeight}px`,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
            padding: '0 8px',
            opacity: 0,
            transition: 'opacity 0.15s ease-out',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        >
         <button
  onClick={(ev) => {
    ev.stopPropagation();

    const payload = {
      genes: row.overlapGenes || [],
      datasetId: datasetId || "Unknown dataset",
    };

    try {
      localStorage.setItem("KNOWLEDGE_GRAPH_DATA", JSON.stringify(payload));
    } catch {}

    // ✅ switch view inside SAME modal (your LassoRegionPanel expects this)
    if (onOpenKnowledgeGraph) {
      onOpenKnowledgeGraph(payload);
      return;
    }

    // fallback: open standalone page
    window.open("/knowledge-graph", "_blank", "noopener,noreferrer");
  }}
>
  View Knowledge Graph
</button>

        </div>
      );
    })}
  </div>
  {/* End Y-Axis Overlay */}
</div>

{/* End Y-Axis Overlay */}

  {/* End Y-Axis Overlay */}
\
                      </Box>

                      {/* Right = EnrichmentFDR legend derived from Fold Enrichment */}
                      {/* Right column: keep EnrichmentFDR on top, add Genes legend at bottom */}
<Box display="flex" flexDirection="column" justifyContent="space-between" minH="560px">
  {/* Top: existing EnrichmentFDR legend (unchanged) */}
  <Box bg="white" border="1px solid #e2e8f0" rounded="xl" p={3} height="fit-content">
    <Text fontWeight="semibold" color="#2d3748" mb={2}>EnrichmentFDR</Text>
    {(() => {
      const folds = chartData.map((d:any) => d.fold || 0);
      const fmin = Math.min(...folds, 0);
      const fmax = Math.max(...folds, 1);
      const scale = (v:number) => {
        if (fmax <= fmin) return 60;
        return 60 + ((v - fmin) * 80) / (fmax - fmin);
      };
      const ticks = [140, 120, 100, 80, 60];
      return (
        <HStack align="stretch" spacing={3}>
          <VStack justify="space-between" spacing={0} fontSize="xs" color="#6b7280">
            {ticks.map((t, idx) => <Text key={idx}>{t}</Text>)}
          </VStack>
          <Box
            width="18px"
            height="140px"
            borderRadius="4px"
            background="linear-gradient(to top, #6f5fcf, #8b54c7, #a846b1, #c93490, #d9265f, #e51f25)"
          />
        </HStack>
      );
    })()}

    <Text paddingTop={3} fontWeight="semibold" color="#2d3748">Genes</Text>
    {/* <Text fontSize="xs" color="#6b7280" mb={2}>Selected: {selectedGeneTotal}</Text> */}

    <VStack align="stretch" spacing={2}>
  {geneTicks.map((g) => {
    const d = Math.max(6, Math.round(diameterForGenes(g)));
    return (
      <HStack key={g} spacing={3} align="center" marginLeft={1}>
        {/* Fixed-width icon column keeps numbers aligned */}
        <Box
          w={`${genesLegendMaxDiameter}px`}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Box
            width={`${d}px`}
            height={`${d}px`}
            borderRadius="50%"
            bg="#3f3f3f"
            flexShrink={0}
          />
        </Box>

        {/* Number column */}
        <Text fontSize="sm" color="#374151" minW="32px" marginBottom={0}>
          {g}
        </Text>
      </HStack>
    );
  })}
  {!geneTicks.length && <Text fontSize="sm" color="#6b7280">No gene size reference available.</Text>}
</VStack>

  </Box>

</Box>

                    </Grid>
                  </Box>
                )}
              </TabPanel>

              {/* NETWORK */}
              <TabPanel>
                {!rows.length && <Text color="#64748b">Run <b>Generate</b> first to build the network.</Text>}
                {!!rows.length && <NetworkPane />}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Grid>
    </Box>
  );
}
