import React, { useEffect, useState, useRef, useMemo } from "react";
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
} from "@chakra-ui/react";
import Plot from "react-plotly.js";
import { Layout, Data, Shape } from "plotly.js";
import { useSamplesContext } from "../../context/SamplesContext";
import { Sample } from "../../types";
import { API_CONFIG } from "../../config/appConfig";

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

  const plotRef = useRef<any>(null);
  // Ref for the actual Plotly DOM node
  const plotlyNodeRef = useRef<any>(null);

  // Memoize base layout (without neighborhood shape)
  const [fixedAxisRange, setFixedAxisRange] = useState<{
    x: [number, number];
    y: [number, number];
  } | null>(null);

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

  // Capture initial axis ranges after first plot render and lock them
  useEffect(() => {
    if (plotlyNodeRef.current && !fixedAxisRange) {
      // Get current axis ranges from the plot
      const xRange = plotlyNodeRef.current.layout?.xaxis?.range;
      const yRange = plotlyNodeRef.current.layout?.yaxis?.range;
      if (xRange && yRange) {
        setFixedAxisRange({
          x: [xRange[0], xRange[1]],
          y: [yRange[0], yRange[1]],
        });
      }
    }
  }, [plotlyNodeRef.current]);

  // Memoize plotData so it only updates when actual data changes
  const memoizedPlotData = useMemo(() => {
    const plotData = (filteredSamples || [])
      .map((sample) => {
        const embedding = embeddingDataMap.get(sample.sampleid || sample.id);
        if (!embedding) return null;
        return {
          x: embedding.x,
          y: embedding.y,
          sampleid: sample.sampleid || sample.id,
          ...sample,
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

  // Effect: update only the circle shape on radius/center change
  useEffect(() => {
    if (plotlyNodeRef.current && showRadiusSlider && neighborhoodCenter) {
      const shape: Partial<Shape> = {
        type: "circle",
        xref: "x",
        yref: "y",
        x0: neighborhoodCenter.x - neighborhoodRadius,
        x1: neighborhoodCenter.x + neighborhoodRadius,
        y0: neighborhoodCenter.y - neighborhoodRadius,
        y1: neighborhoodCenter.y + neighborhoodRadius,
        line: {
          color: "rgba(30,107,82,0.5)",
          width: 2,
        },
        fillcolor: "rgba(30,107,82,0.08)",
      };
      window.Plotly &&
        window.Plotly.relayout(plotlyNodeRef.current, { shapes: [shape] });
    } else if (plotlyNodeRef.current) {
      window.Plotly &&
        window.Plotly.relayout(plotlyNodeRef.current, { shapes: [] });
    }
  }, [showRadiusSlider, neighborhoodCenter, neighborhoodRadius]);

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
              name: `${category} (n=${count})${
                isSelected ? " (Selected)" : ""
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
    setShowRadiusSlider(false);
    setNeighborhoodCenter(null);
    const selectedPoints = event.points || [];
    const selectedIds = new Set<string>();
    selectedPoints.forEach((point: any) => {
      const sampleId = point.customdata;
      if (sampleId) {
        const sample = filteredSamples.find(
          (s) => (s.sampleid || s.id) === sampleId
        );
        if (sample) {
          const correctId = sample.sampleid || sample.id;
          selectedIds.add(correctId);
        }
      }
    });
    if (selectedIds.size > 0) {
      setActiveSelectionSource("scatter");
      setContextSelectedSampleIds(selectedIds);
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
    <Box
      w="100%"
      h="600px"
      bg="white"
      borderRadius="md"
      boxShadow="sm"
      p={4}
      position="relative"
    >
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
        layout={baseLayout as Partial<Layout>}
        onInitialized={(_figure, graphDiv) => {
          plotlyNodeRef.current = graphDiv;
        }}
        onUpdate={(_figure, graphDiv) => {
          plotlyNodeRef.current = graphDiv;
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
  );
};

export default ScatterPlot;
