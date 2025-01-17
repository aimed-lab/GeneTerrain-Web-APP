import { PlotlyHTMLElement } from "plotly.js";
import { changeSigma, changeSigmaCustomDiv } from "../plotlyCode";
import { getGeneInfo } from "../components/GeneInformation";
import * as Plotly from "plotly.js-dist";
import * as d3 from "d3-polygon";

export var heatMap = [
  {
    z: [],
    //z: finalData,
    colorscale: "Jet",
    colorbar: { len: 1, thickness: 10 },
    thickness: 1,
    type: "heatmap",
    // text: finalData,
    hoverinfo: true,
    name: "heatmap",
    zmin: -3,
    zmax: 3,
  },
  {
    x: [],
    y: [],
    // z: finalData,
    mode: "markers+text",
    type: "scatter",
    text: [],
    colorscale: "Jet",
    hoverinfo: true,
    visible: "legendonly",
    name: "Gene Name",
    args: { z: [], exp: [] },
  },
];
export var contourData = [
  {
    z: [],
    type: "contour",
    colorscale: "Jet",
    colorbar: { len: 1, thickness: 10 },
    // text: finalData,
    zmin: -3,
    zmax: 3,
  },
  {
    x: [],
    y: [],
    // z: expressionData,
    mode: "markers+text",
    type: "scatter",
    text: [],
    colorscale: "Jet",
    hoverinfo: true,
    visible: "legendonly",
    name: "Gene Name",
  },
];
export var plotlyLayout = {
  width: 768,
  height: 768,
  showlegend: true,
  dragmode: "pan",
  margin: {
    l: 70,
    r: 70,
    b: 70,
    t: 70,
    pad: 4,
  },
  legend: {
    x: 0.8,
    // xanchor: 'right',
    y: 1.05,
    // bgcolor: 'E2E2E2'
    bgcolor: "transparent",
  },
  font: {
    color: "black",
    size: 12,
  },
};

export var plotlyRelayout = (div = "canvas-div", data, props) => {
  const clonedProps = structuredClone(props);
  console.log(clonedProps);
  var divElement = document.getElementById(div) as PlotlyHTMLElement;
  let previousXRange = null;
  let previousYRange = null;
  var zoomLevel = 0;
  divElement.on("plotly_relayout", async (eventData) => {
    console.log(eventData);
    console.log(clonedProps);
    if (eventData["xaxis.range[0]"] && eventData["xaxis.range[1]"]) {
      const newXRange = [
        eventData["xaxis.range[0]"],
        eventData["xaxis.range[1]"],
      ];
      const newYRange = [
        eventData["yaxis.range[0]"],
        eventData["yaxis.range[1]"],
      ];

      if (previousXRange && previousYRange) {
        const zoomInX =
          newXRange[1] - newXRange[0] < previousXRange[1] - previousXRange[0];
        const zoomInY =
          newYRange[1] - newYRange[0] < previousYRange[1] - previousYRange[0];
        var sigmaInput = document.getElementById(
          "sigma_range"
        ) as HTMLInputElement;
        var sigma = +sigmaInput.value;
        if (zoomInX || zoomInY) {
          sigma -= 0.05;
          zoomLevel++;
        } else {
          sigma += 0.05;
          zoomLevel--;
        }
        sigmaInput.value = sigma + "";
        changeSigmaCustomDiv(
          div,
          data,
          clonedProps.sigmaIndexMap,
          sigma,
          clonedProps.resolution,
          [...clonedProps.heatMapdata],
          clonedProps.geneExpression,
          clonedProps.geneNames,
          zoomLevel
        );
      }

      // Update the previous range
      previousXRange = newXRange;
      previousYRange = newYRange;
    }
  });

  divElement.on("plotly_click", async (data) => {
    console.log(data);
    const clickedTraceIndex = data.points[0].curveNumber; // Index of the clicked trace
    const clickedPointIndex = data.points[0].pointIndex; // Index of the clicked point
    if (clickedTraceIndex === 1) {
      // Handle scatter plot point click
      const xValue = data.points[0].x;
      const yValue = data.points[0].y;
      const text = data.points[0].text;

      getGeneInfo({ geneName: text });
    } else if (clickedTraceIndex === 0) {
      console.log("Clicked on heatmap");
      // Optionally handle heatmap clicks here
    }
  });
};

export var doPlotlyUpdate = async (div = "canvas-div", updatedData) => {
  console.log("Updating plotly with data:", updatedData);
  await Plotly.update(div, updatedData, {}, [1]);

  // const points = [
  //   [1, 2],
  //   [2, 3],
  //   [3, 1],
  //   [4, 5],
  //   [5, 2],
  //   [6, 6],
  // ];

  // // Separate x and y for scatter points
  // const x = updatedData.x.map((p) => p[0]);
  // const y = updatedData.y.map((p) => p[1]);

  // // Compute convex hull
  // const hull = d3.polygonHull(points);

  // // Close the boundary loop by adding the first point to the end
  // if (hull) {
  //   hull.push(hull[0]);
  // }

  // // Separate x and y for boundary
  // const boundaryX = hull.map((p) => p[0]);
  // const boundaryY = hull.map((p) => p[1]);

  // // Boundary trace
  // const boundaryTrace = {
  //   x: boundaryX,
  //   y: boundaryY,
  //   mode: "lines",
  //   type: "scatter",
  //   line: { color: "red", width: 2 },
  //   name: "Boundary",
  // };
  // Plotly.addTraces(div, boundaryTrace);
};

export var drawPlot = () => {};
