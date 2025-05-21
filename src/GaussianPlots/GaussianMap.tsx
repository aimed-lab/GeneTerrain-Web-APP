import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  X,
  Lasso,
  Search,
  Layers,
  Settings,
  Sliders,
} from "lucide-react";
import { Point, ViewportState, PopupState, LassoState, Dataset } from "./types";
import { getSigmaForZoom, isPointInCircle, isPointInPolygon } from "./utils";
import {
  vertexShader,
  fragmentShader,
  discreteFragmentShader,
  waterFragmentShader, // Add this
  skyFragmentShader, // Add this
} from "../shaders/gaussian";
import { VisualizationHistory } from "./VisualizationHistory";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import GeneSelectionSummary from "../components/visualization/GeneSelectionSummary";
import { Box, Button } from "@chakra-ui/react";

// Import the images
import gaussianLayerImg from "../assets/layers/gaussian_view.png";
import discreteLayerImg from "../assets/layers/contour_view.png";
import positiveLayerImg from "../assets/layers/peak_view.png";
import negativeLayerImg from "../assets/layers/valley_view.png";

// Add these imports at the top
import { useTheme } from "@chakra-ui/react";
import { hexToRgbArray, getSpectralColorFromTheme } from "../utils/colorUtils"; // We'll create this utility next
import { ComparisonPopup } from "./ComparisonPopup";

// Add this debounce utility at the top with other imports
// const debounce = (func: Function, wait: number) => {
//   let timeout: NodeJS.Timeout;
//   return function executedFunction(...args: any[]) {
//     const later = () => {
//       clearTimeout(timeout);
//       func(...args);
//     };
//     clearTimeout(timeout);
//     timeout = setTimeout(later, wait);
//   };
// };

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const POINT_RADIUS = 2;
const LABEL_ZOOM_THRESHOLD = 2;

// Add these constants at the top of your file with other constants
const MIN_ZOOM_FOR_LABELS = 4; // Only show labels when zoomed in this much
const PERCENTILE_PER_ZOOM_LEVEL = {
  low: 10, // Show top/bottom 2% of genes at low zoom (most extreme values)
  medium: 25, // Show top/bottom 10% at medium zoom
  high: 50, // Show top/bottom 25% at high zoom
  veryhigh: 100, // Show top/bottom 50% at very high zoom
};
const ZOOM_THRESHOLDS = {
  low: 1,
  medium: 2.0,
  high: 3.5,
  veryhigh: 5,
};

// Update the getSpectralColor function to use theme colors
function getSpectralColor(value: number, theme: any): string {
  // Get theme colors or use fallbacks if not available
  const expressionLow = theme.colors?.geneTerrain?.primary || "#1E6B52"; // Use primary green instead of blue
  const expressionMed = theme.colors?.geneTerrain?.neutral || "#606060"; // Use neutral gray
  const expressionHigh = theme.colors?.geneTerrain?.accent1 || "#80BC00"; // Use accent1 lime green

  return getSpectralColorFromTheme(
    value,
    expressionLow,
    expressionMed,
    expressionHigh
  );
}

interface ComparisonSample {
  points: Point[];
  name: string;
  datasetName: string;
}

interface GaussianMapProps {
  points: Point[];
  datasetId: string;
  sampleId: string;
  datasets: Dataset[];
}

const defaultViewport: ViewportState = {
  scale: 1,
  offset: { x: 0, y: 0 },
  dragging: false,
  lastMousePos: null,
};

