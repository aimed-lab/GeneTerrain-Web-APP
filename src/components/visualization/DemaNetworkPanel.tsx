import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box, VStack, HStack, Text, Spinner, Badge, Tooltip, Center,
  useColorModeValue, IconButton, Collapse, Button, Divider,
} from "@chakra-ui/react";
import { RefreshCw, ChevronDown, ChevronUp, Network, Map as MapIcon } from "lucide-react";
import Plot from "react-plotly.js";
import GaussianMap from "../../GaussianPlots/GaussianMap";
import { Point } from "../../GaussianPlots/types";

const MCP_SERVER_URL = "http://127.0.0.1:8000";

interface DemaNode {
  id: string;
  x: number;
  y: number;
  pathways: string[];
  primary_pathway: string;
}

interface DemaEdge {
  source: string;
  target: string;
  ic: number;
}

interface DemaResult {
  nodes: DemaNode[];
  edges: DemaEdge[];
  pathway_legend: { id: string; name: string }[];
  gene_count: number;
  edge_count: number;
}

export interface CohortData {
  points: Point[];    // lasso-selected expression points
  label: string;     // e.g. "Cohort 1" / "GBM"
  datasetId: string;
}

interface DemaNetworkPanelProps {
  genes: string[];          // gene list driving the DEMA layout
  networkLabel?: string;    // label shown in the network header
  cohorts: CohortData[];    // 1 or 2 cohorts — one terrain rendered per cohort
}

const PATHWAY_COLORS = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
  "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990",
  "#dcbeff", "#9A6324",
];
const DEMA_LAYOUT_TIMEOUT_MS = 90000;
const demaLayoutCache = new Map<string, DemaResult>();

const CANVAS_W = 800;
const CANVAS_H = 600;
const DEMA_CANVAS_PADDING_X = CANVAS_W * 0.1;
const DEMA_CANVAS_PADDING_Y = CANVAS_H * 0.1;

// Compute an initial GaussianMap viewport that centers on the centroid of pts
// and zooms so the ±2σ spread of the data fills ~70% of the canvas.
function computeTerrainViewport(pts: Point[]): { scale: number; offset: { x: number; y: number } } {
  if (pts.length === 0) return { scale: 1, offset: { x: 0, y: 0 } };

  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  const varX = pts.reduce((s, p) => s + (p.x - cx) ** 2, 0) / pts.length;
  const varY = pts.reduce((s, p) => s + (p.y - cy) ** 2, 0) / pts.length;
  const stdX = Math.sqrt(varX) || 1;
  const stdY = Math.sqrt(varY) || 1;

  // Scale so that ±2σ in each axis fits 70% of canvas
  const scaleX = (CANVAS_W * 0.7) / (4 * stdX);
  const scaleY = (CANVAS_H * 0.7) / (4 * stdY);
  const scale = Math.min(scaleX, scaleY, 4);   // cap at 4× zoom

  // Offset to center the centroid in the canvas
  const offset = {
    x: CANVAS_W / 2 - cx * scale,
    y: CANVAS_H / 2 - cy * scale,
  };

  return { scale, offset };
}

function projectDemaPointToCanvas(x: number, y: number) {
  return {
    x: DEMA_CANVAS_PADDING_X + x * (CANVAS_W - DEMA_CANVAS_PADDING_X * 2),
    y: DEMA_CANVAS_PADDING_Y + y * (CANVAS_H - DEMA_CANVAS_PADDING_Y * 2),
  };
}

