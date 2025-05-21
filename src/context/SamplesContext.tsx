import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { Sample, Dataset } from "../types";
import { useToast } from "@chakra-ui/react";
import { GBMDataFetcher } from "../modules/GBMDataModule/GBMDataFetcher";

interface ColumnFilterType {
  column: string | null;
  type: "categorical" | "numeric" | "text" | null;
  value: string | number | [number, number] | null;
}

interface ColumnFilterItem {
  column: string;
  type: "categorical" | "numeric" | "text";
  value: any;
}

// Complete interface definition for context
interface SamplesContextType {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  setSelectedDataset: (dataset: Dataset | null) => void;
  selectedSample: Sample | null;
  setSelectedSample: (sample: Sample | null) => void;
  isLoading: boolean;
  error: string | null;
  filteredSamples: Sample[];
  selectedSampleIds: Set<string>;
  setSelectedSampleIds: (
    value: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void;
  selectedSamples: Sample[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterCondition: string | null;
  setFilterCondition: (condition: string | null) => void;
  availableConditions: string[];
  conditionSearchTerm: string;
  setConditionSearchTerm: (term: string) => void;
  batchConditionSearchTerm: string;
  setBatchConditionSearchTerm: (term: string) => void;
  filteredConditions: string[];
  filteredBatchConditions: string[];
  handleSampleSelect: (sample: Sample, multiSelect: boolean) => void;
  handleSelectAllFiltered: (selected?: boolean) => void;
  handleDeselectAll: () => void;
  handleSelectByCondition: (condition: string) => void;
  isMapVisible: boolean;
  setIsMapVisible: (visible: boolean) => void;
  handleVisualize: () => void;
  columnFilters: Map<string, ColumnFilterItem>;
  addColumnFilter: (filter: ColumnFilterItem) => void;
  removeColumnFilter: (columnName: string) => void;
  clearColumnFilters: () => void;
  activeSelectionSource: "scatter" | "table" | null;
  setActiveSelectionSource: (source: "scatter" | "table" | null) => void;
  activeSampleId: string | null;
  setActiveSampleId: (id: string | null) => void;
}

const SamplesContext = createContext<SamplesContextType | undefined>(undefined);

interface SamplesProviderProps {
  children: React.ReactNode;
  datasets: Dataset[];
}

export const SamplesProvider: React.FC<SamplesProviderProps> = ({
  children,
  datasets,
}) => {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCondition, setFilterCondition] = useState<string | null>(null);
  const [isMapVisible, setIsMapVisible] = useState<boolean>(false);
  const toast = useToast();

  // Add states for UI filtering components
  const [conditionSearchTerm, setConditionSearchTerm] = useState<string>("");
  const [batchConditionSearchTerm, setBatchConditionSearchTerm] =
    useState<string>("");

  // Add GBM specific states
  const [gbmSamples, setGbmSamples] = useState<Sample[]>([]);
  const [isLoadingGBM, setIsLoadingGBM] = useState<boolean>(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [columnFilters, setColumnFilters] = useState<
    Map<string, ColumnFilterItem>
  >(new Map());

  // Add new states for active selection source and active sample ID
  const [activeSelectionSource, setActiveSelectionSource] = useState<
    "scatter" | "table" | null
  >(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);

  // Reset selected samples when dataset changes
  useEffect(() => {
    setSelectedSampleIds(new Set());
    setIsMapVisible(false);
    setSearchTerm("");
    setFilterCondition(null);
    setConditionSearchTerm("");
    setBatchConditionSearchTerm("");
  }, [selectedDataset]);

  // Get unique conditions from current dataset
  const availableConditions = useMemo(() => {
    if (!selectedDataset) return [];
    const conditions = new Set(selectedDataset.samples.map((s) => s.condition));
    return Array.from(conditions).filter(
      (condition): condition is string => condition !== undefined
    );
  }, [selectedDataset]);

  // Filter conditions based on search terms
  const filteredConditions = useMemo(() => {
    return availableConditions.filter(
      (condition) =>
        !conditionSearchTerm ||
        (condition &&
          condition.toLowerCase().includes(conditionSearchTerm.toLowerCase()))
    );
  }, [availableConditions, conditionSearchTerm]);

  const filteredBatchConditions = useMemo(() => {
    return availableConditions.filter(
      (condition) =>
        !batchConditionSearchTerm ||
        (condition &&
          condition
            .toLowerCase()
            .includes(batchConditionSearchTerm.toLowerCase()))
    );
  }, [availableConditions, batchConditionSearchTerm]);

  // Get filtered samples based on search term and condition filter
  const filteredSamples = useMemo(() => {
    if (!selectedDataset) return [];

    return selectedDataset.samples.filter((sample) => {
      // Existing search and condition filters
      const matchesSearch =
        !searchTerm ||
        sample.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sample.name &&
          sample.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sample.description &&
          sample.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCondition =
        !filterCondition || sample.condition === filterCondition;

      // Column filters - check all active filters
      let matchesColumnFilters = true;

      if (columnFilters.size > 0) {
        // For each active column filter
        for (const [column, filter] of Array.from(columnFilters.entries())) {
          const sampleValue = (sample as any)[column];

          if (sampleValue === null || sampleValue === undefined) {
            matchesColumnFilters = false;
            break;
          }

          switch (filter.type) {
            case "numeric":
              const [min, max] = filter.value as [number, number];
              const numValue = Number(sampleValue);
              if (isNaN(numValue) || numValue < min || numValue > max) {
                matchesColumnFilters = false;
              }
              break;

            case "categorical":
              if (String(sampleValue) !== String(filter.value)) {
                matchesColumnFilters = false;
              }
              break;

            case "text":
              if (
                !String(sampleValue)
                  .toLowerCase()
                  .includes(String(filter.value).toLowerCase())
              ) {
                matchesColumnFilters = false;
              }
              break;
          }

          // If any filter doesn't match, we can break early
          if (!matchesColumnFilters) break;
        }
      }

      return matchesSearch && matchesCondition && matchesColumnFilters;
    });
  }, [selectedDataset, searchTerm, filterCondition, columnFilters]);

  // Get selected samples
  const selectedSamples = useMemo(() => {
    if (!selectedDataset) return [];
    return selectedDataset.samples.filter((s) => selectedSampleIds.has(s.id));
  }, [selectedDataset, selectedSampleIds]);

  // Handle sample selection
  const handleSampleSelect = (sample: Sample, multiSelect: boolean) => {
    setSelectedSampleIds((prev) => {
      const newSelection = new Set(multiSelect ? prev : []);
      if (prev.has(sample.id)) {
        newSelection.delete(sample.id);
      } else {
        newSelection.add(sample.id);
      }
      return newSelection;
    });

    // Show success toast
    toast({
      title: "Sample selection updated",
      description: `Selected sample: ${sample.name}`,
      status: "success",
      duration: 1000,
      isClosable: true,
    });
  };

  // Handle selecting all filtered samples
  const handleSelectAllFiltered = (selected: boolean = true) => {
    setSelectedSampleIds((prev) => {
      const newSelection = new Set(prev);

      filteredSamples.forEach((sample) => {
        if (selected) {
          newSelection.add(sample.id);
        } else {
          newSelection.delete(sample.id);
        }
      });

      return newSelection;
    });

    toast({
      title: "Selection updated",
      description: `Selected all ${filteredSamples.length} matching samples`,
      status: "success",
      duration: 1000,
      isClosable: true,
    });
  };

  // Handle deselecting all samples
  const handleDeselectAll = () => {
    setSelectedSampleIds(new Set());

    toast({
      title: "Selection cleared",
      description: "All samples deselected",
      status: "info",
      duration: 1000,
      isClosable: true,
    });
  };

  // Handle selecting samples by condition
  const handleSelectByCondition = (condition: string) => {
    if (!selectedDataset) return;

    setSelectedSampleIds((prev) => {
      const newSelection = new Set(prev);

      selectedDataset.samples
        .filter((sample) => sample.condition === condition)
        .forEach((sample) => {
          newSelection.add(sample.id);
        });

      return newSelection;
    });

    toast({
      title: "Selection updated",
      description: `Selected all "${condition}" samples`,
      status: "success",
      duration: 1000,
      isClosable: true,
    });
  };

  // Handle visualization
  const handleVisualize = () => {
    setIsMapVisible(true);
  };

  // Load GBM data when Glioblastoma Multiforme is selected
  useEffect(() => {
    if (!selectedDataset) return;

    const isGBMDataset = selectedDataset.name === "Glioblastoma Multiforme";

    if (isGBMDataset && gbmSamples.length === 0) {
      setIsLoadingGBM(true);

      const fetchGBMSamples = async () => {
        try {
          const dataFetcher = new GBMDataFetcher();
          const rawGbmSamples = await dataFetcher.fetchAllSamples();

          // Get all possible fields from all samples
          const allFields = new Set<string>();
          rawGbmSamples.forEach((sample) => {
            Object.keys(sample).forEach((key) => allFields.add(key));
          });

          // Standardize field names across samples
          const standardizedSamples = rawGbmSamples.map((sample) => {
            // Create a consistent sample object with standardized field names
            const standardized: any = {};

            // Map common alternative field names to standard ones
            const fieldMappings: Record<string, string> = {
              // ID fields
              case_id: "patient_id",
              case_submitter_id: "patient_id",
              patient_barcode: "patient_id",

              // Clinical fields
              gender: "gender",
              sex: "gender",

              // Subtype/classification fields
              molecular_subtype: "subtype",
              glioma_subtype: "subtype",

              // Status fields
              idh_mutation_status: "idh_status",
              mgmt_promoter_status: "mgmt_status",
            };

            // Process all fields in the sample
            Object.entries(sample).forEach(([key, value]) => {
              // Skip empty values
              if (value === null || value === undefined || value === "") return;

              // Use mapped field name if available
              const standardKey = fieldMappings[key.toLowerCase()] || key;
              standardized[standardKey] = value;
            });

            // Ensure required fields exist
            standardized.id =
              standardized.sampleid ||
              standardized.sample_id ||
              `unknown-${Math.random()}`;
            standardized.name = standardized.id;
            standardized.condition =
              standardized.subtype || standardized.disease_type || "";
            standardized.points = [];

            return standardized;
          });

          setGbmSamples(standardizedSamples);

          // Update the selected dataset with the standardized samples
          setSelectedDataset((prevDataset) => {
            if (!prevDataset) return null;
            return {
              ...prevDataset,
              samples: standardizedSamples,
            };
          });
        } catch (err) {
          console.error("Error loading GBM samples:", err);
          setError("Failed to load GBM samples data");
        } finally {
          setIsLoadingGBM(false);
        }
      };

      fetchGBMSamples();
    }
  }, [selectedDataset, gbmSamples.length]);

  // Add/update a column filter
  const addColumnFilter = (filter: ColumnFilterItem) => {
    setColumnFilters((prev) => {
      const newFilters = new Map(prev);
      newFilters.set(filter.column, filter);
      return newFilters;
    });
  };

  // Remove a specific column filter
  const removeColumnFilter = (columnName: string) => {
    setColumnFilters((prev) => {
      const newFilters = new Map(prev);
      newFilters.delete(columnName);
      return newFilters;
    });
  };

  // Clear all column filters
  const clearColumnFilters = () => {
    setColumnFilters(new Map());
  };

  const value = {
    datasets,
    selectedDataset,
    setSelectedDataset,
    selectedSample,
    setSelectedSample,
    isLoading: isLoading || isLoadingGBM,
    error,
    filteredSamples,
    selectedSampleIds,
    setSelectedSampleIds,
    selectedSamples,
    searchTerm,
    setSearchTerm,
    filterCondition,
    setFilterCondition,
    availableConditions,
    conditionSearchTerm,
    setConditionSearchTerm,
    batchConditionSearchTerm,
    setBatchConditionSearchTerm,
    filteredConditions,
    filteredBatchConditions,
    handleSampleSelect,
    handleSelectAllFiltered,
    handleDeselectAll,
    handleSelectByCondition,
    isMapVisible,
    setIsMapVisible,
    handleVisualize,
    columnFilters,
    addColumnFilter,
    removeColumnFilter,
    clearColumnFilters,
    activeSelectionSource,
    setActiveSelectionSource,
    activeSampleId,
    setActiveSampleId,
  };

  return (
    <SamplesContext.Provider value={value}>{children}</SamplesContext.Provider>
  );
};

// Better description generator
function generateDescription(sample: any): string {
  const descriptionFields = [
    { label: "Gender", field: "gender" },
    { label: "Age", field: "age" },
    { label: "Subtype", field: "subtype" },
    { label: "Grade", field: "grade" },
    { label: "IDH Status", field: "idh_status" },
    { label: "MGMT Status", field: "mgmt_status" },
    { label: "Survival", field: "survival_months", suffix: " months" },
    { label: "Survival", field: "survival_days", suffix: " days" },
    { label: "KPS", field: "kps_score" },
    { label: "Treatment", field: "treatment" },
  ];

  const parts = descriptionFields
    .filter(({ field }) => sample[field])
    .map(
      ({ label, field, suffix = "" }) => `${label}: ${sample[field]}${suffix}`
    );

  return parts.length > 0
    ? parts.join(" | ")
    : "No additional information available";
}

// Helper function to generate a random ID if needed
const generateId = () => `gbm-${Math.random().toString(36).substring(2, 10)}`;

export const useSamplesContext = () => {
  const context = useContext(SamplesContext);
  console.log(context);
  if (context === undefined) {
    throw new Error("useSamplesContext must be used within a SamplesProvider");
  }
  return context;
};
