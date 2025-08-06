import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import {
  Save,
  History,
  Loader2,
  Trash2,
  Filter,
  Plus,
  Check,
} from "lucide-react";
import { ViewportState, LassoState, Dataset, Sample } from "./types";
import { parseSampleIds } from "../utils/sampleIdParser";
import { fetchGeneExpressionData } from "../modules/GeneExpressionDataFetcher/fetchGeneExpressionData";

// Define the response format from Oracle DB
interface OracleHistoryResponse {
  items: Array<{
    id: number;
    user_id: string;
    name: string;
    dataset_id: string;
    sample_id: string;
    viewport_state: string;
    selection_state: string;
    created_date: string;
    updated_date: string | null;
  }>;
  hasMore: boolean;
  limit: number;
  offset: number;
  count: number;
}

// Format after parsing the JSON strings
interface HistoryEntry {
  id: number;
  user_id: string;
  name: string;
  dataset_id: string;
  sample_id: string;
  viewport_state: ViewportState;
  selection_state: {
    selectedGenes: string[];
  };
  created_date: string;
  updated_date: string | null;
}

interface ComparisonSample {
  points: Sample["points"];
  name: string;
  datasetName: string;
}

interface VisualizationHistoryProps {
  datasetId: string;
  sampleId: string;
  viewport: ViewportState;
  lasso: LassoState;
  onLoadState: (viewport: ViewportState, selectedGenes: Set<string>) => void;
  datasets: Dataset[];
  onCompare?: (samples: ComparisonSample[]) => void;
}

// Oracle DB API endpoints
const ORACLE_API = {
  SAVE: "https://aimed.uab.edu/apex/gtkb/save/saveGT/",
  FETCH: "https://aimed.uab.edu/apex/gtkb/save/getGT/",
  DELETE: "https://aimed.uab.edu/apex/gtkb/save/deleteGT/",
};

