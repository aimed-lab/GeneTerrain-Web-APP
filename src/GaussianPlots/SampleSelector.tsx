import React, { useState, useMemo } from "react";
import { Sample } from "./types";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Calendar,
  Tag,
} from "lucide-react";

interface SampleSelectorProps {
  samples: Sample[];
  selectedSample: Sample | null;
  onSelect: (sample: Sample) => void;
}

const ITEMS_PER_PAGE = 12;

export function SampleSelector({
  samples,
  selectedSample,
  onSelect,
}: SampleSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string>("");

  const conditions = useMemo(
    () => Array.from(new Set(samples.map((s) => s.condition))).sort(),
    [samples]
  );

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const matchesSearch =
        searchTerm === "" ||
        sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCondition =
        !selectedCondition || sample.condition === selectedCondition;

      return matchesSearch && matchesCondition;
    });
  }, [samples, searchTerm, selectedCondition]);

  const totalPages = Math.ceil(filteredSamples.length / ITEMS_PER_PAGE);
  const paginatedSamples = filteredSamples.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Get selected samples summary for minimized view
  const getSelectedSampleInfo = () => {
    if (!selectedSample) return null;
    return {
      name: selectedSample.name,
      condition: selectedSample.condition,
      date: selectedSample.date,
    };
  };

  const selectedInfo = getSelectedSampleInfo();

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 mb-6 max-w-[1200px] w-full mx-auto">
      <div className="flex items-center bg-[#1E6B52] px-5 py-4">
        <Database className="h-5 w-5 text-white mr-2" />
        <h2 className="text-lg font-semibold text-white">Sample Selection</h2>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          {!showFilters && selectedInfo && (
            <div className="p-4 bg-gray-50 rounded-md flex-1 mr-2 border-l-4 border-l-[#1E6B52] shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-[#333333] text-base">
                  {selectedInfo.name}
                </h3>
                <span className="bg-[#1E6B52] text-white px-2 py-1 rounded-md text-sm font-medium">
                  {filteredSamples.length} Samples
                </span>
              </div>
              <p className="text-sm text-[#666666] mb-3 leading-relaxed">
                This sample belongs to the {selectedInfo.condition} condition
                group
              </p>
              <div className="bg-white p-3 rounded-md border border-gray-200">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 text-[#1E6B52] mr-2" />
                    <span className="text-[#444444] font-medium">
                      Sample ID:{" "}
                    </span>
                    <span className="text-[#666666] ml-1">
                      {selectedSample?.id}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Tag className="h-4 w-4 text-[#1E6B52] mr-2" />
                    <span className="text-[#444444] font-medium">
                      Condition:{" "}
                    </span>
                    <span className="text-[#666666] ml-1">
                      {selectedInfo.condition}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 text-[#1E6B52] mr-2" />
                    <span className="text-[#444444] font-medium">Date: </span>
                    <span className="text-[#666666] ml-1">
                      {selectedInfo.date}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-grow-0">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search samples..."
                className="pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: "#E2E8F0",
                  color: "#333333",
                  boxShadow: "0 0 0 2px transparent",
                  width: "180px",
                }}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border ${
                showFilters ? "bg-[#1E6B52] text-white" : "hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-medium mb-3 text-[#333333]">Filters</h3>
            <div className="flex flex-wrap gap-2">
              {conditions.map((condition) => (
                <button
                  key={condition}
                  onClick={() => {
                    setSelectedCondition(
                      selectedCondition === condition ? "" : condition
                    );
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors`}
                  style={{
                    backgroundColor:
                      selectedCondition === condition ? "#1E6B52" : "#FFFFFF",
                    color:
                      selectedCondition === condition ? "#FFFFFF" : "#333333",
                    borderColor: "#E2E8F0",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  {condition}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4 max-h-[325px] overflow-y-auto p-0.5">
          {paginatedSamples.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelect(sample)}
              className={`p-3 rounded-lg border-2 transition-colors hover:bg-gray-50`}
              style={{
                borderColor:
                  selectedSample?.id === sample.id ? "#1E6B52" : "#E2E8F0",
                backgroundColor:
                  selectedSample?.id === sample.id
                    ? "rgba(30, 107, 82, 0.1)"
                    : "#FFFFFF",
                boxShadow:
                  selectedSample?.id === sample.id
                    ? "0 2px 4px rgba(0,0,0,0.05)"
                    : "none",
              }}
            >
              <h3 className="font-medium text-[#333333] truncate">
                {sample.name}
              </h3>
              <p className="text-sm text-[#444444] truncate">
                {sample.condition}
              </p>
              <p className="text-sm text-[#666666]">{sample.date}</p>
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredSamples.length)}{" "}
              of {filteredSamples.length} samples
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border hover:bg-white disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border hover:bg-white disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
