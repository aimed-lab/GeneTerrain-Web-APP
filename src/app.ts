import {vec3,mat4} from 'gl-matrix'
import { CubeData } from './cubeData'
import {shaders} from './triangle'
import {CubeDataGene, ColormapData} from './gene_list'
import csv from 'csv-parser';
import * as fs from 'fs';
import * as pandas from "pandas";
import { DataFrame } from "pandas-js";
import {drawPlot} from './plot'
import {exportToHtml,getExpData1, getAGPLOT, preProcessExpData, getSelection,mergeLayoutExpData,getTab2Selection01,getTab2Selection02} from './preProcessing'
import {loadPlotData,loadLayoutData, loadExpData, getExp, getXandY, getGenes,loadGeneRelation,getGeneReationMapName,getExpGeneMap} from './rest'
import {drawSpecificPlot,drawAllSigmaPlot,drawTab1Plot,changeSigma,changeSigmaCustomDiv,rotate90DegreesCounterClockwise, purgeDivs,drawTab2Plot02,drawTab2Plot01,updateExpDataInPlot,drawPathwayDetails} from './plotlyCode'
import {callPagerAPI} from './pager/pager'
import {pagerAGGrid} from './pager/pagerAGGrid'
import {react_select_options_cancer_type, react_select_options_select_genes} from './selectOptions'
import {Chat} from './chat'
import {navbar} from './navbar'
import {extractBarPlot} from './plotly_events'
var store = require('store')
// import RangeSlider from '@spreadtheweb/multi-range-slider';
//import * as csvtojson from 'csvtojson';
const csvtojson=require("csvtojson");
// var Plotly = require('plotly.js/lib/core');
// import * as Plotly from "plotly.js";
// var Plotly = require('../dist/js/plotly-latest.min.js')
import * as Plotly from 'plotly.js-dist';
// var Plotly = require('plotly.js/lib/core');
// Plotly.register([
//   require('plotly.js/lib/pie'),
//   require('plotly.js/lib/choropleth'),
//   require('plotly.js/lib/heatmap'),
//   require('plotly.js/lib/scatter'),
//   require('plotly.js/lib/contour'),
//   require('plotly.js/lib/filter'),
//   require('plotly.js/lib/groupby'),
//   require('plotly.js/lib/bar'),
//   require('plotly.js/src/plot_api'),
// ]);

// module.exports = Plotly;
// import * as $ from '../dist/js/jquery-3.5.1.min.js';
import $ from '../dist/js/jquery-3.5.1.min.js';
import { send } from './medispacy';
import { PlotlyHTMLElement } from 'plotly.js';

function on<T extends HTMLElement, K extends keyof HTMLElementEventMap>(
  element: T,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void
) {
  element.addEventListener(event, handler);
}

var allsigsigdata;

export async function getAllSigData(){
  return allsigsigdata;
}
async function normalizeAllSigmas(data: Float32Array, resolution: number){
  var allSigNormData = [];
  for(var j=0;j<20;j++){
    var newData = data.slice(0,resolution*resolution);
    allSigNormData.push(convert1DArrayTo2D(newData, resolution, resolution))
  }
  return allSigNormData;
}

async function convertPromiseToFloat32Array(outcome) {
  try {
    const result = await outcome;
    if (result instanceof Float32Array) {
      return result;
    } else {
      throw new Error('Promise did not resolve to a Float32Array');
    }
  } catch (error) {
    console.error('Error converting promise to Float32Array:', error);
    return null;
  }
}




function getImageDataFromImage(image: HTMLImageElement): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context not supported.');
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);

  return imageData.data;
}


function imageBitmapToArray(imageBitmap: ImageBitmap): Promise<Uint8ClampedArray> {
  const canvas = document.createElement('canvas');
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported.');
  }

  ctx.drawImage(imageBitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);

  return Promise.resolve(imageData.data);
}


function blobToArray(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      resolve(uint8Array);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read blob as array.'));
    };

    reader.readAsArrayBuffer(blob);
  });
}

async function saveImageBitmapToPNG(imageBitmap: ImageBitmap, fileName: string) {
  const canvas = document.createElement('canvas');
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  const context = canvas.getContext('2d');
  context.drawImage(imageBitmap, 0, 0);

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        resolve();
      } else {
        reject(new Error('Failed to create blob.'));
      }
    }, 'image/png');
  });
}

function convertFloat32ArrayToHTMLImageElement(floatArray, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const imageData = new ImageData(Uint8ClampedArray.from(floatArray), width, height);
  //console.log('imagedata: '+imageData.data);
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  //console.log('canvas get data: '+canvas.getContext('2d').getImageData(0,0,width,height).data);

  const img = new Image();
  img.src = canvas.toDataURL();
  img.width=width;
  img.height=height;
  //console.log(img.src)

  return img;
}


function pixelsToCanvas(pixels, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  imgData.data.set(pixels);
  ctx.putImageData(imgData, 0, 1);

  // flip the image
  ctx.scale(1, -1);
  ctx.globalCompositeOperation = 'copy';
  ctx.drawImage(canvas, 0, -height, width, height);

  return canvas;
}