// Merge DEMA positions with cohort expression data, normalize to canvas space.
// The DEMA x,y (∈ [0,1]) is used as the fixed spatial layout;
// all other Point fields (value, geneName, pathways, description, sampleValues)
// come from the cohort's lasso-selected points.
function buildTerrainPoints(result: DemaResult, cohortPoints: Point[]): Point[] {
  if (cohortPoints.length === 0) return [];

  // Keep only the first occurrence per gene name (duplicate genes can appear
  // when the same gene is rendered at multiple canvas positions in the dataset)
  const exprMap: Record<string, Point> = {};
  cohortPoints.forEach(p => {
    if (!exprMap[p.geneName]) exprMap[p.geneName] = p;
  });

  const seen = new Set<string>();
  const merged: Point[] = [];
  result.nodes.forEach(node => {
    if (seen.has(node.id)) return;   // skip duplicate DEMA node IDs
    seen.add(node.id);
    const expr = exprMap[node.id];
    if (!expr) return;
    const projected = projectDemaPointToCanvas(node.x, node.y);
    merged.push({
      ...expr,
      geneId: node.id,
      geneName: node.id,
      pathways: node.pathways.length > 0 ? node.pathways : expr.pathways,
      description: expr.description || `${node.id} in ${node.primary_pathway}`,
      x: projected.x,
      y: projected.y,
    });
  });

  return merged;
}

