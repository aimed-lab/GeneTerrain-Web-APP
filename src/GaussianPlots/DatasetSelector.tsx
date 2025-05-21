import React from "react";
import { Dataset } from "./types";
import { Database, Share2, Activity, FileSpreadsheet } from "lucide-react";

const datasetIcons = {
  "RNA-Seq Expression": Share2,
  Proteomics: Database,
  Methylation: Activity,
  "ChIP-Seq": FileSpreadsheet,
};

interface DatasetSelectorProps {
  datasets: Dataset[];
  onSelect: (dataset: Dataset) => void;
}

export function DatasetSelector({ datasets, onSelect }: DatasetSelectorProps) {
  return (
    <div className="max-w-[1200px] w-full mx-auto">
      <h1 className="text-3xl font-bold mb-8" style={{ color: "#333333" }}>
        Select Dataset Type
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {datasets.map((dataset) => {
          const Icon =
            datasetIcons[dataset.name as keyof typeof datasetIcons] || Database;

          return (
            <button
              key={dataset.id}
              onClick={() => onSelect(dataset)}
              className="flex items-start p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
            >
              <div
                className="flex-shrink-0 p-3 rounded-lg"
                style={{
                  backgroundColor: "rgba(30, 107, 82, 0.1)",
                }}
              >
                <Icon className="w-8 h-8" style={{ color: "#1E6B52" }} />
              </div>
              <div className="ml-4 text-left">
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "#333333" }}
                >
                  {dataset.name}
                </h2>
                <p className="mt-2" style={{ color: "#444444" }}>
                  {dataset.description}
                </p>
                <p className="mt-2 text-sm" style={{ color: "#80BC00" }}>
                  {dataset.samples.length} samples available
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
