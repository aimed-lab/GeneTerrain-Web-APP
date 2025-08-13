import {
  BaseDataFetcher,
  SampleAPIResponse,
} from "../../services/base/BaseDataFetcher";
import { GBMSampleData } from "./types";
import { getDatasetInfo } from "../../services/datasetService";

/**
 * Class responsible for fetching GBM data from registry API
 */
export class GBMDataFetcher extends BaseDataFetcher {
  /**
   * Fetches all GBM samples using clinical_url from dataset registry
   */
  public async fetchAllSamples(): Promise<GBMSampleData[]> {
    try {
      const datasetInfo = await getDatasetInfo("GBM");
      if (!datasetInfo || !datasetInfo.clinical_url) {
        throw new Error("No clinical URL found for GBM dataset");
      }
      const apiEndpoint = `${datasetInfo.clinical_url}?offset=`;
      const samples = await this.fetchAllFromEndpoint(apiEndpoint);
      // Optionally deduplicate if needed
      return samples;
    } catch (error) {
      console.error("Error fetching GBM samples:", error);
      throw new Error("Failed to fetch GBM samples from API");
    }
  }
}
