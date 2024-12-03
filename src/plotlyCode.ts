import { Hmac } from "crypto";
import * as Plotly from "plotly.js-dist";
import { DomLayoutType, Grid, GridOptions } from "ag-grid-community";
import { do_plotly_selected } from "../dist/js/plotly_events";
import { PlotlyHTMLElement } from "plotly.js";
import {
  maskedGTGenerateClicked,
  pagerGTPlotlySelected,
} from "./pager/pagerAGGrid";
import OpenSeadragon from "openseadragon";
import { drawDensityPlot } from "./density_plot";
import { runPager } from "./pager/pager";

var specificLayout,
  allSigmaLayout,
  tab1Layout,
  tab2Layout,
  tab1HeatMapData,
  tab2HeatMapdataa01,
  tab2HeatMapdataa02;
var heatMapdata, contourData;
var heatmapcopy, layoutcopy, tempheatmapcopy;
var longitude = [],
  latitude = [];
var customColorScale = [
  ["0.0", "rgb(255,0,0)"],
  ["0.4", "rgb(128,128,128)"],
  ["0.6", "rgb(128,128,128)"],
  ["1.0", "rgb(0,0,255)"],
];
var xold = 0;
var helperWidget = document.getElementById("helperWidget");
export async function drawSpecificPlot(hMdata, cData, layout) {
  heatMapdata = hMdata;
  contourData = cData;
  specificLayout = JSON.parse(JSON.stringify(layout));
  specificLayout["paper_bgcolor"] = "transparent";
  specificLayout["plot_bgcolor"] = "transparent";
  specificLayout["modebar"] = { bgcolor: "transparent", color: "black" };
  // specificLayout['title']={
  //     text:'<br>Plot Title',
  //     font: {
  //       size: 24,
  //       color: '#7f7f7f'
  //     },
  //     xref: 'paper',
  //   }

  // showing filter div
  document.getElementById("canvas-div01-textboxbutton").style.display = "block";
  Plotly.newPlot("canvas-div", heatMapdata, specificLayout, {
    scrollZoom: true,
  })
    .then((gd) => {
      heatMapdata[1]["visible"] = false;
      Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
        var img = document.getElementById("a1") as HTMLAnchorElement;
        img.href = url;
      });
      heatMapdata[1]["visible"] = "legendonly";
    })
    .then(() => {
      helperWidget.style.display = "block";
      document
        .getElementById("canvas-div01-textboxbutton")
        .scrollIntoView({ behavior: "smooth", block: "center" });
    });
  Plotly.newPlot("canvas-contour-div", contourData, specificLayout).then(
    (gd) => {
      Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
        var img = document.getElementById("a2") as HTMLAnchorElement;
        img.href = url;
      });
    }
  );
  // drawDensityPlot();
}

export async function drawAllSigmaPlot(hMdata, layout) {
  heatMapdata = hMdata;
  allSigmaLayout = JSON.parse(JSON.stringify(layout));
  allSigmaLayout["paper_bgcolor"] = "transparent";
  allSigmaLayout["plot_bgcolor"] = "transparent";
  allSigmaLayout["modebar"] = { bgcolor: "transparent", color: "black" };
  // allSigmaLayout['title']={
  //     text:'<br>',
  //     font: {
  //       size: 24,
  //       color: '#7f7f7f'
  //     },
  //     xref: 'paper',
  //   }
  Plotly.newPlot("canvas-div1", heatMapdata, allSigmaLayout)
    .then((gd) => {
      Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
        var img = document.getElementById("a3") as HTMLAnchorElement;
        img.href = url;
      });
    })
    .then(() => {
      helperWidget.style.display = "block";
      document
        .getElementById("canvas-div1")
        .scrollIntoView({ behavior: "smooth", block: "center" });
    });
}

export async function drawTab1Plot(hMdata, layout) {
  // tab1HeatMapData = JSON.parse(JSON.stringify(hMdata));
  tab1HeatMapData = hMdata;
  //console.log(tab1HeatMapData);
  //console.log(typeof(tab1HeatMapData))
  tab1HeatMapData[1]["visible"] = "true";
  tab1Layout = JSON.parse(JSON.stringify(layout));
  tab1Layout["dragmode"] = "lasso";
  tab1Layout["bgcolor"] = "transparent";
  Plotly.newPlot("canvas-div01", tab1HeatMapData, tab1Layout, {
    scrollZoom: true,
  })
    .then((gd) => {
      Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
        var img = document.getElementById("a2") as HTMLAnchorElement;
        img.href = url;
      });
    })
    .then(() => {
      helperWidget.style.display = "block";
      document
        .getElementById("canvas-div01")
        .scrollIntoView({ behavior: "smooth", block: "center" });
    });
}

