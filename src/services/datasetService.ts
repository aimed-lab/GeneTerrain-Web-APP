// Mock data utilities for gene visualization

// Import the types instead of redeclaring them
import { Dataset, Point, CancerGroup } from "../types";

// API endpoint constant
const DATASET_API_ENDPOINT =
  "https://aimed.uab.edu/apex/gtkb/datasets/pancan/all";

// Interface for API response
interface DatasetAPIResponse {
  items: Array<{
    cancer_type: string;
    cancer_group?: string;
    description: string;
  }>;
  hasMore: boolean;
  count: number;
}

// Cancer groups configuration
export const CANCER_GROUPS: CancerGroup[] = [
  {
    id: "PANCAN",
    name: "Pan-Cancer",
    description: "Cancer datasets from TCGA Pan-Cancer Atlas",
  },
  {
    id: "KIDNEY_CELL",
    name: "Kidney Cell",
    description: "Specialized kidney cell datasets",
  },
];

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
      cancerGroup: "PANCAN",
    },
    {
      id: "KIDNEYCELL",
      name: "Kidney Cell Dataset",
      description: "Kidney cell gene expression data",
      cancerGroup: "KIDNEY_CELL",
    },
  ];

  return datasetTypes.map((type) => ({
    id: type.id,
    name: type.name,
    description: type.description,
    cancerGroup: type.cancerGroup,
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

// Function to fetch datasets from API
async function fetchDatasetsFromAPI(): Promise<Dataset[]> {
  try {
    const response = await fetch(DATASET_API_ENDPOINT);

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data: DatasetAPIResponse = await response.json();

    // Transform API response to match our Dataset type
    return data.items.map((item) => ({
      id: item.cancer_type,
      name: item.cancer_type,
      description: item.description,
      samples: [], // Samples will be fetched separately when needed
      cancerGroup: item.cancer_group || "PANCAN", // Default to PANCAN if not specified
    }));
  } catch (error) {
    console.error("Error fetching datasets from API:", error);
    throw error;
  }
}

// Function to fetch dataset info by cancer type from registry API
export async function getDatasetInfo(cancerType: string) {
  const endpoint = `https://aimed.uab.edu/apex/gtkb/datasets/pancan/all`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    const allDatasets = (await response.json()).items;

    console.log("[DEBUG] allDatasets:", allDatasets, cancerType);
    // Filter by cancer type
    const datasetInfo = allDatasets.find(
      (dataset: any) => dataset.cancer_type === cancerType
    );

    return datasetInfo || null;
  } catch (error) {
    console.error(`Error fetching dataset info for ${cancerType}:`, error);
    return null;
  }
}

// Function to fetch all datasets by cancer group from registry API
export async function getDatasetsByGroup(cancerGroup: string) {
  const endpoint = `https://aimed.uab.edu/apex/gtkb/datasets/pancan/all`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    const allDatasets = await response.json();

    // Filter by cancer group and active status
    return allDatasets.filter(
      (dataset: any) =>
        dataset.cancer_group === cancerGroup && dataset.is_active === true
    );
  } catch (error) {
    console.error(`Error fetching datasets for group ${cancerGroup}:`, error);
    return [];
  }
}

// Function to fetch datasets by cancer group
export async function fetchDatasetsByGroup(
  cancerGroup?: string
): Promise<Dataset[]> {
  try {
    const allDatasets = await fetchDatasetsFromAPI();

    if (cancerGroup) {
      return allDatasets.filter(
        (dataset) => dataset.cancerGroup === cancerGroup
      );
    }

    return allDatasets;
  } catch (error) {
    console.warn("Falling back to mock datasets due to API error:", error);
    // Fall back to mock data if API fails
    const mockDatasets = generateMockDatasets();
    if (cancerGroup) {
      return mockDatasets.filter(
        (dataset) => dataset.cancerGroup === cancerGroup
      );
    }
    return mockDatasets;
  }
}

// Function to get cancer groups
export function getCancerGroups(): CancerGroup[] {
  return CANCER_GROUPS;
}

// Function to fetch datasets (now tries API first, falls back to mock data)
export async function fetchDatasets(): Promise<Dataset[]> {
  try {
    // Try to fetch from API first
    return await fetchDatasetsFromAPI();
  } catch (error) {
    console.warn("Falling back to mock datasets due to API error:", error);
    // Fall back to mock data if API fails
    return generateMockDatasets();
  }
}

// Function to fetch a single dataset by ID
export async function fetchDatasetById(id: string): Promise<Dataset | null> {
  try {
    const datasets = await fetchDatasetsFromAPI();
    return datasets.find((dataset) => dataset.id === id) || null;
  } catch (error) {
    console.warn("Falling back to mock dataset due to API error:", error);
    // Fall back to mock data if API fails
    const mockDatasets = generateMockDatasets();
    return mockDatasets.find((dataset) => dataset.id === id) || null;
  }
}
