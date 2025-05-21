import React from "react";
import { Point } from "../../GaussianPlots/types";

// Update the interface to accept the new props structure
interface GeneSelectionSummaryProps {
  selectedPoints: Point[];
  regions: { points: Point[]; label: string }[];
  filteredPoints: Point[];
}

const GeneSelectionSummary: React.FC<GeneSelectionSummaryProps> = ({
  selectedPoints,
  regions,
  filteredPoints,
}) => {
  // Calculate statistics
  const selectedPathways = Array.from(
    new Set(selectedPoints.flatMap((point) => point.pathways))
  ).sort();

  const avgValue =
    selectedPoints.length > 0
      ? (
          selectedPoints.reduce((sum, p) => sum + p.value, 0) /
          selectedPoints.length
        ).toFixed(2)
      : "0.00";

  return (
    <div
      className="container-fluid px-2"
      style={{ color: "#333333", maxWidth: "900px", margin: "0 auto" }}
    >
      {/* Title Bar */}
      <div
        className="py-2 px-3 rounded mb-3"
        style={{ backgroundColor: "#1E6B52", color: "white" }}
      >
        <h5 className="mb-0">Selection Summary</h5>
      </div>

      {/* Overall Selection Statistics - More compact row */}
      <div
        className="row g-2 mb-3 justify-content-center"
        style={{ maxWidth: "800px", margin: "0 auto" }}
      >
        <div className="col-md-3 col-6">
          <div
            className="border rounded p-2 h-100"
            style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}
          >
            <div className="small" style={{ color: "#666666" }}>
              Total Selections
            </div>
            <div className="fw-bold" style={{ color: "#333333" }}>
              {regions.length}
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div
            className="border rounded p-2 h-100"
            style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}
          >
            <div className="small" style={{ color: "#666666" }}>
              Total Genes
            </div>
            <div className="fw-bold" style={{ color: "#333333" }}>
              {selectedPoints.length}
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div
            className="border rounded p-2 h-100"
            style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}
          >
            <div className="small" style={{ color: "#666666" }}>
              Total Pathways
            </div>
            <div className="fw-bold" style={{ color: "#333333" }}>
              {selectedPathways.length}
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div
            className="border rounded p-2 h-100"
            style={{ backgroundColor: "white", borderColor: "#E2E8F0" }}
          >
            <div className="small" style={{ color: "#666666" }}>
              Avg. Gene Value
            </div>
            <div
              className="fw-bold"
              style={{
                color: parseFloat(avgValue) >= 0 ? "#80BC00" : "#3182CE",
              }}
            >
              {avgValue}
            </div>
          </div>
        </div>
      </div>

      {/* Region-based Selections - Using a carousel layout for regions */}
      <div className="regions-container">
        {regions.length > 0 && (
          <div className="d-flex align-items-center mb-2">
            <h5 className="h6 mb-0 me-2" style={{ color: "#444444" }}>
              Selections:
            </h5>
            <div className="d-flex gap-1">
              {regions.map((region, i) => (
                <button
                  key={i}
                  className="btn btn-sm px-2 py-0"
                  style={{
                    borderColor: "#1E6B52",
                    color: "#1E6B52",
                    backgroundColor: "transparent",
                  }}
                  onClick={() =>
                    document
                      .getElementById(`region-${i}`)
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {region.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className="regions-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "1rem",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {regions.map((region, idx) => {
            const genesInRegion = filteredPoints.filter((point) =>
              isPointInPolygon(point, region.points)
            );

            const pathwaysInRegion = Array.from(
              new Set(genesInRegion.flatMap((p) => p.pathways))
            ).sort();

            const regionAvgValue = (
              genesInRegion.reduce((sum, p) => sum + p.value, 0) /
              Math.max(1, genesInRegion.length)
            ).toFixed(2);

            const valueColor =
              parseFloat(regionAvgValue) >= 0 ? "#80BC00" : "#3182CE";

            return (
              <div
                id={`region-${idx}`}
                className="card mb-1 border"
                key={idx}
                style={{
                  height: "fit-content",
                  backgroundColor: "white",
                  borderColor: "#E2E8F0",
                }}
              >
                <div
                  className="card-header py-2"
                  style={{
                    backgroundColor: "#F7FAFC",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <h4
                    className="h6 mb-0 d-flex justify-content-between"
                    style={{ color: "#333333" }}
                  >
                    <span>
                      <i className="bi bi-grid-3x3 me-1"></i>
                      {region.label}
                    </span>
                    <span
                      className="badge"
                      style={{ backgroundColor: "#80BC00", color: "white" }}
                    >
                      {genesInRegion.length} genes
                    </span>
                  </h4>
                </div>
                <div className="card-body py-2 px-3">
                  {/* Stats Row */}
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <div
                        className="border rounded p-2"
                        style={{
                          backgroundColor: "white",
                          borderColor: "#E2E8F0",
                        }}
                      >
                        <div className="small" style={{ color: "#666666" }}>
                          Avg. Value
                        </div>
                        <div className="fw-bold" style={{ color: valueColor }}>
                          {regionAvgValue}
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div
                        className="border rounded p-2"
                        style={{
                          backgroundColor: "white",
                          borderColor: "#E2E8F0",
                        }}
                      >
                        <div className="small" style={{ color: "#666666" }}>
                          Pathways
                        </div>
                        <div className="fw-bold" style={{ color: "#333333" }}>
                          {pathwaysInRegion.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs for Gene/Pathway data */}
                  <ul
                    className="nav nav-tabs nav-tabs-sm mb-2"
                    style={{ borderBottom: "1px solid #E2E8F0" }}
                    role="tablist"
                  >
                    <li className="nav-item" role="presentation">
                      <button
                        className="nav-link active py-1 px-2 small"
                        style={{ color: "#1E6B52" }}
                        id={`genes-tab-${idx}`}
                        data-bs-toggle="tab"
                        data-bs-target={`#genes-${idx}`}
                        type="button"
                        role="tab"
                        aria-selected="true"
                      >
                        Genes
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                        className="nav-link py-1 px-2 small"
                        style={{ color: "#444444" }}
                        id={`pathways-tab-${idx}`}
                        data-bs-toggle="tab"
                        data-bs-target={`#pathways-${idx}`}
                        type="button"
                        role="tab"
                        aria-selected="false"
                      >
                        Pathways
                      </button>
                    </li>
                  </ul>

                  <div className="tab-content">
                    <div
                      className="tab-pane fade show active"
                      id={`genes-${idx}`}
                      role="tabpanel"
                    >
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr className="small">
                            <th
                              style={{
                                backgroundColor: "#1E6B52",
                                color: "white",
                                borderBottom: "none",
                              }}
                            >
                              Gene
                            </th>
                            <th
                              style={{
                                backgroundColor: "#1E6B52",
                                color: "white",
                                width: "70px",
                                borderBottom: "none",
                              }}
                            >
                              Value
                            </th>
                          </tr>
                        </thead>
                        <tbody className="small">
                          {genesInRegion.slice(0, 5).map((gene, i) => {
                            const valueColor =
                              gene.value >= 0 ? "#80BC00" : "#3182CE";
                            return (
                              <tr key={i}>
                                <td style={{ color: "#333333" }}>
                                  {gene.geneName}
                                </td>
                                <td style={{ color: valueColor }}>
                                  {gene.value.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div
                      className="tab-pane fade"
                      id={`pathways-${idx}`}
                      role="tabpanel"
                    >
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr className="small">
                            <th
                              style={{
                                backgroundColor: "#1E6B52",
                                color: "white",
                                borderBottom: "none",
                              }}
                            >
                              Pathway
                            </th>
                            <th
                              style={{
                                backgroundColor: "#1E6B52",
                                color: "white",
                                width: "70px",
                                borderBottom: "none",
                              }}
                            >
                              Genes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="small">
                          {pathwaysInRegion.slice(0, 5).map((pathway, i) => {
                            const count = genesInRegion.filter((p) =>
                              p.pathways.includes(pathway)
                            ).length;
                            return (
                              <tr key={i}>
                                <td style={{ color: "#333333" }}>{pathway}</td>
                                <td style={{ width: "50px" }}>
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor: "#80BC00",
                                      color: "white",
                                    }}
                                  >
                                    {count}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper function for point in polygon detection remains unchanged
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  // Existing implementation
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export default GeneSelectionSummary;
