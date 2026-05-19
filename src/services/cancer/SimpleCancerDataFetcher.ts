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

      // Cache clinical data in localStorage for comparison views
      const clinicalDataCache: Record<string, any> = {};
      samples.forEach(sample => {
        const sampleId = sample.sampleid || sample.sample_id || sample.id;
        if (sampleId) {
          clinicalDataCache[sampleId] = sample;
        }
      });
      localStorage.setItem(`CLINICAL_DATA_${this.cancerType}`, JSON.stringify(clinicalDataCache));

      return samples;
    } catch (error) {
      console.error(`Error fetching samples for ${this.cancerType}:`, error);
      throw new Error(`Failed to fetch samples from API`);
    }
  }
}
