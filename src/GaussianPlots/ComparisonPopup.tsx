import React, { useRef, useEffect, useState } from "react";
import { ComparisonSample, Point, ViewportState } from "./types";
import { getSigmaForZoom } from "./utils";
import { vertexShader, fragmentShader } from "../shaders/gaussian";
import { isPointInPolygon } from "./utils";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ComparisonPopupProps {
  samples: ComparisonSample[];
  onClose: () => void;
}

// Shared lasso state that will be used across all mini plots
interface SharedLassoState {
  isDrawing: boolean;
  currentRegion: Point[];
  selectedGeneIds: Set<string>;
}

const defaultViewport: ViewportState = {
  scale: 1,
  offset: { x: 0, y: 0 },
  dragging: false,
  lastMousePos: null,
};

export const ComparisonPopup: React.FC<ComparisonPopupProps> = ({
  samples,
  onClose,
}) => {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  // Add shared lasso state for synchronized selection
  const [sharedLasso, setSharedLasso] = useState<SharedLassoState>({
    isDrawing: false,
    currentRegion: [],
    selectedGeneIds: new Set(),
  });

  // Set a fixed aspect ratio for plots while allowing them to be responsive
  useEffect(() => {
    const updateSize = () => {
      // Calculate a reasonable size based on viewport width
      // Make sure plots are large enough but don't cause overflow
      const containerWidth = Math.min(window.innerWidth * 0.85, 1200);
      const plotWidth = Math.min(containerWidth / 2 - 40, 500); // Allow 2 plots per row with padding
      const plotHeight = plotWidth * 0.75; // Keep a reasonable aspect ratio

      setCanvasSize({ width: plotWidth, height: plotHeight });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Position the grid based on number of samples
  const getGridClass = () => {
    if (samples.length === 1) return "d-flex justify-content-center";
    if (samples.length === 2) return "d-flex justify-content-between";
    return "d-flex flex-wrap";
  };

  // Get width for each item in the grid
  const getItemWidth = () => {
    if (samples.length <= 2) return "calc(50% - 10px)";
    return "calc(50% - 10px)";
  };

  // Handle selection clearing for all plots
  const clearAllSelections = () => {
    setSharedLasso({
      isDrawing: false,
      currentRegion: [],
      selectedGeneIds: new Set(),
    });
  };

  // Get selected points for a particular sample
  const getSelectedPoints = (samplePoints: Point[]) => {
    if (sharedLasso.selectedGeneIds.size === 0) return [];
    return samplePoints.filter((point) =>
      sharedLasso.selectedGeneIds.has(point.geneId)
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        overflow: "hidden", // Prevent page scrolling when modal is open
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
          width: "85%",
          maxWidth: "1200px",
          maxHeight: "85vh", // Limit height to 85% of viewport
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Header with sticky position */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #E2E8F0",
            position: "sticky",
            top: 0,
            backgroundColor: "#FFFFFF",
            zIndex: 1,
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
          }}
        >
          <h3 style={{ margin: 0, color: "#333333", fontWeight: 600 }}>
            Gene Expression Comparison ({samples.length} Samples)
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.5rem",
              color: "#666666",
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content area */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto", // Only vertical scrolling
            overflowX: "hidden", // Prevent horizontal scrolling
            flex: 1,
          }}
        >
          {/* Mini plots section */}
          <div style={{ marginBottom: "30px" }}>
            <h4 style={{ color: "#333333", marginBottom: "16px" }}>
              Individual Sample Visualizations
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
                gap: "20px",
              }}
            >
              {samples.map((sample, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "#F7FAFC",
                    borderRadius: "8px",
                    padding: "16px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <h5 style={{ color: "#333333", marginBottom: "12px" }}>
                    {sample.name}
                  </h5>
                  <div style={{ position: "relative" }}>
                    <ComparisonCanvas
                      points={sample.points}
                      width={canvasSize.width}
                      height={canvasSize.height}
                      sharedLasso={sharedLasso}
                      setSharedLasso={setSharedLasso}
                      sampleIndex={i}
                    />
                  </div>
                  <p
                    style={{
                      color: "#666666",
                      marginTop: "8px",
                      fontSize: "14px",
                    }}
                  >
                    {sample.datasetName}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts section */}
          <div>
            <h4 style={{ color: "#333333", marginBottom: "16px" }}>
              Selected Genes Expression Analysis
            </h4>
            {sharedLasso.selectedGeneIds.size > 0 ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
                    gap: "20px",
                    marginBottom: "30px",
                  }}
                >
                  {samples.map((sample, i) => (
                    <GeneComparisonChart
                      key={i}
                      selectedPoints={sample.points.filter((point) =>
                        sharedLasso.selectedGeneIds.has(point.geneId)
                      )}
                      sampleName={sample.name}
                      sampleIndex={i}
                    />
                  ))}
                </div>
                <CombinedComparisonChart
                  samples={samples}
                  selectedGeneIds={sharedLasso.selectedGeneIds}
                />
              </>
            ) : (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#666666",
                  backgroundColor: "#F7FAFC",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                }}
              >
                Select genes on any plot to see comparison analysis
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            position: "sticky",
            bottom: 0,
            backgroundColor: "#FFFFFF",
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
          }}
        >
          <button
            onClick={() =>
              setSharedLasso((prev) => ({
                ...prev,
                selectedGeneIds: new Set(),
              }))
            }
            style={{
              padding: "8px 16px",
              backgroundColor:
                sharedLasso.selectedGeneIds.size > 0 ? "#FFFFFF" : "#F7FAFC",
              color: "#606060",
              border: "1px solid #E2E8F0",
              borderRadius: "4px",
              cursor:
                sharedLasso.selectedGeneIds.size > 0 ? "pointer" : "default",
              opacity: sharedLasso.selectedGeneIds.size > 0 ? 1 : 0.6,
            }}
            disabled={sharedLasso.selectedGeneIds.size === 0}
          >
            Clear Selection ({sharedLasso.selectedGeneIds.size})
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "#80BC00",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