export async function drawTab2Plot01(tab2HeatMapdata01, layout) {
  console.log("inside drawTab2Plot01");
  tab2HeatMapdata01[0]["selected"] = false;
  tab2HeatMapdata01[1]["visible"] = true;
  tab2HeatMapdata01[1]["opacity"] = 0;
  tab2Layout = JSON.parse(JSON.stringify(layout));
  tab2Layout["margin"] = {
    l: 50,
    r: 50,
    b: 50,
    t: 50,
    pad: 2,
  };
  tab2Layout["dragmode"] = "lasso";
  tab2Layout["bgcolor"] = "transparent";
  delete tab2Layout["width"];
  delete tab2Layout["height"];
  // tab2Layout['width']='100%'
  // tab2Layout['width']='30%'
  // tab2Layout['height']='50%'
  Plotly.newPlot("canvas-tab2-01", tab2HeatMapdata01, tab2Layout).then((gd) => {
    Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
      var img = document.getElementById("a1") as HTMLAnchorElement;
      var compareImage1 = document.getElementById(
        "compareImage1"
      ) as HTMLImageElement;
      img.href = url;
      compareImage1.src = url;
    });
  });
}
export async function drawTab2Plot02(
  tab2HeatMapdata02,
  layout,
  layoutDataX,
  layoutDataY
) {
  console.log("inside drawTab2Plot02");
  tab2HeatMapdata02[1]["visible"] = true;
  tab2HeatMapdata02[1]["opacity"] = 0;
  tab2Layout = JSON.parse(JSON.stringify(layout));
  tab2Layout["margin"] = {
    l: 50,
    r: 50,
    b: 50,
    t: 50,
    pad: 2,
  };
  tab2Layout["dragmode"] = "lasso";
  delete tab2Layout["width"];
  delete tab2Layout["height"];
  // tab2Layout['width']='100%'
  Plotly.newPlot("canvas-tab2-02", tab2HeatMapdata02, tab2Layout)
    .then((gd) => {
      Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
        var img = document.getElementById("a1") as HTMLAnchorElement;
        var compareImage2 = document.getElementById(
          "compareImage2"
        ) as HTMLImageElement;
        var imageCompContainer = document.getElementById(
          "img-comp-container-id"
        ) as HTMLDivElement;
        img.href = url;
        compareImage2.src = url;
        imageCompContainer.style.display = "block";
      });
    })
    .then(() => {
      helperWidget.style.display = "block";
      document
        .getElementById("canvas-tab2-02")
        .scrollIntoView({ behavior: "smooth", block: "center" });
    });
  // .then(()=>{
  //   do_plotly_selected()
  // });
  var heatmapcopy = tab2HeatMapdata02,
    layoutcopy = JSON.parse(JSON.stringify(tab2Layout));
  // var heatmapcopy=[{}];
  // var layoutcopy = {
  //   mapbox: {style:'white-bg',center: {lon: 60, lat: 30}, zoom: 2},
  //   coloraxis: {colorscale: "Viridis"},
  //   width: 600, height: 400, margin: {t: 30, b: 0},};

  // alert(tab2HeatMapdata02[0]['z'].flat().length)
  // heatmapcopy[0]['type']='densitymapbox'
  // heatmapcopy[0]['lon']=Array.from({length: tab2HeatMapdata02[0]['z'].length},(v, i) => i);
  // heatmapcopy[0]['lat']=Array.from({length: tab2HeatMapdata02[0]['z'][0].length},(v, i) => i);
  // heatmapcopy[0]['lon']=layoutDataX
  // heatmapcopy[0]['lat']=layoutDataY
  // heatmapcopy[0]['lon']=generateArray1()
  // heatmapcopy[0]['lat']=generateArray()
  // heatmapcopy[0]['z'] = tab2HeatMapdata02[0]['z'].flat();
  // heatmapcopy[0]['radius']=10
  // heatmapcopy[0]['coloraxis']='coloraxis'
  // heatmapcopy[0]['xaxis.range']=[Math.min(layoutDataX), Math.max(layoutDataX)]
  // heatmapcopy[0]['yaxis.range']=[Math.min(layoutDataY), Math.max(layoutDataY)]
  // heatmapcopy[0]['visible']='legendonly'
  // heatmapcopy[1]=tab2HeatMapdata02[1];
  // var config = {mapboxAccessToken: "pk.eyJ1IjoiaGFyaW1lcmxhIiwiYSI6ImNseDdqbDc4ZzA0MHYya3B6ZTl4NDB3aWsifQ.dw2_YkUfzxaeue1HD5gGVQ"};
  layoutcopy["dragmode"] = "pan";
  // layoutcopy['mapbox'] = {center: {lon: 60, lat: 30}, style: "outdoors", zoom: 2}
  // layoutcopy['coloraxis'] = "Viridis"
  Plotly.newPlot("canvas-tab2-01-copy", heatmapcopy, layoutcopy, {
    scrollZoom: true,
  });
  // Plotly.newPlot('canvas-tab2-01-copy', heatmapcopy, layoutcopy, config, {scrollZoom: true})
  var pagerGT = document.getElementById(
    "canvas-tab2-01-copy"
  ) as PlotlyHTMLElement;
  pagerGT.on("plotly_selected", () => {
    pagerGTPlotlySelected();
  });
  tempheatmapcopy = heatmapcopy;
  await runPager(["abc"]);
  document.getElementById("Generate-PD").style.display = "block";
}

