import { PlotlyHTMLElement } from 'plotly.js';
import * as Plotly from 'plotly.js-dist';
import {runPager, getGenesFromPags} from './pager'
import('ag-grid-enterprise')
import { DomLayoutType, Grid, GridOptions } from 'ag-grid-community';

var maskingAGGridDiv = document.getElementById("gene-pathway-details-table1") as HTMLDivElement;
// var pathwayTableDiv = document.getElementById("gene-pathway-table") as HTMLDivElement;
var genesDiv = document.getElementById("store-genes-input") as HTMLInputElement;
var genesIndexDiv = document.getElementById("store-genes-index") as HTMLInputElement;
var genesByPagIdDiv = document.getElementById("store-genes-input-bypagid") as HTMLInputElement;
var genesList=[], genesIndex=[], genesIndexMap={}, pagerAPIResponse, pagGenes=[];
var pagGenesMap = {}, gtDrawnFlag=false;
var commonGeneIndecies = [], commonPtX=[], commonPtY=[];

export const pagerAGGrid = async ()=>{
    genesDiv.addEventListener('change',async ()=>{
        genesList = genesDiv.innerText.split(',');
        genesIndex = genesIndexDiv.innerText.split(',');
        genesIndexMap = createObject(genesList, genesIndex)
        console.log(genesIndexMap)
        console.log(genesList)
        pagerAPIResponse = await runPager(genesList)
        await drawAGGridTable(maskingAGGridDiv, pagerAPIResponse)
        console.log(pagerAPIResponse)
    })
}

