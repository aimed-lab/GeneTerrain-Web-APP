import { getGenesFromPags } from "./pager/pager";
var store = require("store");

// var BASEURL = "http://localhost:5000/"
var BASEURL = process.env.BASEURL;
var PAGIDGENE_URL = BASEURL + "pagRankedGene/";
var RUN_PAGER_URL = BASEURL;

var getGeneNameFromPags = async (response) => {
  var result = [];
  response.forEach((obj) => {
    result.push(obj["GENE_SYM"]);
  });
  return result;
};

const storedData = store.get("geneNamesInformation");

export async function filterData(
  filterByDiv,
  expressionData = storedData.expressionData,
  layoutDataX = storedData.layoutDataX,
  layoutDataY = storedData.layoutDataY,
  geneName = storedData.geneName,
  ...filteredGeneNames
) {
  // Initialize empty arrays for filtered data
  const filteredExpressionData = [];
  const filteredLayoutDataX = [];
  const filteredLayoutDataY = [];
  const filteredGeneName = [];

  var thresholdDivMin = document.getElementById(
    "canvas-div01-text-min"
  ) as HTMLInputElement;
  var thresholdDivMax = document.getElementById(
    "canvas-div01-text-max"
  ) as HTMLInputElement;
  var geneNameSubstringDiv = document.getElementById(
    "canvas-div01-text-gname"
  ) as HTMLInputElement;
  var pagIDTextDiv = document.getElementById(
    "canvas-div01-text-pagid"
  ) as HTMLInputElement;
  var thresholdDivMinVal = +thresholdDivMin.value;
  var thresholdDivMaxVal = +thresholdDivMax.value;
  var geneNameSubstringDivValue = geneNameSubstringDiv.value;
  var tempArray = geneNameSubstringDiv.name.split(",");
  var tempPagIdArray = pagIDTextDiv.name.split(",");
  var filteredGeneNamess: string[] = [];
  if (filteredGeneNames.length != 0) {
    filteredGeneNamess = filteredGeneNames;
    console.log(filteredGeneNamess);
  }
  if (filterByDiv.value === "pathwayFilter") {
    var allPathwatGenes = [];
    for (var v of tempPagIdArray) {
      var response = await getGenesFromPags(v);
      allPathwatGenes = allPathwatGenes.concat(
        await getGeneNameFromPags(response)
      );
    }
  }
  // Iterate through expressionData and apply the threshold filter
  for (let i = 0; i < expressionData.length; i++) {
    if (filterByDiv.localeCompare("FilteredGeneNames") == 0) {
      for (var v of filteredGeneNamess) {
        if (geneName[i].includes(v.toUpperCase())) {
          filteredExpressionData.push(expressionData[i]);
          filteredLayoutDataX.push(layoutDataX[i]);
          filteredLayoutDataY.push(layoutDataY[i]);
          filteredGeneName.push(geneName[i]);
        }
      }
    } else if (filterByDiv.value.localeCompare("Gene Expression") == 0) {
      if (
        thresholdDivMinVal < expressionData[i] &&
        expressionData[i] < thresholdDivMaxVal
      ) {
        filteredExpressionData.push(expressionData[i]);
        filteredLayoutDataX.push(layoutDataX[i]);
        filteredLayoutDataY.push(layoutDataY[i]);
        filteredGeneName.push(geneName[i]);
      }
    } else if (filterByDiv.value.localeCompare("Gene Name") == 0) {
      for (var v of tempArray) {
        if (geneName[i].includes(v.toUpperCase())) {
          filteredExpressionData.push(expressionData[i]);
          filteredLayoutDataX.push(layoutDataX[i]);
          filteredLayoutDataY.push(layoutDataY[i]);
          filteredGeneName.push(geneName[i]);
        }
      }
    } else if (filterByDiv.value === "pathwayFilter") {
      if (allPathwatGenes.includes(geneName[i])) {
        filteredExpressionData.push(expressionData[i]);
        filteredLayoutDataX.push(layoutDataX[i]);
        filteredLayoutDataY.push(layoutDataY[i]);
        filteredGeneName.push(geneName[i]);
      }
    } else {
      filteredExpressionData.push(expressionData[i]);
      filteredLayoutDataX.push(layoutDataX[i]);
      filteredLayoutDataY.push(layoutDataY[i]);
      filteredGeneName.push(geneName[i]);
    }
  }
  // console.log(allPathwatGenes)
  // alert(filteredExpressionData.length)
  // Return the filtered data as an object
  return {
    expressionData: filteredExpressionData,
    layoutDataX: filteredLayoutDataX,
    layoutDataY: filteredLayoutDataY,
    geneName: filteredGeneName,
  };
}

export async function filterDataByGeneNames(filteredGeneNames) {
  // Initialize empty arrays for filtered data
  const filteredExpressionData = [];
  const filteredLayoutDataX = [];
  const filteredLayoutDataY = [];
  const filteredGeneName = [];

  console.log(storedData);
  const layoutDataX = Object.values(storedData.layoutX);
  const layoutDataY = Object.values(storedData.layoutY);
  const geneName = storedData.geneName;

  console.log(filteredGeneNames);
  // Iterate through expressionData and apply the threshold filter
  for (let i = 0; i < geneName.length; i++) {
    for (var v of filteredGeneNames) {
      if (geneName[i].includes(v.toUpperCase())) {
        filteredLayoutDataX.push(layoutDataX[i]);
        filteredLayoutDataY.push(layoutDataY[i]);
        filteredGeneName.push(geneName[i]);
      }
    }
  }
  // console.log(allPathwatGenes)
  // alert(filteredExpressionData.length)
  // Return the filtered data as an object
  return {
    expressionData: filteredExpressionData,
    layoutDataX: filteredLayoutDataX,
    layoutDataY: filteredLayoutDataY,
    geneName: filteredGeneName,
  };
}