var maskedGT = document.getElementById(
  "canvas-tab2-01-maskedGT"
) as PlotlyHTMLElement;
var data1;
export async function drawPathwayDetails(tab2HeatMapdata01, layout, data) {
  data1 = data;
  // console.log('inside drawTab2Plot01')
  tab2HeatMapdata01[0]["selected"] = false;
  tab2HeatMapdata01[1]["visible"] = true;
  tab2HeatMapdata01[1]["opacity"] = 0;
  tab2Layout = JSON.parse(JSON.stringify(layout));
  tab2Layout["margin"] = {
    l: 50,
    r: 50,
    b: 50,
    t: 50,
    pad: 2,
  };
  tab2Layout["dragmode"] = "lasso";
  delete tab2Layout["width"];
  delete tab2Layout["height"];
  (heatmapcopy = tab2HeatMapdata01), (layoutcopy = tab2Layout);
  heatmapcopy[1]["visible"] = true;
  heatmapcopy[0]["colorscale"] = customColorScale;
  heatmapcopy[1]["opacity"] = 1;
  // heatmapcopy[0]['showscale']=false
  heatmapcopy[1]["visible"] = false;
  layoutcopy["dragmode"] = "pan";
  // layoutcopy['width']=512
  // layoutcopy['height']=512
  console.log(heatmapcopy[0]["z"]);
  await Plotly.newPlot("canvas-tab2-01-maskedGT", heatmapcopy, layoutcopy, {
    scrollZoom: true,
  });
  // await Plotly.newPlot('canvas-tab2-01-maskedGT', heatmapcopy, layoutcopy, {scrollZoom: true}).then((gd)=>{Plotly.toImage(gd,{width:7680,height:7680}).then(async (url)=>{
  //   var img = document.getElementById('a4') as HTMLAnchorElement;
  //   img.href=url;
  //   // var viewer = await OpenSeadragon({
  //   //     id: "canvas-tab2-01-maskedGT1",
  //   //     prefixUrl: "openseadragon/images/",
  //   //     // tileSources: "openseadragon/sample.dzi"
  //   //     tileSources: {
  //   //         type: 'image',
  //   //         url:  url,
  //   //     }
  //   // });
  //   // document.getElementById('canvas-tab2-01-maskedGT1').style.display='block'
  // })});
  // alert('ready download')
  // await Plotly.downloadImage('canvas-tab2-01-maskedGT',{filename: 'image', format:'png',height:1000,width:1000})
  // await maskedGTGenerateClicked()
  console.log(maskedGT.attributes);
  (document.getElementById("density-x") as HTMLInputElement).innerText =
    heatmapcopy[1]["x"];
  (document.getElementById("density-y") as HTMLInputElement).innerText =
    heatmapcopy[1]["y"];
  (document.getElementById("density-genename") as HTMLInputElement).innerText =
    heatmapcopy[1]["text"];
  (
    document.getElementById("density-expression") as HTMLInputElement
  ).innerText = heatmapcopy[0]["z"];
  (document.getElementById("density-rpscore") as HTMLInputElement).innerText =
    heatmapcopy[1]["x"];
}