function convert1DArrayTo2D(float32Array, rows, columns) {
  if (rows * columns !== float32Array.length) {
    throw new Error('Dimensions do not match');
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

function normalize(arr: Float32Array){
  var min = resolution, max=-resolution;
  var temp = new Float32Array(arr.length)
  for(var i=0;i<arr.length;i++){
    if(min>arr[i])
      min=arr[i];
    if(max<arr[i])
      max=arr[i];
  }
  for(var i=0;i<arr.length;i++){
    //temp[i]=(arr[i]-min)/(max-min);
    temp[i]=arr[i]*resolution;
  }
  return temp;
}

async function main(expressionData: Float32Array, layoutDataX: Float32Array, layoutDataY: Float32Array, geneName: Float32Array, sigmaa=1, showGene: boolean, scaleMin: number, scaleMax: number, resolution: number, sampleSize: number, lastIternation:number, selectionLen:number, summedExp:Map<String, number>,weightsArrayMap:Map<String, any>) {
  // var adapter = await navigator.gpu.requestAdapter();
  var adapter;
  if (navigator.gpu) {
    adapter = await navigator.gpu.requestAdapter();
    // Rest of the code
 } else {
    console.error('WebGPU not supported in this environment.');
 }
 
  var device = await adapter.requestDevice();

  var canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  var context = canvas.getContext("webgpu");

  var depthTexture = device.createTexture({
    size: {width: canvas.width, height: canvas.height},
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });

  context.configure(
    {device: device, format: "bgra8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT});
  
    var sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
      mipmapFilter: 'nearest',
      maxAnisotropy: 1
    } as GPUSamplerDescriptor);
  var width=resolution, height=resolution;
  var imageee;
  
    // Load the default colormap and upload it
  var colormapImage = new Image();
  colormapImage.src = "/images/dog.webp";
  colormapImage.id = 'image';
  await colormapImage.decode();
  const imageBitmap = await createImageBitmap(colormapImage);
  var colorTexture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  
  var computeBindGroupLayouts = device.createBindGroupLayout({
    label: 'Compute Binding Group Layout',
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 3,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 4,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 5,
      visibility: GPUShaderStage.COMPUTE,
      texture: {}
    },{
      binding: 6,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 7,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 8,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    }]
  })

  var zeroimg = new Float32Array(resolution*resolution*4);
  var texBuff = device.createBuffer({
    label: 'textbuff buffer',
    size: zeroimg.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  // var dataValues = new Float32Array(resolution*resolution);
  var dataValues = data;
  console.log('just checking : '+data.length)
  var dataValuesBuff = device.createBuffer({
    label: 'data values only buffer',
    size: dataValues.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  var x = layoutDataX;
  var y = layoutDataY;
  var weight = expressionData;
  console.log('Checking lengths of x,y,weight');
  console.log(x.length+' '+x[0]);
  console.log(y.length+' '+y[0]);
  console.log(weight.length+' '+weight[0]);
  console.log(geneName[0])
  var sigmaMap = {0:0,0.05:10000, 0.1:9000,0.15:8500, 0.2:8000,0.25:7500,0.3:7000,0.35:6500,0.4:6000,0.45:5500, 0.5:5000,0.55:3500,0.6:2000,0.65:1500, 0.7:1000,0.75:750, 0.8:500,0.85:250, 0.9:100,0.95:75,1:50}
  var sigmaArray = new Float32Array([0,100000,10000,8500,8000,7500,7000,6500,6000,5500,5000,3500,2500,2000,1500,950,700,450,300,150,100]);
  var sigmaIndexMap = {0:0,0.05:1, 0.1:2,0.15:3, 0.2:4,0.25:5,0.3:6,0.35:7,0.4:8,0.45:9, 0.5:10,0.55:11,0.6:12,0.65:13, 0.7:14,0.75:15, 0.8:16,0.85:17, 0.9:18,0.95:19,1:20}
  // var params = new Float32Array([sigmaMap[sigmaa],scaleMin,scaleMax, sampleSize, lastIternation,resolution]);
  var params = new Float32Array([sigmaMap[sigmaa],scaleMin,scaleMax, sampleSize, lastIternation,resolution,selectionLen]);
  //var params = new Float32Array([sigmaa,scaleMin,scaleMax]);
  //sigma.fill([sigmaa,scaleMin,scaleMax],0,3);
  // var x = CubeDataGene().x;
  // var y = CubeDataGene().y;
  // var weight = CubeDataGene().weight;

  var xBuff = device.createBuffer({
    label: 'x buffer',
    size: x.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  var yBuff = device.createBuffer({
    label: 'y buffer',
    size: y.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  var weightBuff = device.createBuffer({
    label: 'textbuff buffer',
    size: weight.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  var resultBuff = device.createBuffer({
    label: 'result buffer',
    size: zeroimg.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  var dataOnlyResultBuff = device.createBuffer({
    label: 'result buffer',
    size: dataValues.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  var sigmaArrayBuff = device.createBuffer({
    label: 'sigmaArray buffer',
    size: sigmaArray.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  })

  var colormap = require('colormap');
  var color = colormap({
    colormap: 'jet',
    nshades: 200,
    format: 'rgba',
    alpha: 1
  });
  var flatColor = new Float32Array(color.flat());
  var colomapBuff = device.createBuffer({
    label: 'color map buffer',
    size: flatColor.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  })

  var paramsBuff = device.createBuffer({
    label: 'params buffer',
    size: params.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })

  device.queue.writeBuffer(texBuff, 0, zeroimg);
  device.queue.writeBuffer(xBuff,0,x);
  device.queue.writeBuffer(yBuff,0,y);
  device.queue.writeBuffer(weightBuff,0,weight);
  device.queue.writeBuffer(colomapBuff,0,flatColor);
  device.queue.writeBuffer(paramsBuff, 0, params);
  device.queue.writeBuffer(dataValuesBuff, 0, dataValues);
  device.queue.writeBuffer(sigmaArrayBuff, 0, sigmaArray);

  var computeUniformBindGroup = device.createBindGroup({
    label: 'Compute Binding Group',
    layout: computeBindGroupLayouts,
    entries: [{
      binding: 0,
      resource: {buffer: texBuff}
    },{
      binding: 1,
      resource: {buffer: xBuff}
    },{
      binding: 2,
      resource: {buffer: yBuff}
    },{
      binding: 3,
      resource: {buffer: weightBuff}
    },{
      binding: 4,
      resource: {buffer: colomapBuff}
    },{
      binding: 5,
      resource: colorTexture.createView(),
    },{
      binding: 6,
      resource: {buffer: paramsBuff}
    },{
      binding: 7,
      resource: {buffer: dataValuesBuff}
    },{
      binding: 8,
      resource: {buffer: sigmaArrayBuff}
    }]
  })
  
  var computePipeline = device.createComputePipeline({
    label: 'Compute Pipeline',
    layout: device.createPipelineLayout({bindGroupLayouts: [computeBindGroupLayouts]}),
    compute: {
      module: device.createShaderModule({code: shaders().compute}),
      entryPoint: 'main'
    }
  })

  var computePipelineNormalize = device.createComputePipeline({
    label: 'Compute Pipeline for Normalization',
    layout: device.createPipelineLayout({bindGroupLayouts: [computeBindGroupLayouts]}),
    compute: {
      module: device.createShaderModule({code: shaders().compute}),
      entryPoint: 'normalize'
    }
  }) 
  var renderPassDesc = {
    colorAttachments: [{    
        view: undefined,
        loadOp: "clear",
        clearValue: [0.5, 0.5, 0.5, 1],
        storeOp: "store"
    }],
    depthStencilAttachment: {
        view: depthTexture.createView(),
        depthLoadOp: "clear",
        depthClearValue: 1.0,
        depthStoreOp: "store",
        stencilLoadOp: "clear",
        stencilClearValue: 0,
        stencilStoreOp: "store"
    }
} as GPURenderPassDescriptor;


var animationFrame = function() {
  var resolve = null;
  var promise = new Promise(r => resolve = r);
  window.requestAnimationFrame(resolve);
  return promise
};
requestAnimationFrame(animationFrame);

var encoder = device.createCommandEncoder({
  label: 'doubling encoder',
});
var pass = encoder.beginComputePass({
  label: 'doubling compute pass',
});
pass.setPipeline(computePipeline);
pass.setBindGroup(0, computeUniformBindGroup);
pass.dispatchWorkgroups(width*height/16);

pass.end();
// console.log('height: '+height+" width+"+width+" image bytelength: "+zeroimg.byteLength)

encoder.copyBufferToBuffer(texBuff,0,resultBuff, 0, resultBuff.size);
encoder.copyBufferToBuffer(dataValuesBuff,0,dataOnlyResultBuff, 0, dataOnlyResultBuff.size);
//console.log('height: '+height+" width+"+width+" image bytelength: "+zeroimg.byteLength)
device.queue.submit([encoder.finish()]);


await resultBuff.mapAsync(GPUMapMode.READ);
await dataOnlyResultBuff.mapAsync(GPUMapMode.READ);
const result = new Float32Array(resultBuff.getMappedRange().slice(0,resultBuff.size));
const dataOnlyResult = new Float32Array(dataOnlyResultBuff.getMappedRange().slice(0,dataOnlyResultBuff.size));
console.log('data only result: '+dataOnlyResult.slice(0,5));
//console.log('reslut: '+result);
resultBuff.unmap();


// const file = new Blob([dataOnlyResult.toString()], {type: 'text/plain;charset=utf-8'});
// const url = URL.createObjectURL(file);
// const link = document.createElement('a');
// link.href = url;
// link.download = 'filename.txt';
// document.body.appendChild(link);
// link.click();
// console.log('output'+result[result.length-1]);
var min=10000.0, max=-100000.0;
//console.log(dataOnlyResult.slice(0,5))
for(var i=0;i<dataOnlyResult.length;i++){
  if(min>dataOnlyResult[i])
    min=dataOnlyResult[i];
  if(max<dataOnlyResult[i])
    max=dataOnlyResult[i];
}
console.log('min: '+min+' max: '+max);

while(true){
  ////console.log('lenght of the data: '+dataOnlyResult.length)
  ////console.log('dimenstions '+resolution*resolution*sigmaIndexMap[sigmaa]+" "+(resolution*resolution*sigmaIndexMap[sigmaa]+resolution*resolution))
  var sliceIndeces = [resolution*resolution*sigmaIndexMap[sigmaa],(resolution*resolution*sigmaIndexMap[sigmaa]+resolution*resolution)];
  ////console.log('sliceindecies: '+sliceIndeces)
  ////console.log('values: '+dataOnlyResult.slice(sliceIndeces[0],sliceIndeces[0]+5))
  var converted2DData = convert1DArrayTo2D(dataOnlyResult.slice(sliceIndeces[0],sliceIndeces[1]),resolution,resolution);
  ////console.log('inside draw plot')
  // console.log('normalize: '+x);
  // console.log('normalize: '+y);
  //console.log('2d array'+convert1DArrayTo2D(dataOnlyResult,resolution,resolution))
  var finalData = rotate90DegreesCounterClockwise(converted2DData).reverse();
  // const file = new Blob([finalData.toString()], {type: 'text/plain;charset=utf-8'});
  // const url = URL.createObjectURL(file);
  // const link = document.createElement('a');
  // link.href = url;
  // link.download = 'filename.txt';
  // document.body.appendChild(link);
  // link.click();
  // console.log('output'+result[result.length-1]);
  var layout = {
    width:768,
    height:768,
    showlegend: true,
    margin: {
      l: 70,
      r: 70,
      b: 70,
      t: 70,
      pad: 4
    },
    legend: {
      x: 0.8,
      // xanchor: 'right',
      y: 1.05,
      // bgcolor: 'E2E2E2'
      bgcolor: 'transparent'
    },
    font:{
      color:"black",
      size:12,
    },
  }
  if(lastIternation==1){
    heatMapdata = [{
      z: finalData,
      //z: finalData,
      colorscale: 'Jet',
      colorbar: {len:1,thickness:10},
      thickness: 1,
      type: 'heatmap',
      // text: finalData,
      hoverinfo: true,
      name: 'heatmap',
      zmin: scaleMin,
      zmax: scaleMax
    },{
      x: normalize(x),
      y: normalize(y),
      z: finalData,
      mode: 'markers+text',
      type: 'scatter',
      text: geneName,
      colorscale: 'Jet',
      hoverinfo:true,
      visible: 'legendonly',
      name: 'Gene Name',
      args: {z:finalData, exp:summedExp}}]
    contourData = [{
      z: finalData,
      type: 'contour',
      colorscale: 'Jet',
      colorbar: {len:1, thickness:10},
      // text: finalData,
      zmin: scaleMin,
      zmax: scaleMax
    },{
      x: normalize(x),
      y: normalize(y),
      // z: expressionData,
      mode: 'markers+text',
      type: 'scatter',
      text: geneName,
      colorscale: 'Jet',
      hoverinfo:true,
      visible: 'legendonly',
      name: 'Gene Name',}]
    drawSpecificPlot(heatMapdata, contourData, layout);
    drawAllSigmaPlot(heatMapdata, layout);
    drawTab1Plot(heatMapdata, layout)
    // sliceIndeces = [resolution*resolution*sigmaIndexMap[0.1],(resolution*resolution*sigmaIndexMap[0.1]+resolution*resolution)];
    // var stepsArray = []
    // // sliceIndeces = [resolution*resolution*sigmaIndexMap[0.1],(resolution*resolution*sigmaIndexMap[0.1]+resolution*resolution)];
    // for(var i=0;i<20;i++){
    //   var arr = [
    //     {
    //       label: i/2,
    //       method:'restyle',
    //       args: ['z', rotate90DegreesCounterClockwise(convert1DArrayTo2D(dataOnlyResult.slice(resolution*resolution*i,resolution*resolution*(i+1)),resolution,resolution)).reverse()]
    //     }
    //   ]
    //   stepsArray.push(arr);
    // }
    // console.log('stepsarray'+stepsArray)
    // console.log('converted array: '+rotate90DegreesCounterClockwise(convert1DArrayTo2D(dataOnlyResult.slice(resolution*resolution*0,resolution*resolution*0+resolution*resolution),resolution,resolution)).reverse().length)
    // layout['sliders']= [{
    //   currentvalue: {
    //     visible: true,
    //     xanchor: 'right',
    //     font: {size: 5, color: '#666'}
    //   },
    //   steps:
    //   [{
    //     label: 0,
    //     method:'restyle',
    //     // args: ['z', rotate90DegreesCounterClockwise(convert1DArrayTo2D(dataOnlyResult.slice(resolution*resolution*0,resolution*resolution*0+resolution*resolution),resolution,resolution)).reverse()]
    //     args: ['z',rotate90DegreesCounterClockwise(convert1DArrayTo2D(dataOnlyResult.slice(resolution*resolution*0,resolution*resolution*0+resolution*resolution),resolution,resolution)).reverse()]
    //   },
    //   {
    //     label: 1,
    //     method:'restyle',
    //     // args: ['z', rotate90DegreesCounterClockwise(convert1DArrayTo2D(dataOnlyResult.slice(resolution*resolution*1,resolution*resolution*(1)+resolution*resolution),resolution,resolution)).reverse()]
    //     args: ['z',rotate90DegreesCounterClockwise(convert1DArrayTo2D(dataOnlyResult.slice(resolution*resolution*1,resolution*resolution*(1)+resolution*resolution),resolution,resolution)).reverse()]
    //   }]
    // }]
    // console.log(layout)
    data=dataOnlyResult;
  }
  else if(lastIternation==21){
    tab2FinalData01=finalData;
    tab2Exp01=summedExp;
    selectionLen1=selectionLen;
    tab2WeightsArrayMap01 = store.get('expGeneMap');
    tab2HeatMapdata01 = [{
      z: finalData,
      //z: finalData,
      colorscale: 'Jet',
      colorbar: {len:1,thickness:10},
      thickness: 1,
      type: 'heatmap',
      // text: finalData,
      hoverinfo: true,
      name: 'heatmap',
      zmin: scaleMin,
      zmax: scaleMax
    },{
      x: normalize(x),
      y: normalize(y),
      z: finalData,
      mode: 'markers+text',
      type: 'scatter',
      text: geneName,
      colorscale: 'Jet',
      hoverinfo:true,
      visible: 'legendonly',
      name: 'Gene Name',
      args: {z:finalData, exp:summedExp}}]
    drawTab2Plot01(tab2HeatMapdata01,layout);
    // tab2HeatMapdata01=dataOnlyResult;
  }
  else if(lastIternation==22){
    tab2FinalData02=finalData;
    tab2Exp02=summedExp;
    selectionLen2=selectionLen
    tab2WeightsArrayMap02 = store.get('expGeneMap');
    tab2HeatMapdata02 = [{
      z: finalData,
      //z: finalData,
      colorscale: 'Jet',
      colorbar: {len:1,thickness:10},
      thickness: 1,
      type: 'heatmap',
      // text: finalData,
      hoverinfo: true,
      name: 'heatmap',
      zmin: scaleMin,
      zmax: scaleMax
    },{
      x: normalize(x),
      y: normalize(y),
      z: finalData,
      mode: 'markers+text',
      type: 'scatter',
      text: geneName,
      colorscale: 'Jet',
      hoverinfo:true,
      visible: 'legendonly',
      name: 'Gene Name',
      args: {z:finalData, exp:summedExp}}]
    drawTab2Plot02(tab2HeatMapdata02,layout);
    // tab2HeatMapdata02=dataOnlyResult;
    updateExpDataInPlot(tab2HeatMapdata01,tab2HeatMapdata02,tab2FinalData01,tab2FinalData02,tab2WeightsArrayMap01,tab2WeightsArrayMap02,tab2Exp01,tab2Exp02,selectionLen1,selectionLen2);
  }
  else if(lastIternation==42){
    tab2FinalData01=finalData;
    tab2Exp01=summedExp;
    selectionLen1=selectionLen;
    tab2WeightsArrayMap01 = store.get('expGeneMap');
    tab2HeatMapdata01 = [{
      z: finalData,
      //z: finalData,
      colorscale: 'Jet',
      colorbar: {len:1,thickness:10},
      thickness: 1,
      type: 'heatmap',
      // text: finalData,
      hoverinfo: true,
      name: 'heatmap',
      zmin: scaleMin,
      zmax: scaleMax
    },{
      x: normalize(x),
      y: normalize(y),
      z: finalData,
      mode: 'markers+text',
      type: 'scatter',
      text: geneName,
      colorscale: 'Jet',
      hoverinfo:true,
      visible: 'legendonly',
      name: 'Gene Name',
      args: {z:finalData, exp:summedExp}}]
    drawPathwayDetails(tab2HeatMapdata01,layout,dataOnlyResult);
  }
  data=dataOnlyResult;
  //device.queue.submit([commandEncoder.finish()]);
  break;
}
return dataOnlyResult;
};

// var selection:string[]=[];
// var chooseCancer = document.getElementById('patient');
// chooseCancer.addEventListener('click',()=>{
//   async function asyncFunc(){
//     await loadPlotData();
//     await loadExpData();
//     await loadLayoutData();
//     getAGPLOT(selection);
//   }
//   asyncFunc()
// });
var contourData, heatMapdata, tab2HeatMapdata01,tab2HeatMapdata02, tab2FinalData01,tab2FinalData02;;
var tab2WeightsArrayMap01, tab2WeightsArrayMap02, tab2Exp01, tab2Exp02;
var resolution=256, selectionLen=0, selectionLen1=0, selectionLen2=0, selectedDataset="TCGA";
var data=new Float32Array(resolution*resolution*20);
var tab2data01=new Float32Array(resolution*resolution*20);
var tab2data02=new Float32Array(resolution*resolution*20);
var generateTab2 = document.getElementById('Generate-Tab2');
async function asyncFunc(){
  await loadPlotData();
  await loadLayoutData();
  loadGeneRelation();
  console.log('async function completed')
}
console.log('before');
asyncFunc().then(()=>{
// sleep(3000).then(()=>{
  console.log('after timer');
console.log('after');

// setting values for select gene section box
var geneNames = getGenes();
var selectGeneDiv = document.getElementById('selectGene') as HTMLSelectElement;
var options = []
for(var i=0;i<geneNames.length;i++){
  // console.log('option no: '+i+" name: "+geneNames[i]);
  var option = document.createElement('option');
  option.value = geneNames[i];
  option.text = geneNames[i];
  options.push({value: geneNames[i], label:geneNames[i]})
  // selectGeneDiv.appendChild(option);
}
react_select_options_select_genes(options);


var expression = document.getElementById('expression') as HTMLInputElement;
var layout = document.getElementById('layout') as HTMLInputElement;
var expData, expressionData, layoutDataX, layoutDataY, geneName, layoutDataName,layoutData,flag=0,params={},summedExp=new Map<String,number>();
var a,b,weightsArrayMap;
var layoutDataMap = new Map<string, any>();
var f=false;
var storePlotlyDiv = document.getElementById("store-plotly-div") as HTMLInputElement;
expression.addEventListener('change', ()=>{
  sleep(2000);
  var file = expression.files[0];
  var reader = new FileReader();
  var name = file.name;
  console.log('Inside expression addeventlistener');
  reader.onload = function(e){
    var data = e.target.result;
    csvtojson({noheader:true}).fromString(data).then((jsonObjectArray) => {
      console.log(typeof(jsonObjectArray));
      expData = jsonObjectArray;
    })
    .catch((error) => {
      console.error(error);
    });
    // var lines = data.toString().split('\n');
    // for(var i=0;i<lines.length;i++){
    //   var row = lines[i].split('\t');
    //   console.log('flaffffff: '+flag);
    //   if(layoutDataMap.has(row[0])){
    //     var temp = layoutDataMap.get(row[0]);
    //     layoutDataMap.set(row[0], [temp[0],temp[1],temp[2],+row[1]]);
    //   }
    //   else{
    //     layoutDataMap.set(row[0], [row[1]]);
    //   }
    // }
  }
  reader.readAsText(file);
  console.log('flag'+flag);
  flag++;
  f=true;
})

layout.addEventListener('change', ()=>{
  sleep(2000);
  var file = layout.files[0];
  var reader = new FileReader();
  var name = file.name;
  console.log('Inside Layout addeventlistener');
  reader.onload = function(e){
    var data = e.target.result;
    var output;
    csvtojson({noheader:true}).fromString(data).then((jsonObjectArray) => {
      //console.log(jsonObjectArray);
      // console.log(Object.keys(jsonObjectArray));
      layoutData = jsonObjectArray;
      console.log(layoutData[0]);
    })
    .catch((error) => {
      console.error(error);
    });
    // var lines = data.toString().split('\n');
    // layoutDataName = new Float32Array(lines.length);
    // for(var i=0;i<lines.length;i++){
    //   var row = lines[i].split('\t');
    //   if(layoutDataMap.has(row[0])){
    //     var expVal=layoutDataMap.get(row[0])[0];
    //     layoutDataMap.set(row[0], [row[0],+row[1],+row[2],expVal]);
    //   } else{
    //     layoutDataMap.set(row[0], [row[0],+row[1],+row[2]]);
    //   }
    // }
  }
  reader.readAsText(file);
  console.log('layoutmap'+layoutData);
  flag++;
})

var selection:string[]=[];
getAGPLOT(selection)
var selectDiv = document.getElementById('patient') as HTMLSelectElement;
selectDiv.addEventListener('change', ()=>{
  console.log(selectDiv.value);
  selectedDataset = selectDiv.value;
})

var xIndex=0,yIndex=0,nameIndex=0,expIndex=0;
// function checkFlag() {
//   if(flag != 2) {
//     console.log('flag'+flag);
//     window.setTimeout(checkFlag, 2000); /* this checks the flag every 100 milliseconds*/
//   } else {
//     /* do something*/
//     // var len=0;
//     // for(var key of layoutDataMap.keys()){
//     //   if(layoutDataMap.get(key).length!=4)
//     //     continue;
//     //   len++;
//     // }
//     // geneName = new Array(len);
//     // layoutDataX = new Float32Array(len);
//     // layoutDataY = new Float32Array(len);
//     // expressionData = new Float32Array(len);
//     // for(var key of layoutDataMap.keys()){
//     //   var row = layoutDataMap.get(key);
//     //   console.log('row: '+row);
//     //   if(row.length!=4)
//     //     continue;
//     //   geneName[nameIndex++]=row[0];
//     //   layoutDataX[xIndex++]=row[1];
//     //   layoutDataY[yIndex++]=row[2];
//     //   expressionData[expIndex++]=row[3];
//     // }
//     //console.log('layoutDataMap'+layoutDataX);
//   }
// }

var plotLayout = {
  width:768,
  height:768,
  showlegend: true,
    legend: {
      x: 0.8,
      // xanchor: 'right',
      y: 1.05,
      // bgcolor: 'E2E2E2'
      bgcolor: 'transparent'
    },
    font:{
      color:"black",
      size:12,
    }
}
var sigmaInput = document.getElementById('sigma_range') as HTMLInputElement;
var sigma=0.5;
var sigmaIndexMap = {0:0,0.05:1, 0.1:2,0.15:3, 0.2:4,0.25:5,0.3:6,0.35:7,0.4:8,0.45:9, 0.5:10,0.55:11,0.6:12,0.65:13, 0.7:14,0.75:15, 0.8:16,0.85:17, 0.9:18,0.95:19,1:20}
console.log(sigmaIndexMap)
store.set('sigma',sigma)
store.set('sigmaIndexMap',sigmaIndexMap)
store.set('resolution',resolution)
sigmaInput.addEventListener('change', ()=>{
  // callPagerAPI()
  changeSigma(sigmaInput,data,sigmaIndexMap,sigma,resolution,lastIternation)
})

// var maskedGT = document.getElementById("canvas-tab2-01-maskedGT") as PlotlyHTMLElement;
// maskedGT.on('plotly_click',(eventData)=>{
//   alert('Zoom event')
//   changeSigmaCustomDiv(sigmaInput,data,sigmaIndexMap,sigma,resolution,lastIternation)
// })

// var slider = document.getElementById('range-slider-example');
var slider = document.getElementById('parentScale');
// slider.addEventListener('change',()=>{
//   console.log(slider);
// })
var scaleInputMin = document.getElementById('minText') as HTMLInputElement;
var scaleInputMax = document.getElementById('maxText') as HTMLInputElement;
var scaleMin=-3, scaleMax=3;
scaleInputMin.addEventListener('change',()=>{
  console.log('scaleInputMin');
});
scaleInputMax.addEventListener('change',()=>{
  console.log('scaleInputMax');
});
slider.addEventListener('click', ()=>{
  scaleMin=+scaleInputMin.value;
  // scaleMin=21;
  console.log(scaleMin);
  params['scaleMin']=scaleMin;
  scaleMax=+scaleInputMax.value;
  console.log(scaleMax);
  params['scaleMax']=scaleMax;
  if((heatMapdata!=null || heatMapdata!=undefined) && (contourData!=null || contourData!=undefined)){
    heatMapdata[0].zmin=scaleMin;
    contourData[0].zmin=scaleMin;
    heatMapdata[0].zmax=scaleMax;
    contourData[0].zmax=scaleMax;
    Plotly.newPlot('canvas-div', heatMapdata, plotLayout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
      var img = document.getElementById('a1') as HTMLAnchorElement;
      img.href=url;
    })});
    Plotly.newPlot('canvas-contour-div', contourData, plotLayout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
      var img = document.getElementById('a2') as HTMLAnchorElement;
      img.href=url;
    })});
    Plotly.newPlot('canvas-div1', heatMapdata, plotLayout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
      var img = document.getElementById('a2') as HTMLAnchorElement;
      img.href=url;
    })});
    Plotly.newPlot('canvas-div01', heatMapdata, plotLayout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
      var img = document.getElementById('a2') as HTMLAnchorElement;
      img.href=url;
    })});
  }
  // Plotly.restyle('canvas-tab2-01-copy', {zmin:scaleMin, zmax:scaleMax}, [0]);
  Plotly.restyle('canvas-tab2-01-maskedGT', {zmin:scaleMin, zmax:scaleMax}, [0]);
})
// scaleInputMax.addEventListener('change',()=>{
//   scaleMax=+scaleInputMax.value;
//   console.log(scaleMin);
//   params['scaleMax']=scaleMax;
//   if((heatMapdata!=null || heatMapdata!=undefined) && (contourData!=null || contourData!=undefined)){
//     heatMapdata[0].zmax=scaleMax;
//     contourData[0].zmax=scaleMax;
//     Plotly.deleteTraces('canvas-div');
//     Plotly.deleteTraces('canvas-contour-div');
//     Plotly.newPlot('canvas-div', heatMapdata, layout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
//       var img = document.getElementById('a1') as HTMLAnchorElement;
//       img.href=url;
//     })});
//     Plotly.newPlot('canvas-contour-div', contourData, layout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
//       var img = document.getElementById('a2') as HTMLAnchorElement;
//       img.href=url;
//     })});
//   }
// })

var resoluDiv = document.getElementById('pixel') as HTMLInputElement;
resoluDiv.addEventListener('change', ()=>{
  resolution=+resoluDiv.value;
  params['resolution']=+resoluDiv.value;
});

var showGeneInput = document.getElementById('show gene') as HTMLInputElement;
var showGene=false;
showGeneInput.addEventListener('click', ()=>{
  showGene=showGeneInput.checked;
  params['showGene']=showGene;
  if(heatMapdata!=undefined && contourData!=undefined){
    if(!showGene){
      heatMapdata[1].visible='legendonly';
      contourData[1].visible='legendonly';
    }
    else{
      heatMapdata[1].visible='true';
      contourData[1].visible='true';
    }
    Plotly.newPlot('canvas-div', heatMapdata, plotLayout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
      var img = document.getElementById('a1') as HTMLAnchorElement;
      img.href=url;
    })});
    Plotly.newPlot('canvas-contour-div', contourData, plotLayout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
      var img = document.getElementById('a2') as HTMLAnchorElement;
      img.href=url;
    })});
    Plotly.newPlot('canvas-div1', heatMapdata, plotLayout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
      var img = document.getElementById('a2') as HTMLAnchorElement;
      img.href=url;
    })});
    Plotly.newPlot('canvas-div01', heatMapdata, plotLayout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
      var img = document.getElementById('a2') as HTMLAnchorElement;
      img.href=url;
    })});
  }
})

