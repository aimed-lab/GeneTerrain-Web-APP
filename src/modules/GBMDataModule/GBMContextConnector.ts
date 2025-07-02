import { GBMDataFetcher } from "./GBMDataFetcher";
import { GBMSampleData } from "./types";

/**
 * Fetches GBM samples and formats them to match your application's Sample type
 */
export async function fetchAndFormatGBMSamples(): Promise<any[]> {
  try {
    const dataFetcher = new GBMDataFetcher();
    const gbmSamples = await dataFetcher.fetchAllSamples();

    return gbmSamples.map((sample) => formatGBMSampleForApp(sample));
  } catch (error) {
    console.error("Error fetching GBM samples:", error);
    throw error;
  }
}

/**
 * Formats a GBM sample to match your application's Sample type
 */
function formatGBMSampleForApp(gbmSample: GBMSampleData): any {
  return {
    id:
      gbmSample.sample_id ||
      gbmSample.patient_id ||
      gbmSample.sampleid ||
      String(Math.random()),
    name:
      gbmSample.sample_id ||
      gbmSample.patient_id ||
      gbmSample.sampleid ||
      "Unknown Sample",
    description: createSampleDescription(gbmSample),
    // Add any other fields your Sample type requires
    metadata: gbmSample, // Keep the original data for reference
  };
}

/**
 * Creates a description string from GBM sample metadata
 */
function createSampleDescription(sample: GBMSampleData): string {
  const parts: string[] = [];

  if (sample.gender) parts.push(`Gender: ${sample.gender}`);
  if (sample.age) parts.push(`Age: ${sample.age}`);
  if (sample.subtype) parts.push(`Subtype: ${sample.subtype}`);
  if (sample.grade) parts.push(`Grade: ${sample.grade}`);
  if (sample.survival_days || sample.survival_months) {
    const survival = sample.survival_days
      ? `${sample.survival_days} days`
      : `${sample.survival_months} months`;
    parts.push(`Survival: ${survival}`);
  }

  return parts.join(" | ");
}

/**
 * Checks if a dataset is the GBM dataset
 */
export function isGBMDataset(datasetName: string): boolean {
  return datasetName === "Glioblastoma Multiforme";
}