const DemaNetworkPanel: React.FC<DemaNetworkPanelProps> = ({
  genes,
  networkLabel = "Selection",
  cohorts,
}) => {
  const [result, setResult] = useState<DemaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkOpen, setIsNetworkOpen] = useState(true);
  const [isTerrainOpen, setIsTerrainOpen] = useState(true);

  const bg          = useColorModeValue("white", "gray.800");
  const border      = useColorModeValue("purple.100", "purple.700");
  const headerBg    = useColorModeValue("purple.50", "purple.900");
  const cohortLabelBg = useColorModeValue("purple.25", "purple.950");
  const loadingOverlayBg = useColorModeValue("rgba(255,255,255,0.88)", "rgba(26,32,44,0.88)");
  const loadingCardBg = useColorModeValue("purple.25", "whiteAlpha.60");

  const lastGenesKey = useRef<string>("");
  const abortRef     = useRef<AbortController | null>(null);

  const runLayout = useCallback(async (geneList: string[]) => {
    if (geneList.length < 3) return;

    const cacheKey = [...geneList].map((gene) => gene.toUpperCase()).sort().join(",");
    if (demaLayoutCache.has(cacheKey)) {
      setResult(demaLayoutCache.get(cacheKey)!);
      setError(null);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let didTimeout = false;
    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, DEMA_LAYOUT_TIMEOUT_MS);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${MCP_SERVER_URL}/dema_layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genes: geneList, fdr: 0.05, min_score: 0.4 }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: DemaResult = await res.json();
      demaLayoutCache.set(cacheKey, data);
      setResult(data);
    } catch (e: any) {
      if (e.name === "AbortError" && didTimeout) {
        setError("DEMA layout timed out. The selected gene set is likely too large or the external enrichment/network calls are taking too long. Try a smaller lasso selection or refresh.");
      } else if (e.name !== "AbortError") {
        setError(e.message ?? "Failed to generate DEMA layout");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const key = [...genes].sort().join(",");
    if (key === lastGenesKey.current) return;
    lastGenesKey.current = key;
    if (genes.length >= 3) runLayout(genes);
  }, [genes, runLayout]);

  const handleRefresh = () => {
    lastGenesKey.current = "";
    runLayout(genes);
  };

  // One terrain point array per cohort, all using the same DEMA x,y positions
  const cohortTerrains = useMemo((): Point[][] => {
    if (!result) return cohorts.map(() => []);
    return cohorts.map(c => buildTerrainPoints(result, c.points));
  }, [result, cohorts]);

  const hasAnyTerrain = cohortTerrains.some(pts => pts.length > 0);

  // Plotly ranges stay fixed to the DEMA coordinate system so the returned layout is preserved exactly.
  const plotRanges = useMemo(() => ({ x: [-0.05, 1.05] as [number, number], y: [-0.05, 1.05] as [number, number] }), []);
  const terrainViewports = useMemo(() => cohortTerrains.map(computeTerrainViewport), [cohortTerrains]);
  const degreeSummary = useMemo(() => {
    if (!result) return null;
    const degree: Record<string, number> = {};
    result.edges.forEach((edge) => {
      degree[edge.source] = (degree[edge.source] || 0) + 1;
      degree[edge.target] = (degree[edge.target] || 0) + 1;
    });
    const values = result.nodes.map((node) => degree[node.id] || 0);
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    return { min, max };
  }, [result]);

  // Build Plotly traces
  const buildTraces = (): any[] => {
    if (!result) return [];

    const posMap: Record<string, [number, number]> = {};
    result.nodes.forEach(n => { posMap[n.id] = [n.x, n.y]; });

    const ex: (number | null)[] = [];
    const ey: (number | null)[] = [];
    result.edges.forEach(e => {
      const a = posMap[e.source], b = posMap[e.target];
      if (a && b) { ex.push(a[0], b[0], null); ey.push(a[1], b[1], null); }
    });

    const edgeTrace = {
      type: "scatter", mode: "lines",
      x: ex, y: ey,
      line: { color: "#d0d0d0", width: 0.8 },
      hoverinfo: "none", showlegend: false,
    };

    const pathwayColors: Record<string, string> = { Other: "#aaaaaa" };
    result.pathway_legend.forEach((p, i) => {
      pathwayColors[p.name] = PATHWAY_COLORS[i % PATHWAY_COLORS.length];
    });

    const degree: Record<string, number> = {};
    result.edges.forEach((edge) => {
      degree[edge.source] = (degree[edge.source] || 0) + 1;
      degree[edge.target] = (degree[edge.target] || 0) + 1;
    });
    const topHubGenes = new Set(
      [...result.nodes]
        .sort((a, b) => (degree[b.id] || 0) - (degree[a.id] || 0))
        .slice(0, 25)
        .map((node) => node.id)
    );

    const groups: Record<string, DemaNode[]> = {};
    result.nodes.forEach(n => {
      const g = n.primary_pathway === "Other" ? "Other / No significant pathway" : n.primary_pathway;
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });

    const orderedGroupLabels = [
      ...(groups["Other / No significant pathway"] ? ["Other / No significant pathway"] : []),
      ...result.pathway_legend
        .map((pathway) => pathway.name)
        .filter((name) => groups[name]),
      ...Object.keys(groups).filter(
        (name) =>
          name !== "Other / No significant pathway" &&
          !result.pathway_legend.some((pathway) => pathway.name === name)
      ),
    ];

    const nodeTraces = orderedGroupLabels.map((pway) => {
      const nodes = groups[pway];
      return {
        type: "scatter",
        mode: "markers",
        x: nodes.map((n) => n.x),
        y: nodes.map((n) => n.y),
        hovertext: nodes.map((n) => {
          const namedPathways = n.pathways.slice(0, 5);
          const pathwayLines = namedPathways.length > 0
            ? namedPathways.map((pathway) => `• ${pathway}`).join("<br>")
            : "No enriched pathway assigned";
          const extraPathwayText = n.pathways.length > 5 ? `<br>... +${n.pathways.length - 5} more` : "";
          return `<b>${n.id}</b><br>Degree: ${degree[n.id] || 0}<br>Pathways (${n.pathways.length} total):<br>${pathwayLines}${extraPathwayText}`;
        }),
        hoverinfo: "text",
        marker: {
          color: pathwayColors[pway] ?? "#aaaaaa",
          size: nodes.map((n) => Math.max(8, Math.min(22, 8 + (degree[n.id] || 0) * 1.2))),
          line: { color: "white", width: 0.8 },
          opacity: 0.9,
        },
        name: pway.length > 50 ? `${pway.substring(0, 50)}…` : pway,
      };
    });

    const hubLabelTrace = {
      type: "scatter",
      mode: "text",
      x: result.nodes.filter((node) => topHubGenes.has(node.id)).map((node) => node.x),
      y: result.nodes.filter((node) => topHubGenes.has(node.id)).map((node) => node.y),
      text: result.nodes.filter((node) => topHubGenes.has(node.id)).map((node) => node.id),
      textposition: "top center",
      textfont: { size: 8, color: "#111" },
      hoverinfo: "skip",
      showlegend: false,
      cliponaxis: false,
    };

    return [edgeTrace, ...nodeTraces, hubLabelTrace];
  };

  return (
    <Box
      bg={bg}
      border="1px"
      borderColor={border}
      borderRadius="xl"
      overflow="hidden"
      shadow="sm"
      w="full"
    >
      {/* ── DEMA Network header ─────────────────────────────────────── */}
      <HStack
        bg={headerBg}
        px={4} py={3}
        justify="space-between"
        borderBottom="1px"
        borderColor={border}
        cursor="pointer"
        onClick={() => setIsNetworkOpen(o => !o)}
      >
        <HStack spacing={2}>
          <Network size={16} color="#6b46c1" />
          <Text fontWeight="semibold" fontSize="sm" color="purple.700">
            DEMA Network Layout — {networkLabel}
          </Text>
          {loading && (
            <Badge colorScheme="purple" variant="solid" fontSize="10px">
              Loading
            </Badge>
          )}
          {result && (
            <HStack spacing={1}>
              <Badge colorScheme="purple" fontSize="10px">{result.gene_count} genes</Badge>
              <Badge colorScheme="gray"   fontSize="10px">{result.edge_count} edges</Badge>
              {degreeSummary && (
                <Badge colorScheme="blue" fontSize="10px">
                  degree {degreeSummary.min}-{degreeSummary.max}
                </Badge>
              )}
            </HStack>
          )}
        </HStack>
        <HStack spacing={2}>
          {!loading && genes.length >= 3 && (
            <Tooltip label="Regenerate layout">
              <IconButton
                aria-label="refresh"
                icon={<RefreshCw size={14} />}
                size="xs"
                variant="ghost"
                colorScheme="purple"
                onClick={e => { e.stopPropagation(); handleRefresh(); }}
              />
            </Tooltip>
          )}
          {isNetworkOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </HStack>
      </HStack>

      <Collapse in={isNetworkOpen} animateOpacity>
        <Box p={3}>
          {genes.length < 3 && (
            <Text fontSize="xs" color="gray.500" textAlign="center" py={4}>
              Select at least 3 genes with the lasso to generate a DEMA network.
            </Text>
          )}

          {loading && (
            !result ? (
              <Center
                minH="420px"
                borderRadius="xl"
                bg={loadingCardBg}
                border="1px dashed"
                borderColor={border}
                px={6}
              >
                <VStack spacing={4}>
                  <Spinner size="lg" thickness="4px" color="purple.500" />
                  <VStack spacing={1}>
                    <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                      Building DEMA network layout
                    </Text>
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      Running Enrichr, fetching STRING edges, and solving the DEMA layout.
                    </Text>
                    <Text fontSize="10px" color="gray.400" textAlign="center">
                      Selected genes: {genes.length}
                    </Text>
                  </VStack>
                </VStack>
              </Center>
            ) : null
          )}

          {error && !loading && (
            <VStack py={4} spacing={2}>
              <Text fontSize="xs" color="red.500">{error}</Text>
              <Button size="xs" colorScheme="purple" variant="outline" onClick={handleRefresh}>Retry</Button>
            </VStack>
          )}

          {result && (
            <Box position="relative">
              <Plot
                data={buildTraces()}
                layout={{
                  autosize: true,
                  height: 620,
                margin: { l: 20, r: 160, t: 20, b: 20 },
                title: {
                  text: "DEMA Network — Genes · Edges · Pathway Groups<br><sup>Node size = degree | Color = primary pathway | Labels = top 25 hubs | Hover for details</sup>",
                  x: 0.03,
                  xanchor: "left",
                  font: { size: 16, color: "#1f2937" },
                },
                showlegend: true,
                legend: {
                  font: { size: 9 },
                    itemsizing: "constant",
                    x: 1.01, y: 1,
                    bgcolor: "rgba(255,255,255,0.9)",
                    bordercolor: "#eee",
                    borderwidth: 1,
                    title: { text: "Pathway Groups", font: { size: 9 } },
                  },
                  hovermode: "closest",
                xaxis: { showgrid: false, zeroline: false, showticklabels: false, range: plotRanges.x },
                yaxis: { showgrid: false, zeroline: false, showticklabels: false, range: plotRanges.y },
                plot_bgcolor: "#f6f6f6",
                paper_bgcolor: "white",
              }}
                config={{ displayModeBar: true, responsive: true }}
                style={{ width: "100%" }}
              />
              {loading && (
                <Center
                  position="absolute"
                  inset={0}
                  bg={loadingOverlayBg}
                  borderRadius="lg"
                >
                  <VStack spacing={3}>
                    <Spinner size="lg" thickness="4px" color="purple.500" />
                    <VStack spacing={0}>
                      <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                        Refreshing DEMA layout
                      </Text>
                      <Text fontSize="10px" color="gray.500">
                        Selected genes: {genes.length}
                      </Text>
                    </VStack>
                  </VStack>
                </Center>
              )}
            </Box>
          )}
        </Box>
      </Collapse>

      {/* ── DEMA GeneTerrain(s) ─────────────────────────────────────── */}
      {hasAnyTerrain && (
        <>
          <Divider />

          {/* Terrain section header */}
          <HStack
            bg={headerBg}
            px={4} py={3}
            justify="space-between"
            borderBottom="1px"
            borderColor={border}
            cursor="pointer"
            onClick={() => setIsTerrainOpen(o => !o)}
          >
            <HStack spacing={2}>
              <MapIcon size={16} color="#6b46c1" />
              <Text fontWeight="semibold" fontSize="sm" color="purple.700">
                DEMA GeneTerrain — {networkLabel}
              </Text>
              {cohorts.length > 1 && (
                <Badge colorScheme="blue" fontSize="10px">{cohorts.length} cohorts</Badge>
              )}
            </HStack>
            {isTerrainOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </HStack>

          <Collapse in={isTerrainOpen} animateOpacity>
            {/* One terrain per cohort, stacked vertically so the full 800×600 canvas fits */}
            <VStack align="stretch" spacing={0} w="full">
              {cohorts.map((cohort, idx) => {
                const pts = cohortTerrains[idx];
                if (pts.length === 0) return null;
                return (
                  <Box
                    key={cohort.label}
                    w="full"
                    borderTop={idx > 0 ? "1px" : undefined}
                    borderColor={border}
                  >
                    {/* Per-cohort label bar */}
                    <Box
                      px={3} py={1}
                      bg={cohortLabelBg}
                      borderBottom="1px"
                      borderColor={border}
                    >
                      <HStack spacing={2}>
                        <Text fontSize="xs" fontWeight="semibold" color="purple.600">
                          {cohort.label}
                        </Text>
                        <Badge colorScheme="purple" fontSize="9px">{pts.length} genes</Badge>
                      </HStack>
                    </Box>
                    {/* No fixed height or overflow:hidden — let GaussianMap render fully
                        so the layer switcher, lasso tool, and contour controls are accessible */}
                    <Box w="full" overflowX="auto">
                      <GaussianMap
                        points={pts}
                        datasetId={cohort.datasetId}
                        sampleId={`dema-${cohort.label}`}
                        datasets={[]}
                        minZoomForLabels={1}
                        initialViewport={terrainViewports[idx]}
                      />
                    </Box>
                  </Box>
                );
              })}
            </VStack>
          </Collapse>
        </>
      )}
    </Box>
  );
};

export default DemaNetworkPanel;
