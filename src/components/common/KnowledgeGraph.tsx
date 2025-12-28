'use client';
import { Network, DataSet } from 'vis-network/standalone';
import 'vis-network/styles/vis-network.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Grid,
  Heading,
  Text,
  Spinner,
  Tag,
  TagLabel,
  HStack,
  VStack,
  useColorModeValue,
  InputGroup,
  InputLeftElement,
  Input,
  Button,
  IconButton,
} from '@chakra-ui/react';

import {
  SearchIcon,
  AddIcon,
  MinusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RepeatIcon,
} from '@chakra-ui/icons';


// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type NodeKind = 'disease' | 'gene' | 'pathway' | 'drug';

interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  meta?: any;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

interface OtSearchHit {
  id: string;
  name: string;
  description?: string | null;
  entity: string;
}

interface OtDiseaseSearchResult {
  search: {
    hits: OtSearchHit[];
  };
}

interface OtTargetSearchResult {
  search: {
    hits: OtSearchHit[];
  };
}

interface OtReactomePathway {
  pathwayId: string;
  pathway: string;
  topLevelTerm: string;
}

interface OtKnownDrugRow {
  diseaseId?: string | null;
  disease?: { id: string; name: string | null } | null;
  drugId?: string | null;
  drug?: { id: string; name: string | null } | null;
  mechanismOfAction?: string | null;
  phase?: number | null;
  status?: string | null;
  approvedName?: string | null;
  prefName?: string | null;
}

interface OtTargetDetails {
  target: {
    id: string;
    approvedSymbol: string;
    approvedName: string;
    pathways: OtReactomePathway[];
    knownDrugs: {
      rows: OtKnownDrugRow[];
      count: number;
    };
  } | null;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const OT_GRAPHQL_URL = 'https://api.platform.opentargets.org/api/v4/graphql';

async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const res = await fetch(OT_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `OpenTargets error: ${res.status} ${res.statusText} – ${text.slice(
        0,
        200
      )}`
    );
  }

  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e: any) => e.message).join('; '));
  }
  return json.data as T;
}

async function findDiseaseByQuery(queryString: string): Promise<OtSearchHit | null> {
  const query = `
    query SearchDisease($q: String!) {
      search(queryString: $q, entityNames: ["disease"], page: { index: 0, size: 1 }) {
        hits {
          id
          name
          description
          entity
        }
      }
    }
  `;
  const data = await fetchGraphQL<OtDiseaseSearchResult>(query, { q: queryString });
  return data.search?.hits?.[0] ?? null;
}

async function findTargetBySymbol(symbol: string): Promise<OtSearchHit | null> {
  const query = `
    query SearchTarget($q: String!) {
      search(queryString: $q, entityNames: ["target"], page: { index: 0, size: 1 }) {
        hits {
          id
          name
          description
          entity
        }
      }
    }
  `;
  const data = await fetchGraphQL<OtTargetSearchResult>(query, { q: symbol });
  return data.search?.hits?.[0] ?? null;
}

async function fetchTargetDetails(ensemblId: string): Promise<OtTargetDetails['target'] | null> {
  const query = `
    query TargetDetails($id: String!) {
      target(ensemblId: $id) {
        id
        approvedSymbol
        approvedName
        pathways {
          pathwayId
          pathway
          topLevelTerm
        }
        knownDrugs(size: 200) {
          count
          rows {
            diseaseId
            disease { id name }
            drugId
            drug { id name }
            mechanismOfAction
            phase
            status
            approvedName
            prefName
          }
        }
      }
    }
  `;
  const data = await fetchGraphQL<OtTargetDetails>(query, { id: ensemblId });
  return data.target ?? null;
}

function cleanLabel(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return s;
  return trimmed.length > 60 ? trimmed.slice(0, 57) + '…' : trimmed;
}

function wrapText(text: string, maxChars = 18): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const COLORS: Record<NodeKind, string> = {
  disease: '#a377eec8',
  gene: '#ea8383d9',
  pathway: '#6990e3cd',
  drug: '#55cea8d7',
};

// ─────────────────────────────────────────────────────────────
// Graph builder (radial layout)
// ─────────────────────────────────────────────────────────────

interface BuildResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  diseaseNode: GraphNode;
  diseaseHit: OtSearchHit | null;
}

