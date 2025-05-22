import React, { useEffect, useState } from "react";
import { Box, Spinner, Text, Flex, Select } from "@chakra-ui/react";
import Plot from "react-plotly.js";
import { Layout, Data, ScatterData } from "plotly.js";
import { useSamplesContext } from "../../context/SamplesContext";
import { Sample } from "../../types";

interface ScatterPlotProps {
  selectedSampleIds: Set<string>;
}

// Define available metadata fields for coloring
const COLOR_FIELDS = [
  { value: "subtype", label: "Subtype" },
  { value: "grade", label: "Grade" },
  { value: "idh_status", label: "IDH Status" },
  { value: "mgmt_status", label: "MGMT Status" },
  { value: "gender", label: "Gender" },
] as const;

// Color palette for different categories
const COLOR_PALETTE = [
  "#1f77b4", // blue
  "#ff7f0e", // orange
  "#2ca02c", // green
  "#d62728", // red
  "#9467bd", // purple
  "#8c564b", // brown
  "#e377c2", // pink
  "#7f7f7f", // gray
  "#bcbd22", // yellow-green
  "#17becf", // cyan
];

const ScatterPlot: React.FC<ScatterPlotProps> = ({ selectedSampleIds }) => {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorField, setColorField] =
    useState<(typeof COLOR_FIELDS)[number]["value"]>("subtype");
  const {
    filteredSamples,
    activeSelectionSource,
    setActiveSelectionSource,
    setSelectedSampleIds,
  } = useSamplesContext();

  // Function to get color for a category
  const getColorForCategory = (
    category: string,
    categories: Set<string>
  ): string => {
    const index = Array.from(categories).indexOf(category);
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  };

  useEffect(() => {
    const fetchAndProcessData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the TCGA embeddings CSV
        const response = await fetch("/tcga_embeddings.csv");
        const csvText = await response.text();

        // Parse CSV
        const lines = csvText.split("\n").slice(1); // Skip header
        const csvData = lines
          .filter((line) => line.trim()) // Remove empty lines
          .map((line) => {
            const [id, x, y] = line.split(",");
            return {
              id,
              x: parseFloat(x),
              y: parseFloat(y),
            };
          });

        // Create a map of CSV data for quick lookup
        const csvDataMap = new Map(csvData.map((item) => [item.id, item]));

        // Filter samples that exist in both CSV and filtered samples
        const commonSamples = filteredSamples.filter((sample) => {
          const sampleId = sample.sampleid || String(sample.id);
          return csvDataMap.has(sampleId);
        });

        // Get unique categories for the selected color field
        const categories = new Set(
          commonSamples
            .map((sample) => sample[colorField as keyof Sample])
            .filter((value): value is string | number => value !== undefined)
            .map(String)
        );

        // Create plot data with metadata
        const selectedPoints = commonSamples.filter((sample) => {
          const sampleId = sample.sampleid || String(sample.id);
          return selectedSampleIds.has(sampleId);
        });

        const unselectedPoints = commonSamples.filter((sample) => {
          const sampleId = sample.sampleid || String(sample.id);
          return !selectedSampleIds.has(sampleId);
        });

        const createHoverText = (sample: Sample) => {
          const sampleId = sample.sampleid || String(sample.id);
          const metadata = [
            `ID: ${sampleId}`,
            sample.name && `Name: ${sample.name}`,
            sample.description && `Description: ${sample.description}`,
            sample.condition && `Condition: ${sample.condition}`,
            sample.date && `Date: ${sample.date}`,
            sample.project && `Project: ${sample.project}`,
            sample.protocol && `Protocol: ${sample.protocol}`,
            sample.organism && `Organism: ${sample.organism}`,
            sample.platform && `Platform: ${sample.platform}`,
            sample.notes && `Notes: ${sample.notes}`,
            sample.age && `Age: ${sample.age}`,
            sample.gender && `Gender: ${sample.gender}`,
            sample.subtype && `Subtype: ${sample.subtype}`,
            sample.grade && `Grade: ${sample.grade}`,
            sample.idh_status && `IDH Status: ${sample.idh_status}`,
            sample.mgmt_status && `MGMT Status: ${sample.mgmt_status}`,
          ]
            .filter(Boolean)
            .join("<br>");
          return metadata;
        };

        const getCoordinates = (sample: Sample) => {
          const sampleId = sample.sampleid || String(sample.id);
          const coords = csvDataMap.get(sampleId);
          return coords ? [coords.x, coords.y] : null;
        };

        // Create separate traces for each category
        const createCategoryTraces = (
          points: Sample[],
          isSelected: boolean
        ) => {
          const traces: Data[] = [];

          // Group points by category
          const pointsByCategory = new Map<string, Sample[]>();
          points.forEach((point) => {
            const category = point[colorField as keyof Sample];
            if (category !== undefined) {
              const categoryStr = String(category);
              if (!pointsByCategory.has(categoryStr)) {
                pointsByCategory.set(categoryStr, []);
              }
              pointsByCategory.get(categoryStr)?.push(point);
            }
          });

          // Create a trace for each category
          pointsByCategory.forEach((categoryPoints, category) => {
            const coords = categoryPoints
              .map(getCoordinates)
              .filter((coord): coord is [number, number] => coord !== null);

            // Show sample count in legend
            const count = categoryPoints.length;

            if (coords.length > 0) {
              // Group separation: convex hull (fallback to bounding box)
              let hullTrace = null;
              if (coords.length >= 3) {
                // Convex hull algorithm (Graham scan, simple for 2D)
                const hull = getConvexHull(coords);
                if (hull.length >= 3) {
                  hullTrace = {
                    x: hull.map(([x]) => x),
                    y: hull.map(([, y]) => y),
                    type: "scatter",
                    mode: "lines",
                    fill: "toself",
                    fillcolor: getColorForCategory(category, categories) + "11", // transparent
                    line: {
                      color: getColorForCategory(category, categories),
                      width: 1,
                    },
                    hoverinfo: "skip",
                    showlegend: false,
                  };
                }
              } else if (coords.length === 2) {
                // Draw a line between two points
                hullTrace = {
                  x: [coords[0][0], coords[1][0]],
                  y: [coords[0][1], coords[1][1]],
                  type: "scatter",
                  mode: "lines",
                  line: {
                    color: getColorForCategory(category, categories),
                    width: 1,
                  },
                  hoverinfo: "skip",
                  showlegend: false,
                };
              }
              if (hullTrace) traces.push(hullTrace as ScatterData);

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
              });
            }
          });

          return traces;
        };

        const selectedTraces = createCategoryTraces(selectedPoints, true);
        const unselectedTraces = createCategoryTraces(unselectedPoints, false);

        setPlotData([...unselectedTraces, ...selectedTraces]);
      } catch (err) {
        console.error("Error loading plot data:", err);
        setError("Failed to load plot data");
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessData();
  }, [selectedSampleIds, filteredSamples, colorField]);

  // Add Plot onClick handler
  const handlePointClick = (event: any) => {
    const sampleId = event.points[0]?.text?.match(/ID: ([^<]+)/)?.[1];
    if (sampleId) {
      setActiveSelectionSource("scatter");
      setSelectedSampleIds(new Set([sampleId]));
    }
  };

  // Add Plot lasso/box selection handler
  const handleLassoSelect = (event: any) => {
    const selectedPoints = event.points || [];
    const selectedIds = new Set<string>();
    selectedPoints.forEach((point: any) => {
      const sampleId = point.text?.match(/ID: ([^<]+)/)?.[1];
      if (sampleId) {
        selectedIds.add(sampleId);
      }
    });
    if (selectedIds.size > 0) {
      setActiveSelectionSource("scatter");
      setSelectedSampleIds(selectedIds);
    }
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="md" color="geneTerrain.primary" />
        <Text mt={2} color="geneTerrain.textSecondary">
          Loading plot data...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8} textAlign="center">
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  return (
    <Box w="100%" h="500px" bg="white" borderRadius="md" boxShadow="sm" p={4}>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="medium">
          TCGA Sample Embeddings
        </Text>
        <Select
          value={colorField}
          onChange={(e) =>
            setColorField(
              e.target.value as (typeof COLOR_FIELDS)[number]["value"]
            )
          }
          width="200px"
          size="sm"
          bg="white"
          borderColor="gray.300"
          borderWidth="1px"
          borderRadius="md"
          boxShadow="sm"
          _focus={{
            borderColor: "geneTerrain.primary",
            boxShadow: "0 0 0 1px #1f77b4",
          }}
          _hover={{ borderColor: "geneTerrain.primary" }}
          cursor="pointer"
          iconColor="gray.500"
        >
          {COLOR_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </Select>
      </Flex>
      <Plot
        data={plotData.map((trace: Data) => {
          if (
            trace.type === "scatter" &&
            Array.isArray((trace as ScatterData).text) &&
            (trace as ScatterData).marker &&
            typeof (trace as ScatterData).marker === "object"
          ) {
            return trace as ScatterData;
          }
          return trace;
        })}
        onClick={handlePointClick}
        onSelected={handleLassoSelect}
        layout={
          {
            showlegend: true,
            legend: {
              orientation: "h",
              x: 0.5,
              y: -0.25,
              xanchor: "center",
              yanchor: "top",
              bgcolor: "white",
              bordercolor: "#e2e8f0",
              borderwidth: 1,
              font: { size: 12 },
            },
            margin: { t: 40, r: 20, b: 90, l: 40 },
            hovermode: "closest",
            plot_bgcolor: "white",
            paper_bgcolor: "white",
            xaxis: {
              title: "X",
              showgrid: true,
              gridcolor: "rgba(0,0,0,0.1)",
            },
            yaxis: {
              title: "Y",
              showgrid: true,
              gridcolor: "rgba(0,0,0,0.1)",
            },
            autosize: true,
            height: 400,
          } as Partial<Layout>
        }
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </Box>
  );
};

// Add convex hull helper function at the top or bottom of the file
function getConvexHull(points: [number, number][]): [number, number][] {
  // Graham scan algorithm for 2D convex hull
  if (points.length < 3) return points;
  // Sort points lexicographically
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number]
  ) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export default ScatterPlot;