var image;
var downloadDiv1 = document.getElementById('download-image1') as HTMLInputElement;
downloadDiv1.addEventListener('click',()=>{
  var img = document.getElementById("a1") as HTMLAnchorElement;
  exportToHtml(img);
})

var downloadDiv2 = document.getElementById('download-image2') as HTMLInputElement;
downloadDiv2.addEventListener('click',()=>{
  var img = document.getElementById("a2") as HTMLAnchorElement;
  exportToHtml(img);
})

// Tabs
// var navGT = document.getElementById('nav-GT-tab') as HTMLButtonElement;
// var navSigma = document.getElementById('nav-Sigma-tab') as HTMLButtonElement;
// var navAvg = document.getElementById('nav-Avg-tab') as HTMLButtonElement;
// var navTab2 = document.getElementById('nav-tab2-tab') as HTMLButtonElement;
// var navNetwork = document.getElementById('nav-network-tab') as HTMLButtonElement;
// var navPathway = document.getElementById('nav-pathway-tab') as HTMLButtonElement;
// var navCompBeforeAfter = document.getElementById('nav-comp-before-after-tab') as HTMLButtonElement;
// var navAPI = document.getElementById('nav-api-tab') as HTMLButtonElement;
// var navContentGTDiv = document.getElementById('nav-GT') as HTMLButtonElement;
// var navContentSigmaDiv = document.getElementById('nav-Sigma') as HTMLButtonElement;
// var navContentAvgDiv = document.getElementById('nav-Avg') as HTMLButtonElement;
// var navContentTab2Div = document.getElementById('nav-tab2') as HTMLButtonElement;
// var navContentNetworkDiv = document.getElementById('nav-network') as HTMLButtonElement;
// var navContentPathWayDiv = document.getElementById('nav-pathway') as HTMLButtonElement;
// var navContentCompBeforeAfterDiv = document.getElementById('nav-comp-before-after') as HTMLButtonElement;
// var navContentAPIDiv = document.getElementById("nav-api") as HTMLButtonElement;
// navGT.addEventListener('click',()=>{
//   navGT.className='nav-item active'
//   navSigma.className='nav-item'
//   navAvg.className='nav-item'
//   navTab2.className='nav-item'
//   navNetwork.className='nav-item'
//   navPathway.className='nav-item'
//   navCompBeforeAfter.className='nav-item'
//   navGT.ariaSelected='true'
//   navSigma.ariaSelected='false'
//   navAvg.ariaSelected='false'
//   navTab2.ariaSelected='false'
//   navNetwork.ariaSelected='false'
//   navPathway.ariaSelected='false'
//   navCompBeforeAfter.ariaSelected='false'
//   navContentGTDiv.className='tab-pane fade show active'
//   navContentSigmaDiv.className='tab-pane fade'
//   navContentAvgDiv.className='tab-pane fade'
//   navContentTab2Div.className='tab-pane fade'
//   navContentNetworkDiv.className='tab-pane fade'
//   navContentPathWayDiv.className='tab-pane fade'
//   navContentCompBeforeAfterDiv.className='tab-pane fade'
//   navAPI.className='nav-item'
//   navAPI.ariaSelected='false'
//   navContentAPIDiv.className='tab-pane fade'
// })
// navSigma.addEventListener('click',()=>{
//   navSigma.className='nav-item active'
//   navGT.className='nav-item'
//   navAvg.className='nav-item'
//   navTab2.className='nav-item'
//   navNetwork.className='nav-item'
//   navSigma.ariaSelected='true'
//   navGT.ariaSelected='false'
//   navAvg.ariaSelected='false'
//   navTab2.ariaSelected='false'
//   navNetwork.ariaSelected='false'
//   navContentSigmaDiv.className='tab-pane fade show active'
//   navContentGTDiv.className='tab-pane fade'
//   navContentAvgDiv.className='tab-pane fade'
//   navContentTab2Div.className='tab-pane fade'
//   navContentNetworkDiv.className='tab-pane fade'
//   navPathway.className='nav-item'
//   navPathway.ariaSelected='false'
//   navContentPathWayDiv.className='tab-pane fade'
//   navCompBeforeAfter.className='nav-item'
//   navCompBeforeAfter.ariaSelected='false'
//   navContentCompBeforeAfterDiv.className='tab-pane fade'
//   navAPI.className='nav-item'
//   navAPI.ariaSelected='false'
//   navContentAPIDiv.className='tab-pane fade'
// })
// navAvg.addEventListener('click',()=>{
//   navAvg.className='nav-item active'
//   navSigma.className='nav-item'
//   navGT.className='nav-item'
//   navTab2.className='nav-item'
//   navNetwork.className='nav-item'
//   navAvg.ariaSelected='true'
//   navSigma.ariaSelected='false'
//   navGT.ariaSelected='false'
//   navTab2.ariaSelected='false'
//   navNetwork.ariaSelected='false'
//   navContentAvgDiv.className='tab-pane fade show active'
//   navContentSigmaDiv.className='tab-pane fade'
//   navContentGTDiv.className='tab-pane fade'
//   navContentTab2Div.className='tab-pane fade'
//   navContentNetworkDiv.className='tab-pane fade'
//   navPathway.className='nav-item'
//   navPathway.ariaSelected='false'
//   navContentPathWayDiv.className='tab-pane fade'
//   navCompBeforeAfter.className='nav-item'
//   navCompBeforeAfter.ariaSelected='false'
//   navContentCompBeforeAfterDiv.className='tab-pane fade'
//   navAPI.className='nav-item'
//   navAPI.ariaSelected='false'
//   navContentAPIDiv.className='tab-pane fade'
// })
// navTab2.addEventListener('click',()=>{
//   navTab2.className='nav-item active'
//   navSigma.className='nav-item'
//   navGT.className='nav-item'
//   navAvg.className='nav-item'
//   navNetwork.className='nav-item'
//   navTab2.ariaSelected='true'
//   navSigma.ariaSelected='false'
//   navGT.ariaSelected='false'
//   navAvg.ariaSelected='false'
//   navNetwork.ariaSelected='false'
//   navContentTab2Div.className='tab-pane fade show active'
//   navContentSigmaDiv.className='tab-pane fade'
//   navContentGTDiv.className='tab-pane fade'
//   navContentAvgDiv.className='tab-pane fade'
//   navContentNetworkDiv.className='tab-pane fade'
//   navPathway.className='nav-item'
//   navPathway.ariaSelected='false'
//   navContentPathWayDiv.className='tab-pane fade'
//   navCompBeforeAfter.className='nav-item'
//   navCompBeforeAfter.ariaSelected='false'
//   navContentCompBeforeAfterDiv.className='tab-pane fade'
//   navAPI.className='nav-item'
//   navAPI.ariaSelected='false'
//   navContentAPIDiv.className='tab-pane fade'
// })