async function buildKnowledgeGraph(
  datasetId: string,
  geneSymbols: string[]
): Promise<BuildResult> {
  const trimmedGenes = geneSymbols.map((g) => g.trim()).filter(Boolean);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (from: string, to: string, tag: string) => {
    if (!from || !to || from === to) return;
    const id = `edge:${tag}:${from}:${to}`;
    if (edgeSet.has(id)) return;
    edgeSet.add(id);
    edges.push({ id, from, to });
  };

  // Disease node from datasetId
  let diseaseHit: OtSearchHit | null = null;
  try {
    diseaseHit = await findDiseaseByQuery(datasetId);
  } catch (e) {
    console.warn('Disease search failed:', e);
  }

  const diseaseLabel = diseaseHit?.name || datasetId;
  const diseaseNode: GraphNode = {
    id: `disease:${diseaseHit?.id || datasetId}`,
    label: cleanLabel(diseaseLabel),
    kind: 'disease',
    x: 0,
    y: 0,
    meta: {
      datasetId,
      diseaseId: diseaseHit?.id || null,
      description: diseaseHit?.description || null,
    },
  };

  nodes.push(diseaseNode);

  const geneMap = new Map<string, GraphNode>();
  const pathwayMap = new Map<string, GraphNode>();
  const drugMap = new Map<string, GraphNode>();

  const diseaseOtId = diseaseHit?.id ?? null;

  for (const symbol of trimmedGenes) {
    try {
      const targetHit = await findTargetBySymbol(symbol);
      if (!targetHit) {
        console.warn(`No target found for symbol ${symbol}`);
        continue;
      }

      const targetId = targetHit.id;
      const targetDetails = await fetchTargetDetails(targetId);
      if (!targetDetails) {
        console.warn(`No target details for ${targetId}`);
        continue;
      }

      // Gene node
      let geneNode = geneMap.get(targetId);
      if (!geneNode) {
        geneNode = {
          id: `gene:${targetId}`,
          label: symbol || targetDetails.approvedSymbol,
          kind: 'gene',
          x: 0,
          y: 0,
          meta: {
            ensemblId: targetId,
            symbol: symbol || targetDetails.approvedSymbol,
            approvedName: targetDetails.approvedName,
          },
        };
        geneMap.set(targetId, geneNode);
        nodes.push(geneNode);

        addEdge(diseaseNode.id, geneNode.id, 'disease-gene');
      }

      // Pathways
      if (targetDetails.pathways && targetDetails.pathways.length) {
        for (const pw of targetDetails.pathways) {
          const pwKey = pw.pathwayId || pw.pathway;
          if (!pwKey) continue;

          let pathwayNode = pathwayMap.get(pwKey);
          if (!pathwayNode) {
            pathwayNode = {
              id: `pathway:${pwKey}`,
              label: pw.pathwayId ?? 'Pathway', // ID only
              kind: 'pathway',
              x: 0,
              y: 0,
              meta: {
                pathwayId: pw.pathwayId,
                pathwayLabel: pw.pathway, // full name for detail panel
                topLevelTerm: pw.topLevelTerm,
              },
            };
            pathwayMap.set(pwKey, pathwayNode);
            nodes.push(pathwayNode);
          }

          addEdge(geneNode.id, pathwayNode.id, 'gene-pathway');
        }
      }

      // Drugs
      const rows = targetDetails.knownDrugs?.rows ?? [];
      for (const row of rows) {
        const drugKey = row.drug?.id || row.drugId;
        if (!drugKey) continue;

        let drugNode = drugMap.get(drugKey);
        if (!drugNode) {
          const drugLabel =
            row.drug?.name ||
            row.prefName ||
            row.approvedName ||
            `Drug ${drugKey}`;

          const rowDiseaseId = row.disease?.id ?? row.diseaseId ?? null;

          drugNode = {
            id: `drug:${drugKey}`,
            label: cleanLabel(drugLabel),
            kind: 'drug',
            x: 0,
            y: 0,
            meta: {
              drugId: drugKey,
              name: drugLabel,
              mechanismOfAction: row.mechanismOfAction || null,
              phase: row.phase ?? null,
              status: row.status ?? null,
              diseaseId: rowDiseaseId,
              diseaseName: row.disease?.name ?? null,
            },
          };
          drugMap.set(drugKey, drugNode);
          nodes.push(drugNode);
        }

        addEdge(geneNode.id, drugNode.id, 'gene-drug');

        const rowDiseaseId = row.disease?.id ?? row.diseaseId ?? null;
        if (!diseaseOtId || (rowDiseaseId && rowDiseaseId === diseaseOtId)) {
          addEdge(diseaseNode.id, drugNode.id, 'disease-drug');
        }
      }
    } catch (e) {
      console.warn(`Error building graph for gene ${symbol}:`, e);
    }
  }

  // Radial layout
  const centerX = 0;
  const centerY = 0;
  diseaseNode.x = centerX;
  diseaseNode.y = centerY;

  const geneNodes = nodes.filter((n) => n.kind === 'gene');
  const drugNodes = nodes.filter((n) => n.kind === 'drug');
  const pathwayNodes = nodes.filter((n) => n.kind === 'pathway');

  const START_ANGLE = -Math.PI / 2;

  const arrangeRing = (arr: GraphNode[], radius: number) => {
    const n = arr.length;
    if (!n) return;
    const step = (2 * Math.PI) / n;
    arr.forEach((node, idx) => {
      const angle = START_ANGLE + idx * step;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
      node.meta = { ...(node.meta || {}), theta: angle };
    });
  };

  const R_GENE = 240;
  const R_DRUG = 380;
  
  
// Base radius for pathways, but we will grow it if there are many pathways
const baseRPath = 560;
const minArcSpacing = 140; // desired minimum arc distance between pathways, in pixels

// Circumference = 2πR, spacing ≈ circumference / N
// ⇒ R ≥ (minArcSpacing * N) / (2π)
const R_PATH =
  pathwayNodes.length > 0
    ? Math.max(
        baseRPath,
        (minArcSpacing * pathwayNodes.length) / (2 * Math.PI)
      )
    : baseRPath;

  arrangeRing(geneNodes, R_GENE);
  arrangeRing(drugNodes, R_DRUG);
  arrangeRing(pathwayNodes, R_PATH);

  return { nodes, edges, diseaseNode, diseaseHit };
}

