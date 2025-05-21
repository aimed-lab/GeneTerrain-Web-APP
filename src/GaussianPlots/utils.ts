import { Dataset, Point } from "./types";

const geneNames = [
  "BRCA1",
  "TP53",
  "EGFR",
  "KRAS",
  "PTEN",
  "BRAF",
  "PIK3CA",
  "AKT1",
  "MAPK1",
  "MTOR",
  "NRAS",
  "CDKN2A",
  "RB1",
  "NOTCH1",
  "CTNNB1",
  "SMAD4",
  "ERBB2",
  "ALK",
  "MET",
  "FGFR1",
];

const pathways = [
  "DNA Repair",
  "Cell Cycle",
  "Apoptosis",
  "Signal Transduction",
  "Metabolism",
  "Immune Response",
  "Angiogenesis",
  "Cell Adhesion",
  "Protein Synthesis",
  "Gene Expression",
];

function getRandomPathways(): string[] {
  const count = Math.floor(Math.random() * 3) + 1;
  const selectedPathways = new Set<string>();

  while (selectedPathways.size < count) {
    selectedPathways.add(pathways[Math.floor(Math.random() * pathways.length)]);
  }

  return Array.from(selectedPathways);
}

function generateGeneDescription(geneName: string, pathways: string[]): string {
  return `${geneName} is involved in ${pathways.join(
    ", "
  )} pathways. This gene plays a crucial role in cellular regulation and homeostasis.`;
}

export function generateRandomPoints(
  count: number,
  width: number,
  height: number
): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const geneName = geneNames[index % geneNames.length];
    const selectedPathways = getRandomPathways();
    const value = Math.random() * 6 - 3; // Random value between -3 and +3

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      geneId: `GENE${index + 1}`,
      geneName,
      pathways: selectedPathways,
      description: generateGeneDescription(geneName, selectedPathways),
      value,
    };
  });
}

export function generateMockDatasets(sampleCount: number = 150): Dataset[] {
  const datasetTypes = [
    {
      name: "RNA-Seq Expression",
      description: "Gene expression levels from RNA sequencing",
    },
    { name: "Proteomics", description: "Protein abundance measurements" },
    { name: "Methylation", description: "DNA methylation patterns" },
    {
      name: "ChIP-Seq",
      description: "Chromatin immunoprecipitation sequencing data",
    },
  ];

  return datasetTypes.map((type, index) => ({
    id: `dataset-${index + 1}`,
    name: type.name,
    description: type.description,
    samples: Array.from({ length: sampleCount }, (_, sampleIndex) => ({
      id: `sample-${index + 1}-${sampleIndex + 1}`,
      name: `Sample ${String(sampleIndex + 1).padStart(3, "0")}`,
      description: `${type.name} sample ${sampleIndex + 1}`,
      condition: sampleIndex % 2 === 0 ? "Control" : "Treatment",
      date: new Date(2024, 0, 1 + sampleIndex).toISOString().split("T")[0],
      points: generateRandomPoints(100, 800, 600),
    })),
  }));
}

export function getSigmaForZoom(scale: number): number {
  return 50 / scale;
}

export function isPointInCircle(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radius: number
): boolean {
  const dx = x - centerX;
  const dy = y - centerY;
  return dx * dx + dy * dy <= radius * radius;
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    // Add parentheses to fix mixed operator warnings
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