// navPathway.addEventListener('click',()=>{
//   navTab2.className='nav-item'
//   navSigma.className='nav-item'
//   navGT.className='nav-item'
//   navAvg.className='nav-item'
//   navNetwork.className='nav-item'
//   navTab2.ariaSelected='false'
//   navSigma.ariaSelected='false'
//   navGT.ariaSelected='false'
//   navAvg.ariaSelected='false'
//   navNetwork.ariaSelected='false'
//   navContentTab2Div.className='tab-pane fade'
//   navContentSigmaDiv.className='tab-pane fade'
//   navContentGTDiv.className='tab-pane fade'
//   navContentAvgDiv.className='tab-pane fade'
//   navContentNetworkDiv.className='tab-pane fade'
//   navPathway.className='nav-item active'
//   navPathway.ariaSelected='true'
//   navContentPathWayDiv.className='tab-pane fade show active'
//   navCompBeforeAfter.className='nav-item'
//   navCompBeforeAfter.ariaSelected='false'
//   navContentCompBeforeAfterDiv.className='tab-pane fade'
//   navAPI.className='nav-item'
//   navAPI.ariaSelected='false'
//   navContentAPIDiv.className='tab-pane fade'
// })

// navNetwork.addEventListener('click',()=>{
//   navGT.className='nav-item'
//   navSigma.className='nav-item'
//   navAvg.className='nav-item'
//   navTab2.className='nav-item'
//   navNetwork.className='nav-item active'
//   navGT.ariaSelected='false'
//   navSigma.ariaSelected='false'
//   navAvg.ariaSelected='false'
//   navTab2.ariaSelected='false'
//   navNetwork.ariaSelected='true'
//   navContentGTDiv.className='tab-pane fade'
//   navContentSigmaDiv.className='tab-pane fade'
//   navContentAvgDiv.className='tab-pane fade'
//   navContentTab2Div.className='tab-pane fade'
//   navContentNetworkDiv.className='tab-pane fade show active'
//   navPathway.className='nav-item'
//   navPathway.ariaSelected='false'
//   navContentPathWayDiv.className='tab-pane fade'
//   navCompBeforeAfter.className='nav-item'
//   navCompBeforeAfter.ariaSelected='false'
//   navContentCompBeforeAfterDiv.className='tab-pane fade'
//   navAPI.className='nav-item'
//   navAPI.ariaSelected='false'
//   navContentAPIDiv.className='tab-pane fade'
// })