// maskedGT.addEventListener('mouseenter',()=>{
//   maskedGT.on('plotly_relayout',(eventData)=>{
//     console.log(eventData)
//     var {sigmaIndexMap, sigma, resolution, lastIternation } = newFunction();
//     if (xold-eventData['xaxis.range[0]']>0){
//       sigma-=0.2
//       // alert(sigma)
//     }
//     if(xold-eventData['xaxis.range[0]']<0){
//       sigma+=0.2
//       // alert(sigma)
//     }
//     xold=eventData['xaxis.range[0]']
//     // console.log(data1)
//     changeSigmaCustomDiv(data1,sigmaIndexMap,sigma,resolution,lastIternation)

//     var store = require('store');
//     store.set('sigma',sigma);

//     function newFunction() {
//       var store = require('store');
//       var sigmaIndexMap = store.get('sigmaIndexMap');
//       var resolution = store.get('resolution');
//       var sigma = store.get('sigma');
//       var lastIternation = store.get('lastIternation');
//       console.log(data1, sigmaIndexMap, sigma, resolution, lastIternation)
//       return {data1, sigmaIndexMap, sigma, resolution, lastIternation };
//     }
//   })
// })

var data: any;

export async function updateExpDataInPlot(
  tab2HeatMapdata01,
  tab2HeatMapdata02,
  tab2FinalData01,
  tab2FinalData02,
  tab2WeightsArrayMap01,
  tab2WeightsArrayMap02,
  tab2Exp01,
  tab2Exp02,
  selectionLen1,
  selectionLen2
) {
  // console.log('updateExpDataInPlot'+tab2FinalData01)
  // console.log('updateExpDataInPlot'+tab2FinalData01)
  console.log(tab2Exp01);
  console.log(tab2Exp02);
  tab2HeatMapdata01[1]["args"] = {
    z1: tab2FinalData01,
    z2: tab2FinalData02,
    expGeneMap1: tab2WeightsArrayMap01,
    expGeneMap2: tab2WeightsArrayMap02,
    exp1: tab2Exp01,
    exp2: tab2Exp02,
    selectionLen1: selectionLen1,
    selectionLen2: selectionLen2,
  };
  tab2HeatMapdata02[1]["args"] = {
    z1: tab2FinalData01,
    z2: tab2FinalData02,
    expGeneMap1: tab2WeightsArrayMap01,
    expGeneMap2: tab2WeightsArrayMap02,
    exp1: tab2Exp01,
    exp2: tab2Exp02,
    selectionLen1: selectionLen1,
    selectionLen2: selectionLen2,
  };
  var t1 = JSON.parse(JSON.stringify(tab2HeatMapdata01));
  var t2 = JSON.parse(JSON.stringify(tab2HeatMapdata02));
  // var t1 = tab2HeatMapdata01, t2 = tab2HeatMapdata02;
  var l1 = JSON.parse(JSON.stringify(tab2Layout));
  var l2 = JSON.parse(JSON.stringify(tab2Layout));
  Plotly.update("canvas-tab2-01", t1, l1, 1);
  Plotly.update("canvas-tab2-02", t2, l2, 1);
}
export function changeSigma(
  element,
  data,
  sigmaIndexMap,
  sigma,
  resolution,
  lastIternation
) {
  sigma = +element.value;
  if (sigma == 1) sigma = 0.95;
  console.log("changing sigma");
  var sliceIndeces = [
    resolution * resolution * sigmaIndexMap[sigma],
    resolution * resolution * sigmaIndexMap[sigma] + resolution * resolution,
  ];
  console.log("slice indeces: " + sliceIndeces);
  console.log("value: " + data.slice(sliceIndeces[0], sliceIndeces[0] + 5));
  var converted2DData = convert1DArrayTo2D(
    data.slice(sliceIndeces[0], sliceIndeces[1]),
    resolution,
    resolution
  );
  var finalData = rotate90DegreesCounterClockwise(converted2DData).reverse();
  if (
    (heatMapdata != null || heatMapdata != undefined) &&
    (contourData != null || contourData != undefined)
  ) {
    heatMapdata[0].z = finalData;
    contourData[0].z = finalData;
    Plotly.newPlot("canvas-div", heatMapdata, specificLayout).then((gd) => {
      Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
        var img = document.getElementById("a1") as HTMLAnchorElement;
        img.href = url;
      });
    });
    Plotly.newPlot("canvas-contour-div", contourData, specificLayout).then(
      (gd) => {
        Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
          var img = document.getElementById("a2") as HTMLAnchorElement;
          img.href = url;
        });
      }
    );
    Plotly.newPlot("canvas-div1", heatMapdata, allSigmaLayout).then((gd) => {
      Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
        var img = document.getElementById("a2") as HTMLAnchorElement;
        img.href = url;
      });
    });
    Plotly.newPlot("canvas-div01", tab1HeatMapData, tab1Layout).then((gd) => {
      Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
        var img = document.getElementById("a2") as HTMLAnchorElement;
        img.href = url;
      });
    });
  }
  if (heatmapcopy != undefined) {
    heatmapcopy[0].z = finalData;
    Plotly.newPlot("canvas-tab2-01-maskedGT", heatmapcopy, layoutcopy).then(
      (gd) => {
        Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
          var img = document.getElementById("a4") as HTMLAnchorElement;
          img.href = url;
        });
      }
    );
    Plotly.toImage("canvas-tab2-01-maskedGT", {
      name: "image",
      format: "png",
      height: 400,
      width: 400,
    });
  }
}

