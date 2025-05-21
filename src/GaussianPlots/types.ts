export interface Point {
  x: number;
  y: number;
  geneId: string;
  geneName: string;
  pathways: string[];
  description: string;
  value: number;
}

export interface ViewportState {
  scale: number;
  offset: {
    x: number;
    y: number;
  };
  dragging: boolean;
  lastMousePos: {
    x: number;
    y: number;
  } | null;
}

export interface PopupState {
  visible: boolean;
  point: Point | null;
  position: { x: number; y: number } | null;
}

// export interface LassoState {
//   active: boolean;
//   points: Point[];
//   selectedGenes: Set<string>;
// }

export interface Region {
  points: Point[];
  label: string;
}

export interface LassoState {
  active: boolean;
  regions: Region[]; // Change from Point[][] to Region[]
  selectedGenes: Set<string>;
  currentRegion: Point[];
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  samples: Sample[];
}

export interface Sample {
  id: string;
  name: string;
  description: string;
  condition: string;
  date: string;
  points: Point[];
}

export interface ComparisonSample {
  points: Sample["points"]; // The gene expression data points
  name: string; // Name of the visualization state
  datasetName: string; // Name of the dataset it belongs to
}

// Add this to your existing types if not already there
export interface GaussianMapProps {
  points: Point[];
  datasetId: string;
  sampleId: string;
  datasets: Dataset[];
  comparisonMode?: boolean;
}