// navCompBeforeAfter.addEventListener('click',()=>{
//   navGT.className='nav-item'
//   navSigma.className='nav-item'
//   navAvg.className='nav-item'
//   navTab2.className='nav-item'
//   navNetwork.className='nav-item'
//   navGT.ariaSelected='false'
//   navSigma.ariaSelected='false'
//   navAvg.ariaSelected='false'
//   navTab2.ariaSelected='false'
//   navNetwork.ariaSelected='false'
//   navContentGTDiv.className='tab-pane fade'
//   navContentSigmaDiv.className='tab-pane fade'
//   navContentAvgDiv.className='tab-pane fade'
//   navContentTab2Div.className='tab-pane fade'
//   navContentNetworkDiv.className='tab-pane fade'
//   navPathway.className='nav-item'
//   navPathway.ariaSelected='false'
//   navContentPathWayDiv.className='tab-pane fade'
//   navCompBeforeAfter.className='nav-item active'
//   navCompBeforeAfter.ariaSelected='true'
//   navContentCompBeforeAfterDiv.className='tab-pane fade show active'
//   navAPI.className='nav-item'
//   navAPI.ariaSelected='false'
//   navContentAPIDiv.className='tab-pane fade'
// })

// navAPI.addEventListener('click',()=>{
//   navGT.className='nav-item'
//   navSigma.className='nav-item'
//   navAvg.className='nav-item'
//   navTab2.className='nav-item'
//   navNetwork.className='nav-item'
//   navGT.ariaSelected='false'
//   navSigma.ariaSelected='false'
//   navAvg.ariaSelected='false'
//   navTab2.ariaSelected='false'
//   navNetwork.ariaSelected='false'
//   navContentGTDiv.className='tab-pane fade'
//   navContentSigmaDiv.className='tab-pane fade'
//   navContentAvgDiv.className='tab-pane fade'
//   navContentTab2Div.className='tab-pane fade'
//   navContentNetworkDiv.className='tab-pane fade'
//   navPathway.className='nav-item'
//   navPathway.ariaSelected='false'
//   navContentPathWayDiv.className='tab-pane fade'
//   navCompBeforeAfter.className='nav-item'
//   navCompBeforeAfter.ariaSelected='false'
//   navContentCompBeforeAfterDiv.className='tab-pane fade'
//   navAPI.className='nav-item active'
//   navAPI.ariaSelected='true'
//   navContentAPIDiv.className='tab-pane fade show active'
// })

