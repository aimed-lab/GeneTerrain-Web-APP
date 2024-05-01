import {vec3,mat4} from 'gl-matrix'
import { CubeData } from './cubeData'
import {shaders} from './triangle'
import {CubeDataGene, ColormapData} from './gene_list'
import csv from 'csv-parser';
import * as fs from 'fs';
import * as pandas from "pandas";
import { DataFrame } from "pandas-js";
import {exportToHtml, getExpData,getExpData1, getAGPLOT, preProcessExpData} from './preProcessing'
//import * as csvtojson from 'csvtojson';
const csvtojson=require("csvtojson");
var Plotly = require('plotly.js/lib/core');
Plotly.register([
  require('plotly.js/lib/pie'),
  require('plotly.js/lib/choropleth'),
  require('plotly.js/lib/heatmap'),
  require('plotly.js/lib/scatter'),
  require('plotly.js/lib/contour'),
]);

module.exports = Plotly;

export function rotate90DegreesCounterClockwise(array) {
    const rows = array.length;
    const cols = array[0].length;
    const rotatedArray = [];
  
    for (let col = cols - 1; col >= 0; col--) {
      const newRow = [];
      for (let row = 0; row < rows; row++) {
        newRow.push(array[row][col]);
      }
      rotatedArray.push(newRow);
    }
  
    return rotatedArray;
  }
  export  function convert1DArrayTo2D(float32Array, rows, columns) {
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
  
  export function normalize(arr: Float32Array){
    var min = 256, max=-256;
    var temp = new Float32Array(arr.length)
    for(var i=0;i<arr.length;i++){
      if(min>arr[i])
        min=arr[i];
      if(max<arr[i])
        max=arr[i];
    }
    for(var i=0;i<arr.length;i++){
      //temp[i]=(arr[i]-min)/(max-min);
      temp[i]=arr[i]*255;
    }
    return temp;
  }
    

export function drawPlot(dataOnlyResult, x,y,expressionData,geneName,scaleMin,scaleMax,showGene){
    var converted2DData = convert1DArrayTo2D(dataOnlyResult,256,256);
    console.log('inside draw plot')
  // console.log('normalize: '+x);
  // console.log('normalize: '+y);
  //console.log('2d array'+convert1DArrayTo2D(dataOnlyResult,256,256))
  var heatMapdata = [{
    z: rotate90DegreesCounterClockwise(converted2DData).reverse(),
    //z: converted2DData,
    colorscale: 'Jet',
    type: 'heatmap',
    hoverinfo: 'none',
    zmin: scaleMin,
    zmax: scaleMax

  },{
    x: normalize(x),
    y: normalize(y),
    z: expressionData,
    mode: 'markers+text',
    type: 'scatter',
    text: geneName,
    colorscale: 'Jet',
    hoverinfo:true,
    visible: 'true',
    name: 'point'
  }]

  var contourData = [{
    z: rotate90DegreesCounterClockwise(converted2DData).reverse(),
    type: 'contour',
    colorscale: 'Jet',
    zmin: scaleMin,
    zmax: scaleMax
  },{
    x: normalize(x),
    y: normalize(y),
    z: expressionData,
    mode: 'markers+text',
    type: 'scatter',
    text: expressionData,
    colorscale: 'Jet',
    hoverinfo:true,
    visible: 'true',
    name: 'point'
  }]

  if(!showGene){
    heatMapdata[1].visible='legendonly';
    contourData[1].visible='legendonly';
  }
  else{
    heatMapdata[1].visible='true';
    contourData[1].visible='true';
  }

  var layout = {
    width:768,
    height:768,
  }
  Plotly.newPlot('canvas-div', heatMapdata, layout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
    var img = document.getElementById('a1') as HTMLAnchorElement;
    img.href=url;
  })});
  Plotly.newPlot('canvas-contour-div', contourData, layout).then((gd)=>{Plotly.toImage(gd,{width:768,height:768}).then((url)=>{
    var img = document.getElementById('a2') as HTMLAnchorElement;
    img.href=url;
  })});
}