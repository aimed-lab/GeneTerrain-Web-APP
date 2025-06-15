import { BaseDataFetcher } from "../base/BaseDataFetcher";

export class SimpleCancerDataFetcher extends BaseDataFetcher {
  private apiEndpoint: string;

  constructor(cancerType: string) {
    super();
    this.apiEndpoint = `https://aimed.uab.edu/apex/gtkb/clinical_data/pancan/${cancerType.toLowerCase()}?offset=`;
  }

  public async fetchAllSamples(): Promise<any[]> {
    try {
      const samples = await this.fetchAllFromEndpoint(this.apiEndpoint);
      return samples;
    } catch (error) {
      console.error(`Error fetching ${this.apiEndpoint} samples:`, error);
      throw new Error(`Failed to fetch samples from API`);
    }
  }
}
