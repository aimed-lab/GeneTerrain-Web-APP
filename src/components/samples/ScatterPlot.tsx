import React, { useEffect, useState, useRef, useMemo } from "react";
import * as d3 from "d3";
import {
  Box,
  Spinner,
  Text,
  Flex,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
  VStack,
  Badge,
  IconButton,
  Icon,
  HStack,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from "@chakra-ui/react";
import { MdClose, MdCenterFocusStrong, MdFilterCenterFocus } from "react-icons/md";
import { ChevronDownIcon } from "@chakra-ui/icons";
import Plot from "react-plotly.js";
import { Layout, Data, Shape } from "plotly.js";
import { useSamplesContext } from "../../context/SamplesContext";
import { Sample } from "../../types";
import { API_CONFIG } from "../../config/appConfig";
import { useNavigate } from "react-router-dom";
import { Point } from "../../GaussianPlots/types";
import { fetchGeneExpressionData } from "../../modules/GeneExpressionDataFetcher/fetchGeneExpressionData";

interface LassoData {
  label: string;
  sampleIds: string[];
  points: Point[];
}

interface ScatterPlotProps {
  selectedSampleIds: Set<string>;
}

// --- Helper Functions for Clustering ---

interface Cluster {
  min: number;
  max: number;
  label: string;
}

function clusterByInterval(data: number[], maxClusters = 5): Cluster[] {
  if (data.length < 2) return [];

  const sortedData = [...data].sort((a, b) => a - b);
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];

  if (min === max) {
    return [{ min, max, label: `${min}` }];
  }

  const uniqueValues = new Set(data);
  const numClusters = Math.min(maxClusters, uniqueValues.size);

  if (numClusters <= 1) {
    return [{ min, max, label: `${min.toFixed(1)} - ${max.toFixed(1)}` }];
  }

  const range = max - min;
  const interval = range / numClusters;

  const clusters: Cluster[] = [];
  for (let i = 0; i < numClusters; i++) {
    const clusterMin = min + i * interval;
    const clusterMax = i === numClusters - 1 ? max : min + (i + 1) * interval;
    clusters.push({
      min: clusterMin,
      max: clusterMax,
      label: `${clusterMin.toFixed(1)} - ${clusterMax.toFixed(1)}`,
    });
  }

  clusters[clusters.length - 1].max = max;

  return clusters;
}

function clusterByQuantile(data: number[], numClusters: number): Cluster[] {
  if (data.length < 2 || numClusters < 1) return [];

  const sorted = [...data].sort((a, b) => a - b);
  const totalSize = sorted.length;

  const uniqueValues = new Set(data);
  const k = Math.min(numClusters, uniqueValues.size);

  if (k <= 1) {
    return [
      {
        min: sorted[0],
        max: sorted[totalSize - 1],
        label: `${sorted[0].toFixed(1)} - ${sorted[totalSize - 1].toFixed(1)}`,
      },
    ];
  }

  const clusterSize = Math.floor(totalSize / k);
  if (clusterSize === 0) return [];

  const clusters: Cluster[] = [];
  for (let i = 0; i < k; i++) {
    const startIndex = i * clusterSize;
    const endIndex = i === k - 1 ? totalSize - 1 : (i + 1) * clusterSize - 1;

    if (startIndex >= totalSize) break;

    const min = sorted[startIndex];
    const max = sorted[endIndex];

    if (max === undefined) continue;

    clusters.push({
      min,
      max,
      label: `${min.toFixed(1)} - ${max.toFixed(1)}`,
    });
  }
  return clusters;
}

const getColumnType = (
  samples: Sample[],
  columnName: string
): "categorical" | "numeric" | "other" => {
  if (!samples || samples.length === 0 || !columnName) return "other";

  const values = samples
    .map((s) => (s as Record<string, any>)[columnName])
    .filter((v) => v !== null && v !== undefined);

  if (values.length === 0) return "other";

  const isNumeric = values.every((v) => !isNaN(Number(v)));
  if (isNumeric) return "numeric";

  const isCategorical = values.every(
    (v) => typeof v === "string" && v.trim() !== ""
  );
  if (isCategorical) {
    const uniqueValues = new Set(values);
    if (uniqueValues.size > 1 && uniqueValues.size < 50) {
      return "categorical";
    }
  }

  return "other";
};

const COLOR_PALETTE = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];
type LassoRegion = {
  id: string;
  x: number[]; // polygon x coords (data space)
  y: number[]; // polygon y coords (data space)
  selectedIds: string[]; // sample IDs inside this lasso
};

const MAX_LASSOS = 2;

function polygonToPath(xs: number[], ys: number[]): string {
  if (!xs || !ys || xs.length < 3 || ys.length < 3) return "";
  const n = Math.min(xs.length, ys.length);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y]);
  }
  if (pts.length < 3) return "";

  const [x0, y0] = pts[0];
  const rest = pts.slice(1).map(([x, y]) => `L ${x},${y}`).join(" ");
  return `M ${x0},${y0} ${rest} Z`;
}