export var changeSigmaCustomDiv = async (
  data,
  sigmaIndexMap,
  sigma,
  resolution,
  lastIternation
) => {
  var sigmaDiv = document.getElementById("sigma_range") as HTMLInputElement;
  if (sigma >= 1) sigma = 0.95;
  if (sigma <= 0) sigma = 0;
  console.log("changing sigma");
  console.log(data1);
  console.log(resolution, sigmaIndexMap, sigma);
  var sliceIndeces = [
    resolution * resolution * sigmaIndexMap[sigma],
    resolution * resolution * sigmaIndexMap[sigma] + resolution * resolution,
  ];
  console.log("slice indeces: " + sliceIndeces);
  console.log("value: " + data.slice(sliceIndeces[0], sliceIndeces[0] + 5));
  var converted2DData = convert1DArrayTo2D(
    data.slice(sliceIndeces[0], sliceIndeces[1]),
    resolution,
    resolution
  );
  var finalData = rotate90DegreesCounterClockwise(converted2DData).reverse();
  if (heatmapcopy != undefined) {
    heatmapcopy[0].z = finalData;
    Plotly.newPlot("canvas-tab2-01-maskedGT", heatmapcopy, layoutcopy).then(
      (gd) => {
        Plotly.toImage(gd, { width: 768, height: 768 }).then((url) => {
          var img = document.getElementById("a4") as HTMLAnchorElement;
          img.href = url;
        });
      }
    );
    await Plotly.toImage("canvas-tab2-01-maskedGT", {
      name: "image",
      format: "png",
      height: 400,
      width: 400,
    });
  }
};

export async function purgeDivs() {
  Plotly.purge("canvas-div");
  Plotly.purge("canvas-contour-div");
  Plotly.purge("canvas-div1");
  Plotly.purge("canvas-div01");
  // Plotly.purge('canvas-tab2-01')
  // Plotly.purge('canvas-tab2-02')
}

export function convert1DArrayTo2D(float32Array, rows, columns) {
  if (rows * columns !== float32Array.length) {
    throw new Error("Dimensions do not match");
  }

  const result = [];
  let index = 0;

  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < columns; j++) {
      row.push(float32Array[index]);
      index++;
    }
    result.push(row);
  }

  return result;
}
export function rotate90DegreesCounterClockwise(array) {
  const rows = array.length;
  const cols = array[0].length;
  const rotatedArray = [];

  for (let col = cols - 1; col >= 0; col--) {
    const newRow = [];
    for (let row = 0; row < rows; row++) {
      latitude.push(col);
      longitude.push(row);
      newRow.push(array[row][col]);
    }
    rotatedArray.push(newRow);
  }
  return rotatedArray;
}

function generateArray() {
  const array = [];
  for (let i = 0; i < 256; i++) {
    array.push(...new Array(256).fill(i));
  }
  return array;
}

function generateArray1() {
  const array = [];
  const sequence = Array.from({ length: 256 }, (_, i) => i + 1); // Create array [1, 2, 3, ..., 256]
  for (let i = 0; i < 256; i++) {
    array.push(...sequence); // Append the sequence to the array 256 times
  }
  return array;
}