export function VisualizationHistory({
  datasetId,
  sampleId,
  viewport,
  lasso,
  onLoadState,
  datasets,
  onCompare,
}: VisualizationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDatasetOnly, setCurrentDatasetOnly] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(
    new Set()
  );
  const [isComparing, setIsComparing] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) throw new Error("Not authenticated");

      // Direct URL with user ID appended as path parameter
      let url = `${ORACLE_API.FETCH}${user.uid}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const responseData = (await response.json()) as OracleHistoryResponse;

      // Extract items from the response and parse the JSON strings
      const historyItems = responseData.items.map((item) => ({
        ...item,
        viewport_state: JSON.parse(item.viewport_state),
        selection_state: JSON.parse(item.selection_state),
      }));

      // Apply client-side filtering if needed
      const filteredItems = historyItems.filter((item) => {
        if (!showAllHistory) {
          if (currentDatasetOnly) {
            return item.dataset_id === datasetId;
          } else {
            return item.dataset_id === datasetId && item.sample_id === sampleId;
          }
        }
        return true;
      });

      setHistory(filteredItems);
    } catch (error) {
      console.error("Error loading history:", error);
      setError("Failed to load history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getDatasetAndSampleNames = (entry: HistoryEntry) => {
    // Check if datasets is an array
    if (!Array.isArray(datasets)) {
      return {
        datasetName: `Dataset ${entry.dataset_id}`,
        sampleName: `Sample ${entry.sample_id}`,
      };
    }

    const dataset = datasets.find((d) => d.id === entry.dataset_id);
    if (!dataset)
      return {
        datasetName: `Dataset ${entry.dataset_id}`,
        sampleName: `Sample ${entry.sample_id}`,
      };

    // Check if dataset.samples is an array
    if (!Array.isArray(dataset.samples)) {
      return {
        datasetName: dataset.name,
        sampleName: `Sample ${entry.sample_id}`,
      };
    }

    const sample = dataset.samples.find((s) => s.id === entry.sample_id);
    return {
      datasetName: dataset.name,
      sampleName: sample ? sample.name : `Sample ${entry.sample_id}`,
    };
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, datasetId, sampleId, showAllHistory, currentDatasetOnly]);

  const saveCurrentState = async () => {
    // alert(sampleId);
    if (!saveName.trim()) return;
    setError(null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) throw new Error("Not authenticated");

      const response = await fetch(ORACLE_API.SAVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          user_id: user.uid,
          name: saveName,
          dataset_id: datasetId,
          sample_id: sampleId,
          viewport_state: viewport,
          selection_state: {
            selectedGenes: Array.from(lasso.selectedGenes),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save state: ${response.statusText}`);
      }

      await loadHistory();
      setShowSaveDialog(false);
      setSaveName("");
    } catch (error) {
      console.error("Error saving state:", error);
      setError("Failed to save state. Please try again.");
    }
  };

  const deleteHistoryEntry = async (id: number) => {
    setError(null);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) throw new Error("Not authenticated");

      // Pass the ID directly in the URL path
      const response = await fetch(`${ORACLE_API.DELETE}${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete entry: ${response.statusText}`);
      }

      await loadHistory();
      setSelectedEntries((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Error deleting history entry:", error);
      setError("Failed to delete entry. Please try again.");
    }
  };

  const loadHistoryEntry = (entry: HistoryEntry) => {
    if (entry.dataset_id !== datasetId) {
      setError(
        "This visualization is from a different dataset. Please switch to the correct dataset first."
      );
      return;
    }
    onLoadState(
      entry.viewport_state,
      new Set(entry.selection_state.selectedGenes)
    );
    setIsOpen(false);
  };

  const toggleEntrySelection = (entryId: number) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else if (next.size < 5) {
        next.add(entryId);
      }
      return next;
    });
  };

  const startComparison = async () => {
    if (!onCompare) return;
    // setIsComparing(true);
    setLoading(true);

    try {
      const selectedEntrySamples = await Promise.all(
        Array.from(selectedEntries).map(async (id) => {
          const entry = history.find((h) => h.id === id);
          if (!entry) return null;

          const dataset = datasets.find((d) => d.id === entry.dataset_id);
          if (!dataset) return null;

          // Parse the comma-separated sample IDs
          const sampleIds = entry.sample_id.split(",").map((id) => id.trim());

          // Fetch gene expression data with the array of sample IDs
          try {
            const expressionData = await fetchGeneExpressionData(
              sampleIds,
              dataset,
              100 // default fallback count
            );

            return {
              points: expressionData,
              name: entry.name || `History #${entry.id}`,
              datasetName: dataset.name,
            };
          } catch (error) {
            console.error(`Error fetching data for entry ${entry.id}:`, error);
            return null;
          }
        })
      );

      const validSamples = selectedEntrySamples.filter(
        (sample) => sample !== null
      ) as ComparisonSample[];

      if (validSamples.length === 0) {
        setError("No valid samples selected for comparison");
        return;
      }

      onCompare(validSamples);
      setIsComparing(true);
      setIsOpen(false);
    } catch (error) {
      console.error("Error preparing comparison data:", error);
      setError("Failed to load comparison data. Please try again.");
    } finally {
      setLoading(false);
      setIsComparing(false);
    }
  };

  const cancelComparison = () => {
    setIsComparing(false);
    setSelectedEntries(new Set());
    if (onCompare) {
      onCompare([]);
    }
  };

  const filteredHistory = history.filter((entry) => {
    if (!searchTerm) return true;
    const { datasetName, sampleName } = getDatasetAndSampleNames(entry);
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.name.toLowerCase().includes(searchLower) ||
      datasetName.toLowerCase().includes(searchLower) ||
      sampleName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="position-relative">
      <div className="d-flex gap-2">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="btn btn-light d-flex align-items-center gap-2 shadow-sm"
          title="Save current state"
        >
          <Save color="#1E6B52" className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-light d-flex align-items-center gap-2 shadow-sm"
          title="View history"
        >
          <History color="#1E6B52" className="h-5 w-5" />
          {history.length > 0 && (
            <span className="badge bg-primary rounded-pill">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="modal-title h5">Save Current State</h3>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setError(null);
                  }}
                  className="btn-close"
                />
              </div>
              {error && <div className="alert alert-danger mb-4">{error}</div>}
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter a name for this state"
                className="form-control mb-4"
              />
              <div className="d-flex justify-content-end gap-2">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setError(null);
                  }}
                  className="btn btn-light"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrentState}
                  disabled={!saveName.trim()}
                  className="btn btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {isOpen && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div
              className="modal-content p-4"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3
                  className="modal-title h5"
                  style={{ color: "#333333", fontWeight: "600" }}
                >
                  Visualization History
                </h3>
                <div className="d-flex align-items-center gap-2">
                  {selectedEntries.size > 0 && (
                    <>
                      {isComparing ? (
                        <button
                          onClick={cancelComparison}
                          className="btn"
                          style={{
                            backgroundColor: "#FFFFFF",
                            color: "#ff4d4f",
                            borderColor: "#ff4d4f",
                            fontWeight: "500",
                          }}
                        >
                          Cancel Comparison
                        </button>
                      ) : (
                        <button
                          onClick={startComparison}
                          disabled={selectedEntries.size < 2}
                          style={{
                            backgroundColor: "#80BC00",
                            color: "#FFFFFF",
                            border: "none",
                            padding: "6px 16px",
                            borderRadius: "4px",
                            marginRight: "10px",
                            fontWeight: "500",
                            opacity: selectedEntries.size < 2 ? 0.6 : 1,
                          }}
                        >
                          Compare ({selectedEntries.size})
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setError(null);
                    }}
                    className="btn-close"
                  />
                </div>
              </div>

              <div className="mb-4 d-flex gap-4 align-items-center">
                <div className="flex-grow-1 position-relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search saved states..."
                    className="form-control pe-5"
                  />
                  <Filter
                    className="position-absolute"
                    style={{
                      right: "12px",
                      top: "10px",
                      height: "20px",
                      width: "20px",
                      color: "#606060", // Changed from #6c757d to geneTerrain.neutral
                    }}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button
                    onClick={() => setCurrentDatasetOnly(!currentDatasetOnly)}
                    className={`btn ${
                      currentDatasetOnly
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                  >
                    {currentDatasetOnly ? "Current Dataset" : "Current Sample"}
                  </button>
                  <button
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className={`btn ${
                      showAllHistory ? "btn-primary" : "btn-outline-secondary"
                    }`}
                  >
                    {showAllHistory ? "Show Current Only" : "Show All States"}
                  </button>
                </div>
              </div>

              {error && <div className="alert alert-danger mb-4">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <Loader2
                    className="h-6 w-6 spinner-border"
                    style={{ color: "#1E6B52" }}
                  />
                </div>
              ) : filteredHistory.length === 0 ? (
                <p className="text-center py-4" style={{ color: "#666666" }}>
                  {searchTerm
                    ? "No states match your search"
                    : showAllHistory
                    ? "No saved states found"
                    : currentDatasetOnly
                    ? "No saved states found for this dataset"
                    : "No saved states found for this sample"}
                </p>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: "24rem" }}>
                  {filteredHistory.map((entry) => {
                    const { datasetName, sampleName } =
                      getDatasetAndSampleNames(entry);
                    const isSelected = selectedEntries.has(entry.id);
                    const canSelect = !isSelected && selectedEntries.size < 5;
                    const isSameDataset = entry.dataset_id === datasetId;

                    return (
                      <div
                        key={entry.id}
                        className="d-flex align-items-center justify-content-between p-3 rounded mb-2"
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(128, 188, 0, 0.1)"
                            : isSameDataset
                            ? entry.sample_id === sampleId
                              ? "rgba(128, 188, 0, 0.1)"
                              : "rgba(30, 107, 82, 0.1)"
                            : "#FFFFFF",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <button
                            onClick={() => toggleEntrySelection(entry.id)}
                            style={{
                              backgroundColor: isSelected
                                ? "#80BC00"
                                : "#FFFFFF",
                              color: isSelected ? "#FFFFFF" : "#333333",
                              border: isSelected ? "none" : "1px solid #E2E8F0",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              opacity: !canSelect && !isSelected ? 0.5 : 1,
                              cursor:
                                !canSelect && !isSelected
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                            disabled={!canSelect && !isSelected}
                            title={
                              isSelected
                                ? "Remove from comparison"
                                : canSelect
                                ? "Add to comparison"
                                : "Maximum 5 samples for comparison"
                            }
                          >
                            {isSelected ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <Plus className="h-5 w-5" />
                            )}
                          </button>
                          <div>
                            <h4
                              className="h6 mb-1"
                              style={{
                                color: "#333333",
                                fontWeight: "600",
                                fontSize: "16px",
                              }}
                            >
                              {entry.name}
                            </h4>
                            <p
                              className="small mb-1"
                              style={{ color: "#444444" }}
                            >
                              {datasetName} • {sampleName}
                            </p>
                            <p
                              className="small mb-0"
                              style={{ color: "#666666" }}
                            >
                              {new Date(entry.created_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          {!isSelected && (
                            <button
                              onClick={() => loadHistoryEntry(entry)}
                              style={{
                                backgroundColor: isSameDataset
                                  ? "#80BC00"
                                  : "#E2E8F0",
                                color: isSameDataset ? "#FFFFFF" : "#666666",
                                border: "none",
                                borderRadius: "4px",
                                padding: "4px 12px",
                                cursor: isSameDataset
                                  ? "pointer"
                                  : "not-allowed",
                              }}
                              disabled={!isSameDataset}
                              title={
                                !isSameDataset
                                  ? "Switch to the correct dataset to load this state"
                                  : "Load this state"
                              }
                            >
                              Load
                            </button>
                          )}
                          <button
                            onClick={() => deleteHistoryEntry(entry.id)}
                            style={{
                              backgroundColor: "#FFFFFF",
                              color: "#ff4d4f",
                              border: "1px solid #ff4d4f",
                              borderRadius: "4px",
                              padding: "4px 8px",
                            }}
                            title="Delete this state"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