function getPolygonFromSelectEvent(event: any): { x: number[]; y: number[] } | null {
  // Lasso selection
  const lp = event?.lassoPoints;
  if (lp?.x?.length && lp?.y?.length) {
    return { x: lp.x as number[], y: lp.y as number[] };
  }

  // Box selection fallback (range)
  const xr = event?.range?.x;
  const yr = event?.range?.y;
  if (Array.isArray(xr) && xr.length === 2 && Array.isArray(yr) && yr.length === 2) {
    const [x0, x1] = xr;
    const [y0, y1] = yr;
    return { x: [x0, x1, x1, x0], y: [y0, y0, y1, y1] };
  }

  return null;
}

function makeId(): string {
  // safe id for browsers without crypto.randomUUID
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// Utility to distinguish continuous vs discrete numeric
function getNumericSubtype(values: any[]): "continuous" | "discrete" {
  const unique = Array.from(
    new Set(values.filter((v) => v !== null && v !== undefined))
  );
  const allNumbers = unique.every((v) => !isNaN(Number(v)));
  const allIntegers = unique.every((v) => Number.isInteger(Number(v)));
  if (allNumbers) {
    if (unique.length > 20 && unique.some((v) => String(v).includes(".")))
      return "continuous";
    if (allIntegers && unique.length <= 20) return "discrete";
    return "continuous";
  }
  return "continuous"; // fallback
}

const ScatterPlot: React.FC<ScatterPlotProps> = ({ selectedSampleIds }) => {
  const {
    selectedDataset,
    filteredSamples,
    activeSelectionSource,
    setActiveSelectionSource,
    setSelectedSampleIds,
    embeddingDataMap,
    filteredSamples: contextFilteredSamples,
    selectedSampleIds: contextSelectedSampleIds,
    setSelectedSampleIds: setContextSelectedSampleIds,
  } = useSamplesContext();

  const navigate = useNavigate();

  const [lassoRegions, setLassoRegions] = useState<LassoRegion[]>([]);
  const [focusedLassoId, setFocusedLassoId] = useState<string | null>(null);

  // Comparison data state
  const [comparisonData, setComparisonData] = useState<LassoData[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // Function to handle "Compare" click with real data fetching
  const handleShowComparison = async () => {
    if (lassoRegions.length < 2) return;

    setIsComparing(true);
    try {
      const dataPromises = lassoRegions.map(async (region, i) => {
        // Fetch REAL data for this region (aggregating samples)
        const points = await fetchGeneExpressionData(
          region.selectedIds,
          selectedDataset || { id: "default", name: "Default", type: "gene_expression" } as any
        );

        // Get sample metadata for demographics summary
        const samples = filteredSamples.filter(s => region.selectedIds.includes(s.id));

        return {
          label: `Selection11 ${i + 1}`,
          sampleIds: region.selectedIds,
          points: points,
          samples: samples // Include full sample objects with metadata
        };
      });

      const results = await Promise.all(dataPromises);
      // Store specifically for lasso comparison
      localStorage.setItem("LASSO_COMPARISON_DATA", JSON.stringify(results));

      // Open in a new tab as requested
      window.open("/lasso-comparison", "_blank");
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    } finally {
      setIsComparing(false);
    }
  };

  const [colorField, setColorField] = useState<string>("");
  const [colorFieldOptions, setColorFieldOptions] = useState<string[]>([]);
  const [currentColumnType, setCurrentColumnType] = useState<
    "categorical" | "numeric" | "other"
  >("other");
  const [numericSubtype, setNumericSubtype] = useState<
    "continuous" | "discrete" | null
  >(null);
  const [numClusters, setNumClusters] = useState<number>(5);
  const [clusterMethod, setClusterMethod] = useState<"interval" | "quantile">(
    "interval"
  );
  const [neighborhoodCenter, setNeighborhoodCenter] = useState<{
    x: number;
    y: number;
    id: string;
  } | null>(null);
  const [neighborhoodRadius, setNeighborhoodRadius] = useState<number>(2);
  const [showRadiusSlider, setShowRadiusSlider] = useState<boolean>(false);

  // Capture State
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);
  const [visibleTraceCount, setVisibleTraceCount] = useState<number>(0);
  const [totalTraceCount, setTotalTraceCount] = useState<number>(0);
  // Store visibility state by trace name to persist across re-renders
  const [traceVisibility, setTraceVisibility] = useState<Record<string, boolean | "legendonly">>({});


  const plotRef = useRef<any>(null);
  // Ref for the actual Plotly DOM node
  const plotlyNodeRef = useRef<any>(null);

  // Memoize base layout (without neighborhood shape)
  const [fixedAxisRange, setFixedAxisRange] = useState<{
    x: [number, number];
    y: [number, number];
  } | null>(null);

  // Utility to compute square axis ranges
  function getSquareAxisRanges(
    xs: number[],
    ys: number[]
  ): { x: [number, number]; y: [number, number] } {
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const xLen = maxX - minX;
    const yLen = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const maxLen = Math.max(xLen, yLen);
    return {
      x: [centerX - maxLen / 2, centerX + maxLen / 2],
      y: [centerY - maxLen / 2, centerY + maxLen / 2],
    };
  }

  const baseLayout = useMemo(
    () => ({
      showlegend: true,
      legend: {
        orientation: "v",
        x: 1.02,
        y: 0.9,
        xanchor: "left",
        yanchor: "top",
        font: { size: 10 },
        itemclick: "toggle",
        itemdoubleclick: "toggleothers",
      },
      margin: { t: 40, r: 180, b: 50, l: 40 },
      hovermode: "closest",
      autosize: true,
      xaxis: {
        showline: true,
        linecolor: "rgba(0,0,0,0.05)",
        linewidth: 1,
        zeroline: true,
        zerolinecolor: "rgba(0,0,0,0.2)",
        zerolinewidth: 1,
        // Lock axis range if fixedAxisRange is set
        ...(fixedAxisRange ? { range: fixedAxisRange.x } : {}),
      },
      yaxis: {
        showline: true,
        linecolor: "rgba(0,0,0,0.05)",
        linewidth: 1,
        zeroline: true,
        zerolinecolor: "rgba(0,0,0,0.2)",
        zerolinewidth: 1,
        // Make y axis scale match x axis for true circle
        scaleanchor: "x",
        scaleratio: 1,
        // Lock axis range if fixedAxisRange is set
        ...(fixedAxisRange ? { range: fixedAxisRange.y } : {}),
      },
    }),
    [fixedAxisRange]
  );

  const layoutWithShapes = useMemo(() => {
    const shapes: Partial<Shape>[] = [];

    // Neighborhood circle (if active)
    if (showRadiusSlider && neighborhoodCenter) {
      shapes.push({
        type: "circle",
        xref: "x",
        yref: "y",
        x0: neighborhoodCenter.x - neighborhoodRadius,
        x1: neighborhoodCenter.x + neighborhoodRadius,
        y0: neighborhoodCenter.y - neighborhoodRadius,
        y1: neighborhoodCenter.y + neighborhoodRadius,
        line: { color: "rgba(30,107,82,0.5)", width: 2 },
        fillcolor: "rgba(30,107,82,0.08)",
        layer: "above",
      });
    }

    // Up to 2 lasso polygons
    const lassoColors = [
      { line: "rgba(30,107,82,0.95)", fill: "rgba(30,107,82,0.12)" },
      { line: "rgba(255,127,14,0.95)", fill: "rgba(255,127,14,0.12)" },
    ];

    lassoRegions.forEach((region, idx) => {
      const path = polygonToPath(region.x, region.y);
      if (!path) return;

      const c = lassoColors[idx % lassoColors.length];
      shapes.push({
        type: "path",
        path,
        xref: "x",
        yref: "y",
        line: { color: c.line, width: 2 },
        fillcolor: c.fill,
        layer: "above",
      });
    });

    return {
      ...(baseLayout as any),
      dragmode: "lasso", // default tool; user can still switch via toolbar
      shapes,
    } as Partial<Layout>;
  }, [
    baseLayout,
    lassoRegions,
    showRadiusSlider,
    neighborhoodCenter,
    neighborhoodRadius,
  ]);

  useEffect(() => {
    if (lassoRegions.length === 0) return;

    const union = new Set<string>();
    lassoRegions.forEach((r) => r.selectedIds.forEach((id) => union.add(id)));

    setActiveSelectionSource("scatter");
    setContextSelectedSampleIds(union);
  }, [lassoRegions, setActiveSelectionSource, setContextSelectedSampleIds]);


  // Memoize plotData so it only updates when actual data changes
  const memoizedPlotData = useMemo(() => {
    const plotData = (filteredSamples || [])
      .map((sample) => {
        const embedding = embeddingDataMap.get(sample.sampleid || sample.id);
        if (!embedding) return null;
        return {
          ...sample,
          x: embedding.x,
          y: embedding.y,
          sampleid: sample.sampleid || sample.id,
        };
      })
      .filter(Boolean);
    console.log(
      "[STEP 1] plotData length:",
      plotData.length,
      "Sample:",
      plotData[0]
    );
    if (plotData.length > 0) {
      const xs = (plotData as Array<any>).map((d) => d.x);
      const ys = (plotData as Array<any>).map((d) => d.y);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs);
      const minY = Math.min(...ys),
        maxY = Math.max(...ys);
      console.log("[STEP 2] x range:", minX, maxX, "y range:", minY, maxY);
    }
    return plotData;
  }, [embeddingDataMap, filteredSamples]);

  // Capture initial axis ranges based on actual data coordinates
  useEffect(() => {
    if (memoizedPlotData.length > 0 && !fixedAxisRange) {
      const xs = memoizedPlotData.map((d: any) => d.x);
      const ys = memoizedPlotData.map((d: any) => d.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const xRange = maxX - minX;
      const yRange = maxY - minY;

      // Add 10% padding
      const xPadding = xRange * 0.1 || 1;
      const yPadding = yRange * 0.1 || 1;

      const paddedMinX = minX - xPadding;
      const paddedMaxX = maxX + xPadding;
      const paddedMinY = minY - yPadding;
      const paddedMaxY = maxY + yPadding;

      // Make axis ranges square
      const squareRanges = getSquareAxisRanges(
        [paddedMinX, paddedMaxX],
        [paddedMinY, paddedMaxY]
      );
      setFixedAxisRange(squareRanges);
      console.log("[DEBUG] Initial Axis Range set from data:", squareRanges);
    }
  }, [memoizedPlotData, fixedAxisRange]);

  // Reset fixed axis range when dataset or filtered samples change significantly
  useEffect(() => {
    setFixedAxisRange(null);
  }, [filteredSamples]);


  useEffect(() => {
    if (!filteredSamples || filteredSamples.length === 0) {
      setColorFieldOptions([]);
      setColorField("");
      return;
    }
    // Debug: Log available fields and sample data
    console.log("[DEBUG] First filtered sample:", filteredSamples[0]);
    const sampleKeys = Object.keys(filteredSamples[0] || {});
    console.log("[DEBUG] All keys in first sample:", sampleKeys);
    sampleKeys.forEach((key) => {
      const type = getColumnType(filteredSamples, key);
      console.log(`[DEBUG] Field: ${key}, Type: ${type}`);
    });
    const excludeFields = new Set([
      "id",
      "sampleid",
      "name",
      "description",
      "date",
      "notes",
    ]);

    const options: string[] = [];
    if (filteredSamples.length > 0) {
      for (const key of sampleKeys) {
        if (excludeFields.has(key)) continue;

        const type = getColumnType(filteredSamples, key);
        if (type === "categorical" || type === "numeric") {
          options.push(key);
        }
      }
    }

    setColorFieldOptions(options);
    if (!options.includes(colorField)) {
      const defaultOption =
        options.find((o) => o.toLowerCase().includes("age")) ||
        options[0] ||
        "id";
      setColorField(defaultOption);
    }
  }, [filteredSamples]);

  const getColorForCategory = (
    category: string,
    categories: Set<string>
  ): string => {
    const index = Array.from(categories).indexOf(category);
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  };

  // Process plot data when embeddings, samples, or UI state change
  useEffect(() => {
    if (
      !selectedDataset ||
      !filteredSamples ||
      filteredSamples.length === 0 ||
      embeddingDataMap.size === 0
    ) {
      return;
    }
    try {
      const commonSamples = filteredSamples.filter((sample) => {
        const sampleId = sample.sampleid || String(sample.id);
        return embeddingDataMap.has(sampleId);
      });

      const columnType = getColumnType(commonSamples, colorField);
      setCurrentColumnType(columnType);
      let numericSubtypeLocal: "continuous" | "discrete" | null = null;
      let numericData: number[] = [];
      if (columnType === "numeric") {
        numericData = commonSamples
          .map((s) => Number((s as Record<string, any>)[colorField]))
          .filter((n) => !isNaN(n));
        numericSubtypeLocal = getNumericSubtype(numericData);
        setNumericSubtype(numericSubtypeLocal);
      } else {
        setNumericSubtype(null);
      }

      let clusters: Cluster[] = [];
      if (columnType === "numeric" && numericSubtypeLocal === "continuous") {
        clusters =
          clusterMethod === "interval"
            ? clusterByInterval(numericData, numClusters)
            : clusterByQuantile(numericData, numClusters);
      }

      const getCategoryForSample = (sample: Sample): string => {
        const value = (sample as Record<string, any>)[colorField];
        if (
          columnType === "numeric" &&
          numericSubtypeLocal === "continuous" &&
          clusters.length > 0
        ) {
          const numValue = Number(value);
          if (isNaN(numValue)) return "N/A";
          for (const cluster of clusters) {
            if (numValue >= cluster.min && numValue <= cluster.max) {
              return cluster.label;
            }
          }
          const lastCluster = clusters[clusters.length - 1];
          if (lastCluster && numValue === lastCluster.max)
            return lastCluster.label;
          return "Other";
        }
        // For discrete numeric, treat as categorical
        return String(value);
      };

      const categories = new Set(commonSamples.map(getCategoryForSample));

      const selectedPoints = commonSamples.filter((sample) => {
        const sampleId = sample.sampleid || String(sample.id);
        return selectedSampleIds.has(sampleId);
      });

      const unselectedPoints = commonSamples.filter((sample) => {
        const sampleId = sample.sampleid || String(sample.id);
        return !selectedSampleIds.has(sampleId);
      });

      const createHoverText = (sample: Sample) => {
        return Object.entries(sample)
          .map(([key, value]) => `${key}: ${value}`)
          .join("<br>");
      };

      const getCoordinates = (sample: Sample) => {
        const sampleId = sample.sampleid || String(sample.id);
        const coords = embeddingDataMap.get(sampleId);
        return coords ? [coords.x, coords.y] : null;
      };

      const createCategoryTraces = (points: Sample[], isSelected: boolean) => {
        const traces: Data[] = [];
        const pointsByCategory = new Map<string, Sample[]>();
        points.forEach((point) => {
          const category = getCategoryForSample(point);
          if (category !== undefined) {
            const categoryStr = String(category);
            if (!pointsByCategory.has(categoryStr)) {
              pointsByCategory.set(categoryStr, []);
            }
            pointsByCategory.get(categoryStr)?.push(point);
          }
        });

        pointsByCategory.forEach((categoryPoints, category) => {
          const coords = categoryPoints
            .map(getCoordinates)
            .filter((coord): coord is [number, number] => coord !== null);

          const count = categoryPoints.length;

          if (coords.length > 0) {
            traces.push({
              x: coords.map(([x]) => x),
              y: coords.map(([, y]) => y),
              type: "scatter",
              mode: "markers",
              marker: {
                size: isSelected ? 10 : 8,
                color: getColorForCategory(category, categories),
                line: {
                  color: isSelected
                    ? "rgba(30, 107, 82, 0.8)"
                    : "rgba(0, 0, 0, 0.2)",
                  width: isSelected ? 2 : 1,
                },
              },
              name: `${category} (n=${count})${isSelected ? " (Selected)" : ""
                }`,
              text: categoryPoints.map(createHoverText),
              hoverinfo: "text",
              customdata: categoryPoints.map(
                (sample) => sample.sampleid || sample.id
              ),
            });
          }
        });

        return traces;
      };

      let selectedTraces = createCategoryTraces(selectedPoints, true);
      let unselectedTraces = createCategoryTraces(unselectedPoints, false);

      if (columnType === "numeric" && clusters.length > 0) {
        const sortOrder = clusters.map((c) => c.label);
        const sortTraces = (traces: Data[]): Data[] => {
          return [...traces].sort((a, b) => {
            const aName = (a.name || "").split(" (")[0];
            const bName = (b.name || "").split(" (")[0];
            return sortOrder.indexOf(aName) - sortOrder.indexOf(bName);
          });
        };
        unselectedTraces = sortTraces(unselectedTraces);
        selectedTraces = sortTraces(selectedTraces);
      }
    } catch (err) {
      console.error("Failed to load plot data:", err);
    }
  }, [
    embeddingDataMap,
    filteredSamples,
    selectedSampleIds,
    colorField,
    numClusters,
    clusterMethod,
    selectedDataset,
    setSelectedSampleIds,
  ]);

  // Neighborhood selection logic
  const selectNeighborhood = (
    center: { x: number; y: number; id: string },
    radius: number
  ) => {
    if (!embeddingDataMap.size) return;
    const selectedIds = new Set<string>();
    embeddingDataMap.forEach((coords, id) => {
      const dx = coords.x - center.x;
      const dy = coords.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        selectedIds.add(id);
      }
    });
    setActiveSelectionSource("scatter");
    setContextSelectedSampleIds(selectedIds);
  };

  // On point click, set center and show slider
  const handlePointClick = (event: any) => {
    setLassoRegions([]); // switching to neighborhood mode clears old lassos

    const sampleId = event.points[0]?.customdata;
    if (sampleId && embeddingDataMap.has(sampleId)) {
      const coords = embeddingDataMap.get(sampleId);
      if (!coords || coords.x === undefined || coords.y === undefined) return;
      setNeighborhoodCenter({ x: coords.x, y: coords.y, id: sampleId });
      setShowRadiusSlider(true);
      setNeighborhoodRadius(2); // default radius
      // Select initial neighborhood
      selectNeighborhood({ x: coords.x, y: coords.y, id: sampleId }, 2);
    }
  };

  // When radius changes, update selection
  useEffect(() => {
    if (neighborhoodCenter && showRadiusSlider) {
      selectNeighborhood(neighborhoodCenter, neighborhoodRadius);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhoodRadius]);

  // Hide slider on lasso select or outside click
  const handleLassoSelect = (event: any) => {
    // Lasso mode should cancel neighborhood mode
    setShowRadiusSlider(false);
    setNeighborhoodCenter(null);

    const poly = getPolygonFromSelectEvent(event);
    const selectedPoints = event?.points || [];
    if (!poly || selectedPoints.length === 0) return;

    const selectedIds: string[] = [];
    selectedPoints.forEach((p: any) => {
      const id = p?.customdata;
      if (id) selectedIds.push(String(id));
    });

    const newRegion: LassoRegion = {
      id: makeId(),
      x: poly.x,
      y: poly.y,
      selectedIds,
    };

    setLassoRegions((prev) => {
      const next = [...prev, newRegion];
      // keep only last 2 lassos
      return next.slice(-MAX_LASSOS);
    });
  };

  // Calculate Convex Hull using d3
  const calculateConvexHull = (points: [number, number][]) => {
    if (points.length < 3) return null;
    const hull = d3.polygonHull(points);
    return hull; // returns Array<[number, number]> or null
  };

  // Create lasso region from currently visible points
  const createLassoFromVisible = () => {
    if (!plotlyNodeRef.current || !plotlyNodeRef.current.data) return;

    // Collect all visible points
    const visiblePoints: [number, number][] = [];
    const visibleIds: string[] = [];

    // Iterate through traces in the plot
    const data = plotlyNodeRef.current.data as any[];
    data.forEach((trace: any) => {
      // Check if trace is visible (true or undefined means visible; 'legendonly' means hidden)
      // Also ensure it's a scatter/marker trace with data
      if (
        (trace.visible === true || trace.visible === undefined) &&
        trace.x &&
        trace.y &&
        trace.customdata
      ) {
        // Collect points
        for (let i = 0; i < trace.x.length; i++) {
          const x = trace.x[i];
          const y = trace.y[i];
          const id = trace.customdata[i];
          if (x !== undefined && y !== undefined && id) {
            visiblePoints.push([x, y]);
            visibleIds.push(String(id));
          }
        }
      }
    });

    if (visiblePoints.length === 0) return;

    // Calculate Hull
    let hullPoints = calculateConvexHull(visiblePoints);

    // If hull failed (e.g. collinear or < 3 points), use bounding box or verify
    if (!hullPoints) {
      if (visiblePoints.length >= 3) {
        // fallback if d3 fails? d3.polygonHull returns null for collinear
        // Just use bbox
        const xs = visiblePoints.map(p => p[0]);
        const ys = visiblePoints.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        hullPoints = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
      } else if (visiblePoints.length > 0) {
        // Small number of points: small box around them
        const xs = visiblePoints.map(p => p[0]);
        const ys = visiblePoints.map(p => p[1]);
        const minX = Math.min(...xs) - 0.5;
        const maxX = Math.max(...xs) + 0.5;
        const minY = Math.min(...ys) - 0.5;
        const maxY = Math.max(...ys) + 0.5;
        hullPoints = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
      } else {
        return;
      }
    }

    // Separate x and y for LassoRegion
    const hullX = hullPoints.map(p => p[0]);
    const hullY = hullPoints.map(p => p[1]);

    // Create new LassoRegion
    const newRegion: LassoRegion = {
      id: makeId(),
      x: hullX,
      y: hullY,
      selectedIds: visibleIds,
    };

    setLassoRegions((prev) => {
      // Append new region, keeping max 2
      const next = [...prev, newRegion];
      return next.slice(-MAX_LASSOS);
    });
    setHasCaptured(true);
  };

  const checkTraceVisibility = () => {
    if (!plotlyNodeRef.current || !plotlyNodeRef.current.data) return;
    const data = plotlyNodeRef.current.data as any[];
    // Filter for actual data traces (scatter/markers) to avoid counting shapes if they ever become traces
    const relevantTraces = data.filter((t: any) => t.type === 'scatter' || t.mode === 'markers');

    const total = relevantTraces.length;
    const visible = relevantTraces.filter((t: any) =>
      t.visible === true || t.visible === undefined
    ).length;

    // Capture visibility map
    const newVisibility: Record<string, boolean | "legendonly"> = {};
    relevantTraces.forEach((t: any) => {
      if (t.name) {
        newVisibility[t.name] = t.visible === undefined ? true : t.visible;
      }
    });

    setTotalTraceCount(total);
    setVisibleTraceCount(visible);
    setTraceVisibility(prev => {
      // Only update if changed to avoid unnecessary re-renders?
      // Actually, JSON.stringify check might be expensive, but safe for small number of traces.
      if (JSON.stringify(prev) !== JSON.stringify(newVisibility)) {
        return newVisibility;
      }
      return prev;
    });
  };

  // Focus on a specific lasso region by zooming to its bounding box
  const focusOnLasso = (regionId: string) => {
    const region = lassoRegions.find(r => r.id === regionId);
    if (!region || !plotlyNodeRef.current) return;

    const xs = region.x;
    const ys = region.y;

    if (!xs.length || !ys.length) return;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Add padding (20% on each side)
    const xPadding = (maxX - minX) * 0.2;
    const yPadding = (maxY - minY) * 0.2;

    const xRange = [minX - xPadding, maxX + xPadding];
    const yRange = [minY - yPadding, maxY + yPadding];

    // Update the plot to zoom to this region
    const update = {
      'xaxis.range': xRange,
      'yaxis.range': yRange
    };

    // Use Plotly.relayout to update the view
    if (plotlyNodeRef.current && (window as any).Plotly) {
      (window as any).Plotly.relayout(plotlyNodeRef.current, update);
    }

    setFocusedLassoId(regionId);
  };

  // Remove a specific lasso region
  const removeLasso = (regionId: string) => {
    setLassoRegions((prev) => prev.filter(r => r.id !== regionId));
    if (focusedLassoId === regionId) {
      setFocusedLassoId(null);
    }
  };



  if (!embeddingDataMap || embeddingDataMap.size === 0) {
    return <div>Loading embeddings...</div>;
  }

  console.log("[STEP 3] Plotly data prop:", memoizedPlotData);

  // Before rendering, transform memoizedPlotData into Plotly traces based on data type
  const filteredPlotData = memoizedPlotData.filter(Boolean) as Array<any>;
  let plotlyData: any[] = [];
  if (
    filteredPlotData.length > 0 &&
    colorField &&
    ((currentColumnType === "numeric" && numericSubtype === "discrete") ||
      currentColumnType === "categorical")
  ) {
    // Discrete numeric or categorical: one trace per value
    const categories = Array.from(
      new Set(filteredPlotData.map((d) => String(d[colorField])))
    );
    plotlyData = categories.map((cat, idx) => {
      const catPoints = filteredPlotData.filter(
        (d) => String(d[colorField]) === cat
      );
      return {
        x: catPoints.map((d) => d.x),
        y: catPoints.map((d) => d.y),
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { size: 8, color: COLOR_PALETTE[idx % COLOR_PALETTE.length] },
        name: cat,
        text: catPoints.map((d) => d.sampleid),
        customdata: catPoints.map((d) => d.sampleid),
        visible: traceVisibility[cat] !== undefined ? traceVisibility[cat] : true,
      };
    });
  } else if (
    filteredPlotData.length > 0 &&
    colorField &&
    currentColumnType === "numeric" &&
    numericSubtype === "continuous"
  ) {
    // Continuous numeric: cluster and color by interval
    // Recompute clusters for legend
    const numericData = filteredPlotData
      .map((d) => Number(d[colorField]))
      .filter((n) => !isNaN(n));
    const clusters =
      clusterMethod === "interval"
        ? clusterByInterval(numericData, numClusters)
        : clusterByQuantile(numericData, numClusters);
    // Assign cluster label to each point
    const getClusterLabel = (value: number) => {
      for (const cluster of clusters) {
        if (value >= cluster.min && value <= cluster.max) return cluster.label;
      }
      return "Other";
    };
    const categories = clusters.map((c) => c.label);
    plotlyData = categories.map((cat, idx) => {
      const catPoints = filteredPlotData.filter(
        (d) => getClusterLabel(Number(d[colorField])) === cat
      );
      return {
        x: catPoints.map((d) => d.x),
        y: catPoints.map((d) => d.y),
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { size: 8, color: COLOR_PALETTE[idx % COLOR_PALETTE.length] },
        name: cat,
        text: catPoints.map((d) => d.sampleid),
        customdata: catPoints.map((d) => d.sampleid),
        visible: traceVisibility[cat] !== undefined ? traceVisibility[cat] : true,
      };
    });
  } else {
    // No colorField or fallback: single trace
    plotlyData = [
      {
        x: filteredPlotData.map((d) => d.x),
        y: filteredPlotData.map((d) => d.y),
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { size: 8, color: "rgba(30,107,82,0.7)" },
        name: colorField ? colorField.replace(/_/g, " ") : "Samples",
        text: filteredPlotData.map((d) => d.sampleid),
        customdata: filteredPlotData.map((d) => d.sampleid),
      },
    ];
  }

  return (
    <Flex
      w="100%"
      h="600px"
      bg="white"
      borderRadius="md"
      boxShadow="sm"
      p={4}
      position="relative"
      gap={4}
    >
      {/* Main Plot Area */}
      <Box flex={lassoRegions.length > 0 ? "1" : "1"} position="relative">
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontSize="lg" fontWeight="medium" color="geneTerrain.primary">
            Statistical Analysis Embeddings
          </Text>
          <Flex align="center">
            {currentColumnType === "numeric" &&
              numericSubtype === "continuous" && (
                <>
                  <Select
                    value={clusterMethod}
                    onChange={(e) => setClusterMethod(e.target.value as any)}
                    width="120px"
                    size="sm"
                    bg="white"
                    mr={2}
                    borderColor="gray.300"
                    borderWidth="1px"
                    borderRadius="md"
                  >
                    <option value="interval">Interval</option>
                    <option value="quantile">Quantile</option>
                  </Select>
                  <Select
                    value={numClusters}
                    onChange={(e) => setNumClusters(Number(e.target.value))}
                    width="120px"
                    size="sm"
                    bg="white"
                    mr={2}
                    borderColor="gray.300"
                    borderWidth="1px"
                    borderRadius="md"
                  >
                    {[...Array(9)].map((_, i) => {
                      const count = i + 2;
                      return (
                        <option key={count} value={count}>
                          {count} Clusters
                        </option>
                      );
                    })}
                  </Select>
                </>
              )}
            <Select
              value={colorField}
              onChange={(e) => setColorField(e.target.value)}
              width="200px"
              size="sm"
              bg="white"
              borderColor="gray.300"
              borderWidth="1px"
              borderRadius="md"
            >
              {colorFieldOptions.map((field) => (
                <option key={field} value={field}>
                  {field
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </Select>

            {/* Controls to create Lasso from Visible */}
            {((currentColumnType === "numeric" && numericSubtype === "discrete") ||
              currentColumnType === "categorical") && (
                <HStack spacing={2} ml={2}>
                  {visibleTraceCount > 0 && visibleTraceCount < totalTraceCount && !hasCaptured && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<MdFilterCenterFocus />}
                      colorScheme="teal"
                      borderColor="rgba(30,107,82,0.5)"
                      color="rgba(30,107,82,1)"
                      onClick={createLassoFromVisible}
                      title="Capture currently visible samples as a lasso selection"
                    >
                      Capture
                    </Button>
                  )}
                </HStack>
              )}

            {/* Compare button - visible when more than 1 lassos active */}
            {/* {lassoRegions.length > 1 && (
              <Button
                ml={2}
                size="sm"
                colorScheme="green"
                isLoading={isComparing}
                loadingText="Preparing..."
                onClick={handleShowComparison}
              >
                Compare Lassos
              </Button>
            )} */}
          </Flex>
        </Flex>
        {/* Neighborhood radius slider (below controls, right-aligned, only visible after click) */}
        {showRadiusSlider && (
          <Flex justify="flex-end" align="center" mb={2}>
            <Box bg="white" p={3} borderRadius="md" boxShadow="md" minW="220px">
              <Text
                fontSize="sm"
                fontWeight="medium"
                mb={2}
                color="geneTerrain.primary"
              >
                Neighborhood Radius: {neighborhoodRadius.toFixed(2)}
              </Text>
              <Slider
                min={0.5}
                max={10}
                step={0.1}
                value={neighborhoodRadius}
                onChange={setNeighborhoodRadius}
                colorScheme="green"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </Box>
          </Flex>
        )}
        <Plot
          ref={plotRef}
          data={plotlyData}
          onClick={handlePointClick}
          onSelected={handleLassoSelect}
          // layout={baseLayout as Partial<Layout>}
          layout={layoutWithShapes}

          onInitialized={(_figure, graphDiv) => {
            plotlyNodeRef.current = graphDiv;
            checkTraceVisibility();
          }}
          onUpdate={(_figure, graphDiv) => {
            plotlyNodeRef.current = graphDiv;
            checkTraceVisibility();
          }}
          onRestyle={() => {
            // Slight delay to ensure internal state update? Usually not needed but safe.
            checkTraceVisibility();
            // Reset capture state on restyle (visibility change)
            setHasCaptured(false);
          }}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ["pan2d", "autoScale2d", "toImage"],
          }}
          style={{ width: "100%", height: "100%" }}
        />
      </Box>

      {/* Side Panel for Lasso Selections */}
      {lassoRegions.length > 0 && (
        <VStack
          w="280px"
          bg="gray.50"
          borderRadius="md"
          p={4}
          spacing={3}
          align="stretch"
          maxH="100%"
          overflowY="auto"
        >
          <HStack justify="space-between" align="center">
            <Text fontSize="md" fontWeight="bold" color="geneTerrain.primary">
              Cohort Selections
            </Text>
            <Badge colorScheme="green" borderRadius="full" px={2}>
              {lassoRegions.length}
            </Badge>
          </HStack>

          <Divider />

          {lassoRegions.map((region, idx) => {
            const lassoColors = [
              { line: "rgba(30,107,82,0.95)", bg: "green.50", border: "green.500" },
              { line: "rgba(255,127,14,0.95)", bg: "orange.50", border: "orange.500" },
            ];
            const colorScheme = lassoColors[idx % lassoColors.length];
            const isFocused = focusedLassoId === region.id;

            return (
              <Box
                key={region.id}
                p={3}
                bg={isFocused ? colorScheme.bg : "white"}
                borderRadius="md"
                borderWidth="2px"
                borderColor={isFocused ? colorScheme.border : "gray.200"}
                boxShadow="sm"
                transition="all 0.2s"
              >
                <HStack justify="space-between" mb={2}>
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      Cohort {idx + 1}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {region.selectedIds.length} sample{region.selectedIds.length !== 1 ? 's' : ''}
                    </Text>
                  </VStack>

                  <HStack spacing={1}>
                    <IconButton
                      aria-label="Focus on selection"
                      icon={<Icon as={MdCenterFocusStrong} />}
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      onClick={() => focusOnLasso(region.id)}
                      title="Focus on this selection"
                    />
                    <IconButton
                      aria-label="Remove selection"
                      icon={<Icon as={MdClose} />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => removeLasso(region.id)}
                      title="Remove this selection"
                    />
                  </HStack>
                </HStack>

                {/* Color indicator */}
                <Box
                  h="3px"
                  bg={colorScheme.border}
                  borderRadius="full"
                  mt={2}
                />
              </Box>
            );
          })}

          <Divider mt={2} />

          <Button
            colorScheme="green"
            size="md"
            w="100%"
            mt={2}
            leftIcon={<Icon as={MdFilterCenterFocus} />}
            onClick={handleShowComparison}
            isDisabled={lassoRegions.length < 2}
            isLoading={isComparing}
            loadingText="Loading..."
          >
            Compare
          </Button>

          {lassoRegions.length < 2 && (
            <Text fontSize="xs" color="gray.500" textAlign="center" mt={1}>
              Select at least 2 regions to compare
            </Text>
          )}
        </VStack>
      )}
    </Flex>
  );
};

export default ScatterPlot;
