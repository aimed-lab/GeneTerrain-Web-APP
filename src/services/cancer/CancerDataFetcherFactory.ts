import { GBMDataFetcher } from "../../modules/GBMDataModule/GBMDataFetcher";
import { SimpleCancerDataFetcher } from "./SimpleCancerDataFetcher";
import { BaseDataFetcher } from "../base/BaseDataFetcher";

export class CancerDataFetcherFactory {
  static getFetcher(cancerType: string): BaseDataFetcher {
    switch (cancerType.toUpperCase()) {
      case "GBM":
        return new GBMDataFetcher();
      default:
        return new SimpleCancerDataFetcher(cancerType);
    }
  }
}