navbar();

var pathWayGrid = document.getElementById('gene-pathway-table');
pathWayGrid.addEventListener('change',()=>{
  // callPagerAPI();
})

var len=0;
var generate = document.getElementById('Generate');
var result=0, lastIternation=0;

graphDiv = document.getElementById('canvas-div') as HTMLDivElement;
// var selectionLayer = document.getElementsByTagName('selectionlayer');
// selectionLayer[0].addEventListener('click',()=>{
//   alert('clicked');
// })
$('#canvas-div').on('plotly_selected',(eventData)=>{
  alert('click done');
  console.log(eventData)
  extractBarPlot(graphDiv);
})
// console.log('hey')
// console.log(typeof(graphDiv))
// console.log('graphdiv methods: '+Object.keys(Plotly))

// graphDiv.addEventListener('plotly_click', (eventData)=> {
//   alert('you clicked it')
// })
//   var x = [];
//   var y = [];
  
//   var colors = [];
//   var color1Light = '#c2a5cf';
//   var color1 = '#7b3294';
//   var N = 1000;
//   for(var i = 0; i < N; i++) colors.push(color1Light);
  
//   var points = Plotly.getSelectedPoints(graphDiv);
//   console.log(points);
//   console.log('points selected');
//   // console.log(eventData.points)
  
