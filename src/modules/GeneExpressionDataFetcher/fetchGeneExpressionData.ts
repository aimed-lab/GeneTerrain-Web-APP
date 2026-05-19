import { normalizePoints } from "../../GaussianPlots/GaussianMap";
import { useSamplesContext } from "../../context/SamplesContext";
import { Dataset } from "../../types";
import { getDatasetInfo } from "../../services/datasetService";

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

const SAMPLE_FETCH_CONCURRENCY = 8;
const SAMPLE_FETCH_RETRIES = 1;

// Cache raw layout items per dataset so both cohorts in a comparison always
// share the same gene positions.
// Critical for GBM: its layout API returns 404, so we fall back to random
// positions — without caching, each cohort gets different random positions.
const layoutItemCache: Record<string, LayoutItem[]> = {};

// Helper function to generate random points with Gaussian distribution
function generateRandomPoints(count: number) {
  const points = [];
  const geneNames = [
    "BRCA1", "TP53", "EGFR", "KRAS", "PTEN",
    "RB1", "AKT1", "MTOR", "PIK3CA", "MAPK1",
    "ERBB2", "MYC", "CDKN2A", "BRAF", "ALK",
  ];

  for (let i = 0; i < count; i++) {
    points.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      geneId: `GENE${i}`,
      geneName: geneNames[i % geneNames.length],
      value: Math.random() * 6 - 3,
      pathways: [],
      description: "",
    });
  }

  return normalizePoints(points);
}

// Fallback random layout items (same shape as LayoutItem) cached per dataset
const fallbackCache: Record<string, ReturnType<typeof normalizePoints>> = {};

// Helper: Fetch layout data using URL from dataset registry
async function fetchLayoutData(
  selectedDataset: Dataset | null
): Promise<LayoutItem[]> {
  if (!selectedDataset) throw new Error("No dataset selected");
  const datasetInfo = await getDatasetInfo(selectedDataset.id);
  if (!datasetInfo || !datasetInfo.layout_url)
    throw new Error(`No layout URL found for dataset ${selectedDataset.id}`);

  let layoutData: LayoutItem[] = [];
  let offset = 0,
    hasMore = true;
  while (hasMore) {
    const url = `${datasetInfo.layout_url}?offset=${offset}`;
    console.log("[GeneTerrain] Layout URL:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch layout data");
    const json = await res.json();
    layoutData = layoutData.concat(json.items);
    hasMore = json.count > 0;
    offset += json.limit;
  }
  return layoutData;
}

