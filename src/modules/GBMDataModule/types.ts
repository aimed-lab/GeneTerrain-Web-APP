export interface SampleAPIResponse {
  count: number;
  items: GBMSampleData[];
  hasMore: boolean;
  limit: number;
  offset: number;
}

export interface GBMSampleData {
  [key: string]: any; // Flexible structure for variable fields
  sample_id?: string;
  patient_id?: string;
}

export interface FetchStatus {
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export interface GBMDataContextType {
  samples: GBMSampleData[];
  fetchStatus: FetchStatus;
  refreshSamples: () => Promise<void>;
  getSamplesForPatient: (patientId: string) => GBMSampleData[];
  getFieldAvailability: () => Record<string, number>;
  getUniqueFieldValues: (field: string) => any[];
  getTotalSamplesCount: () => number;
}