//   // eventData.points.forEach(function(pt) {
//   //   x.push(pt.x);
//   //   y.push(pt.y);
//   //   colors[pt.pointNumber] = color1;
//   // });
  
//   // Plotly.restyle(graphDiv, {
//   //   x: [x, y],
//   //   xbins: {}
//   // }, [1, 2]);
  
//   // Plotly.restyle(graphDiv, 'marker.color', [colors], [0]);
// });
// var geneNames = getGenes();
// console.log('gene names: '+geneNames);
// var selectGeneDiv = document.getElementById('selectGene') as HTMLSelectElement;
// for(var i=0;i<geneNames.length;i++){
//   // console.log('option no: '+i+" name: "+geneNames[i]);
//   var option = document.createElement('option');
//   option.value = geneNames[i];
//   option.text = geneNames[i];
//   selectGeneDiv.appendChild(option);
// }
var scatterX=[], scatterY=[], scatterNames=[];
var geneRelatationTraceMap = new Map<string, any>(), traceIndex=2;
var graphDiv = document.getElementById('canvas-div');
//var selectGeneDiv = document.getElementById('selectGene') as HTMLSelectElement;
//console.log('selection :',document.getElementsByClassName('select__multi-value__label css-wsp0cs-MultiValueGeneric').item)
selectGeneDiv.addEventListener('change',()=>{
  var graphDiv = document.getElementById('canvas-div01');
  console.log('traces array: '+Array.from(Array(traceIndex).keys()).slice(2,traceIndex+1));
  Plotly.deleteTraces(graphDiv,Array.from(Array(traceIndex).keys()).slice(2,traceIndex+1))
  geneRelatationTraceMap = new Map<string, any>(), traceIndex=2;
  // console.log(Object.keys(selectGeneDiv.selectedOptions));
  // console.log(selectGeneDiv.selectedIndex);
  console.log('selected value: '+selectGeneDiv.value);
  var geneRelationNameMap = getGeneReationMapName();
  console.log(geneRelationNameMap);
  for(var i=0;i<selectGeneDiv.selectedOptions.length;i++){
    scatterX=[];
    scatterY=[];
    scatterNames=[];
    var optionText = selectGeneDiv.selectedOptions[i].innerText;
    console.log(optionText);
    console.log(optionText in geneRelationNameMap)
    if(!(optionText in geneRelationNameMap)){
      // selectGeneDiv.selectedOptions[i].selected=false;
      // alert('Gene is not in List')
      // traceIndex--;
      var trace = {x:scatterX,y:scatterY,type:'scatter', name:'Gene Relations',visible:'true',text:scatterNames,mode: 'lines+markers+text',legendgroup:'Gene Relation',showlegend:false};
      geneRelatationTraceMap[optionText] = [trace,traceIndex++]
      Plotly.addTraces(graphDiv, trace);
      continue;
    }
    for(var j=0;j<geneRelationNameMap[optionText].length;j++){ 
      var name = geneRelationNameMap[optionText][j];
      if(!(name in b))
        break;
      console.log(name, b[name]);
      scatterX.push((0.9*b[name][1]+0.05)*resolution);
      scatterY.push(resolution-(0.9*b[name][2]+0.05)*resolution);
      scatterNames.push(name);
    }
  var trace = {x:scatterX,y:scatterY,type:'scatter', name:'Gene Relations',visible:'true',text:scatterNames,mode: 'lines+markers+text',legendgroup:'Gene Relation',showlegend:false};
  geneRelatationTraceMap[optionText] = [trace,traceIndex++]
  console.log(scatterX);
  console.log(scatterY);
  console.log(scatterNames);
  // Plotly.deleteTraces(graphDiv, -1);
  Plotly.addTraces(graphDiv, trace);
  }
  // for(var i=0;i<selectGeneDiv.selectedOptions.length;i++){
  //   var firstOptionText = selectGeneDiv.selectedOptions[0].innerText;
  //   var optionText = selectGeneDiv.selectedOptions[i].innerText;
  //   scatterX.push((0.9*b[firstOptionText][1]+0.05)*resolution);
  //   scatterY.push(resolution-(0.9*b[firstOptionText][2]+0.05)*resolution);
  //   scatterNames.push(firstOptionText);
  //   scatterX.push((0.9*b[optionText][1]+0.05)*resolution);
  //   scatterY.push(resolution-(0.9*b[optionText][2]+0.05)*resolution);
  //   scatterNames.push(optionText);
  // }
})