const drawAGGridTable = async (maskingAGGridDiv: HTMLDivElement, response) => {

    try{

        var columnNames = Object.keys(response[0])
        var columnDefs = []
        for(var i=0;i<columnNames.length;i++){
            if(columnNames[i].localeCompare("GS_ID")==0){
                columnDefs.push({
                    field: columnNames[i],
                    checkboxSelection: true,
                    filter: 'agSetColumnFilter',
                    headerCheckboxSelection:true
                })
                continue;
            }
            columnDefs.push({
                field: columnNames[i],
                filter: 'agSetColumnFilter'
            })
        }
        console.log(response[0])
        var rowData = response

        const gridOptions = {
        columnDefs: columnDefs,
        rowData: rowData,
        rowSelection: 'multiple',
        autoGroupColumnDef: {
            minWidth: 200,
            filter: 'agGroupColumnFilter',
        },
        animateRows: true,
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
        domLayout: 'autoHeight',
        } as GridOptions;
        const gridOptionsPathway = {
            columnDefs: columnDefs,
            rowData: rowData,
            rowSelection: 'multiple',
            autoGroupColumnDef: {
                minWidth: 200,
                filter: 'agGroupColumnFilter',
            },
            animateRows: true,
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
            domLayout: 'autoHeight',
            } as GridOptions;
        maskingAGGridDiv.innerHTML=""
        // pathwayTableDiv.innerHTML=""
        new Grid(maskingAGGridDiv, gridOptions);
        // new Grid(pathwayTableDiv, gridOptionsPathway);

        maskingAGGridDiv.addEventListener('click',async ()=>{
            console.log('inside grid div click event')
            const selectedRows = gridOptions.api.getSelectedRows();
            var ptXDiv = document.getElementById('store-genes-x') as HTMLInputElement
            var ptYDiv = document.getElementById('store-genes-y') as HTMLInputElement
            var ptX = ptXDiv.innerText.split(",").map(value => +value);
            var ptY = ptYDiv.innerText.split(",").map(value => +value);
            var genePtXMap = createObject(genesList, ptX)
            var genePtYMap = createObject(genesList, ptY)
            var PAGids=[]
            pagGenes = []
            for(var row of selectedRows){
                PAGids.push(row["GS_ID"])
                var resp = await getGenesFromPags(row["GS_ID"])
                await preProcessPAGGenes(row["GS_ID"], resp)
            }
            console.log(PAGids)
            var commonGens = pagGenes.filter(value => genesList.includes(value));
            genesByPagIdDiv.innerText=commonGens.toString()
            genesByPagIdDiv.dispatchEvent(event);
            // var pagerGT = document.getElementById("canvas-tab2-01-copy") as PlotlyHTMLElement;
            // if(gtDrawnFlag)
            var customColorScale = [
                [-1.0, 'rgb(180, 180, 180)'],
                [-0.95, 'rgb(165, 165, 165)'],
                [-0.9, 'rgb(150, 150, 150)'],
                [-0.85, 'rgb(130, 130, 130)'],
                [-0.8, 'rgb(110, 110, 110)'],
                [-0.75, 'rgb(90, 90, 90)'],
                [-0.7, 'rgb(70, 70, 70)'],
                [-0.65, 'rgb(50, 50, 50)'],
                [-0.6, 'rgb(30, 30, 30)'],
                [-0.55, 'rgb(10, 10, 10)'],
                [-0.5, 'rgb(0, 0, 0)'],
                [-0.45, 'rgb(0, 0, 0)'],
                [-0.4, 'rgb(20, 20, 20)'],
                [-0.35, 'rgb(40, 40, 40)'],
                [-0.3, 'rgb(60, 60, 60)'],
                [-0.25, 'rgb(80, 80, 80)'],
                [-0.2, 'rgb(100, 100, 100)'],
                [-0.15, 'rgb(120, 120, 120)'],
                [-0.1, 'rgb(140, 140, 140)'],
                [-0.05, 'rgb(160, 160, 160)'],
                [0.0, 'rgb(180, 180, 180)'],
                [0.05, 'rgb(165, 165, 165)'],
                [0.1, 'rgb(150, 150, 150)'],
                [0.15, 'rgb(130, 130, 130)'],
                [0.2, 'rgb(110, 110, 110)'],
                [0.25, 'rgb(90, 90, 90)'],
                [0.3, 'rgb(70, 70, 70)'],
                [0.35, 'rgb(50, 50, 50)'],
                [0.4, 'rgb(30, 30, 30)'],
                [0.45, 'rgb(10, 10, 10)'],
                [0.5, 'rgb(0, 0, 0)'],
                [0.55, 'rgb(0, 0, 0)'],
                [0.6, 'rgb(20, 20, 20)'],
                [0.65, 'rgb(40, 40, 40)'],
                [0.7, 'rgb(60, 60, 60)'],
                [0.75, 'rgb(80, 80, 80)'],
                [0.8, 'rgb(100, 100, 100)'],
                [0.85, 'rgb(120, 120, 120)'],
                [0.9, 'rgb(140, 140, 140)'],
                [0.95, 'rgb(160, 160, 160)'],
                [1.0, 'rgb(180, 180, 180)']
            ]
            commonGeneIndecies = [], commonPtX=[], commonPtY=[];
            commonGens.forEach(key => {
                if (genesIndexMap.hasOwnProperty(key)) {
                    commonGeneIndecies.push(genesIndexMap[key]);
                    commonPtX.push(genePtXMap[key]);
                    commonPtY.push(genePtYMap[key]);
                }
            });
            await Plotly.restyle("canvas-tab2-01-copy", {colorscale:customColorScale},[0])
            await Plotly.restyle('canvas-tab2-01-copy', {selectedpoints: [commonGeneIndecies], opacity:1, unselected: {
                marker: {
                  color: '#00ff00',
                  opacity: 0
                }, textfont: {
                  color: 'transparent',
                  opacity: 0
                }
              }},[1])
            await Plotly.relayout("canvas-tab2-01-copy", {
                'xaxis.range': [Math.min(...commonPtX)-20, Math.max(...commonPtX)+20],
                'yaxis.range': [Math.min(...commonPtY)-20, Math.max(...commonPtY)+20]
            })
            var d = document.getElementById("canvas-tab2-01-copy") as PlotlyHTMLElement;
            console.log(Object.keys(d))
            console.log(d.data)
            console.log(d.layout)
            console.log(genePtXMap)
            console.log(genePtYMap)
            console.log(genesIndexMap)
            console.log(commonGeneIndecies)
        })
    }
    catch(e){
        console.error('Error '+e)
    }
}

const preProcessPAGGenes = async (pag, response) => {
    response.forEach((obj)=>{
        if(pagGenesMap[pag]!=undefined)
            pagGenesMap[pag].push(obj['GENE_SYM'])
        else
            pagGenesMap[pag]=[obj['GENE_SYM']]
        pagGenes.push(obj['GENE_SYM'])
    })
    console.log(pagGenesMap)
    console.log(pagGenes)
}

export const pagerGTPlotlySelected = async ()=>{
    gtDrawnFlag=true;
}

export const maskedGTGenerateClicked = async ()=> {
    await Plotly.relayout("canvas-tab2-01-maskedGT", {
        'xaxis.range': [Math.min(...commonPtX)-20, Math.max(...commonPtX)+20],
        'yaxis.range': [Math.min(...commonPtY)-20, Math.max(...commonPtY)+20]
    })
}

const createObject = (keys: any[], values: any[]) => {
    if (keys.length !== values.length) {
        throw new Error("Arrays must be of equal length");
    }

    const result: { [key: string]: any } = {};
    keys.forEach((key, index) => {
        result[key] = values[index];
    });
    return result;
}