// Add this component

interface GeneComparisonChartProps {
  selectedPoints: Point[];
  sampleName: string;
  sampleIndex: number;
}

const GeneComparisonChart: React.FC<GeneComparisonChartProps> = ({
  selectedPoints,
  sampleName,
  sampleIndex,
}) => {
  // Select top genes by absolute value for better visualization
  const topGenes = [...selectedPoints]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 10);

  // Skip rendering if no genes
  if (topGenes.length === 0) return null;

  // Create chart data
  const chartData = {
    labels: topGenes.map((p) => p.geneName || p.geneId),
    datasets: [
      {
        label: sampleName,
        data: topGenes.map((p) => p.value), // Add the data property
        backgroundColor:
          sampleIndex % 2 === 0
            ? "rgba(128, 188, 0, 0.8)" // geneTerrain.accent1 with opacity
            : "rgba(30, 107, 82, 0.8)", // geneTerrain.primary with opacity
        borderColor:
          sampleIndex % 2 === 0
            ? "#80BC00" // geneTerrain.accent1
            : "#1E6B52", // geneTerrain.primary
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          boxWidth: 15,
          padding: 8,
          font: {
            size: 10,
          },
        },
      },
      title: {
        display: true,
        text: `Top ${topGenes.length} Genes by Expression Value`,
        font: {
          size: 12,
        },
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: any[]) => {
            const index = tooltipItems[0].dataIndex;
            return topGenes[index].geneName || topGenes[index].geneId;
          },
          label: (tooltipItem: any) => {
            return `Value: ${tooltipItem.raw.toFixed(3)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 90,
          minRotation: 45,
          font: {
            size: 9,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: "Expression Value",
          font: {
            size: 10,
          },
        },
      },
    },
    animation: {
      duration: 500,
    },
  };

  return <Bar data={chartData} options={chartOptions} />;
};

// Add this component

interface CombinedComparisonChartProps {
  samples: ComparisonSample[];
  selectedGeneIds: Set<string>;
}

const CombinedComparisonChart: React.FC<CombinedComparisonChartProps> = ({
  samples,
  selectedGeneIds,
}) => {
  // Find common genes across all samples
  const commonGenes: { id: string; name: string }[] = [];

  // Get all selected genes from the first sample
  if (samples.length > 0) {
    samples[0].points.forEach((point) => {
      if (selectedGeneIds.has(point.geneId)) {
        commonGenes.push({
          id: point.geneId,
          name: point.geneName || point.geneId,
        });
      }
    });
  }

  // Sort by gene name
  commonGenes.sort((a, b) => a.name.localeCompare(b.name));

  // Take top 10 for visibility
  const displayGenes = commonGenes.slice(0, Math.min(10, commonGenes.length));

  // Skip rendering if no genes
  if (displayGenes.length === 0) return null;

  // Create datasets for each sample
  const datasets = samples.slice(0, 4).map((sample, idx) => {
    const geneValues = new Map(
      sample.points
        .filter((p) => selectedGeneIds.has(p.geneId))
        .map((p) => [p.geneId, p.value])
    );

    const colors = [
      "rgba(53, 162, 235, 0.7)", // Blue
      "rgba(255, 99, 132, 0.7)", // Pink
      "rgba(75, 192, 192, 0.7)", // Teal
      "rgba(255, 159, 64, 0.7)", // Orange
    ];

    return {
      label: sample.name,
      data: displayGenes.map((gene) => geneValues.get(gene.id) || 0),
      backgroundColor: colors[idx % colors.length],
      borderColor: colors[idx % colors.length].replace("0.7", "1"),
      borderWidth: 1,
      borderRadius: 4,
    };
  });

  const chartData = {
    labels: displayGenes.map((g) => g.name),
    datasets,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Gene Expression Comparison Across Samples",
        font: {
          size: 14,
          weight: "bold" as const,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 90,
          minRotation: 45,
          font: {
            size: 10,
          },
        },
      },
      y: {
        title: {
          display: true,
          text: "Expression Value",
        },
      },
    },
  };

  return <Bar data={chartData} options={chartOptions} />;
};

// Enhanced ComparisonCanvas with lasso selection
interface ComparisonCanvasProps {
  points: Point[];
  width: number;
  height: number;
  sharedLasso: SharedLassoState;
  setSharedLasso: React.Dispatch<React.SetStateAction<SharedLassoState>>;
  sampleIndex: number;
}

const ComparisonCanvas: React.FC<ComparisonCanvasProps> = ({
  points,
  width,
  height,
  sharedLasso,
  setSharedLasso,
  sampleIndex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    ...defaultViewport,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Initialize WebGL and render the data
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Initialize WebGL
    const program = initWebGL(gl);
    if (program) {
      // Draw points
      drawSample(gl, program, points, viewport, width, height);
    }
  }, [points, viewport, width, height]);

  // Effect to redraw the overlay with lasso selection
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear the overlay canvas
    ctx.clearRect(0, 0, width, height);

    // Draw the current lasso region
    if (sharedLasso.currentRegion.length > 0) {
      ctx.beginPath();
      ctx.moveTo(
        sharedLasso.currentRegion[0].x * viewport.scale + viewport.offset.x,
        sharedLasso.currentRegion[0].y * viewport.scale + viewport.offset.y
      );

      sharedLasso.currentRegion.forEach((point) => {
        ctx.lineTo(
          point.x * viewport.scale + viewport.offset.x,
          point.y * viewport.scale + viewport.offset.y
        );
      });

      ctx.strokeStyle = "#2463EB";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fill with semi-transparent color
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fill();
    }

    // Highlight selected points
    if (sharedLasso.selectedGeneIds.size > 0) {
      points.forEach((point) => {
        if (sharedLasso.selectedGeneIds.has(point.geneId)) {
          ctx.beginPath();
          ctx.arc(
            point.x * viewport.scale + viewport.offset.x,
            point.y * viewport.scale + viewport.offset.y,
            4,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
          ctx.fill();
        }
      });
    }
  }, [sharedLasso, viewport, points, width, height]);

  // Initialize WebGL
  const initWebGL = (gl: WebGLRenderingContext) => {
    const vShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShader, vertexShader);
    gl.compileShader(vShader);

    const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShader, fragmentShader);
    gl.compileShader(fShader);

    const program = gl.createProgram()!;
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    return program;
  };

  // Draw the sample data
  const drawSample = (
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    samplePoints: Point[],
    viewport: ViewportState,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    gl.useProgram(program);

    // Check for texture float extension
    const ext =
      gl.getExtension("OES_texture_float") ||
      gl.getExtension("OES_texture_half_float");

    // Create points texture
    const pointsData = new Float32Array(samplePoints.length * 4);
    for (let i = 0; i < samplePoints.length; i++) {
      pointsData[i * 4] = samplePoints[i].x;
      pointsData[i * 4 + 1] = samplePoints[i].y;
      pointsData[i * 4 + 2] = 0;
      pointsData[i * 4 + 3] = 0;
    }

    // Create values texture
    const valuesData = new Float32Array(samplePoints.length * 4);
    for (let i = 0; i < samplePoints.length; i++) {
      valuesData[i * 4] = samplePoints[i].value;
      valuesData[i * 4 + 1] = 0;
      valuesData[i * 4 + 2] = 0;
      valuesData[i * 4 + 3] = 0;
    }

    // Create and bind textures
    const pointsTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pointsTexture);

    const texType = ext ? gl.FLOAT : gl.UNSIGNED_BYTE;
    const pointsTextureWidth = Math.min(1024, samplePoints.length);

    if (ext) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        pointsTextureWidth,
        1,
        0,
        gl.RGBA,
        texType,
        pointsData
      );
    } else {
      const uint8Points = new Uint8Array(samplePoints.length * 4);
      for (let i = 0; i < samplePoints.length; i++) {
        uint8Points[i * 4] = Math.min(
          255,
          Math.max(0, Math.floor(samplePoints[i].x * 127 + 127))
        );
        uint8Points[i * 4 + 1] = Math.min(
          255,
          Math.max(0, Math.floor(samplePoints[i].y * 127 + 127))
        );
        uint8Points[i * 4 + 2] = 0;
        uint8Points[i * 4 + 3] = 255;
      }
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        pointsTextureWidth,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        uint8Points
      );
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const valuesTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, valuesTexture);

    if (ext) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        pointsTextureWidth,
        1,
        0,
        gl.RGBA,
        texType,
        valuesData
      );
    } else {
      const uint8Values = new Uint8Array(samplePoints.length * 4);
      for (let i = 0; i < samplePoints.length; i++) {
        uint8Values[i * 4] = Math.min(
          255,
          Math.max(0, Math.floor(((samplePoints[i].value + 3) / 6) * 255))
        );
        uint8Values[i * 4 + 1] = 0;
        uint8Values[i * 4 + 2] = 0;
        uint8Values[i * 4 + 3] = 255;
      }
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        pointsTextureWidth,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        uint8Values
      );
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Set shader uniforms
    const pointsTexLoc = gl.getUniformLocation(program, "pointsTexture");
    gl.uniform1i(pointsTexLoc, 0);

    const valuesTexLoc = gl.getUniformLocation(program, "valuesTexture");
    gl.uniform1i(valuesTexLoc, 1);

    const pointCountLoc = gl.getUniformLocation(program, "pointCount");
    gl.uniform1i(pointCountLoc, samplePoints.length);

    const sigmaLoc = gl.getUniformLocation(program, "sigma");
    gl.uniform1f(sigmaLoc, getSigmaForZoom(viewport.scale));

    const resolutionLoc = gl.getUniformLocation(program, "resolution");
    gl.uniform2f(resolutionLoc, canvasWidth, canvasHeight);

    const offsetLoc = gl.getUniformLocation(program, "offset");
    gl.uniform2f(offsetLoc, viewport.offset.x, viewport.offset.y);

    const scaleLoc = gl.getUniformLocation(program, "scale");
    gl.uniform1f(scaleLoc, viewport.scale);

    // Add these uniforms:
    const colorScaleLoc = gl.getUniformLocation(program, "colorScale");
    gl.uniform1f(colorScaleLoc, 1.0); // Match your main plot's value

    // Also add color range uniforms if your shader uses them
    const colorMinLoc = gl.getUniformLocation(program, "colorMin");
    const colorMaxLoc = gl.getUniformLocation(program, "colorMax");
    gl.uniform1f(colorMinLoc, -3.0); // Match your main plot's range
    gl.uniform1f(colorMaxLoc, 3.0); // Match your main plot's range

    // Draw
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Clean up
    gl.deleteTexture(pointsTexture);
    gl.deleteTexture(valuesTexture);
  };

  // Convert screen coordinates to world coordinates
  const getWorldCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Calculate coordinates relative to canvas
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // Transform to world space
    const x = (canvasX - viewport.offset.x) / viewport.scale;
    const y = (canvasY - viewport.offset.y) / viewport.scale;

    return { x, y };
  };

  // Mouse event handlers for lasso selection
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const { x, y } = getWorldCoords(e.clientX, e.clientY);

    // Start lasso drawing
    if (e.button === 0 && !e.shiftKey) {
      // Left click without shift
      setSharedLasso({
        isDrawing: true,
        currentRegion: [
          {
            x,
            y,
            geneId: "",
            geneName: "",
            pathways: [],
            description: "",
            value: 0,
          },
        ],
        selectedGeneIds: new Set(),
      });
    }
    // Start panning
    else {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Handle lasso drawing
    if (sharedLasso.isDrawing) {
      const { x, y } = getWorldCoords(e.clientX, e.clientY);

      // Only add point if it's far enough from the last point
      const lastPoint =
        sharedLasso.currentRegion[sharedLasso.currentRegion.length - 1];
      const minDistance = 5 / viewport.scale;
      const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);

      if (distance > minDistance) {
        setSharedLasso((prev) => ({
          ...prev,
          currentRegion: [
            ...prev.currentRegion,
            {
              x,
              y,
              geneId: "",
              geneName: "",
              pathways: [],
              description: "",
              value: 0,
            },
          ],
        }));
      }
    }
    // Handle panning
    else if (isDragging && lastMousePos) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;

      setViewport((prev) => ({
        ...prev,
        offset: {
          x: prev.offset.x + dx,
          y: prev.offset.y + dy,
        },
      }));

      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  // Update handleMouseUp to properly finalize the lasso selection
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Complete lasso selection
    if (sharedLasso.isDrawing && sharedLasso.currentRegion.length > 2) {
      // Find points that are inside the lasso polygon
      const selectedIds = new Set<string>();

      // Log for debugging
      console.log(
        `Checking ${points.length} points against lasso with ${sharedLasso.currentRegion.length} points`
      );

      points.forEach((point) => {
        if (
          isPointInPolygon(
            point, // Pass the complete Point object
            sharedLasso.currentRegion
          )
        ) {
          selectedIds.add(point.geneId);
        }
      });

      console.log(`Selected ${selectedIds.size} points inside lasso`);

      setSharedLasso({
        isDrawing: false,
        currentRegion: [],
        selectedGeneIds: selectedIds,
      });
    } else {
      // Reset lasso state if not enough points
      if (sharedLasso.isDrawing) {
        setSharedLasso((prev) => ({
          ...prev,
          isDrawing: false,
          currentRegion: [],
        }));
      }
    }

    // End panning
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);

    if (sharedLasso.isDrawing) {
      setSharedLasso((prev) => ({
        ...prev,
        isDrawing: false,
      }));
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setViewport((prev) => {
      const newScale = Math.max(0.1, Math.min(10, prev.scale * zoomFactor));
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
    <div className="position-relative" style={{ width: width, height: height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border rounded"
        style={{
          display: width > 0 ? "block" : "none",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          cursor: sharedLasso.isDrawing ? "crosshair" : "grab",
          borderColor: "#E2E8F0", // geneTerrain.border
        }}
      />
      <canvas
        ref={overlayCanvasRef}
        width={width}
        height={height}
        className="position-absolute top-0 start-0"
        style={{
          pointerEvents: "none",
        }}
      />
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ cursor: sharedLasso.isDrawing ? "crosshair" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove} // FIXED: was incorrectly onMouseOver
        onMouseUp={handleMouseUp} // FIXED: was incorrectly onMouseOut
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
    </div>
  );
};