function fetchDataForGivenSamples(...gensListArgs:any[]){
  console.log(gensListArgs);
  var argsFlag=gensListArgs[0]!=undefined
  for(var i=0;i<keys.length;i++){
    // console.log(argsFlag)
    if(argsFlag && !(gensListArgs[0].includes(keys[i])))
      continue
    var row = mergedMap[keys[i]];
    // if(gensListArgs[0].includes(row[0]))
    //   console.log(row[0])
    // if(argsFlag && !(gensListArgs[0].includes(row[0])))
    //   continue;
    geneName[nameIndex++]=row[0];
    layoutDataX[xIndex++]=0.9*row[1]+0.05;
    layoutDataY[yIndex++]=1-(0.9*row[2]+0.05);
    expressionData[expIndex++]=row[3];
    if(summedExp[row[0]]==undefined)
      summedExp[row[0]]=row[3]
    else
      summedExp[row[0]]+=row[3]
  }
}

a = getExp();
b = getXandY();
var keys,mergedMap;
// console.log('layout: '+b['cacng3']);
async function generateTexture(selection, ...genesList){
  purgeDivs()
  console.log('app.ts || generate');
  const startTime = new Date().getTime();
  data=new Float32Array(resolution*resolution*20);
  console.log(data.slice(0,10));
  console.log('start time: '+startTime);
  // selection = getSelection();
  selection = Array.from(new Set(selection));
  console.log('selection'+selection.length)
  // if(f==true)
  //   expData = preProcessExpData(expData)
    // alert(expData)
    // selection = ["IVYGAP_304950336"]
    var startTime1 = new Date().getTime();
    await loadExpData(selectedDataset,selection)
    selectionLen = selection.length;
    store.set('selectionLen',selectionLen);
    a = getExp();
    weightsArrayMap = getExpGeneMap();
    var count=0;
    // for (const select of selection) {
      console.log(count +" of "+selectionLen);
      count++;
      // console.log('data for each select : '+data.slice(0,10))
      console.log('select')
      // console.log(select);
      console.log(selection);
      mergedMap = mergeLayoutExpData(b,a,'sampleKey');
      var endTime1 = new Date().getTime();
        // lastIternation=1;
    // if(selection[selection.length-1]==select){
    //   console.log('selection: '+select);
    //   lastIternation=1;
    // }
    // console.log('select '+ select)
    //layoutDataMap = getExpData1(expData,layoutData,select);
    //console.log('size: '+layoutDataMap['SULT4A1'])
    // var tempGenes = [
    //   "CACNG3",
    //   "LOXL2",
    //   "IL18",
    //   "KCNC1",
    //   "FPR1",
    //   "POSTN",
    //   "EDNRA",
    //   "CAMK1D",]
    keys = Object.keys(mergedMap);
    len=keys.length;
    if(genesList.length!=0)
      len = genesList[0].length
      geneName = new Array(len);
      layoutDataX = new Float32Array(len);
      layoutDataY = new Float32Array(len);
      expressionData = new Float32Array(len);
      nameIndex=0,xIndex=0,yIndex=0,expIndex=0;
      summedExp=new Map<String,number>()
      fetchDataForGivenSamples(genesList[0]);
    var endTime2 = new Date().getTime();
    console.log('loading data and mergelayout function'+(endTime1-startTime1)+"\n after merge layout for loop: "+(endTime2-endTime1)+"Overall time: "+(endTime2-startTime1))
    console.log('x: '+layoutDataX.length+' y: '+layoutDataY.length+' exp: '+expressionData.length+' gene: '+geneName.length)
    console.log('layoutx: '+layoutDataX)
    console.log('layouty: '+layoutDataY)
    console.log('expression data: '+expressionData)
    console.log('gene name: '+geneName)
    // var outcome=await main(expressionData, layoutDataX, layoutDataY, geneName, sigma, showGene, scaleMin, scaleMax, resolution, selection.length, lastIternation, data, selectionLen, summedExp) as unknown as Float32Array;
    await main(expressionData, layoutDataX, layoutDataY, geneName, sigma, showGene, scaleMin, scaleMax, resolution, selection.length, lastIternation, selectionLen, summedExp, weightsArrayMap) as unknown as Float32Array;
    // await convertPromiseToFloat32Array(outcome).then((d)=>{
    //   data=d;
    //   console.log('final data: '+data[0]);
    // })
    ////console.log('final data: '+data.slice(0,20));
    downloadDiv1.style.display='block';
    downloadDiv2.style.display='block';
    f=false;
    lastIternation=0;
// }
const endTime = new Date().getTime();
console.log('end time: '+endTime)
console.log('Time taken: '+(endTime-startTime))
//alert(endTime-startTime);
console.log('heatmap data'+contourData)
var allsigsigdata = normalizeAllSigmas(data,resolution);
//drawPlot(data,layoutDataX,layoutDataY,expressionData,geneName,scaleMin,scaleMax,showGene)
};

generate.addEventListener('click',async ()=>{
  lastIternation=1
  selection = getSelection();
  var startTime = new Date().getTime();
  await generateTexture(selection);
  var endTime = new Date().getTime();
  // alert('Time taken to generate GeneTerrain: '+(endTime-startTime))
});

generateTab2.addEventListener('click',async()=>{
  lastIternation=21;
  store.set('lastIternation',lastIternation)
  selection=getTab2Selection01();
  console.log('1. '+selection)
  await generateTexture(selection);
  lastIternation=22;
  store.set('lastIternation',lastIternation)
  selection=getTab2Selection02();
  console.log('2. '+selection)
  await generateTexture(selection);
})

var generatePatwayDetails = document.getElementById("Generate-PD")
var genesDiv = document.getElementById("store-genes-input") as HTMLInputElement;
var genesByPagIdDiv = document.getElementById("store-genes-input-bypagid") as HTMLInputElement;
generatePatwayDetails.addEventListener('click',async()=>{
  alert('im here')
  lastIternation=42;
  store.set('lastIternation',lastIternation)
  selection=getTab2Selection01();
  var genesList = genesByPagIdDiv.innerText.split(',');
  console.log('1. '+selection)
  console.log('genes:  '+ genesList)
  await generateTexture(selection, genesList);
})

Chat();
})



react_select_options_cancer_type();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// callPagerAPI()
pagerAGGrid()
// send()