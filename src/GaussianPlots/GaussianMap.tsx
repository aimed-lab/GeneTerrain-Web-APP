import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  ZoomIn,
  ZoomOut,
  X,
  Lasso,
  Search,
  Layers,
  Sliders,
} from "lucide-react";
import { Point, ViewportState, PopupState, LassoState, Dataset } from "./types";
import { getSigmaForZoom, isPointInCircle, isPointInPolygon } from "./utils";
import {
  vertexShader,
  fragmentShader,
  discreteFragmentShader,
  waterFragmentShader,
  skyFragmentShader,
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

// Chakra theme
import { useTheme } from "@chakra-ui/react";
import {
  hexToRgbArray,
  getSpectralColorFromTheme,
} from "../utils/colorUtils";
import { ComparisonPopup } from "./ComparisonPopup";
import GeneDetailsPanel from "../components/common/GeneDetailsPanel";
import LassoRegionPanel from "./LassoRegionPanel";


const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const POINT_RADIUS = 2;

const MIN_ZOOM_FOR_LABELS = 4;
const PERCENTILE_PER_ZOOM_LEVEL = {
  low: 10,
  medium: 25,
  high: 50,
  veryhigh: 100,
};
const ZOOM_THRESHOLDS = {
  low: 1,
  medium: 2.0,
  high: 3.5,
  veryhigh: 5,
};

function getSpectralColor(value: number, theme: any): string {
  const expressionLow = theme.colors?.geneTerrain?.primary || "#1E6B52";
  const expressionMed = theme.colors?.geneTerrain?.neutral || "#606060";
  const expressionHigh = theme.colors?.geneTerrain?.accent1 || "#80BC00";

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
  minZoomForLabels?: number;
  initialViewport?: { scale: number; offset: { x: number; y: number } };
}

const defaultViewport: ViewportState = {
  scale: 1,
  offset: { x: 0, y: 0 },
  dragging: false,
  lastMousePos: null,
};

// Helper: Load and compile a shader
export const loadShader = (
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

// Helper: Initialize a shader program
export const initShaderProgram = (
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

export function GaussianMap({
  points,
  datasetId,
  sampleId,
  datasets,
  minZoomForLabels = MIN_ZOOM_FOR_LABELS,
  initialViewport,
}: GaussianMapProps) {
  const theme = useTheme();

  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const prevSampleIdRef = useRef<string>(sampleId);
  const [isRegionPanelOpen, setIsRegionPanelOpen] = useState(false);
  const [activeRegionIndex, setActiveRegionIndex] = useState<number | null>(null);

  // ===== OPTIMIZED: Persistent WebGL resources =====
  type LayerType = "gaussian" | "discrete" | "water" | "sky";
  const shaderProgramsRef = useRef<Record<LayerType, WebGLProgram | null>>({
    gaussian: null,
    discrete: null,
    water: null,
    sky: null,
  });
  const pointsTextureRef = useRef<WebGLTexture | null>(null);
  const valuesTextureRef = useRef<WebGLTexture | null>(null);
  const vertexBufferRef = useRef<WebGLBuffer | null>(null);
  // ===== END OPTIMIZED =====

  const [viewport, setViewport] = useState<ViewportState>(
    initialViewport
      ? { ...defaultViewport, scale: initialViewport.scale, offset: initialViewport.offset }
      : defaultViewport
  );

  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    point: null,
    position: null,
  });

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

  const [comparisonSamples, setComparisonSamples] = useState<ComparisonSample[]>(
    []
  );
  const [showComparisonPopup, setShowComparisonPopup] = useState(false);

  // Summary panel toggle
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);

  // Layer type (LayerType defined earlier with refs)
  const [currentLayer, setCurrentLayer] = useState<LayerType>("gaussian");

  // Selected gene
  const [selectedGene, setSelectedGene] = useState<Point | null>(null);

  // Contour settings
  const [lineThickness, setLineThickness] = useState<number>(0.12);
  const [showThicknessControl, setShowThicknessControl] =
    useState<boolean>(false);
  const [isolineSpacing, setIsolineSpacing] = useState(1.0);

  // Excluded genes
  const [excludedGeneIds, setExcludedGeneIds] = useState<Set<string>>(
    new Set()
  );

  // ✅ NEW: hovered lasso region + hover card position (canvas-local)
  const [hoveredRegionIndex, setHoveredRegionIndex] = useState<number | null>(
    null
  );
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  useEffect(() => {
    if (prevSampleIdRef.current !== sampleId) {
      setViewport(defaultViewport);
      setLasso({
        active: false,
        regions: [],
        selectedGenes: new Set(),
        currentRegion: [],
      });
      setIsDrawingLasso(false);
      setShowSelectionSummary(false);
      setPathwaySearch("");
      setPopup({ visible: false, point: null, position: null });
      setComparisonSamples([]);
      setShowComparisonPopup(false);
      setShowSummaryPanel(false);
      setHoveredRegionIndex(null);
      setHoverPos(null);
      prevSampleIdRef.current = sampleId;
    }
  }, [sampleId]);

  // Filter points by excluded + pathways
  const filteredPoints = points.filter((point) => {
    if (excludedGeneIds.has(point.geneId)) return false;

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

  const selectedPathways = Array.from(
    new Set(selectedPoints.flatMap((point) => point.pathways))
  ).sort();

  // ✅ NEW: Precompute per-region gene lists for hover/card actions (fast + stable)
  const regionStats = useMemo(() => {
    return lasso.regions.map((region) => {
      const genes = filteredPoints.filter((p) => isPointInPolygon(p, region.points));
      return { count: genes.length, geneIds: genes.map((g) => g.geneId) };
    });
  }, [lasso.regions, filteredPoints]);

  // Helper: Initialize WebGL for a given context
  const initWebGLForContext = useCallback((gl: WebGLRenderingContext) => {
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
  }, []);

  const initWebGL = useCallback(
    (canvas: HTMLCanvasElement) => {
      const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
      if (!gl) {
        console.error("WebGL not supported");
        return;
      }
      glRef.current = gl;

      // ===== OPTIMIZED: Initialize all resources here =====
      // Create all 4 shader programs
      const shaderMap: Record<LayerType, string> = {
        gaussian: fragmentShader,
        discrete: discreteFragmentShader,
        water: waterFragmentShader,
        sky: skyFragmentShader,
      };

      const layers: LayerType[] = ["gaussian", "discrete", "water", "sky"];
      layers.forEach((layer) => {
        const program = initShaderProgram(gl, vertexShader, shaderMap[layer]);
        if (program) {
          shaderProgramsRef.current[layer] = program;
        }
      });

      // Initialize defaults for the legacy/fallback program (using gaussian)
      const program = shaderProgramsRef.current.gaussian;
      if (program) {
        programRef.current = program; // Fallback

        // Create persistent vertex buffer
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        vertexBufferRef.current = buffer;

        // Also setup attributes for the legacy program reference in case it's used
        const position = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      }

      // Create persistent textures
      pointsTextureRef.current = gl.createTexture();
      valuesTextureRef.current = gl.createTexture();
      // ===== END OPTIMIZED =====
    },
    [] // No dependencies needed since helpers are static
  );

  // Draw sample (WebGL)
  const drawSample = useCallback(
    (
      gl: WebGLRenderingContext,
      program: WebGLProgram,
      samplePoints: Point[],
      viewport: ViewportState
    ) => {
      gl.useProgram(program);
      if (samplePoints.length === 0) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }


      const themeColors = {
        expressionLow: theme.colors?.geneTerrain?.primary || "#1E6B52",
        expressionMed: theme.colors?.geneTerrain?.neutral || "#606060",
        expressionHigh: theme.colors?.geneTerrain?.accent1 || "#80BC00",
        background: theme.colors?.geneTerrain?.bg || "#FFFFFF",
      };

      const expressionLowRgb = hexToRgbArray(themeColors.expressionLow);
      const expressionMedRgb = hexToRgbArray(themeColors.expressionMed);
      const expressionHighRgb = hexToRgbArray(themeColors.expressionHigh);
      const backgroundRgb = hexToRgbArray(themeColors.background);

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

      if (expressionLowLoc) gl.uniform3fv(expressionLowLoc, expressionLowRgb);
      if (expressionMedLoc) gl.uniform3fv(expressionMedLoc, expressionMedRgb);
      if (expressionHighLoc) gl.uniform3fv(expressionHighLoc, expressionHighRgb);
      if (backgroundLoc) gl.uniform3fv(backgroundLoc, backgroundRgb);

      const ext =
        gl.getExtension("OES_texture_float") ||
        gl.getExtension("OES_texture_half_float");

      const pointsData = new Float32Array(samplePoints.length * 4);
      for (let i = 0; i < samplePoints.length; i++) {
        pointsData[i * 4] = samplePoints[i].x;
        pointsData[i * 4 + 1] = samplePoints[i].y;
        pointsData[i * 4 + 2] = 0;
        pointsData[i * 4 + 3] = 0;
      }

      const valuesData = new Float32Array(samplePoints.length * 4);
      for (let i = 0; i < samplePoints.length; i++) {
        valuesData[i * 4] = samplePoints[i].value;
        valuesData[i * 4 + 1] = 0;
        valuesData[i * 4 + 2] = 0;
        valuesData[i * 4 + 3] = 0;
      }

      // ===== OPTIMIZED: Use persistent textures =====
      const pointsTexture = pointsTextureRef.current;
      const valuesTexture = valuesTextureRef.current;

      if (!pointsTexture || !valuesTexture) return;

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

      const pointsTexLoc = gl.getUniformLocation(program, "pointsTexture");
      gl.uniform1i(pointsTexLoc, 0);

      const valuesTexLoc = gl.getUniformLocation(program, "valuesTexture");
      gl.uniform1i(valuesTexLoc, 1);

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

      const lineThicknessLoc = gl.getUniformLocation(program, "lineThickness");
      if (lineThicknessLoc) gl.uniform1f(lineThicknessLoc, lineThickness);

      const isolineSpacingLoc = gl.getUniformLocation(program, "isolineSpacing");
      if (isolineSpacingLoc && currentLayer === "discrete") {
        gl.uniform1f(isolineSpacingLoc, isolineSpacing);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // ===== END OPTIMIZED (Textures are persistent, no deletion) =====
    },
    [theme, lineThickness, isolineSpacing, currentLayer]
  );

  // Draw (WebGL + overlay canvas)
  const draw = useCallback(() => {
    const gl = glRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!gl || !overlayCanvas) {
      return;
    }

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // const pointsToShow =
    //   lasso.active || lasso.regions.length === 0
    //     ? filteredPoints
    //     : filteredPoints.filter((point) =>
    //         lasso.regions.some((region) => isPointInPolygon(point, region.points))
    //       );

    const pointsToShow = filteredPoints;



    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ===== OPTIMIZED: Use cached shader program =====
    const program = shaderProgramsRef.current[currentLayer];
    if (program) {
      drawSample(gl, program, pointsToShow, viewport);
    }
    // ===== END OPTIMIZED =====

    // Draw lasso regions
    ctx.setTransform(
      viewport.scale,
      0,
      0,
      viewport.scale,
      viewport.offset.x,
      viewport.offset.y
    );

    lasso.regions.forEach((region, idx) => {
      const isHovered = idx === hoveredRegionIndex;

      ctx.beginPath();
      ctx.moveTo(region.points[0].x, region.points[0].y);
      region.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();

      ctx.strokeStyle = `${theme.colors?.geneTerrain?.primary || "#1E6B52"}cc`;
      ctx.lineWidth = (isHovered ? 2.5 : 1) / viewport.scale;
      ctx.stroke();

      ctx.fillStyle = `${theme.colors?.geneTerrain?.primary || "#1E6B52"}${isHovered ? "35" : "20"
        }`;
      ctx.fill();
    });

    // Draw current lasso region
    if (lasso.currentRegion.length > 0) {
      ctx.beginPath();
      ctx.moveTo(lasso.currentRegion[0].x, lasso.currentRegion[0].y);
      lasso.currentRegion.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = `${theme.colors?.geneTerrain?.primary || "#1E6B52"}cc`;
      ctx.lineWidth = 1 / viewport.scale;
      ctx.stroke();
    }

    // Labels (your existing logic)
    if (viewport.scale >= minZoomForLabels) {
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

      const allPointsSorted = [...pointsToShow].sort(
        (a, b) => Math.abs(b.value) - Math.abs(a.value)
      );

      const totalCount = allPointsSorted.length;
      const cutoffIndex = Math.max(
        1,
        Math.floor(totalCount * (percentileThreshold / 100))
      );
      const pointsToLabel = allPointsSorted.slice(0, cutoffIndex);

      ctx.setTransform(
        viewport.scale,
        0,
        0,
        viewport.scale,
        viewport.offset.x,
        viewport.offset.y
      );

      const fontSize = Math.min(16, Math.max(12, 14 / Math.sqrt(viewport.scale)));
      ctx.font = `bold ${fontSize / viewport.scale}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const usedPositions = new Set<string>();

      pointsToLabel.forEach((point) => {
        if (!point.geneName) return;

        const gridSize = 40 / viewport.scale;
        const posKey = `${Math.floor(point.x / gridSize)},${Math.floor(
          point.y / gridSize
        )}`;

        if (usedPositions.has(posKey)) return;
        usedPositions.add(posKey);

        const textWidth = ctx.measureText(point.geneName).width;
        const padding = 4 / viewport.scale;
        const rectHeight = 14 / viewport.scale;

        ctx.fillStyle = "rgba(97, 94, 94, 0)";

        const labelY = point.y - (rectHeight + 5 / viewport.scale);

        ctx.beginPath();
        // @ts-ignore
        if (typeof ctx.roundRect === "function") {
          // @ts-ignore
          ctx.roundRect(
            point.x - textWidth / 2 - padding,
            labelY - rectHeight / 2,
            textWidth + padding * 2,
            rectHeight,
            3 / viewport.scale
          );
        } else {
          ctx.rect(
            point.x - textWidth / 2 - padding,
            labelY - rectHeight / 2,
            textWidth + padding * 2,
            rectHeight
          );
        }
        ctx.fill();

        ctx.font = `${fontSize / viewport.scale}px Arial`;
        ctx.fillStyle = "black";
        ctx.fillText(point.geneName, point.x, labelY);
      });
    }
  }, [
    filteredPoints,
    viewport,
    lasso,
    currentLayer,
    drawSample,
    theme,
    initShaderProgram,
    hoveredRegionIndex, // ✅
  ]);

  // --- Animation refs/helpers (your existing focus/jump logic) ---
  const focusAnimRef = useRef<number | null>(null);
  const isFocusingRef = useRef(false);

  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const cancelFocusAnimation = () => {
    if (focusAnimRef.current) cancelAnimationFrame(focusAnimRef.current);
    focusAnimRef.current = null;
    isFocusingRef.current = false;
  };

  const focusOnGenePoint = useCallback(
    (
      gene: Point,
      opts?: { durationPan?: number; durationZoom?: number; extraZoom?: number }
    ) => {
      cancelFocusAnimation();

      const durationPan = opts?.durationPan ?? 1800;
      const durationZoom = opts?.durationZoom ?? 900;
      const extraZoom = opts?.extraZoom ?? 3.2;

      const centerX = CANVAS_WIDTH / 2;
      const centerY = CANVAS_HEIGHT / 2;

      const startScale = viewport.scale;
      const startOffset = { ...viewport.offset };
      const targetScale = Math.min(50, Math.max(6.5, startScale * extraZoom));

      setLasso((prev) => ({ ...prev, selectedGenes: new Set([gene.geneId]) }));

      const t0 = performance.now();
      isFocusingRef.current = true;

      const step = (now: number) => {
        const pZoom = Math.min(1, (now - t0) / durationZoom);
        const pPan = Math.min(1, (now - t0) / durationPan);

        const ez = easeInOutCubic(pZoom);
        const ep = easeInOutCubic(pPan);

        const s = startScale + (targetScale - startScale) * ez;

        const targOffX = centerX - gene.x * s;
        const targOffY = centerY - gene.y * s;

        const offX = startOffset.x + (targOffX - startOffset.x) * ep;
        const offY = startOffset.y + (targOffY - startOffset.y) * ep;

        setViewport((v) => ({
          ...v,
          scale: s,
          offset: { x: offX, y: offY },
          dragging: false,
          lastMousePos: null,
        }));

        const rect = overlayCanvasRef.current?.getBoundingClientRect();
        const sx = gene.x * s + offX;
        const sy = gene.y * s + offY;
        if (rect) {
          setPopup({
            visible: true,
            point: gene,
            position: { x: rect.left + sx, y: rect.top + sy },
          });
        } else {
          setPopup({
            visible: true,
            point: gene,
            position: { x: centerX, y: centerY },
          });
        }

        requestAnimationFrame(() => draw());

        if ((pPan < 1 || pZoom < 1) && isFocusingRef.current) {
          focusAnimRef.current = requestAnimationFrame(step);
        } else {
          isFocusingRef.current = false;
          focusAnimRef.current = null;
        }
      };

      focusAnimRef.current = requestAnimationFrame(step);
    },
    [viewport.scale, viewport.offset, draw]
  );

  const jumpToGeneByName = useCallback(
    (geneName: string) => {
      if (!geneName) return;
      const target = points.find(
        (p) => p.geneName && p.geneName.toLowerCase() === geneName.toLowerCase()
      );
      if (!target) {
        console.warn(`Gene not found: ${geneName}`);
        return;
      }
      focusOnGenePoint(target, { durationPan: 2200, durationZoom: 900, extraZoom: 3.4 });
    },
    [points, focusOnGenePoint]
  );

  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (canvas) initWebGL(canvas);

    return () => {
      const gl = glRef.current;
      if (!gl) return;

      // Cleanup persistent resources
      if (pointsTextureRef.current) {
        gl.deleteTexture(pointsTextureRef.current);
        pointsTextureRef.current = null;
      }
      if (valuesTextureRef.current) {
        gl.deleteTexture(valuesTextureRef.current);
        valuesTextureRef.current = null;
      }
      if (vertexBufferRef.current) {
        gl.deleteBuffer(vertexBufferRef.current);
        vertexBufferRef.current = null;
      }

      Object.values(shaderProgramsRef.current).forEach(program => {
        if (program) gl.deleteProgram(program);
      });
      shaderProgramsRef.current = {
        gaussian: null,
        discrete: null,
        water: null,
        sky: null,
      };
    };
  }, [initWebGL]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    requestAnimationFrame(() => draw());
  }, [lasso.active, lasso.regions, draw]);

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

  // ✅ NEW: find hovered region index (topmost = last drawn)
  const getHoveredRegionIndex = useCallback(
    (worldX: number, worldY: number) => {
      if (lasso.regions.length === 0) return null;

      const probe: Point = {
        x: worldX,
        y: worldY,
        geneId: "",
        geneName: "",
        pathways: [],
        description: "",
        value: 0,
      };

      for (let i = lasso.regions.length - 1; i >= 0; i--) {
        if (isPointInPolygon(probe, lasso.regions[i].points)) return i;
      }
      return null;
    },
    [lasso.regions]
  );

  // Wheel zoom (your existing logic)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      cancelFocusAnimation();
      e.preventDefault();
      e.stopPropagation();

      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;

      setViewport((prev) => {
        const newScale = Math.max(0.1, Math.min(50, prev.scale * scaleFactor));
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

        requestAnimationFrame(() => {
          const gl = glRef.current;
          // ===== OPTIMIZED: Use correct cached shader program for current layer =====
          const program = shaderProgramsRef.current[currentLayer];
          if (gl && program) {
            gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            drawSample(gl, program, filteredPoints, newViewport);
          }
          // ===== END OPTIMIZED =====
        });

        return newViewport;
      });
    },
    [drawSample, filteredPoints, currentLayer]
  );

  useEffect(() => {
    if (prevSampleIdRef.current !== sampleId) {
      // Calculate center of points to center the view
      if (points.length > 0) {
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Get canvas dimensions
        const canvas = overlayCanvasRef.current;
        const canvasWidth = canvas?.width || 800;
        const canvasHeight = canvas?.height || 600;

        // Set viewport centered on data
        const scale = 2; // Default zoomed in
        setViewport({
          scale,
          offset: {
            x: canvasWidth / 2 - centerX * scale,
            y: canvasHeight / 2 - centerY * scale,
          },
          dragging: false,
          lastMousePos: null,
        });
      } else {
        setViewport(defaultViewport);
      }
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
  }, [sampleId, points]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  // Center viewport on initial load
  const viewportInitializedRef = useRef(false);
  useEffect(() => {
    if (!viewportInitializedRef.current && points.length > 0 && overlayCanvasRef.current) {
      const minX = Math.min(...points.map(p => p.x));
      const maxX = Math.max(...points.map(p => p.x));
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const canvas = overlayCanvasRef.current;
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 600;

      const scale = 4;
      setViewport({
        scale,
        offset: {
          x: canvasWidth / 2 - centerX * scale,
          y: canvasHeight / 2 - centerY * scale,
        },
        dragging: false,
        lastMousePos: null,
      });
      viewportInitializedRef.current = true;
    }
  }, [points]);

  const handleMouseDown = (e: React.MouseEvent) => {
    cancelFocusAnimation();

    const { worldX, worldY } = getMouseWorldCoords(e.clientX, e.clientY);

    // =========================
    // LASSO MODE (active)
    // =========================
    if (lasso.active) {
      // If user clicks inside an existing region -> open the left panel
      // (Do NOT start drawing a new region)
      if (lasso.regions.length > 0 && !isDrawingLasso) {
        const hitIdx = getHoveredRegionIndex(worldX, worldY);
        if (hitIdx !== null) {
          setActiveRegionIndex(hitIdx);
          setIsRegionPanelOpen(true);

          // Optional: focus selection on this region only
          const ids = regionStats[hitIdx]?.geneIds ?? [];
          setLasso((prev) => ({ ...prev, selectedGenes: new Set(ids) }));

          return;
        }
      }

      // Otherwise, start drawing a new lasso region
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
      return;
    }

    // =========================
    // NORMAL MODE (lasso inactive)
    // =========================
    const clickedPoint = filteredPoints.find((point) =>
      isPointInCircle(worldX, worldY, point.x, point.y, POINT_RADIUS * 2)
    );

    // If user clicked a gene point -> open gene popup
    if (clickedPoint) {
      setPopup({
        visible: true,
        point: clickedPoint,
        position: { x: e.clientX, y: e.clientY },
      });
      return;
    }

    // Otherwise -> start dragging the viewport
    setViewport((prev) => ({
      ...prev,
      dragging: true,
      lastMousePos: { x: e.clientX, y: e.clientY },
    }));
  };


  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingLasso) {
      const { worldX, worldY } = getMouseWorldCoords(e.clientX, e.clientY);

      setLasso((prev) => {
        const lastPoint = prev.currentRegion[prev.currentRegion.length - 1];
        const minDistance = 10 / viewport.scale;

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
        offset: { x: prev.offset.x + dx, y: prev.offset.y + dy },
        lastMousePos: { x: e.clientX, y: e.clientY },
      }));
    } else {
      // ✅ Allow hover tooltip even when lasso is active
      // ❌ But do NOT update hover while actively drawing a new region
      if (isDrawingLasso || lasso.regions.length === 0) {
        if (hoveredRegionIndex !== null) setHoveredRegionIndex(null);
        if (hoverPos !== null) setHoverPos(null);
        return;
      }

      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const { worldX, worldY } = getMouseWorldCoords(e.clientX, e.clientY);
      const idx = getHoveredRegionIndex(worldX, worldY);

      if (idx !== hoveredRegionIndex) setHoveredRegionIndex(idx);

      if (idx !== null) {
        setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        if (hoverPos !== null) setHoverPos(null);
      }
    }

  };

  const handleMouseUp = () => {
    if (isDrawingLasso) {
      setIsDrawingLasso(false);
      setLasso((prev) => {
        const nextLabel = String.fromCharCode(65 + prev.regions.length);
        const newRegion = {
          points: prev.currentRegion,
          label: `Selection ${nextLabel}`,
        };
        const newRegions = [...prev.regions, newRegion];

        const selectedGenes = new Set(
          filteredPoints
            .filter((point) =>
              newRegions.some((region) => isPointInPolygon(point, region.points))
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

  const adjustZoom = useCallback(
    (delta: number) => {
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

        requestAnimationFrame(() => {
          const gl = glRef.current;
          const program = programRef.current;
          if (gl && program) {
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

  const clearSelection = () => {
    setLasso({
      active: false,
      regions: [],
      selectedGenes: new Set(),
      currentRegion: [],
    });
    setIsDrawingLasso(false);
    setShowSelectionSummary(false);
    setHoveredRegionIndex(null);
    setHoverPos(null);
    requestAnimationFrame(() => draw());
  };

  const toggleLasso = () => {
    setLasso((prev) => ({
      ...prev,
      active: !prev.active,
      currentRegion: [],
    }));
    setIsDrawingLasso(false);
    setShowSelectionSummary(false);
    setHoveredRegionIndex(null);
    setHoverPos(null);
  };

  const handleLoadState = (newViewport: ViewportState, selectedGenes: Set<string>) => {
    setViewport((prev) => ({
      ...prev,
      scale: newViewport.scale,
      offset: newViewport.offset,
    }));
    setLasso((prev) => ({ ...prev, selectedGenes }));
  };

  const handleCompare = (samples: ComparisonSample[]) => {
    setComparisonSamples(samples);
    setShowComparisonPopup(samples.length > 0);
  };

  const excludeGene = (geneId: string) => {
    setExcludedGeneIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(geneId);
      return newSet;
    });
    setPopup((prev) => ({ ...prev, visible: false }));
    requestAnimationFrame(() => draw());
  };

  // Layer UI config
  const availableLayers = [
    { id: "gaussian", name: "Terrain View", icon: "bi-bullseye", image: gaussianLayerImg },
    { id: "discrete", name: "Contour View", icon: "bi-grid-3x3", image: discreteLayerImg },
    { id: "water", name: "Peaks View", icon: "bi-water", image: positiveLayerImg },
    { id: "sky", name: "Valley View", icon: "bi-cloud-sun", image: negativeLayerImg },
  ];

  return (
    <div className="d-flex flex-column align-items-center p-4">
      {/* Pathway Search */}
      <div className="w-100" style={{ maxWidth: "32rem", marginBottom: "1rem" }}>
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
          onMouseLeave={() => {
            handleMouseUp();
            setHoveredRegionIndex(null);
            setHoverPos(null);
          }}
        />

        {/* History UI */}
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

        {/* ✅ NEW: Hover Card (clickable + shows only when hovering a region) */}
        {hoveredRegionIndex !== null && hoverPos && !isDrawingLasso && (
          <div
            style={{
              position: "absolute",
              left: `${clamp(hoverPos.x + 12, 8, CANVAS_WIDTH - 120)}px`,
              top: `${clamp(hoverPos.y + 12, 8, CANVAS_HEIGHT - 36)}px`,
              zIndex: 2000,
              pointerEvents: "none",
              background: "rgba(0,0,0,0.78)",
              color: "#fff",
              padding: "6px 8px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
              whiteSpace: "nowrap",
            }}
          >
            {(regionStats[hoveredRegionIndex]?.count ?? 0)} genes
          </div>
        )}


        {/* Gene popup panel */}
        {popup.visible && popup.point && popup.position && (
          <div>
            <GeneDetailsPanel
              selectedGene={popup.point}
              allPoints={points}
              onJumpTo={jumpToGeneByName}
              onClose={() =>
                setPopup({ visible: false, point: null, position: null })
              }
            />
          </div>
        )}

        {/* Bottom-right controls */}
        <div className="position-absolute bottom-0 end-0 m-3 d-flex flex-column gap-2">
          {/* Layer dropdown */}
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
                  backgroundColor: theme.colors?.geneTerrain?.headerBg || "#1E6B52",
                }}
              >
                <div className="fw-bold small">Layer Style</div>
              </div>

              {availableLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="border-bottom"
                  style={{
                    borderColor: `${theme.colors?.geneTerrain?.neutral || "#d1d5db"
                      }20`,
                  }}
                >
                  <button
                    className="dropdown-item d-flex align-items-center py-3 px-3 layer-btn-hover"
                    onClick={() =>
                      setCurrentLayer(layer.id as "gaussian" | "discrete" | "water" | "sky")
                    }
                    style={{
                      backgroundColor:
                        currentLayer === layer.id
                          ? `${theme.colors?.geneTerrain?.primary || "#1E6B52"}20`
                          : "transparent",
                      position: "relative",
                      color: theme.colors?.geneTerrain?.textPrimary || "#333333",
                    }}
                  >
                    <div className="d-flex align-items-center" style={{ width: "100%" }}>
                      <div className="me-3" style={{ width: "60px", height: "40px" }}>
                        <img
                          src={layer.image}
                          alt={layer.name}
                          className="img-fluid rounded"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            border: `1px solid ${theme.colors?.geneTerrain?.border || "#E2E8F0"
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
                              color: theme.colors?.geneTerrain?.textPrimary || "#333333",
                            }}
                          ></i>
                          <span>{layer.name}</span>
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
                              color: theme.colors?.geneTerrain?.primary || "#1E6B52",
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
                  borderTop: `1px solid ${theme.colors?.geneTerrain?.border || "#E2E8F0"}`,
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
                      if (dropdownToggle) (dropdownToggle as HTMLElement).click();
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

          {/* Contour settings (discrete only) */}
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
                    border: `1px solid ${theme.colors?.geneTerrain?.border || "#E2E8F0"}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="d-flex justify-content-between align-items-center p-2"
                    style={{
                      backgroundColor: theme.colors?.geneTerrain?.headerBg || "#1E6B52",
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

                  <div className="p-3">
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <label className="form-label fw-medium">Line Thickness</label>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: theme.colors?.geneTerrain?.primary || "#1E6B52",
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
                          onChange={(e) => setLineThickness(parseFloat(e.target.value))}
                        />
                        <span className="text-muted small">Thick</span>
                      </div>

                      <div className="d-flex gap-2 mt-2">
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setLineThickness(0.06)}
                          style={{
                            borderColor: theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color: theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Thin
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setLineThickness(0.12)}
                          style={{
                            borderColor: theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color: theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Medium
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setLineThickness(0.18)}
                          style={{
                            borderColor: theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color: theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Thick
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between mb-2">
                        <label className="form-label fw-medium">Number of Isolines</label>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: theme.colors?.geneTerrain?.primary || "#1E6B52",
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
                          onChange={(e) => setIsolineSpacing(parseFloat(e.target.value))}
                        />
                        <span className="text-muted small">Fewer</span>
                      </div>

                      <div className="d-flex gap-2 mt-2">
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setIsolineSpacing(0.5)}
                          style={{
                            borderColor: theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color: theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Dense
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setIsolineSpacing(1.0)}
                          style={{
                            borderColor: theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color: theme.colors?.geneTerrain?.primary || "#1E6B52",
                          }}
                        >
                          Medium
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => setIsolineSpacing(1.5)}
                          style={{
                            borderColor: theme.colors?.geneTerrain?.primary || "#1E6B52",
                            color: theme.colors?.geneTerrain?.primary || "#1E6B52",
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

          {/* Lasso button */}
          <button
            onClick={toggleLasso}
            className={`btn btn-lg rounded-circle shadow ${lasso.active ? "btn-primary" : "btn-light"
              }`}
            title={lasso.active ? "Complete selection" : "Start lasso selection"}
          >
            <Lasso color="#4B5563" className="w-6 h-6" />
          </button>

          {/* Clear selections */}
          {lasso.regions.length > 0 && (
            <button
              onClick={clearSelection}
              className="btn btn-lg rounded-circle shadow"
              title="Clear all selections"
            >
              <X color="#4B5563" className="w-6 h-6" />
            </button>
          )}

          {/* Zoom buttons */}
          <button onClick={() => adjustZoom(0.1)} className="btn btn-lg rounded-circle shadow">
            <ZoomIn color="#4B5563" className="w-6 h-6" />
          </button>
          <button onClick={() => adjustZoom(-0.1)} className="btn btn-lg rounded-circle shadow">
            <ZoomOut color="#4B5563" className="w-6 h-6" />
          </button>
        </div>

        {/* Restore excluded genes */}
        {excludedGeneIds.size > 0 && (
          <div className="position-absolute" style={{ top: "20px", right: "20px", zIndex: 1000 }}>
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
          borderTop: `1px solid ${theme.colors?.geneTerrain?.border || "#E2E8F0"}`,
          boxShadow: "0 -4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="d-flex align-items-center justify-content-between p-2"
          style={{
            borderBottom: `1px solid ${theme.colors?.geneTerrain?.border || "#E2E8F0"}`,
            backgroundColor: theme.colors?.geneTerrain?.headerBg || "#1E6B52",
          }}
        >
          <h5 className="mb-0" style={{ color: "white" }}>
            Selection Summary
          </h5>
          <button
            className="btn-close"
            style={{
              color: "white",
              filter: "brightness(0) invert(1)",
            }}
            onClick={() => setShowSummaryPanel(false)}
          ></button>
        </div>

        <div className="p-3 overflow-auto" style={{ height: "calc(100% - 40px)" }}>
          <GeneSelectionSummary
            selectedPoints={selectedPoints}
            regions={lasso.regions}
            filteredPoints={filteredPoints}
            datasetId={datasetId}
          />
        </div>
      </div>

      {/* Toggle button */}
      <button
        className="position-fixed bottom-0 start-50 translate-middle-x mb-2 btn"
        onClick={() => setShowSummaryPanel(true)}
        style={{
          display: !showSummaryPanel && selectedPoints.length > 0 ? "block" : "none",
          zIndex: 1051,
          backgroundColor: theme.colors?.geneTerrain?.accent1 || "#80BC00",
          color: "white",
        }}
      >
        <i className="bi bi-chevron-up me-1"></i>
        Selection Summary ({selectedPoints.length} genes)
      </button>

      {/* Comparison popup */}
      {showComparisonPopup && comparisonSamples.length > 0 && (
        <ComparisonPopup
          samples={comparisonSamples}
          onClose={() => setShowComparisonPopup(false)}
        />
      )}

      <LassoRegionPanel
        isOpen={isRegionPanelOpen}
        title={
          activeRegionIndex !== null
            ? (lasso.regions[activeRegionIndex]?.label ??
              `Selection ${activeRegionIndex + 1}`)
            : "Selection"
        }
        onClose={() => setIsRegionPanelOpen(false)}
        activeRegionIndex={activeRegionIndex}
        regions={lasso.regions}
        filteredPoints={filteredPoints}
        datasetId={datasetId}
      />


    </div>
  );
}

export const normalizePoints = (points: Point[]): Point[] => {
  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const padding = 0.1;
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const paddedXMin = xMin - xRange * padding;
  const paddedXMax = xMax + xRange * padding;
  const paddedYMin = yMin - yRange * padding;
  const paddedYMax = yMax + yRange * padding;

  return points.map((point) => ({
    ...point,
    x: ((point.x - paddedXMin) / (paddedXMax - paddedXMin)) * CANVAS_WIDTH,
    y: ((point.y - paddedYMin) / (paddedYMax - paddedYMin)) * CANVAS_HEIGHT,
  }));
};

export default GaussianMap;
