// Mock data utilities for gene visualization

// Import the types instead of redeclaring them
import { Dataset, Point } from "../types";

// Gene names for mock data
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

// Pathway names for mock data
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

// Generate random set of pathways
function getRandomPathways(): string[] {
  const count = Math.floor(Math.random() * 3) + 1;
  const selectedPathways = new Set<string>();

  while (selectedPathways.size < count) {
    selectedPathways.add(pathways[Math.floor(Math.random() * pathways.length)]);
  }

  return Array.from(selectedPathways);
}

// Generate mock gene description
function generateGeneDescription(geneName: string, pathways: string[]): string {
  return `${geneName} is involved in ${pathways.join(
    ", "
  )} pathways. This gene plays a crucial role in cellular regulation and homeostasis.`;
}

// Generate random data points for visualization
export function generateRandomPoints(
  count: number,
  width: number = 800,
  height: number = 600
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

// Generate mock datasets for development with enhanced sample data
export function generateMockDatasets(sampleCount: number = 20): Dataset[] {
  const datasetTypes = [
    {
      id: "GBM",
      name: "Glioblastoma Multiforme",
      description: "Brain tumor gene expression data",
    },
    // {
    //   id: "CGGA",
    //   name: "Chinese Glioma Genome Atlas",
    //   description: "Glioma data collection",
    // },
    // {
    //   id: "COAD",
    //   name: "Colon Adenocarcinoma",
    //   description: "Colorectal cancer dataset",
    // },
    // {
    //   id: "LUAD",
    //   name: "Lung Adenocarcinoma",
    //   description: "Lung cancer gene expression",
    // },
  ];

  return datasetTypes.map((type) => ({
    id: type.id,
    name: type.name,
    description: type.description,
    samples: Array.from({ length: sampleCount }, (_, sampleIndex) => ({
      id: `${type.id}_S${String(sampleIndex + 1).padStart(3, "0")}`,
      name: `${type.id} Sample ${String(sampleIndex + 1).padStart(3, "0")}`,
      description: `${type.name} sample ${sampleIndex + 1}`,
      condition: sampleIndex % 2 === 0 ? "Control" : "Treatment",
      date: new Date(2024, 0, 1 + sampleIndex).toISOString().split("T")[0],
      points: generateRandomPoints(100),
      // Add the new fields for enhanced display
      project: `Project ${Math.floor(sampleIndex / 4) + 1}`,
      protocol: sampleIndex % 3 === 0 ? "RNA-Seq" : "Microarray",
      organism: "Homo sapiens",
      platform:
        sampleIndex % 2 === 0 ? "Illumina NextSeq" : "Affymetrix GeneChip",
      notes:
        sampleIndex % 4 === 0
          ? "High quality sample"
          : sampleIndex % 4 === 1
          ? "Some quality concerns"
          : sampleIndex % 4 === 2
          ? "Repeat analysis recommended"
          : "",
    })),
  }));
}

// Function to fetch datasets (mock implementation for now)
export async function fetchDatasets(): Promise<Dataset[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  return generateMockDatasets();
}

// Function to fetch a single dataset by ID
export async function fetchDatasetById(id: string): Promise<Dataset | null> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 600));
  const datasets = generateMockDatasets();
  return datasets.find((dataset) => dataset.id === id) || null;
}
