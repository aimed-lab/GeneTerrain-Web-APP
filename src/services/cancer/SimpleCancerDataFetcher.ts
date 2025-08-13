import { BaseDataFetcher } from "../base/BaseDataFetcher";
import { getDatasetInfo } from "../datasetService";

export class SimpleCancerDataFetcher extends BaseDataFetcher {
  private cancerType: string;

  constructor(cancerType: string) {
    super();
    this.cancerType = cancerType;
  }

  public async fetchAllSamples(): Promise<any[]> {
    try {
      const datasetInfo = await getDatasetInfo(this.cancerType);
      if (!datasetInfo || !datasetInfo.clinical_url) {
        throw new Error(`No clinical URL found for dataset ${this.cancerType}`);
      }
      const apiEndpoint = `${datasetInfo.clinical_url}?offset=`;
      const samples = await this.fetchAllFromEndpoint(apiEndpoint);
      return samples;
    } catch (error) {
      console.error(`Error fetching samples for ${this.cancerType}:`, error);
      throw new Error(`Failed to fetch samples from API`);
    }
  }
}