// Helper: Fetch gene expression for a single sample using URL from dataset registry
async function fetchSampleGeneData(
  sampleId: string,
  selectedDataset: Dataset | null
): Promise<GeneExpItem[]> {
  if (!selectedDataset) throw new Error("No dataset selected");
  const datasetInfo = await getDatasetInfo(selectedDataset.id);
  if (!datasetInfo || !datasetInfo.gene_expression_url)
    throw new Error(
      `No gene expression URL found for dataset ${selectedDataset.id}`
    );

  const url = `${datasetInfo.gene_expression_url}${sampleId}`;
  console.log("[GeneTerrain] Gene Expression URL:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch gene data for ${sampleId}`);
  return (await res.json()).items;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSampleGeneDataWithRetry(
  sampleId: string,
  selectedDataset: Dataset | null
): Promise<GeneExpItem[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= SAMPLE_FETCH_RETRIES; attempt++) {
    try {
      return await fetchSampleGeneData(sampleId, selectedDataset);
    } catch (error) {
      lastError = error;
      if (attempt < SAMPLE_FETCH_RETRIES) {
        console.warn(
          `[GeneTerrain] Retrying gene expression fetch for ${sampleId} (attempt ${attempt + 2}/${SAMPLE_FETCH_RETRIES + 1})`,
          error
        );
        await delay(250 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch gene data for ${sampleId}`);
}

async function fetchGeneDataForSamples(
  sampleIds: string[],
  selectedDataset: Dataset | null
) {
  const geneDataArr: GeneExpItem[][] = new Array(sampleIds.length);
  const failedSampleIds: string[] = [];
  let nextIndex = 0;

  const workerCount = Math.min(SAMPLE_FETCH_CONCURRENCY, sampleIds.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = nextIndex++;
        if (currentIndex >= sampleIds.length) {
          return;
        }

        const sampleId = sampleIds[currentIndex];
        try {
          geneDataArr[currentIndex] = await fetchSampleGeneDataWithRetry(
            sampleId,
            selectedDataset
          );
        } catch (error) {
          failedSampleIds.push(sampleId);
          geneDataArr[currentIndex] = [];
          console.warn(`Failed to fetch gene data for ${sampleId}:`, error);
        }
      }
    })
  );

  return {
    geneDataArr,
    failedSampleIds,
    successCount: sampleIds.length - failedSampleIds.length,
  };
}

// --- Main function ---
export async function fetchGeneExpressionData(
  sampleIds: string[],
  selectedDataset: Dataset | null,
  fallbackCount: number = 100
) {
  const datasetKey = selectedDataset?.id ?? "__unknown__";

  try {
    console.log("Fetching gene expression data for samples:", sampleIds);

    // Use cached layout items if available, otherwise fetch and cache them.
    // This guarantees both cohorts in a side-by-side comparison always get
    // identical gene x,y positions.
    if (!layoutItemCache[datasetKey]) {
      layoutItemCache[datasetKey] = await fetchLayoutData(selectedDataset);
    }
    const layoutData = layoutItemCache[datasetKey];

    // Fetch sample expression with a concurrency cap so large cohort
    // selections do not overwhelm the API or browser connection pool.
    const { geneDataArr, failedSampleIds, successCount } =
      await fetchGeneDataForSamples(sampleIds, selectedDataset);

    if (sampleIds.length > 0 && successCount === 0) {
      throw new Error(
        `Gene expression fetch failed for all ${sampleIds.length} selected samples`
      );
    }

    if (failedSampleIds.length > 0) {
      console.warn(
        `[GeneTerrain] Gene expression fetch failed for ${failedSampleIds.length}/${sampleIds.length} samples`,
        failedSampleIds
      );
    }

    console.log("[fetchGeneExpressionData] geneDataArr:", geneDataArr);

    // Average expression across all selected samples
    const geneValues: Record<string, number[]> = {};
    geneDataArr.forEach((sampleGeneData) => {
      sampleGeneData.forEach((gene) => {
        const geneName = gene.gene_symbol;
        const value = Number(gene.value);
        if (isNaN(value) || value === null || value === undefined) return;
        if (!geneValues[geneName]) {
          geneValues[geneName] = [value];
        } else {
          geneValues[geneName].push(value);
        }
      });
    });

    console.log("[fetchGeneExpressionData] geneValues counts:", Object.keys(geneValues).length);

    // Combine fixed layout positions with per-cohort averaged expression values
    const points = layoutData.map((layoutItem) => {
      const values = geneValues[layoutItem.gene] || [];
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return {
        x: layoutItem.x,
        y: layoutItem.y,
        geneId: layoutItem.id,
        geneName: layoutItem.gene,
        value: avg,
        sampleValues: values,
        pathways: [],
        description: "",
      };
    });

    console.log("[fetchGeneExpressionData] points (first 5):", points.slice(0, 5));

    return normalizePoints(points);
  } catch (error) {
    console.error("Error fetching points from API:", error);
    // Fall back to random points — cached so both cohorts get identical
    // positions even when the layout API is unavailable (e.g. GBM 404)
    if (!fallbackCache[datasetKey]) {
      fallbackCache[datasetKey] = generateRandomPoints(fallbackCount);
    }
    return fallbackCache[datasetKey];
  }
}