export function GaussianMap({
  points,
  datasetId,
  sampleId,
  datasets,
}: GaussianMapProps) {
  console.log(points);
  const theme = useTheme(); // <-- Add this line

  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const prevSampleIdRef = useRef<string>(sampleId);

  console.log("points: ", points);

  const [viewport, setViewport] = useState<ViewportState>(defaultViewport);
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    point: null,
    position: null,
  });
  // Modify the initial lasso state
  const [lasso, setLasso] = useState<LassoState>({
    active: false,
    regions: [],
    selectedGenes: new Set(),
    currentRegion: [],
  });
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);
  const [showSelectionSummary, setShowSelectionSummary] = useState(false);
  const [pathwaySearch, setPathwaySearch] = useState("");
  const [availablePathways] = useState(() =>
    Array.from(new Set(points.flatMap((p) => p.pathways))).sort()
  );
  const [comparisonSamples, setComparisonSamples] = useState<
    ComparisonSample[]
  >([]);
  const [showComparisonPopup, setShowComparisonPopup] = useState(false);

  // Add these new state variables at the top with other useState declarations
  const [summaryPosition, setSummaryPosition] = useState({ x: 16, y: 16 });
  const [isDraggingSummary, setIsDraggingSummary] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Add this with your other state variables at the top of the GaussianMap component
  type LayerType = "gaussian" | "discrete" | "water" | "sky";
  const [currentLayer, setCurrentLayer] = useState<LayerType>("gaussian");

  // Add state for selected gene
  const [selectedGene, setSelectedGene] = useState<Point | null>(null);

  // Add state for line thickness control
  const [lineThickness, setLineThickness] = useState<number>(0.12);
  const [showThicknessControl, setShowThicknessControl] =
    useState<boolean>(false);

  // Add state for summary panel toggle
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);

  // Add a new state variable for isoline spacing
  const [isolineSpacing, setIsolineSpacing] = useState(1.0); // Default value
  const [showIsolineControl, setShowIsolineControl] = useState(false); // For toggle panel

  // Step 2: Add a simple layers configuration array to make the UI dynamic
  // Update the availableLayers array to include image paths
  const availableLayers = [
    {
      id: "gaussian",
      name: "Terrain View",
      icon: "bi-bullseye",
      image: gaussianLayerImg,
    },
    {
      id: "discrete",
      name: "Contour View",
      icon: "bi-grid-3x3",
      image: discreteLayerImg,
    },
    {
      id: "water",
      name: "Peaks View",
      icon: "bi-water",
      image: positiveLayerImg,
    },
    {
      id: "sky",
      name: "Valley View",
      icon: "bi-cloud-sun",
      image: negativeLayerImg,
    },
  ];

  useEffect(() => {
    if (prevSampleIdRef.current !== sampleId) {
      setViewport(defaultViewport);
      setLasso({
        active: false,
        regions: [], // Use regions instead of points
        selectedGenes: new Set(),
        currentRegion: [],
      });
      setIsDrawingLasso(false);
      setShowSelectionSummary(false);
      setPathwaySearch("");
      setPopup({ visible: false, point: null, position: null });
      setComparisonSamples([]);
      setShowComparisonPopup(false);
      prevSampleIdRef.current = sampleId;
    }
  }, [sampleId]);

  // First, add a new state variable to track excluded points
  const [excludedGeneIds, setExcludedGeneIds] = useState<Set<string>>(
    new Set()
  );

  // Then modify your filteredPoints to exclude these points
  const filteredPoints = points.filter((point) => {
    // First check if this point is excluded
    if (excludedGeneIds.has(point.geneId)) {
      return false;
    }

    // Then apply existing pathway filter
    if (!pathwaySearch) return true;
    const searchTerms = pathwaySearch
      .toLowerCase()
      .split(",")
      .map((term) => term.trim());
    return searchTerms.some((term) =>
      point.pathways.some((pathway) => pathway.toLowerCase().includes(term))
    );
  });

  const selectedPoints = filteredPoints.filter(
    (p) => lasso.selectedGenes.size === 0 || lasso.selectedGenes.has(p.geneId)
  );

  // Helper: Initialize WebGL for a given context.
  const initWebGLForContext = useCallback(
    (gl: WebGLRenderingContext): WebGLProgram => {
      const vShader = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vShader, vertexShader);
      gl.compileShader(vShader);
      if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        console.error("Vertex shader error: ", gl.getShaderInfoLog(vShader));
      }
      const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fShader, fragmentShader);
      gl.compileShader(fShader);
      if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        console.error("Fragment shader error: ", gl.getShaderInfoLog(fShader));
      }
      const program = gl.createProgram()!;
      gl.attachShader(program, vShader);
      gl.attachShader(program, fShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program linking error: ", gl.getProgramInfoLog(program));
      }
      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      return program;
    },
    []
  );

  const initWebGL = useCallback(
    (canvas: HTMLCanvasElement) => {
      const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
      if (!gl) {
        console.error("WebGL not supported");
        return;
      }
      glRef.current = gl;
      const program = initWebGLForContext(gl);
      programRef.current = program;
    },
    [initWebGLForContext]
  );

  // Update your drawSample function to pass theme colors to the WebGL shader
  const drawSample = useCallback(
    (
      gl: WebGLRenderingContext,
      program: WebGLProgram,
      samplePoints: Point[],
      viewport: ViewportState
    ) => {
      gl.useProgram(program);

      // Existing code...

      // Add theme colors for WebGL shaders
      const themeColors = {
        expressionLow: theme.colors?.geneTerrain?.primary || "#1E6B52",
        expressionMed: theme.colors?.geneTerrain?.neutral || "#606060",
        expressionHigh: theme.colors?.geneTerrain?.accent1 || "#80BC00",
        background: theme.colors?.geneTerrain?.bg || "#FFFFFF",
        panel: theme.colors?.geneTerrain?.sectionBg || "#FFFFFF",
      };

      // Convert hex colors to RGB arrays for WebGL (normalized to 0-1)
      const expressionLowRgb = hexToRgbArray(themeColors.expressionLow);
      const expressionMedRgb = hexToRgbArray(themeColors.expressionMed);
      const expressionHighRgb = hexToRgbArray(themeColors.expressionHigh);
      const backgroundRgb = hexToRgbArray(themeColors.background);

      // Add uniforms for the theme colors
      const expressionLowLoc = gl.getUniformLocation(
        program,
        "expressionLowColor"
      );
      const expressionMedLoc = gl.getUniformLocation(
        program,
        "expressionMedColor"
      );
      const expressionHighLoc = gl.getUniformLocation(
        program,
        "expressionHighColor"
      );
      const backgroundLoc = gl.getUniformLocation(program, "backgroundColor");

      // Set the color uniforms if the locations exist
      if (expressionLowLoc) gl.uniform3fv(expressionLowLoc, expressionLowRgb);
      if (expressionMedLoc) gl.uniform3fv(expressionMedLoc, expressionMedRgb);
      if (expressionHighLoc)
        gl.uniform3fv(expressionHighLoc, expressionHighRgb);
      if (backgroundLoc) gl.uniform3fv(backgroundLoc, backgroundRgb);

      // Rest of your existing code...

      // Check for texture float extension support
      const ext =
        gl.getExtension("OES_texture_float") ||
        gl.getExtension("OES_texture_half_float");

      // Create points texture
      const pointsData = new Float32Array(samplePoints.length * 4); // RGBA format
      for (let i = 0; i < samplePoints.length; i++) {
        pointsData[i * 4] = samplePoints[i].x; // R channel - x coordinate
        pointsData[i * 4 + 1] = samplePoints[i].y; // G channel - y coordinate
        pointsData[i * 4 + 2] = 0; // B channel - unused
        pointsData[i * 4 + 3] = 0; // A channel - unused
      }

      // Create values texture
      const valuesData = new Float32Array(samplePoints.length * 4); // RGBA format
      for (let i = 0; i < samplePoints.length; i++) {
        valuesData[i * 4] = samplePoints[i].value; // R channel - value
        valuesData[i * 4 + 1] = 0; // G channel - unused
        valuesData[i * 4 + 2] = 0; // B channel - unused
        valuesData[i * 4 + 3] = 0; // A channel - unused
      }

      // Create and bind points texture
      const pointsTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pointsTexture);

      // Use RGBA with floating point if supported, otherwise fall back to UNSIGNED_BYTE
      const texType = ext ? gl.FLOAT : gl.UNSIGNED_BYTE;
      const pointsTextureWidth = Math.min(1024, samplePoints.length); // Max 1024 width

      if (ext) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0, // level
          gl.RGBA, // internal format
          pointsTextureWidth, // width
          1, // height
          0, // border
          gl.RGBA, // format
          texType, // type
          pointsData // data
        );
      } else {
        // Convert to UNSIGNED_BYTE for fallback
        const uint8Points = new Uint8Array(samplePoints.length * 4);
        for (let i = 0; i < samplePoints.length; i++) {
          // Normalize x and y to 0-255 range
          const x = samplePoints[i].x;
          const y = samplePoints[i].y;
          uint8Points[i * 4] = Math.min(
            255,
            Math.max(0, Math.floor(x * 127 + 127))
          );
          uint8Points[i * 4 + 1] = Math.min(
            255,
            Math.max(0, Math.floor(y * 127 + 127))
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

      // Create and bind values texture
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
        // Convert to UNSIGNED_BYTE for fallback
        const uint8Values = new Uint8Array(samplePoints.length * 4);
        for (let i = 0; i < samplePoints.length; i++) {
          // Normalize value to 0-255 range (from typically -3 to 3)
          const value = samplePoints[i].value;
          uint8Values[i * 4] = Math.min(
            255,
            Math.max(0, Math.floor(((value + 3) / 6) * 255))
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
      gl.uniform1i(pointsTexLoc, 0); // texture unit 0

      const valuesTexLoc = gl.getUniformLocation(program, "valuesTexture");
      gl.uniform1i(valuesTexLoc, 1); // texture unit 1

      const pointCountLoc = gl.getUniformLocation(program, "pointCount");
      gl.uniform1i(pointCountLoc, samplePoints.length);

      const sigmaLoc = gl.getUniformLocation(program, "sigma");
      gl.uniform1f(sigmaLoc, getSigmaForZoom(viewport.scale));

      const resolutionLoc = gl.getUniformLocation(program, "resolution");
      gl.uniform2f(resolutionLoc, CANVAS_WIDTH, CANVAS_HEIGHT);

      const offsetLoc = gl.getUniformLocation(program, "offset");
      gl.uniform2f(offsetLoc, viewport.offset.x, viewport.offset.y);

      const scaleLoc = gl.getUniformLocation(program, "scale");
      gl.uniform1f(scaleLoc, viewport.scale);

      // Add line thickness uniform
      const lineThicknessLoc = gl.getUniformLocation(program, "lineThickness");
      if (lineThicknessLoc) {
        gl.uniform1f(lineThicknessLoc, lineThickness);
      }

      // Add the isolineSpacing uniform
      const isolineSpacingLoc = gl.getUniformLocation(
        program,
        "isolineSpacing"
      );
      if (isolineSpacingLoc && currentLayer === "discrete") {
        gl.uniform1f(isolineSpacingLoc, isolineSpacing);
      }

      // Draw full-screen quad
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Clean up
      gl.deleteTexture(pointsTexture);
      gl.deleteTexture(valuesTexture);
    },
    [theme, lineThickness, isolineSpacing, currentLayer] // Add theme to the dependencies
  );

  // Add helper function for creating shader programs dynamically
  const initShaderProgram = (
    gl: WebGLRenderingContext,
    vsSource: string,
    fsSource: string
  ) => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return null;

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return null;

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error(
        "Unable to initialize the shader program: " +
          gl.getProgramInfoLog(shaderProgram)
      );
      return null;
    }

    return shaderProgram;
  };

  // Update the draw function to use theme colors for lasso selections
  const draw = useCallback(() => {
    const gl = glRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!gl || !overlayCanvas) return;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    // Determine which points to show based on lasso selection
    const pointsToShow =
      lasso.active || lasso.regions.length === 0
        ? filteredPoints
        : filteredPoints.filter((point) =>
            lasso.regions.some((region) =>
              isPointInPolygon(point, region.points)
            )
          );

    // Clear both canvases
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Select the appropriate shader based on the current layer
    let selectedShader;
    switch (currentLayer) {
      case "gaussian":
        selectedShader = fragmentShader;
        break;
      case "discrete":
        selectedShader = discreteFragmentShader;
        break;
      case "water":
        selectedShader = waterFragmentShader;
        break;
      case "sky":
        selectedShader = skyFragmentShader;
        break;
    }

    // Initialize shader program with the selected shader
    const program = initShaderProgram(gl, vertexShader, selectedShader);

    if (program) {
      // Draw using WebGL
      drawSample(gl, program, pointsToShow, viewport);
      gl.deleteProgram(program);
    }

    // Draw lasso regions on the overlay canvas
    ctx.setTransform(
      viewport.scale,
      0,
      0,
      viewport.scale,
      viewport.offset.x,
      viewport.offset.y
    );

    // Draw lasso regions
    lasso.regions.forEach((region) => {
      ctx.beginPath();
      ctx.moveTo(region.points[0].x, region.points[0].y);
      region.points.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();

      // Use theme color for stroke
      ctx.strokeStyle = `${theme.colors?.geneTerrain?.primary || "#1E6B52"}cc`;
      ctx.lineWidth = 1 / viewport.scale;
      ctx.stroke();

      // Use theme color for fill with transparency
      ctx.fillStyle = `${theme.colors?.geneTerrain?.primary || "#1E6B52"}20`;
      ctx.fill();
    });

    // Draw current lasso region if active
    if (lasso.currentRegion.length > 0) {
      ctx.beginPath();
      ctx.moveTo(lasso.currentRegion[0].x, lasso.currentRegion[0].y);
      lasso.currentRegion.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });

      // Use theme color for stroke
      ctx.strokeStyle = `${theme.colors?.geneTerrain?.primary || "#1E6B52"}cc`;
      ctx.lineWidth = 1 / viewport.scale;
      ctx.stroke();
    }

    // Add this at the end of the function to render gene labels
    // Only show labels when zoomed in past the minimum threshold
    if (viewport.scale >= MIN_ZOOM_FOR_LABELS) {
      // Determine the percentile threshold based on zoom level
      let percentileThreshold;
      if (viewport.scale >= ZOOM_THRESHOLDS.veryhigh) {
        percentileThreshold = PERCENTILE_PER_ZOOM_LEVEL.veryhigh;
      } else if (viewport.scale >= ZOOM_THRESHOLDS.high) {
        percentileThreshold = PERCENTILE_PER_ZOOM_LEVEL.high;
      } else if (viewport.scale >= ZOOM_THRESHOLDS.medium) {
        percentileThreshold = PERCENTILE_PER_ZOOM_LEVEL.medium;
      } else {
        percentileThreshold = PERCENTILE_PER_ZOOM_LEVEL.low;
      }

      // First, sort all points by absolute value
      const allPointsSorted = [...pointsToShow].sort(
        (a, b) => Math.abs(b.value) - Math.abs(a.value)
      );

      // Calculate the cutoff index based on percentile
      const totalCount = allPointsSorted.length;
      const cutoffIndex = Math.max(
        1,
        Math.floor(totalCount * (percentileThreshold / 100))
      );

      // Take only the points that fall within the percentile threshold
      const pointsToLabel = allPointsSorted.slice(0, cutoffIndex);

      // Draw gene name labels
      ctx.setTransform(
        viewport.scale,
        0,
        0,
        viewport.scale,
        viewport.offset.x,
        viewport.offset.y
      );

      // Adjust text size based on zoom level - increased base size from 12 to 14
      const fontSize = Math.min(
        16,
        Math.max(12, 14 / Math.sqrt(viewport.scale))
      );
      ctx.font = `bold ${fontSize / viewport.scale}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Track used positions to avoid overlaps
      const usedPositions = new Set();

      pointsToLabel.forEach((point) => {
        if (!point.geneName) return; // Skip if no gene name

        // Create a position key for this point's location
        // Divide the space into grid cells to check for overlaps
        const gridSize = 40 / viewport.scale;
        const posKey = `${Math.floor(point.x / gridSize)},${Math.floor(
          point.y / gridSize
        )}`;

        // Skip this label if we already have one in this grid cell
        if (usedPositions.has(posKey)) return;

        // Add this position to used positions
        usedPositions.add(posKey);

        // Create background for text
        const textWidth = ctx.measureText(point.geneName).width;
        const padding = 4 / viewport.scale;
        const rectHeight = 14 / viewport.scale;

        // Choose color based on point value
        if (point.value > 1) {
          // Strong positive - red background
          ctx.fillStyle = "rgba(220, 53, 69, 0.8)"; // Bootstrap danger
        } else if (point.value < -1) {
          // Strong negative - blue background
          ctx.fillStyle = "rgba(13, 110, 253, 0.8)"; // Bootstrap primary
        } else if (Math.abs(point.value) > 0.5) {
          // Moderate values - grey background
          ctx.fillStyle = "rgba(52, 58, 64, 0.8)"; // Bootstrap dark
        } else {
          // Minimal values - light grey background
          ctx.fillStyle = "rgba(108, 117, 125, 0.7)"; // Bootstrap secondary
        }

        // Position the label above the point
        const labelY = point.y - (rectHeight + 5 / viewport.scale);

        // Draw text background with rounded corners
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(
            point.x - textWidth / 2 - padding,
            labelY - rectHeight / 2,
            textWidth + padding * 2,
            rectHeight,
            3 / viewport.scale
          );
        } else {
          // Fallback for browsers without roundRect
          ctx.rect(
            point.x - textWidth / 2 - padding,
            labelY - rectHeight / 2,
            textWidth + padding * 2,
            rectHeight
          );
        }
        ctx.fill();

        // Draw text
        ctx.fillStyle = "white";
        ctx.fillText(point.geneName, point.x, labelY);
      });
    }
  }, [
    filteredPoints,
    viewport,
    lasso,
    currentLayer,
    drawSample,
    initShaderProgram,
    theme,
  ]); // Add theme to deps

  const loadShader = (
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ) => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        "An error occurred compiling the shaders: " +
          gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (canvas) initWebGL(canvas);
  }, [initWebGL]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Add a separate useEffect to handle lasso state changes
  useEffect(() => {
    requestAnimationFrame(() => draw());
  }, [lasso.active, lasso.regions, draw]);

  // Add useEffect to redraw when layer type changes
  useEffect(() => {
    draw();
  }, [currentLayer, draw]);

  const getMouseWorldCoords = (clientX: number, clientY: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { worldX: 0, worldY: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    return {
      worldX: (mouseX - viewport.offset.x) / viewport.scale,
      worldY: (mouseY - viewport.offset.y) / viewport.scale,
    };
  };

  // Update the handleWheel function to redraw both heatmap and contours immediately
  // Fix for unused 'ctx' variables
  // In handleWheel function
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPopup((prev) => ({ ...prev, visible: false }));

      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;

      setViewport((prev) => {
        const newScale = Math.max(0.1, Math.min(10, prev.scale * scaleFactor));
        const dx = mouseX - prev.offset.x;
        const dy = mouseY - prev.offset.y;
        const newViewport = {
          ...prev,
          scale: newScale,
          offset: {
            x: mouseX - dx * (newScale / prev.scale),
            y: mouseY - dy * (newScale / prev.scale),
          },
        };

        // Immediate redraw of both heatmap and contours
        requestAnimationFrame(() => {
          const gl = glRef.current;
          const program = programRef.current;

          // Remove or comment out the unused ctx variable
          // const ctx = overlayCanvasRef.current?.getContext("2d");

          if (gl && program) {
            // Draw heatmap
            gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            drawSample(gl, program, filteredPoints, newViewport);
          }
        });

        return newViewport;
      });
    },
    [drawSample, filteredPoints]
  );

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const { worldX, worldY } = getMouseWorldCoords(e.clientX, e.clientY);
    if (lasso.active) {
      setIsDrawingLasso(true);
      setLasso((prev) => ({
        ...prev,
        currentRegion: [
          {
            x: worldX,
            y: worldY,
            geneId: "",
            geneName: "",
            pathways: [],
            description: "",
            value: 0,
          },
        ],
      }));
    } else {
      const clickedPoint = filteredPoints.find((point) =>
        isPointInCircle(worldX, worldY, point.x, point.y, POINT_RADIUS * 2)
      );
      if (clickedPoint) {
        setPopup({
          visible: true,
          point: clickedPoint,
          position: { x: e.clientX, y: e.clientY },
        });
      } else {
        setPopup((prev) => ({ ...prev, visible: false }));
        setViewport((prev) => ({
          ...prev,
          dragging: true,
          lastMousePos: {
            x: e.clientX,
            y: e.clientY,
          },
        }));
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingLasso) {
      const { worldX, worldY } = getMouseWorldCoords(e.clientX, e.clientY);

      // Only add new point if it's far enough from the last point
      setLasso((prev) => {
        const lastPoint = prev.currentRegion[prev.currentRegion.length - 1];
        const minDistance = 10 / viewport.scale; // Minimum distance between points

        const distance = lastPoint
          ? Math.hypot(worldX - lastPoint.x, worldY - lastPoint.y)
          : 0;

        if (!lastPoint || distance > minDistance) {
          return {
            ...prev,
            currentRegion: [
              ...prev.currentRegion,
              {
                x: worldX,
                y: worldY,
                geneId: "",
                geneName: "",
                pathways: [],
                description: "",
                value: 0,
              },
            ],
          };
        }
        return prev;
      });
    } else if (viewport.dragging && viewport.lastMousePos) {
      const dx = e.clientX - viewport.lastMousePos.x;
      const dy = e.clientY - viewport.lastMousePos.y;
      setViewport((prev) => ({
        ...prev,
        offset: {
          x: prev.offset.x + dx,
          y: prev.offset.y + dy,
        },
        lastMousePos: { x: e.clientX, y: e.clientY },
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDrawingLasso) {
      setIsDrawingLasso(false);
      setLasso((prev) => {
        // Generate next label (A, B, C, etc.)
        const nextLabel = String.fromCharCode(65 + prev.regions.length);

        // Create new region with label
        const newRegion = {
          points: prev.currentRegion,
          label: `Selection ${nextLabel}`,
        };

        // Add new region to regions array
        const newRegions = [...prev.regions, newRegion];

        // Get points that are in any of the regions
        const selectedGenes = new Set(
          filteredPoints
            .filter((point) =>
              newRegions.some((region) =>
                isPointInPolygon(point, region.points)
              )
            )
            .map((point) => point.geneId)
        );

        return {
          ...prev,
          regions: newRegions,
          currentRegion: [],
          selectedGenes,
          active: true,
        };
      });
      setShowSelectionSummary(true);
    }
    setViewport((prev) => ({
      ...prev,
      dragging: false,
      lastMousePos: null,
    }));
  };

  // Update the adjustZoom function similarly
  // Apply the same fix to adjustZoom function
  const adjustZoom = useCallback(
    (delta: number) => {
      setPopup((prev) => ({ ...prev, visible: false }));
      const centerX = CANVAS_WIDTH / 2;
      const centerY = CANVAS_HEIGHT / 2;

      setViewport((prev) => {
        const newScale = Math.max(0.1, Math.min(10, prev.scale * (1 + delta)));
        const dx = centerX - prev.offset.x;
        const dy = centerY - prev.offset.y;
        const newViewport = {
          ...prev,
          scale: newScale,
          offset: {
            x: centerX - dx * (newScale / prev.scale),
            y: centerY - dy * (newScale / prev.scale),
          },
        };

        // Immediate redraw of both heatmap and contours
        requestAnimationFrame(() => {
          const gl = glRef.current;
          const program = programRef.current;

          // Remove or comment out the unused ctx variable
          // const ctx = overlayCanvasRef.current?.getContext("2d");

          if (gl && program) {
            // Draw heatmap
            gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            drawSample(gl, program, filteredPoints, newViewport);
          }
        });

        return newViewport;
      });
    },
    [drawSample, filteredPoints]
  );

  // 6. Update clearSelection
  const clearSelection = () => {
    // Reset everything when clicking the X button
    setLasso({
      active: false,
      regions: [],
      selectedGenes: new Set(),
      currentRegion: [],
    });
    setIsDrawingLasso(false);
    setShowSelectionSummary(false);
    requestAnimationFrame(() => draw());
  };

  // Update the toggleLasso function
  const toggleLasso = () => {
    setLasso((prev) => ({
      ...prev,
      active: !prev.active,
      currentRegion: [],
    }));
    setIsDrawingLasso(false);
    setShowSelectionSummary(false);
  };

  const selectedPathways = Array.from(
    new Set(selectedPoints.flatMap((point) => point.pathways))
  ).sort();

  const handleLoadState = (
    newViewport: ViewportState,
    selectedGenes: Set<string>
  ) => {
    setViewport((prev) => ({
      ...prev,
      scale: newViewport.scale,
      offset: newViewport.offset,
    }));
    setLasso((prev) => ({ ...prev, selectedGenes }));
  };

  // Update the handleCompare function if needed
  const handleCompare = (samples: ComparisonSample[]) => {
    console.log("Comparison samples received:", samples); // Debug line
    setComparisonSamples(samples);
    setShowComparisonPopup(samples.length > 0);
  };

  // Add these new handlers before the return statement
  const handleSummaryMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof Element && e.target.closest(".btn-close")) {
      return; // Don't start drag if clicking close button
    }
    setIsDraggingSummary(true);
    setDragOffset({
      x: e.clientX - summaryPosition.x,
      y: e.clientY - summaryPosition.y,
    });
  };

  const handleSummaryMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSummary) {
      setSummaryPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleSummaryMouseUp = () => {
    setIsDraggingSummary(false);
  };

  // In your canvas click handler
  const handleCanvasClick = (x: number, y: number) => {
    // Find if a gene is clicked
    const clickedGene = points.find((point) =>
      isPointInCircle(x, y, point.x, point.y, 10)
    );

    if (clickedGene) {
      setSelectedGene(clickedGene);
    }
  };

  // Add a function to exclude a gene
  const excludeGene = (geneId: string) => {
    setExcludedGeneIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(geneId);
      return newSet;
    });

    // Close the popup after excluding
    setPopup((prev) => ({ ...prev, visible: false }));

    // Redraw the visualization
    requestAnimationFrame(() => draw());
  };

  return (
    <div className="d-flex flex-column align-items-center p-4">
      {/* Apply theme colors to the gene pathway search section */}
      <div
        className="w-100"
        style={{
          maxWidth: "32rem",
          marginBottom: "1rem",
        }}
      >
        <div className="position-relative">
          <input
            type="text"
            value={pathwaySearch}
            onChange={(e) => setPathwaySearch(e.target.value)}
            placeholder="Search pathways (e.g., DNA Repair, Cell Cycle)"
            className="form-control ps-5"
            style={{
              backgroundColor: theme.colors?.geneTerrain?.inputBg || "#FFFFFF",
              color: theme.colors?.geneTerrain?.textPrimary || "#333333",
              borderColor: theme.colors?.geneTerrain?.border || "#E2E8F0",
            }}
          />
          <Search
            className="position-absolute"
            style={{
              left: "12px",
              top: "10px",
              height: "20px",
              width: "20px",
              color: theme.colors?.geneTerrain?.gray || "#687488",
            }}
          />
        </div>

        {/* Update pathway buttons */}
        <div className="mt-2 d-flex flex-wrap gap-2">
          {availablePathways.map((pathway) => (
            <button
              key={pathway}
              onClick={() => {
                const currentTerms = pathwaySearch
                  ? pathwaySearch.split(",").map((term) => term.trim())
                  : [];
                if (currentTerms.includes(pathway)) {
                  setPathwaySearch(
                    currentTerms.filter((term) => term !== pathway).join(", ")
                  );
                } else {
                  setPathwaySearch(
                    [...currentTerms, pathway].filter(Boolean).join(", ")
                  );
                }
              }}
              className={`btn btn-sm rounded-pill`}
              style={{
                backgroundColor: pathwaySearch.includes(pathway)
                  ? theme.colors?.geneTerrain?.primary || "#1E6B52"
                  : theme.colors?.geneTerrain?.bg || "#FFFFFF",
                color: pathwaySearch.includes(pathway)
                  ? "white"
                  : theme.colors?.geneTerrain?.textPrimary || "#333333",
                borderColor: theme.colors?.geneTerrain?.border || "#E2E8F0",
              }}
            >
              {pathway}
            </button>
          ))}
        </div>
      </div>

      {/* Main visualization canvases */}
      <div
        className="position-relative"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <canvas
          ref={glCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border rounded"
          style={{ touchAction: "none" }}
        />
        <canvas
          ref={overlayCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="position-absolute top-0 start-0"
          style={{
            touchAction: "none",
            cursor: lasso.active ? "crosshair" : "move",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        <div className="position-absolute top-0 start-0 m-3">
          <VisualizationHistory
            datasetId={datasetId}
            sampleId={sampleId}
            viewport={viewport}
            lasso={lasso}
            onLoadState={handleLoadState}
            datasets={datasets}
            onCompare={handleCompare}
          />
        </div>

        {popup.visible && popup.point && popup.position && (
          <div
            className="position-absolute rounded shadow p-3"
            style={{
              left: Math.min(popup.position.x + 10, CANVAS_WIDTH - 256 - 10),
              top: Math.min(popup.position.y + 10, CANVAS_HEIGHT - 200),
              width: "16rem",
              zIndex: 1000,
              backgroundColor: theme.colors?.geneTerrain?.bg || "#FFFFFF",
              color: theme.colors?.geneTerrain?.textPrimary || "#333333",
              border: `1px solid ${
                theme.colors?.geneTerrain?.border || "#E2E8F0"
              }`,
            }}
          >
            <button
              onClick={() => setPopup((prev) => ({ ...prev, visible: false }))}
              className="btn-close btn-close-white position-absolute"
              style={{ top: "8px", right: "8px" }}
            />
            <h3
              className="h5 mb-2"
              style={{
                color: theme.colors?.geneTerrain?.textPrimary || "#333333",
              }}
            >
              {popup.point.geneName}
            </h3>
            <p
              className="small mb-2"
              style={{
                color: theme.colors?.geneTerrain?.textMuted || "#666666",
              }}
            >
              ID: {popup.point.geneId}
            </p>

            {/* Add value color based on expression level */}
            <p
              className="small mb-2"
              style={{
                color: getSpectralColor(popup.point.value, theme),
              }}
            >
              Value: {popup.point.value.toFixed(2)}
            </p>

            <div className="mb-2">
              <h4 className="h6 mb-1" style={{ color: "white" }}>
                Pathways:
              </h4>
              <ul
                className="list-unstyled ps-3 small"
                style={{ color: theme.colors?.geneTerrain?.gray || "#687488" }}
              >
                {popup.point.pathways.map((pathway, index) => (
                  <li key={index} className="mb-1">
                    • {pathway}
                  </li>
                ))}
              </ul>
            </div>
            <p
              className="small"
              style={{ color: theme.colors?.geneTerrain?.gray || "#687488" }}
            >
              {popup.point.description}
            </p>

            {/* Add the exclude button */}
            <div className="d-flex justify-content-end mt-3">
              <button
                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2"
                onClick={() => popup.point && excludeGene(popup.point.geneId)}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.25rem 0.5rem",
                  color: "#f87171",
                  borderColor: "#f87171",
                }}
              >
                <i className="bi bi-trash"></i>
                Remove Gene
              </button>
            </div>
          </div>
        )}

        <div className="position-absolute bottom-0 end-0 m-3 d-flex flex-column gap-2">
          {/* Layer control (Google Maps style) */}
          {/* Layer dropdown with images */}
          <div className="dropdown">
            <button
              className="btn btn-lg rounded-circle shadow"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="Change visualization layer"
              style={{
                backgroundColor: theme.colors?.geneTerrain?.bg || "#FFFFFF",
                color: theme.colors?.geneTerrain?.textPrimary || "#333333",
                borderColor: theme.colors?.geneTerrain?.border || "#E2E8F0",
              }}
            >
              <Layers className="w-6 h-6" />
            </button>
            <div
              className="dropdown-menu p-0 shadow border-0"
              style={{
                minWidth: "250px",
                borderRadius: "8px",
                overflow: "hidden",
                marginTop: "10px",
                marginRight: "-10px",
                backgroundColor: theme.colors?.geneTerrain?.bg || "#FFFFFF",
                borderColor: theme.colors?.geneTerrain?.border || "#E2E8F0",
              }}
            >
              <div
                className="p-2 text-white"
                style={{
                  backgroundColor:
                    theme.colors?.geneTerrain?.headerBg || "#1E6B52",
                }}
              >
                <div className="fw-bold small">Layer Style</div>
              </div>
              {availableLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="border-bottom"
                  style={{
                    borderColor: `${
                      theme.colors?.geneTerrain?.neutral || "#d1d5db"
                    }20`,
                  }}
                >
                  <button
                    className="dropdown-item d-flex align-items-center py-3 px-3 layer-btn-hover"
                    onClick={() =>
                      setCurrentLayer(
                        layer.id as "gaussian" | "discrete" | "water" | "sky"
                      )
                    }
                    style={{
                      backgroundColor:
                        currentLayer === layer.id
                          ? `${
                              theme.colors?.geneTerrain?.primary || "#1E6B52"
                            }20`
                          : "transparent",
                      position: "relative",
                      color:
                        theme.colors?.geneTerrain?.textPrimary || "#333333",
                    }}
                  >
                    <div
                      className="d-flex align-items-center"
                      style={{ width: "100%" }}
                    >
                      <div
                        className="me-3"
                        style={{ width: "60px", height: "40px" }}
                      >
                        <img
                          src={layer.image}
                          alt={layer.name}
                          className="img-fluid rounded"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            border: `1px solid ${
                              theme.colors?.geneTerrain?.border || "#E2E8F0"
                            }`,
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <i
                            className={`bi ${layer.icon}`}
                            style={{
                              fontSize: "1rem",
                              color:
                                theme.colors?.geneTerrain?.textPrimary ||
                                "#333333",
                            }}
                          ></i>
                          <span
                            style={{
                              color:
                                theme.colors?.geneTerrain?.textPrimary ||
                                "#333333",
                            }}
                          >
                            {layer.name}
                          </span>
                        </div>
                      </div>
                      {currentLayer === layer.id && (
                        <div
                          className="position-absolute"
                          style={{
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                        >
                          <i
                            className="bi bi-check-circle-fill"
                            style={{
                              color:
                                theme.colors?.geneTerrain?.primary || "#1E6B52",
                              fontSize: "1.25rem",
                            }}
                          ></i>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              ))}
              <div
                className="p-2 d-flex justify-content-end"
                style={{
                  backgroundColor: theme.colors?.geneTerrain?.bg || "#FFFFFF",
                  borderTop: `1px solid ${
                    theme.colors?.geneTerrain?.border || "#E2E8F0"
                  }`,
                }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    const dropdown = e.currentTarget.closest(".dropdown");
                    if (dropdown) {
                      const dropdownToggle = dropdown.querySelector(
                        '[data-bs-toggle="dropdown"]'
                      );
                      if (dropdownToggle) {
                        (dropdownToggle as HTMLElement).click();
                      }
                    }
                  }}
                  colorScheme="teal"
                  color={theme.colors?.geneTerrain?.primary || "#1E6B52"}
                  borderColor={theme.colors?.geneTerrain?.primary || "#1E6B52"}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Replace the existing contour controls with this unified version */}
          {currentLayer === "discrete" && (
            <div className="position-relative ms-2">
              <button
                className="btn btn-lg rounded-circle shadow"
                type="button"
                title="Adjust contour settings"
                onClick={() => setShowThicknessControl(!showThicknessControl)}
                style={{
                  backgroundColor: theme.colors?.geneTerrain?.bg || "#FFFFFF",
                  color: theme.colors?.geneTerrain?.textPrimary || "#333333",
                }}
              >
                <Sliders className="w-6 h-6" />
              </button>

              {showThicknessControl && (
                <div
                  className="position-absolute p-0 rounded shadow"
                  style={{
                    zIndex: 1000,
                    top: "-350px",
                    right: "0",
                    width: "300px",
                    backgroundColor: theme.colors?.geneTerrain?.bg || "#FFFFFF",
                    border: `1px solid ${
                      theme.colors?.geneTerrain?.border || "#E2E8F0"
                    }`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="d-flex justify-content-between align-items-center p-2"
                    style={{
                      backgroundColor:
                        theme.colors?.geneTerrain?.headerBg || "#1E6B52",
                      color: "white",
                    }}
                  >
                    <h5 className="h6 m-0">Contour Settings</h5>
                    <button
                      onClick={() => setShowThicknessControl(false)}
                      className="btn-close btn-close-white"
                      aria-label="Close"
                    />
                  </div>

                  {/* Line Thickness Control */}
                  <div className="p-3">
                    {/* Thickness settings */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <label className="form-label fw-medium">
                          Line Thickness
                        </label>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color: "white",
                          }}
                        >
                          {lineThickness.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">Thin</span>
                        <input
                          type="range"
                          className="form-range flex-grow-1"
                          min="0.02"
                          max="0.25"
                          step="0.01"
                          value={lineThickness}
                          onChange={(e) =>
                            setLineThickness(parseFloat(e.target.value))
                          }
                        />
                        <span className="text-muted small">Thick</span>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setLineThickness(0.06)}
                          style={{
                            borderColor:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Thin
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setLineThickness(0.12)}
                          style={{
                            borderColor:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Medium
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setLineThickness(0.18)}
                          style={{
                            borderColor:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Thick
                        </button>
                      </div>
                    </div>

                    {/* Isoline Density Control */}
                    <div>
                      <div className="d-flex justify-content-between mb-2">
                        <label className="form-label fw-medium">
                          Number of Isolines
                        </label>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color: "white",
                          }}
                        >
                          {isolineSpacing.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">More</span>
                        <input
                          type="range"
                          className="form-range flex-grow-1"
                          min="0.2"
                          max="2.0"
                          step="0.1"
                          value={isolineSpacing}
                          onChange={(e) =>
                            setIsolineSpacing(parseFloat(e.target.value))
                          }
                        />
                        <span className="text-muted small">Fewer</span>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setIsolineSpacing(0.5)}
                          style={{
                            borderColor:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Dense
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setIsolineSpacing(1.0)}
                          style={{
                            borderColor:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Medium
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setIsolineSpacing(1.5)}
                          style={{
                            borderColor:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color:
                              theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Sparse
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing lasso button */}
          <button
            onClick={toggleLasso}
            className={`btn btn-lg rounded-circle shadow ${
              lasso.active ? "btn-primary" : "btn-light"
            }`}
            title={
              lasso.active ? "Complete selection" : "Start lasso selection"
            }
          >
            <Lasso color="#4B5563" className="w-6 h-6" />
          </button>

          {/* Rest of your buttons */}
          {lasso.regions.length > 0 && (
            <>
              <button
                color="#4B5563"
                onClick={() => setShowSelectionSummary(true)}
                className="btn btn-lg rounded-circle shadow"
                title="Show selection summary"
              >
                <span className="fw-bold">{selectedPoints.length}</span>
              </button>
              <button
                onClick={clearSelection}
                className="btn btn-lg rounded-circle shadow"
                title="Clear all selections"
              >
                <X color="#4B5563" className="w-6 h-6" />
              </button>
            </>
          )}
          <button
            onClick={() => adjustZoom(0.1)}
            className="btn  btn-lg rounded-circle shadow"
          >
            <ZoomIn color="#4B5563" className="w-6 h-6" />
          </button>
          <button
            onClick={() => adjustZoom(-0.1)}
            className="btn  btn-lg rounded-circle shadow"
          >
            <ZoomOut color="#4B5563" className="w-6 h-6" />
          </button>
        </div>

        {/* Add a badge showing excluded count and option to restore */}
        {excludedGeneIds.size > 0 && (
          <div
            className="position-absolute"
            style={{
              top: "20px",
              right: "20px",
              zIndex: 1000,
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-danger"
                title="Restore all excluded genes"
                onClick={() => {
                  setExcludedGeneIds(new Set());
                  requestAnimationFrame(() => draw());
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                Restore {excludedGeneIds.size} excluded gene
                {excludedGeneIds.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom summary panel */}
      <div
        className="position-fixed bottom-0 start-0 w-100"
        style={{
          transform: showSummaryPanel ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s ease",
          height: "400px",
          background: theme.colors?.geneTerrain?.bg || "#FFFFFF",
          zIndex: 1050,
          borderTop: `1px solid ${
            theme.colors?.geneTerrain?.border || "#E2E8F0"
          }`,
          boxShadow: "0 -4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="d-flex align-items-center justify-content-between p-2"
          style={{
            borderBottom: `1px solid ${
              theme.colors?.geneTerrain?.border || "#E2E8F0"
            }`,
            backgroundColor: theme.colors?.geneTerrain?.headerBg || "#1E6B52",
          }}
        >
          <h5 className="mb-0" style={{ color: "geneTerrain.accent2" }}>
            Selection Summary
          </h5>
          <button
            className="btn-close"
            style={{
              color: "white",
              filter: "brightness(0) invert(1)", // This makes the close icon white
            }}
            onClick={() => setShowSummaryPanel(false)}
          ></button>
        </div>
        <div
          className="p-3 overflow-auto"
          style={{ height: "calc(100% - 40px)" }}
        >
          <GeneSelectionSummary
            selectedPoints={selectedPoints}
            regions={lasso.regions}
            filteredPoints={filteredPoints}
          />
        </div>
      </div>

      {/* Toggle button */}
      <button
        className="position-fixed bottom-0 start-50 translate-middle-x mb-2 btn"
        onClick={() => setShowSummaryPanel(true)}
        style={{
          display:
            !showSummaryPanel && selectedPoints.length > 0 ? "block" : "none",
          zIndex: 1051,
          backgroundColor: theme.colors?.geneTerrain?.accent1 || "#80BC00",
          color: "white",
        }}
      >
        <i className="bi bi-chevron-up me-1"></i>
        Selection Summary ({selectedPoints.length} genes)
      </button>

      {/* Add this to your JSX return section */}
      {showComparisonPopup && comparisonSamples.length > 0 && (
        <ComparisonPopup
          samples={comparisonSamples}
          onClose={() => setShowComparisonPopup(false)}
        />
      )}
    </div>
  );
}

export const normalizePoints = (points: Point[]): Point[] => {
  // Find min and max values for x and y coordinates
  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  // Add padding (10% on each side)
  const padding = 0.1;
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const paddedXMin = xMin - xRange * padding;
  const paddedXMax = xMax + xRange * padding;
  const paddedYMin = yMin - yRange * padding;
  const paddedYMax = yMax + yRange * padding;

  // Normalize points to fit within canvas (0 to CANVAS_WIDTH/HEIGHT)
  return points.map((point) => ({
    ...point,
    x: ((point.x - paddedXMin) / (paddedXMax - paddedXMin)) * CANVAS_WIDTH,
    y: ((point.y - paddedYMin) / (paddedYMax - paddedYMin)) * CANVAS_HEIGHT,
  }));
};

// Replace the callGaussianMap function with direct component usage

// Instead of:
// callGaussianMap(points, datasetId, sampleId, datasets)

// Use the GaussianMap component directly:
export default GaussianMap;
