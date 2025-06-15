import { normalizePoints } from "../../GaussianPlots/GaussianMap";
import { useSamplesContext } from "../../context/SamplesContext";
import { Dataset } from "../../types";

// --- Types ---
interface LayoutItem {
  x: number;
  y: number;
  id: string;
  gene: string;
}

interface GeneExpItem {
  gene_symbol: string;
  value: number;
}

// Helper function to generate random points with Gaussian distribution
function generateRandomPoints(count: number) {
  const points = [];
  const geneNames = [
    "BRCA1",
    "TP53",
    "EGFR",
    "KRAS",
    "PTEN",
    "RB1",
    "AKT1",
    "MTOR",
    "PIK3CA",
    "MAPK1",
    "ERBB2",
    "MYC",
    "CDKN2A",
    "BRAF",
    "ALK",
  ];

  for (let i = 0; i < count; i++) {
    points.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      geneId: `GENE${i}`,
      geneName: geneNames[i % geneNames.length],
      value: Math.random() * 6 - 3, // Random value between -3 and 3
      pathways: [],
      description: "",
    });
  }

  return normalizePoints(points);
}

// Mapping of sample prefixes to legacy API URLs
const legacyApiMapping: Record<string, string> = {
  TCGA: "https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_GBM/TCGA/",
  GSM: "https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/CGGA_Illumina_HiSeq_2000/",
  CGGA: "https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/CGGA_Illumina_HiSeq_2000_or_2500/",
  IVYGAP: "https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/IvyGap/",
  GLSS: "https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/GLSS/",
};

// Pancan gene expression and layout URL templates
const pancanGeneExpUrl = (cancerId: string, sampleId: string) =>
  `https://aimed.uab.edu/apex/gtkb/gene_exp/pancan/${cancerId}/${sampleId}`;
const pancanLayoutUrl = (cancerId: string) =>
  `https://aimed.uab.edu/apex/gtkb/layout/pancan/${cancerId}`;

// Helper: Fetch layout data (all at once)
async function fetchLayoutData(
  selectedDataset: Dataset | null
): Promise<LayoutItem[]> {
  let layoutData: LayoutItem[] = [];
  let offset = 0,
    hasMore = true;

  // Determine if this is a pancan dataset
  let pancanId = selectedDataset?.id?.toLowerCase() || "";
  let isPancan =
    selectedDataset &&
    pancanId &&
    !legacyApiMapping[pancanId.toUpperCase()] &&
    pancanId !== "gbm"; // Exclude legacy/GBM

  let baseUrl =
    isPancan && pancanId
      ? pancanLayoutUrl(pancanId)
      : "https://aimed.uab.edu/apex/gtkb/layout/all";

  while (hasMore) {
    const url = isPancan
      ? `${baseUrl}?offset=${offset}`
      : `${baseUrl}?offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch layout data");
    const json = await res.json();
    layoutData = layoutData.concat(json.items);
    hasMore = json.count > 0;
    offset += json.limit;
  }
  return layoutData;
}

// Helper: Fetch gene expression for a single sample
async function fetchSampleGeneData(
  sampleId: string,
  selectedDataset: Dataset | null
): Promise<GeneExpItem[]> {
  // Try legacy mapping first
  const prefix = sampleId.split("-")[0];
  let apiUrl = legacyApiMapping[prefix];

  // If not found, try pancan pattern
  if (!apiUrl && selectedDataset) {
    const pancanId = selectedDataset.id.toLowerCase();
    if (pancanId && pancanId !== "gbm") {
      apiUrl = `https://aimed.uab.edu/apex/gtkb/gene_exp/pancan/${pancanId}/`;
    }
  }

  if (!apiUrl) throw new Error(`No API mapping for ${sampleId}`);
  const res = await fetch(`${apiUrl}${sampleId}`);
  if (!res.ok) throw new Error(`Failed to fetch gene data for ${sampleId}`);
  return (await res.json()).items;
}

// --- Main function ---
export async function fetchGeneExpressionData(
  sampleIds: string[],
  selectedDataset: Dataset | null,
  fallbackCount: number = 100
) {
  try {
    console.log("Fetching gene expression data for samples:", sampleIds);
    // Fetch layout and gene expression data in parallel
    const [layoutData, geneDataArr] = await Promise.all([
      fetchLayoutData(selectedDataset),
      Promise.all(
        sampleIds.map((id) =>
          fetchSampleGeneData(id, selectedDataset).catch((err) => {
            console.warn(`Failed to fetch gene data for ${id}:`, err);
            return [];
          })
        )
      ),
    ]);

    console.log("[fetchGeneExpressionData] geneDataArr:", geneDataArr);

    // Calculate average gene expression values across all selected samples
    const geneAverages: Record<string, number> = {};
    const geneCounts: Record<string, number> = {};

    geneDataArr.forEach((sampleGeneData) => {
      sampleGeneData.forEach((gene) => {
        const geneName = gene.gene_symbol;
        const value = Number(gene.value);
        if (isNaN(value) || value === null || value === undefined) return;
        if (!geneAverages[geneName]) {
          geneAverages[geneName] = value;
          geneCounts[geneName] = 1;
        } else {
          geneAverages[geneName] += value;
          geneCounts[geneName] += 1;
        }
      });
    });

    console.log("[fetchGeneExpressionData] geneAverages:", geneAverages);
    console.log(
      "[fetchGeneExpressionData] layoutData (first 5):",
      layoutData.slice(0, 5)
    );

    Object.keys(geneAverages).forEach((geneName) => {
      if (geneCounts[geneName] > 0) {
        geneAverages[geneName] /= geneCounts[geneName];
      } else {
        geneAverages[geneName] = 0;
      }
    });

    // Combine layout data with averaged gene expression values
    const points = layoutData.map((layoutItem) => ({
      x: layoutItem.x,
      y: layoutItem.y,
      geneId: layoutItem.id,
      geneName: layoutItem.gene,
      value: geneAverages[layoutItem.gene] || 0,
      pathways: [],
      description: "",
    }));

    console.log(
      "[fetchGeneExpressionData] points (first 5):",
      points.slice(0, 5)
    );

    return normalizePoints(points);
  } catch (error) {
    console.error("Error fetching points from API:", error);
    // Fall back to generating random points
    return generateRandomPoints(fallbackCount);
  }
}
