import {
  BaseDataFetcher,
  SampleAPIResponse,
} from "../../services/base/BaseDataFetcher";
import { GBMSampleData } from "./types";

/**
 * Class responsible for fetching GBM data from multiple APIs
 */
export class GBMDataFetcher extends BaseDataFetcher {
  private apiEndpoints: string[] = [
    "https://aimed.uab.edu/apex/gtkb/sample/all?offset=",
    "https://aimed.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/MRNA_301?offset=",
    "https://aimed.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/MRNA_325?offset=",
    "https://aimed.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/GLSS?offset=",
  ];

  /**
   * Fetches all GBM samples from all APIs
   */
  public async fetchAllSamples(): Promise<GBMSampleData[]> {
    try {
      // Fetch from all APIs concurrently
      const allSamplesPromises = this.apiEndpoints.map((api) =>
        this.fetchAllFromEndpoint(api)
      );
      const samplesArrays = await Promise.all(allSamplesPromises);

      // Flatten and deduplicate samples based on sample_id
      const uniqueSamples = this.deduplicateSamples(samplesArrays.flat());
      console.log(
        `Successfully fetched ${uniqueSamples.length} unique samples from all APIs`
      );
      return uniqueSamples;
    } catch (error) {
      console.error("Error fetching all samples:", error);
      throw new Error("Failed to fetch GBM samples from APIs");
    }
  }

  /**
   * Removes duplicate samples based on sample_id
   */
  private deduplicateSamples(samples: GBMSampleData[]): GBMSampleData[] {
    // Create a map to merge samples with the same ID
    const sampleMap = new Map<string, GBMSampleData>();

    samples.forEach((sample) => {
      // Use reliable ID fields to identify samples
      const id =
        sample.sample_id || sample.patient_id || sample.case_id || sample.id;

      // Skip samples without any ID (very rare case)
      if (!id) {
        console.warn("Sample without ID found:", sample);
        return;
      }

      if (sampleMap.has(id)) {
        // Merge with existing sample data (keeping existing values if present)
        const existingSample = sampleMap.get(id) || {};
        sampleMap.set(id, { ...sample, ...existingSample });
      } else {
        // Ensure sample has an ID property for consistency
        sampleMap.set(id, { ...sample, sample_id: id });
      }
    });

    return Array.from(sampleMap.values());
  }
}
