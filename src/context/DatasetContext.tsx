import React, { createContext, useContext, useState, useEffect } from "react";
import { Dataset } from "../types";
import { fetchDatasets } from "../services/datasetService";

interface DatasetContextType {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  setSelectedDataset: (dataset: Dataset | null) => void;
  isLoading: boolean;
  error: string | null;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load datasets on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchDatasets();

        // Validate data structure before setting state
        if (Array.isArray(data) && data.length > 0) {
          console.log("Fetched datasets:", data);
          setDatasets(data);
          setError(null);

          // Optional: Select the first dataset by default
          if (data.length > 0) {
            setSelectedDataset(data[0]);
          }
        } else {
          throw new Error("Invalid dataset format received");
        }
      } catch (err) {
        console.error("Error loading datasets:", err);
        setError(
          "Could not connect to the dataset service. Using mock data instead."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        selectedDataset,
        setSelectedDataset,
        isLoading,
        error,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDatasetContext = () => {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error("useDatasetContext must be used within a DatasetProvider");
  }
  return context;
};
