export interface SampleAPIResponse {
  count: number;
  hasMore: boolean;
  items: any[];
}

export abstract class BaseDataFetcher {
  protected batchSize: number = 10000;

  /**
   * Fetches all samples from a single API endpoint, handling pagination
   */
  protected async fetchAllFromEndpoint(apiUrl: string): Promise<any[]> {
    let allItems: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await fetch(`${apiUrl}${offset}`);

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data: SampleAPIResponse = await response.json();

        if (
          !data.items ||
          !Array.isArray(data.items) ||
          data.items.length === 0
        ) {
          console.log(`No more samples found in ${apiUrl}`);
          break;
        }

        allItems = [...allItems, ...data.items];

        if (!data.hasMore || data.items.length < this.batchSize) {
          hasMore = false;
        } else {
          offset += this.batchSize;
        }
      } catch (error) {
        console.error(
          `Error fetching from ${apiUrl} at offset ${offset}:`,
          error
        );
        hasMore = false;
      }
    }

    console.log(`Fetched ${allItems.length} samples from ${apiUrl}`);
    return allItems;
  }

  /**
   * Abstract method that each cancer type must implement
   */
  abstract fetchAllSamples(): Promise<any[]>;
}