interface CanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchTerm: string;
  visibleKinds: Record<NodeKind, boolean>;
}


// ─────────────────────────────────────────────────────────────
// Network canvas using vis-network (like UnifiedPathwayNetwork)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Network canvas using vis-network (HTML-like node styling)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Network canvas using vis-network (HTML-like node styling)
// ─────────────────────────────────────────────────────────────

interface CanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchTerm: string;
}

const KnowledgeCanvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  selectedId,
  onSelect,
  searchTerm,
  visibleKinds,
}) => {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef(new DataSet<any>([]));
  const edgesRef = useRef(new DataSet<any>([]));
  const bg = useColorModeValue('#F9FAFB', '#020617');

  // Helper: wrap label into multiple lines so nodes don't get too wide
  function wrapLabelForVis(
    label: string,
    maxCharsPerLine = 14,
    maxLines = 3
  ): string {
    const words = label.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const w of words) {
      const next = current ? `${current} ${w}` : w;

      if (next.length > maxCharsPerLine) {
        if (current) lines.push(current);
        current = w;
        if (lines.length >= maxLines - 1) {
          // truncate last line if still too long
          if (current.length > maxCharsPerLine) {
            current = current.slice(0, maxCharsPerLine - 1) + '…';
          }
          break;
        }
      } else {
        current = next;
      }
    }

    if (current && lines.length < maxLines) {
      if (current.length > maxCharsPerLine) {
        current = current.slice(0, maxCharsPerLine - 1) + '…';
      }
      lines.push(current);
    }

    // vis-network treats "\n" as a line break inside the node
    return lines.join('\n');
  }

    // Apply legend filters: keep layout, just dim or "hide" kinds
  useEffect(() => {
    if (!networkRef.current) return;

    // Nodes: active kinds bright, inactive kinds very light
    const nodeUpdates = nodes.map((n) => {
      const baseColor = COLORS[n.kind];
      const active = visibleKinds[n.kind];

      return {
        id: n.id,
        color: {
          background: active ? baseColor : '#E5E7EB',
          border: active ? '#FFFFFF' : '#E5E7EB',
          highlight: { background: baseColor, border: '#FFFFFF' },
          hover: { background: baseColor, border: '#FFFFFF' },
        },
        font: {
          color: active ? '#FFFFFF' : '#9CA3AF',
        },
      };
    });
    nodesRef.current.update(nodeUpdates as any);

    // Edges: edges connecting only active nodes are bright, others dim
    const activeIds = new Set(
      nodes
        .filter((n) => visibleKinds[n.kind])
        .map((n) => n.id)
    );

    const edgeUpdates = edges.map((e) => {
      const active =
        activeIds.has(e.from) && activeIds.has(e.to);

      return {
        id: e.id,
        color: {
          color: active ? '#CBD5E1' : '#E5E7EB',
          highlight: '#0ea5e9',
        },
        width: active ? 1.6 : 0.6,
      };
    });
    edgesRef.current.update(edgeUpdates as any);
  }, [visibleKinds, nodes, edges]);


  // Build / update vis-network when node/edge data changes
  useEffect(() => {
    if (!containerRef.current) return;

    // Map our GraphNode → vis-network node with HTML-like styling
    const visNodes = nodes.map((n) => {
      const baseColor = COLORS[n.kind];

      const hoverTitle =
        n.kind === 'pathway' &&
        n.meta &&
        typeof n.meta.pathwayLabel === 'string' &&
        n.meta.pathwayLabel.trim().length > 0
          ? n.meta.pathwayLabel
          : n.label;

      let shape: string;
      let size: number | undefined;
      let borderWidth = 0;

      if (n.kind === 'disease') {
        // Let vis size from label so text stays inside
        shape = 'circle';
        size = undefined;
        borderWidth = 0;
      } else if (n.kind === 'gene') {
        shape = 'box';
        size = undefined;
      } else if (n.kind === 'pathway') {
        shape = 'box';
        size = undefined;
      } else {
        // Drugs: circle with label inside
        shape = 'circle';
        size = 34;
      }

      // Wrap long labels so nodes don’t get too wide
      const needsWrap = /\s/.test(n.label) && n.label.length > 10;
      const wrappedLabel =
        needsWrap && (shape === 'box' || shape === 'circle' || shape === 'diamond')
          ? wrapLabelForVis(
              n.label,
              n.kind === 'drug' ? 10 : 14,
              3
            )
          : n.label;

      const node: any = {
        id: n.id,
        label: wrappedLabel,
        title: hoverTitle,
        shape,
        borderWidth,
        color: {
          background: baseColor,
          border: '#FFFFFF',
          highlight: { background: baseColor, border: '#FFFFFF' },
          hover: { background: baseColor, border: '#FFFFFF' },
        },
        shadow: {
          enabled: true,
          color: 'rgba(15,23,42,0.35)',
          x: 0,
          y: 2,
          size: 8,
        },
        font: {
          color: '#FFFFFF',
          face:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          size: 14,
          align: 'center',
          bold: {
            color: '#FFFFFF',
            size: 14,
            face: 'Inter',
          },
          strokeWidth: 0.2,
          strokeColor: 'rgba(15,23,42,0.65)',
          vadjust: 0,
        },
      };

      // Padding only for box shapes
      if (shape === 'box') {
        node.margin = { top: 4, right: 10, bottom: 4, left: 10 };
      }

      // Only non-box shapes (circles) get explicit size
      if (size !== undefined && shape !== 'box' && shape !== 'diamond') {
        node.size = size;
      }

      return node;
    });

    // Map our GraphEdge → vis-network edge
    const visEdges = edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      color: { color: '#CBD5E1', highlight: '#0ea5e9' },
      width: 1.6,
      smooth: false,
    }));

    // Update datasets
    nodesRef.current.clear();
    edgesRef.current.clear();
    nodesRef.current.add(visNodes);
    edgesRef.current.add(visEdges);

    const applyNeighborHighlight = (hoverId: string | number) => {
      if (!networkRef.current) return;

      const centerId = String(hoverId);
      const connected = networkRef.current.getConnectedNodes(centerId) as (
        | string
        | number
      )[];
      const neighborSet = new Set<string>([centerId, ...connected.map(String)]);

      // Nodes: neighbors bright, others dim
      const nodeUpdates = nodes.map((n) => {
        const baseColor = COLORS[n.kind];
        const isNeighbor = neighborSet.has(n.id);

        return {
          id: n.id,
          color: {
            background: isNeighbor ? baseColor : '#E5E7EB',
            border: isNeighbor ? '#FFFFFF' : '#E5E7EB',
            highlight: { background: baseColor, border: '#FFFFFF' },
            hover: { background: baseColor, border: '#FFFFFF' },
          },
          font: {
            color: isNeighbor ? '#FFFFFF' : '#9CA3AF',
          },
        };
      });
      nodesRef.current.update(nodeUpdates as any);

      // Edges: only neighbor edges bright
      const edgeUpdates = edges.map((e) => {
        const isNeighborEdge =
          neighborSet.has(String(e.from)) && neighborSet.has(String(e.to));

        return {
          id: e.id,
          color: {
            color: isNeighborEdge ? '#94A3B8' : '#E5E7EB',
            highlight: '#0ea5e9',
          },
          width: isNeighborEdge ? 1.8 : 0.6,
        };
      });
      edgesRef.current.update(edgeUpdates as any);
    };

    const resetNeighborHighlight = () => {
      const nodeUpdates = nodes.map((n) => {
        const baseColor = COLORS[n.kind];
        return {
          id: n.id,
          color: {
            background: baseColor,
            border: '#FFFFFF',
            highlight: { background: baseColor, border: '#FFFFFF' },
            hover: { background: baseColor, border: '#FFFFFF' },
          },
          font: {
            color: '#FFFFFF',
          },
        };
      });
      nodesRef.current.update(nodeUpdates as any);

      const edgeUpdates = edges.map((e) => ({
        id: e.id,
        color: { color: '#CBD5E1', highlight: '#0ea5e9' },
        width: 1.6,
      }));
      edgesRef.current.update(edgeUpdates as any);
    };

    // Create or update network
    if (!networkRef.current) {
      networkRef.current = new Network(
        containerRef.current,
        { nodes: nodesRef.current, edges: edgesRef.current },
        {
          autoResize: true,
          height: '100%',
          width: '100%',
          interaction: {
            dragView: true,
            zoomView: true,
            hover: true,
            navigationButtons: false, // ✅ show built-in zoom / pan buttons
          },
          layout: {
            improvedLayout: true,
          },
          physics: {
            solver: 'forceAtlas2Based',
            stabilization: { iterations: 220, updateInterval: 25 },
            forceAtlas2Based: {
              gravitationalConstant: -35,
              centralGravity: 0.015,
              springLength: 130,
              springConstant: 0.08,
              damping: 0.4,
              avoidOverlap: 0.8,
            },
          },
          nodes: {
            shadow: true,
          },
          edges: {
            shadow: false,
          },
        }
      );

      // One-time: freeze layout + fit into the viewport
      networkRef.current.once('stabilizationIterationsDone', () => {
        if (!networkRef.current) return;
        networkRef.current.setOptions({ physics: false });
        networkRef.current.fit({
          animation: { duration: 600, easingFunction: 'easeInOutQuad' },
        });
      });

      // Click → select node (no zoom here)
      networkRef.current.on('selectNode', (params) => {
        const id = (params.nodes && params.nodes[0]) as string | undefined;
        if (id) onSelect(id);
      });

      networkRef.current.on('deselectNode', () => {
        onSelect(null);
      });

      // Hover → neighbor highlight
      networkRef.current.on('hoverNode', (params: any) => {
        if (!params?.node) return;
        applyNeighborHighlight(params.node);
      });

      networkRef.current.on('blurNode', () => {
        resetNeighborHighlight();
      });
    } else {
      // Just update data; keep view / zoom state as user left it
      networkRef.current.setData({
        nodes: nodesRef.current,
        edges: edgesRef.current,
      });
    }
  }, [nodes, edges, onSelect]);

  // React to selectedId from parent (select, but don't move the camera)
  useEffect(() => {
    if (!networkRef.current) return;

    if (selectedId) {
      networkRef.current.selectNodes([selectedId], false);
    } else {
      networkRef.current.unselectAll();
    }
  }, [selectedId]);

  // Search → focus first matching node (label or gene symbol)
  useEffect(() => {
    if (!networkRef.current) return;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return;

    const match = nodes.find((n) => {
      const labelMatch = n.label.toLowerCase().includes(q);
      const symbolMatch =
        n.kind === 'gene' &&
        typeof n.meta?.symbol === 'string' &&
        n.meta.symbol.toLowerCase().includes(q);
      return labelMatch || symbolMatch;
    });

    if (match) {
      networkRef.current.selectNodes([match.id], false);
      networkRef.current.focus(match.id, {
        scale: 1.4,
        animation: { duration: 600, easingFunction: 'easeInOutQuad' },
      });
      onSelect(match.id);
    }
  }, [searchTerm, nodes, onSelect]);


  // Custom view controls (for zoom buttons)
  const zoom = (factor: number) => {
    const network = networkRef.current;
    if (!network) return;

    const currentScale = network.getScale();
    network.moveTo({
      scale: currentScale * factor,
      animation: { duration: 250, easingFunction: 'easeInOutQuad' },
    });
  };

  const resetView = () => {
    const network = networkRef.current;
    if (!network) return;

    network.fit({
      animation: { duration: 400, easingFunction: 'easeInOutQuad' },
    });
  };


  // Cleanup
  useEffect(() => {
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

    return (
    <Box
      position="relative"
      bg={bg}
      border="1px solid #E5E7EB"
      rounded="2xl"
      overflow="hidden"
      w="100%"
      h="100%"
      minH={0}
      boxShadow="0 20px 40px rgba(15,23,42,0.18)"
    >
      {/* Network canvas container */}
      <Box
        ref={containerRef}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
      />

      {/* Custom zoom controls (top-left) */}
      <Box
        position="absolute"
        top={3}
        left={3}
        zIndex={10}
        bg="whiteAlpha.900"
        borderRadius="full"
        boxShadow="md"
        display="flex"
        alignItems="center"
        gap={1}
        px={1.5}
        py={1}
      >
        <IconButton
          aria-label="Fit network to view"
          size="xs"
          icon={<RepeatIcon boxSize={3} />}
          variant="ghost"
          onClick={resetView}
        />
        <IconButton
          aria-label="Zoom in"
          size="xs"
          icon={<AddIcon boxSize={3} />}
          variant="ghost"
          onClick={() => zoom(1.25)}
        />
        <IconButton
          aria-label="Zoom out"
          size="xs"
          icon={<MinusIcon boxSize={3} />}
          variant="ghost"
          onClick={() => zoom(1 / 1.25)}
        />
      </Box>
    </Box>
  );


};





// ─────────────────────────────────────────────────────────────
// Detail panel
// ─────────────────────────────────────────────────────────────

function DetailPanel({
  selected,
  diseaseHit,
  edges,
}: {
  selected: GraphNode | null;
  diseaseHit: OtSearchHit | null;
  edges: GraphEdge[];
}) {
  if (!selected) {
    return (
      <Box textAlign="center" mt={8} color="#9CA3AF">
        <Box
          as="svg"
          width="48px"
          height="48px"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          mx="auto"
          mb={3}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Box>
        <Text fontSize="sm">
          Select a node to view biological details
          <br />
          and external database links.
        </Text>
      </Box>
    );
  }

  const { kind, label, meta } = selected;

  const degree = edges.filter(
    (e) => e.from === selected.id || e.to === selected.id
  ).length;

  let badgeText = '';
  let primaryIdLabel = 'ID';
  let primaryId: string | null = null;
  let description: string | null = null;

  if (kind === 'disease') {
    badgeText = 'DISEASE';
    primaryIdLabel = 'Disease ID';
    primaryId = meta?.diseaseId || diseaseHit?.id || meta?.datasetId || null;
    description = meta?.description || diseaseHit?.description || null;
  } else if (kind === 'gene') {
    badgeText = 'GENE';
    primaryIdLabel = 'Ensembl ID';
    primaryId = meta?.ensemblId || null;
    description = meta?.approvedName || null;
  } else if (kind === 'pathway') {
    badgeText = 'PATHWAY';
    primaryIdLabel = 'Reactome ID';
    primaryId = meta?.pathwayId || null;
    description = meta?.pathwayLabel || meta?.topLevelTerm || null;
  } else {
    badgeText = 'DRUG';
    primaryIdLabel = 'Drug ID';
    primaryId = meta?.drugId || null;
    description =
      meta?.mechanismOfAction ||
      (meta?.diseaseName ? `Indication: ${meta.diseaseName}` : null);
  }

  const displayTitle =
    kind === 'pathway' &&
    typeof meta?.pathwayLabel === 'string' &&
    meta.pathwayLabel.trim().length > 0
      ? meta.pathwayLabel
      : label;

  // Links
  let link1Label = 'OpenTargets';
  let link1Href = '#';
  let link2Label = 'LitSearch';
  let link2Href = '#';

  if (kind === 'drug') {
    const drugId = primaryId || '';
    link1Label = 'OpenTargets';
    link1Href = drugId
      ? `https://platform.opentargets.org/drug/${drugId}`
      : 'https://platform.opentargets.org/drug';
    link2Label = 'PubChem';
    link2Href = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(
      label
    )}`;
  } else if (kind === 'disease') {
    const diseaseId = primaryId || '';
    link1Label = 'OpenTargets';
    link1Href = diseaseId
      ? `https://platform.opentargets.org/disease/${diseaseId}`
      : 'https://platform.opentargets.org/disease';
    link2Label = 'LitSearch';
    link2Href = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(
      label
    )}`;
  } else if (kind === 'gene') {
    const ensembl = primaryId || '';
    const symbol = meta?.symbol || label;
    link1Label = 'OpenTargets';
    link1Href = ensembl
      ? `https://platform.opentargets.org/target/${ensembl}`
      : 'https://platform.opentargets.org/target';
    link2Label = 'UniProt Search';
    link2Href = `https://www.uniprot.org/uniprotkb?query=${encodeURIComponent(
      symbol
    )}`;
  } else if (kind === 'pathway') {
    const pid = primaryId || '';
    link1Label = 'Reactome';
    link1Href = pid
      ? `https://reactome.org/PathwayBrowser/#/${pid}`
      : 'https://reactome.org';
    link2Label = 'OpenTargets';
    link2Href = pid
      ? `https://platform.opentargets.org/pathway/${pid}`
      : 'https://platform.opentargets.org';
  }

  return (
    <Box>
      <Box className="detail-header" mb={4}>
        <HStack justify="space-between" mb={2}>
          <Tag
            size="sm"
            borderRadius="full"
            bg={COLORS[kind]}
            color="white"
            px={3}
            py={1}
          >
            <TagLabel fontSize="xs" textTransform="uppercase">
              {badgeText}
            </TagLabel>
          </Tag>
        </HStack>
        <Heading
          size="md"
          className="detail-title"
          mb={1}
          color="#111827"
          lineHeight="1.2"
        >
          {displayTitle}
        </Heading>
        {primaryId && (
          <Text
            className="detail-id"
            fontFamily="mono"
            fontSize="xs"
            color="#6B7280"
            bg="#F3F4F6"
            display="inline-block"
            px={2}
            py={0.5}
            borderRadius="md"
          >
            {primaryIdLabel}: {primaryId}
          </Text>
        )}
      </Box>

      <Box className="prop-row" mb={4}>
        <Text
          className="prop-label"
          fontSize="xs"
          fontWeight="semibold"
          color="#6B7280"
          textTransform="uppercase"
          mb={1}
        >
          Description
        </Text>
        <Text className="prop-value" fontSize="sm" color="#374151">
          {description || 'No description available from Open Targets.'}
        </Text>
      </Box>

      <Box className="prop-row" mb={4}>
        <Text
          className="prop-label"
          fontSize="xs"
          fontWeight="semibold"
          color="#6B7280"
          textTransform="uppercase"
          mb={1}
        >
          Known Associations
        </Text>
        <Text className="prop-value" fontSize="sm" color="#374151">
          Degree: <strong>{degree}</strong> interactions
          <br />
          <Text as="span" fontSize="xs" color="#6B7280">
            Hover over a node to highlight its neighborhood.
          </Text>
        </Text>
      </Box>

      <Box
        className="action-buttons"
        mt={6}
        pt={4}
        borderTop="1px solid #E5E7EB"
      >
        <HStack spacing={3}>
          <Button
            as="a"
            href={link1Href}
            target="_blank"
            rel="noopener noreferrer"
            flex="1"
            variant="outline"
            size="sm"
          >
            {link1Label}
          </Button>
          <Button
            as="a"
            href={link2Href}
            target="_blank"
            rel="noopener noreferrer"
            flex="1"
            variant="outline"
            size="sm"
          >
            {link2Label}
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function KnowledgeGraph(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [diseaseHit, setDiseaseHit] = useState<OtSearchHit | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [visibleKinds, setVisibleKinds] = useState<Record<NodeKind, boolean>>({
    disease: true,
    gene: true,
    pathway: true,
    drug: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        if (typeof window === 'undefined') return;
        const raw = window.localStorage.getItem('KNOWLEDGE_GRAPH_DATA');
        if (!raw) {
          setError('No KNOWLEDGE_GRAPH_DATA found in localStorage.');
          setLoading(false);
          return;
        }

        const payload = JSON.parse(raw);
        const genes: string[] = Array.isArray(payload?.genes)
          ? payload.genes.filter((g: any) => typeof g === 'string')
          : [];
        const datasetId: string =
          typeof payload?.datasetId === 'string'
            ? payload.datasetId
            : 'Unknown dataset';

        if (!genes.length) {
          setError('No genes provided in KNOWLEDGE_GRAPH_DATA.');
          setLoading(false);
          return;
        }

        const result = await buildKnowledgeGraph(datasetId, genes);
        if (cancelled) return;

        setNodes(result.nodes);
        setEdges(result.edges);
        setDiseaseHit(result.diseaseHit ?? null);
        setSelectedId(result.diseaseNode.id);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message || 'Failed to build knowledge graph.');
        setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // const displayedNodes = useMemo(
  //   () => nodes.filter((n) => visibleKinds[n.kind]),
  //   [nodes, visibleKinds]
  // );

  // const displayedNodeIds = useMemo(
  //   () => new Set(displayedNodes.map((n) => n.id)),
  //   [displayedNodes]
  // );

  // const displayedEdges = useMemo(
  //   () =>
  //     edges.filter(
  //       (e) => displayedNodeIds.has(e.from) && displayedNodeIds.has(e.to)
  //     ),
  //   [edges, displayedNodeIds]
  // );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  const toggleKind = (kind: NodeKind) => {
    setVisibleKinds((prev) => ({
      ...prev,
      [kind]: !prev[kind],
    }));
  };

  const resetFilters = () => {
    setVisibleKinds({
      disease: true,
      gene: true,
      pathway: true,
      drug: true,
    });
  };

  if (loading) {
    return (
      <Box
        h="100vh"
        bg="#F3F4F6"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <HStack spacing={3}>
          <Spinner />
          <Text color="#4B5563">
            Building knowledge graph from Open Targets…
          </Text>
        </HStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        h="100vh"
        bg="#F3F4F6"
        p={6}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box
          bg="white"
          border="1px solid #E5E7EB"
          rounded="xl"
          p={6}
          maxW="540px"
          textAlign="center"
        >
          <Heading size="sm" mb={2} color="#111827">
            Knowledge Graph Error
          </Heading>
          <Text fontSize="sm" color="#6B7280" mb={2}>
            {error}
          </Text>
          <Text fontSize="xs" color="#9CA3AF">
            Make sure <code>KNOWLEDGE_GRAPH_DATA</code> in{' '}
            <code>localStorage</code> contains{' '}
            <code>{'{ genes: string[], datasetId: string }'}</code>.
          </Text>
        </Box>
      </Box>
    );
  }

  const legendItems: { kind: NodeKind; label: string }[] = [
    { kind: 'drug', label: 'Drugs' },
    { kind: 'gene', label: 'Genes' },
    { kind: 'pathway', label: 'Pathways' },
    { kind: 'disease', label: 'Diseases' },
  ];
  

  return (
  <Box
    bg="#F9FAFB"
    h="100vh"
    minH="100vh"
    display="flex"
    flexDirection="column"
    overflow="hidden"
  >

      <Box
        as="main"
        flex="1"
        h="100%"                     // 🔒 main fills page
        overflow="hidden"
        p={{ base: 3, md: 4 }}
        minH={0}
      >
        <Grid
          templateColumns={{ base: '1fr', xl: 'minmax(0, 1.8fr) 380px' }}
          gap={4}
          h="92%"                   // 🔒 grid fills main
          minH={0}
        >
          {/* Network viewport */}
          <Box minH={0} h="100%">
            {/* <KnowledgeCanvas
              nodes={displayedNodes}
              edges={displayedEdges}
              selectedId={selectedId}
              onSelect={setSelectedId}
              searchTerm={search}
            /> */}
            <KnowledgeCanvas
  nodes={nodes}
  edges={edges}
  selectedId={selectedId}
  onSelect={setSelectedId}
  searchTerm={search}
  visibleKinds={visibleKinds}
/>
          </Box>

          {/* Sidebar */}
          <Box
            bg="white"
            border="1px solid #E5E7EB"
            rounded="2xl"
            boxShadow="0 16px 32px rgba(15,23,42,0.12)"
            display="flex"
            flexDirection="column"
            overflow="hidden"
            minH={0}
            h="100%"                 // 🔒 sidebar same height as network
          >
            {/* Search */}
            <Box
              borderBottom="1px solid #E5E7EB"
              p={3}
              flexShrink={0}
            >
              <InputGroup size="sm" maxW="260px" mx="auto">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" boxSize={3} />
                </InputLeftElement>
                <Input
                  placeholder="Search gene, pathway, drug or disease…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  bg="#F3F4F6"
                  borderColor="#E5E7EB"
                  _focus={{
                    bg: 'white',
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px rgba(59,130,246,0.6)',
                  }}
                />
              </InputGroup>
            </Box>

            {/* Filters & Legend (compact, non-growing) */}
            <Box
              borderBottom="1px solid #E5E7EB"
              px={3}
              py={2}
              flexShrink={0}
            >
              <HStack justify="space-between" mb={2}>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="#6B7280"
                  textTransform="uppercase"
                >
                  Filters & Legend
                </Text>
                <Text
                  fontSize="xs"
                  color="#2563EB"
                  cursor="pointer"
                  onClick={resetFilters}
                >
                  Reset
                </Text>
              </HStack>
              <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={1.5}>
                {legendItems.map((item) => {
                  const active = visibleKinds[item.kind];
                  return (
                    <HStack
                      key={item.kind}
                      spacing={1.5}
                      fontSize="xs"
                      cursor="pointer"
                      px={2}
                      py={0.5}
                      borderRadius="md"
                      onClick={() => toggleKind(item.kind)}
                      opacity={active ? 1 : 0.4}
                      _hover={{ bg: '#F3F4F6' }}
                    >
                      <Box
                        w="10px"
                        h="10px"
                        borderRadius="full"
                        bg={COLORS[item.kind]}
                      />
                      <Text marginBottom={0}>{item.label}</Text>
                    </HStack>
                  );
                })}
              </Grid>
            </Box>

            {/* Details (the only scrollable area) */}
            <Box
              id="details-container"
              flex="1"
              overflowY="auto"
              p={4}
              minH={0}
            >
              <DetailPanel
                selected={selectedNode}
                diseaseHit={diseaseHit}
                edges={edges}
              />
            </Box>
          </Box>
        </Grid>
      </Box>
    </Box>
  );
}
