import { useState, useEffect } from "react";
import { GBMDataFetcher } from "./GBMDataFetcher";
import { GBMSampleData } from "./types";

/**
 * Hook to provide GBM sample data in a format compatible with existing sample selection component
 * @param datasetName The selected dataset name to check if we should load GBM data
 * @returns Sample data formatted for the sample selection component
 */
export const useGBMDataConnector = (datasetName: string) => {
  const [samples, setSamples] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if the selected dataset is GBM
  const isGBMDataset = datasetName === "Glioblastoma Multiforme";

  useEffect(() => {
    const fetchGBMSamples = async () => {
      if (!isGBMDataset) {
        setSamples([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const dataFetcher = new GBMDataFetcher();
        const gbmSamples = await dataFetcher.fetchAllSamples();

        // Convert GBM samples to format expected by your sample selection component
        // Modify this mapping based on what your sample selection component expects
        const formattedSamples = gbmSamples.map((sample) =>
          formatSampleForSelection(sample)
        );

        setSamples(formattedSamples);
      } catch (err) {
        console.error("Error fetching GBM samples for sample selection:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load GBM samples"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchGBMSamples();
  }, [isGBMDataset]);

  return {
    samples,
    isLoading,
    error,
    isGBMDataset,
  };
};

/**
 * Format GBM sample data to match your existing sample selection format
 * You'll need to adjust this based on your existing component's expected format
 */
function formatSampleForSelection(gbmSample: GBMSampleData): any {
  return {
    // Adjust these fields based on what your sample selection component expects
    id: gbmSample.sample_id || gbmSample.patient_id || "unknown",
    name:
      gbmSample.name ||
      gbmSample.sample_id ||
      gbmSample.patient_id ||
      "Unknown Sample",
    description: createSampleDescription(gbmSample),
    // Add any other required fields for your sample selection component
  };
}

/**
 * Create a readable description from sample metadata
 */
function createSampleDescription(sample: GBMSampleData): string {
  const parts: string[] = [];

  // Add available metadata to the description
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
