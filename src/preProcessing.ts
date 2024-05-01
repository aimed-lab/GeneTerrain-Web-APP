// import * as fs from 'fs';
const fs = require('fs');
const csvtojson=require("csvtojson");
//import('ag-grid-community')
import('ag-grid-enterprise')
// import { Grid } from 'ag-grid-community';
import { DomLayoutType, Grid, GridOptions } from 'ag-grid-community';
import { copyFileSync } from 'fs';
import {getPlotData,getGenes} from './rest'

var samples: string[] = []
var tab2Samples01: string[] = []
var tab2Samples02: string[] = []

function setSelection(selection){
  samples = selection;
}
function setTab2Selection01(selection){
  tab2Samples01 = selection;
}
function setTab2Selection02(selection){
  tab2Samples02 = selection;
}

export function getSelection(){
  return samples;
}
export function getTab2Selection01(){
  return tab2Samples01;
}
export function getTab2Selection02(){
  return tab2Samples02;
}

async function getPlotlyScript() {
    // fetch
    const plotlyRes = await fetch('https://cdn.plot.ly/plotly-latest.js')
    // get response as text
    return await plotlyRes.text() 
  } 

function getChartState (data, layout) {
    const el = document.getElementById('canvas-div')
    return {
      data: data, // current data
      layout: layout // current layout
    }
  }

  async function getHtml(anchor) {
  
    return `
        <head>
          <meta charset="utf-8" />
        </head>
        <img src=${anchor}></img>
    `
    // <div id="plotly-output"><img src=""></div>
  }

  export async function exportToHtml (anchor) {
    // Create URL
    const blob = new Blob([await getHtml(anchor)], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
  
    // Create downloader
    // const downloader = document.getElementById(id) as HTMLAnchorElement;
    const downloader = document.createElement('a')
    downloader.href = url
    downloader.download = 'export.html'
    console.log('a tag: '+url);
  
    // Trigger click
    downloader.click()

  
    // Clean up
    URL.revokeObjectURL(url)
  }
  
export function mergeLayoutExpData(layoutMap: Map<string,any>, expMap:Map<string,any>, select: string){
  var map = new Map<string,any>();
  console.log(layoutMap['cacng3'])
  var genes = getGenes();
  console.log('inside mergeLayout')
  console.log(layoutMap.size)
  console.log(genes)
  console.log(expMap)
  // expMap[select]=expMap['TCGA-02-0004-01'];
  for(var key of Object.keys(layoutMap)){
    if(key in expMap[select]){
      var row = layoutMap[key];
      if(row.length==4)
        row[3]=expMap[select][row[0]]
      else
        row.push(expMap[select][row[0]])
      map[row[0]]=row;
      // console.log(row);
    }
  }
  console.log(map);
  return map;
}
export function preProcessExpData(expData){
  var data=new Map<string, any>();
  var fields = Object.keys(expData[0])
  for(var i=0;i<expData.length;i++){
    data[expData[i][fields[0]]] = expData[i]
  }
  return data;
}

export function getExpData(expData, layoutData, selection){
  var expMap = new Map<string, any>();
  var colNames = expData[Object.keys(expData)[0]];
  console.log('colnames length '+colNames.size);
  var fields = Object.keys(expData[Object.keys(expData)[0]]);
  //var fields = Object.keys(expData);
  console.log('fields length'+fields.length)
  console.log(selection.length)
  for(var k=0;k<selection.length;k++){
    var row = expData[selection[k]];
    for(var i=1;i<fields.length;i++){
      // console.log('each row: '+expData[0][fields[i]])
      if(k!=0)
      console.log('row sdkvhbjkhfdbvdfhkjbvdf '+expMap[colNames[fields[i]]]+" "+row[fields[i]])
      if(k==0)
        expMap[colNames[fields[i]]]=+row[fields[i]];
      else if(k!=selection.length-1)
        expMap[colNames[fields[i]]]=expMap[colNames[fields[i]]]+(+row[fields[i]]);
      else
        expMap[colNames[fields[i]]]=(expMap[colNames[fields[i]]]+(+row[fields[i]]))/(k+1);
    }
  }
  // for(var k=0;k<selection.length;k++){
  //   for(var i=1;i<Object.keys(expData[0]).length;i++){
  //     // console.log('each row: '+expData[0][fields[i]])
  //     expMap[expData[0][fields[i]]]=expData[selection[k]+1][fields[i]];
  //   }
  // }
  console.log(Object.keys(expMap));
  console.log(expMap['SULT4A1']);
  console.log('SULT4A1' in expMap);
  var map=new Map<string,any>();
  fields = Object.keys(layoutData[0]);
  for(var i=1;i<Object.keys(layoutData).length;i++){
    //console.log(expMap.has('SULT4A1'));
    if((layoutData[i][fields[0]]) in expMap){
        var row=layoutData[i];
        //console.log(row[fields[0]])
        map[row[fields[0]]]=[row[fields[0]],+row[fields[1]],+row[fields[2]],expMap[row[fields[0]]]];
      }
    }
    return map;
}

export function getExpData1(expData, layoutData, select){
  var layoutMap=new Map<string,any>();
  var fields = Object.keys(layoutData[0]);
  for(var i=1;i<Object.keys(layoutData).length;i++){
    //console.log(expMap.has('SULT4A1'));
      var row=layoutData[i];
      //console.log(row[fields[0]])
      layoutMap[row[fields[0]]]=[row[fields[0]],+row[fields[1]],+row[fields[2]],0];
  }
  //console.log('layout map: '+Object.keys(layoutMap))
  // console.log('layout map: '+layoutMap['PALM'])
  var map = new Map<string, any>();
  // console.log('exp data'+expData);
  // console.log(Object.keys(expData));
  var colNames = expData[Object.keys(expData)[0]];
  // console.log(colNames)
  // console.log('colnames length '+Object.keys(colNames));
  var fields = Object.keys(expData[Object.keys(expData)[0]]);
  // console.log('fields length'+fields)
    var row = expData[select];
    for(var i=1;i<fields.length;i++){
      //console.log('row sdkvhbjkhfdbvdfhkjbvdf '+map[colNames[fields[i]]]+" "+row[fields[i]])
      if(colNames[fields[i]] in layoutMap)
        var row = layoutMap[colNames[fields[i]]]
        // console.log(colNames[fields[i]])
        // console.log('row'+row)
        row[3]=+expData[select][fields[i]]
        map[colNames[fields[i]]]=row;
  }
  return map
}

export function getData(map, index){

}

export async function getAGPLOT(selection: string[]){
  console.log('preProcessing.ts || getAGPLOT || start')
  // var path = './csv/clinical_Data_GBM.csv';
  // var data, fileContent;
  // var reader = new FileReader();
  // const response: Response = await fetch(path);
  // await response.text().then(d=>{
  //   // console.log('response '+d);
  //   fileContent=d;
  // })
  // await csvtojson({noheader:true}).fromString(fileContent).then((jsonObjectArray) => {
  //   data = jsonObjectArray;
  // })
  // .catch((error) => {
  //   console.error(error);
  // });
  // var rowData = data;
  // const columnDefs = [
  //   { field: 'id', hide: true,},
  //   { field: 'SampleID',checkboxSelection: true, filter: 'agSetColumnFilter'},
  //   { field: 'Overal_Survival_Days', filter:'agNumberColumnFilter'},
  //   { field: 'Overal_Survival_Status', filter:'agNumberColumnFilter'},
  //   { field: 'Subtype', filter: 'agSetColumnFilter'},
  //   { field: 'Age', filter:'agNumberColumnFilter'},
  //   { field: 'Type', filter:'agSetColumnFilter'},
  // ];
  const columnDefs = []
  // specify the data
  var rowData = []
  var rowSamples = await getPlotData();
  // console.log('row data: '+rowSamples);
  var column_names_set = new Set()
  var numerical_columns = ['age', 'overal_survival_days']
  var ignore_columns = ['dataset_id', 'disease_name']
  for(var row of rowSamples){
    column_names_set=new Set([...column_names_set, ...Object.keys(row)]);
    var type;
    if(row.sampleid.search('_')==-1)
      type=row.sampleid.split('-')[0]
    else
      type=row.sampleid.split('_')[0]
    var temp = row;
    temp['Type']=type
    rowData.push(temp)
    // rowData.push({id:row.id, SampleID:row.sampleid, Overal_Survival_Days:row.overal_survival_days, Overal_Survival_Status:row.overal_survival_status,Subtype:row.subtype, Age:row.age, Type:type})
  }
  for(var name of column_names_set){
    if(name=='sampleid')
      columnDefs.push({field:name,checkboxSelection: true, filter: 'agSetColumnFilter' })
    else if(name=='id' || name=='Id')
      columnDefs.push({field:name, hide:true,suppressFiltersToolPanel: true, })
    else if(numerical_columns.includes(name+'')){
      columnDefs.push({field:name, filter: 'agNumberColumnFilter' })
    }
    else if(ignore_columns.includes(name+'')){
      continue
    }
    else
      columnDefs.push({field:name, filter: 'agSetColumnFilter' })
  }
  // columnDefs.push({ field: 'id', hide: true})
  columnDefs.push({ field: 'Type', filter:'agSetColumnFilter'})
  // var rowData = []
  // var fields = Object.keys(data[0]);
  // for(var i=1;i<data.length;i++){
  //   var row = data[i];
  //   rowData.push({SampleID: data[i][fields[0]],
  //     Overal_Survival_Days: +data[i][fields[1]],
  //     Overal_Survival_Status: +data[i][fields[2]],
  //     GBM_Subtype: data[i][fields[3]],
  //     Age_at_GBM_Diagnosis: +data[i][fields[4]],
  //   })
  //   // rowData.push({SampleID: 1,
  //   //   Overal_Survival_Days: 2,
  //   //   Overal_Survival_Status: 3,
  //   //   GBM_Subtype: 4,
  //   //   Age_at_GBM_Diagnosis: 5,
  //   // })
  // }
  // let the grid know which columns and what data to use
  /** @type {import('ag-grid-community').GridOptions} */
  var gridDiv=document.querySelector("#myGrid") as HTMLElement;
  var tab2GridDiv1=document.querySelector("#myGridTab2-01") as HTMLElement;
  var tab2GridDiv2=document.querySelector("#myGridTab2-02") as HTMLElement;
  const gridOptions = {
    columnDefs: columnDefs,
    rowData: rowData,
    // defaultColDef: {
    //   flex: 1,
    //   minWidth: 100,
    //   filter: true,
    //   resizable: true,
    //   enableRowGroup: true,
    // },
    rowSelection: 'multiple',
    autoGroupColumnDef: {
      minWidth: 200,
      filter: 'agGroupColumnFilter',
    },
    animateRows: true,
    // sideBar: {id:'filters',hiddenByDefault:true},
    // sideBar: {
    //   toolPanels: [
    //       {
    //           id: 'columns',
    //           labelDefault: 'Columns',
    //           labelKey: 'columns',
    //           iconKey: 'columns',
    //           toolPanel: 'agColumnsToolPanel',
    //       },
    //       {
    //           id: 'filters',
    //           labelDefault: 'Filters',
    //           labelKey: 'filters',
    //           iconKey: 'filter',
    //           toolPanel: 'agFiltersToolPanel',
    //       }
    //   ],
    //   defaultToolPanel: 'columns',
    //   hiddenByDefault:true
    // },
    // sideBar: 'filters',
    sideBar: {
      toolPanels: [
        {
          id: 'filters',
          labelDefault: 'Filters',
          labelKey: 'filters',
          iconKey: 'filter',
          toolPanel: 'agFiltersToolPanel',
          toolPanelParams: {
            suppressExpandAll: true,
            suppressFilterSearch: true,
          },
        },
      ],
    },
    groupSelectsChildren: true,
    suppressHorizontalScroll: true,
    defaultColDef: {
      enableRowGroup: true,
      enablePivot: true,
      enableValue: true,
      width: 100,
      sortable: true,
      resizable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
      editable: true,
    },
    pagination: true,
    paginationPageSize: 10,
    // paginationAutoPageSize:true,
    domLayout: 'autoHeight',
    //suppressHorizontalScroll: true
    // getRowId: (params) => params.data.id,
  } as GridOptions;
  var tab2GridOptions1 = {
    columnDefs: columnDefs,
    rowData: rowData,
    // defaultColDef: {
    //   flex: 1,
    //   minWidth: 100,
    //   filter: true,
    //   resizable: true,
    //   enableRowGroup: true,
    // },
    rowSelection: 'multiple',
    autoGroupColumnDef: {
      minWidth: 200,
      filter: 'agGroupColumnFilter',
    },
    animateRows: true,
    // sideBar: 'filters',
    sideBar: {
      toolPanels: [
        {
          id: 'filters',
          labelDefault: 'Filters',
          labelKey: 'filters',
          iconKey: 'filter',
          toolPanel: 'agFiltersToolPanel',
          toolPanelParams: {
            suppressExpandAll: true,
            suppressFilterSearch: true,
          },
        },
      ],
    },
    groupSelectsChildren: true,
    suppressHorizontalScroll: true,
    defaultColDef: {
      enableRowGroup: true,
      enablePivot: true,
      enableValue: true,
      width: 100,
      sortable: true,
      resizable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
      editable: true,
    },
    pagination: true,
    paginationPageSize: 10,
    // paginationAutoPageSize:true,
    domLayout: 'autoHeight',
    //suppressHorizontalScroll: true
    // getRowId: (params) => params.data.id,
  } as GridOptions;;
  var tab2GridOptions2 = {
    columnDefs: columnDefs,
    rowData: rowData,
    // defaultColDef: {
    //   flex: 1,
    //   minWidth: 100,
    //   filter: true,
    //   resizable: true,
    //   enableRowGroup: true,
    // },
    rowSelection: 'multiple',
    autoGroupColumnDef: {
      minWidth: 200,
      filter: 'agGroupColumnFilter',
    },
    animateRows: true,
    // sideBar: 'filters',
    sideBar: {
      toolPanels: [
        {
          id: 'filters',
          labelDefault: 'Filters',
          labelKey: 'filters',
          iconKey: 'filter',
          toolPanel: 'agFiltersToolPanel',
          toolPanelParams: {
            suppressExpandAll: true,
            suppressFilterSearch: true,
          },
        },
      ],
    },
    groupSelectsChildren: true,
    suppressHorizontalScroll: true,
    defaultColDef: {
      enableRowGroup: true,
      enablePivot: true,
      enableValue: true,
      width: 100,
      sortable: true,
      resizable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
      editable: true,
    },
    pagination: true,
    paginationPageSize: 10,
    // paginationAutoPageSize:true,
    domLayout: 'autoHeight',
    //suppressHorizontalScroll: true
    // getRowId: (params) => params.data.id,
  } as GridOptions;
  // const rowHeight = api.getRowNode('0').rowHeight;
  // const rowCount = api.getDisplayedRowCount();
  // const containerHeight = rowHeight * rowCount;
  // gridDiv.style.height = containerHeight + 'px';
  new Grid(gridDiv, gridOptions);
  new Grid(tab2GridDiv1, tab2GridOptions1);
  new Grid(tab2GridDiv2, tab2GridOptions2);

  gridDiv.addEventListener('click',()=>{
    console.log('inside grid div click event')
    const selectedRows = gridOptions.api.getSelectedRows();
    // console.log(selectedRows)
    // console.log(selectedRows[selectedRows.length-1]['SampleID'])
    //selection.push(selectedRows[selectedRows.length-1]['SampleID'])
    selection=[]
    for(var row of selectedRows){
      selection.push(row['sampleid'])
    }
    // console.log('updated selection: '+selection)
    setSelection(selection)
    //selection=temp.slice();
    //console.log(selection)
    //selection = selectedRows;
  })
  tab2GridDiv1.addEventListener('click',()=>{
    console.log('inside grid div click event')
    const selectedRows = tab2GridOptions1.api.getSelectedRows();
    selection=[]
    for(var row of selectedRows){
      selection.push(row['sampleid'])
    }
    setTab2Selection01(selection)
  })
  tab2GridDiv2.addEventListener('click',()=>{
    console.log('inside grid div click event')
    const selectedRows = tab2GridOptions2.api.getSelectedRows();
    selection=[]
    for(var row of selectedRows){
      selection.push(row['sampleid'])
    }
    setTab2Selection02(selection)
  })

  // gridOptions.api.setSideBarVisible(false);
  // gridDiv.scrollTo(0, gridDiv.scrollHeight)
  // gridDiv.style.height = 40.36*rowData.length+'px';
  // gridDiv.style.overflow = 'scroll';

  gridDiv.style.height = '60%'; // Set the desired height of the grid container
  gridDiv.style.width = '100%';
  gridDiv.style.overflow = 'auto';
  // console.log(gridDiv.offsetHeight)
  // console.log(gridOptions.api.getRowNode('0').rowHeight)
  console.log('preProcessing.ts || getAGPLOT || end')
}

