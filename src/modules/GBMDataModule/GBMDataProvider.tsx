import React, { createContext, useEffect, useState, useCallback } from "react";
import { GBMDataFetcher } from "./GBMDataFetcher";
import { GBMSampleData, FetchStatus, GBMDataContextType } from "./types";

// Create the context with a default value
export const GBMDataContext = createContext<GBMDataContextType>({
  samples: [],
  fetchStatus: { loading: false, error: null, lastUpdated: null },
  refreshSamples: async () => {},
  getSamplesForPatient: () => [],
  getFieldAvailability: () => ({}),
  getUniqueFieldValues: () => [],
  getTotalSamplesCount: () => 0,
});

// Props for the provider component
interface GBMDataProviderProps {
  children: React.ReactNode;
  autoFetch?: boolean;
}

export const GBMDataProvider: React.FC<GBMDataProviderProps> = ({
  children,
  autoFetch = true,
}) => {
  const [samples, setSamples] = useState<GBMSampleData[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const dataFetcher = new GBMDataFetcher();

  // Function to fetch all samples
  const refreshSamples = useCallback(async () => {
    try {
      setFetchStatus((prev) => ({ ...prev, loading: true, error: null }));

      const allSamples = await dataFetcher.fetchAllSamples();
      setSamples(allSamples);

      setFetchStatus({
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });

      return;
    } catch (error) {
      setFetchStatus({
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
        lastUpdated: Date.now(),
      });
      // We don't throw here to prevent the app from crashing
      console.error("Error refreshing GBM samples:", error);
      return;
    }
  }, []);

  // Helper function to get samples for a specific patient
  const getSamplesForPatient = useCallback(
    (patientId: string) => {
      return samples.filter(
        (sample) =>
          sample.patient_id === patientId || sample.case_id === patientId
      );
    },
    [samples]
  );

  // Get field availability statistics
  const getFieldAvailability = useCallback(() => {
    const totalSamples = samples.length;
    if (totalSamples === 0) return {};

    const fieldCounts: Record<string, number> = {};

    samples.forEach((sample) => {
      Object.keys(sample).forEach((field) => {
        if (sample[field] !== null && sample[field] !== undefined) {
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        }
      });
    });

    // Convert to percentages
    const fieldAvailability: Record<string, number> = {};
    Object.keys(fieldCounts).forEach((field) => {
      fieldAvailability[field] = fieldCounts[field] / totalSamples;
    });

    return fieldAvailability;
  }, [samples]);

  // Get all unique values for a specific field
  const getUniqueFieldValues = useCallback(
    (field: string) => {
      const values = new Set<any>();

      samples.forEach((sample) => {
        if (sample[field] !== undefined && sample[field] !== null) {
          values.add(sample[field]);
        }
      });

      return Array.from(values).sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") {
          return a - b;
        }
        return String(a).localeCompare(String(b));
      });
    },
    [samples]
  );

  // Get total number of samples
  const getTotalSamplesCount = useCallback(() => {
    return samples.length;
  }, [samples]);

  // Fetch data on initial load if autoFetch is true
  useEffect(() => {
    if (autoFetch) {
      refreshSamples();
    }
  }, [autoFetch, refreshSamples]);

  // The value provided to consumers of this context
  const contextValue: GBMDataContextType = {
    samples,
    fetchStatus,
    refreshSamples,
    getSamplesForPatient,
    getFieldAvailability,
    getUniqueFieldValues,
    getTotalSamplesCount,
  };

  return (
    <GBMDataContext.Provider value={contextValue}>
      {children}
    </GBMDataContext.Provider>
  );
};
