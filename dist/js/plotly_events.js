var resultSelection=[]
var pathwayTableSelection = {}, pathwayGeneMap={}
var graphDiv = document.getElementById('canvas-div');
var plt_bgcolor = 'white', pltWidth=768,colorscale='Bluered',yaxisFontSize=12,base=1;
var gProfilerResponse,drawNetworkVisited=false,edgesMap={},maxGeneCountInPathway=0;
var isplotlySelected=false;
var selectedPointsIndices=[], pagGenesMap={};
var PAGIDGENE_URL = 'http://127.0.0.1:5000/pagRankedGene/'
function calculateStandardDeviation(data) {
    const n = data.length;
    const mean = data.reduce((sum, value) => sum + value, 0) / n;
  
    const squaredDifferences = data.map(value => Math.pow(value - mean, 2));
    const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / (n - 1);
  
    const standardDeviation = Math.sqrt(variance);
  
    return standardDeviation*0.05;
  }

  function normalize(arr){
    var min = 1000, max=-1000;
    var temp = new Float32Array(arr.length)
    for(var i=0;i<arr.length;i++){
      if(min>arr[i])
        min=arr[i];
      if(max<arr[i])
        max=arr[i];
    }
    for(var i=0;i<arr.length;i++){
      //temp[i]=(arr[i]-min)/(max-min);
      temp[i]=arr[i];
    }
    return temp;
  }

function displayClinicalDataTable(){
    document.getElementById('myGrid').style.display='block';
}

function hideClinicalDataTable(){
    document.getElementById('myGrid').style.display='none';
}

function displayPathwayDataTable(){
    document.getElementById('myGrid').style.display='none';
    document.getElementById('gene-pathway-table').style.display='block'
    // document.getElementById('pathway-table-nav-pathway').innerHTML=document.getElementById('gene-pathway-table').innerHTML
    // document.getElementById('pathway-table-nav-pathway-details').innerHTML=document.getElementById('gene-pathway-table').innerHTML
}

function hidePathwayDataTable(){
    document.getElementById('myGrid').style.display='none';
    document.getElementById('gene-pathway-table').style.display='none'
}
// graphDiv.addEventListener('mouseenter', ()=>{
// // if (graphDiv.classList.contains('js-plotly-plot') || graphDiv.id.startsWith('myPlotlyGraph_')) {
//     graphDiv.on('plotly_selected',function(eventData){
//     console.log(eventData);
//     // console.log(eventData.currentTarget.data[1].selectedpoints)
//     // console.log(eventData.currentTarget.data[1].selectedpoints[0].x)
//     var pt=[]
//     var ptx=[], pty=[], pttext=[], ptout=[], ptexp=[], ptbase=[], ptcolorexp=[], ptcolorGT=[], ptoutText=[], ptexpText=[]
//     eventData.points.forEach(function(pt) {
//         ptx.push(pt.x);
//         pty.push(pt.y);
//         var currOut = pt.data.args.z[~~(pt.y)][~~(pt.x)]
//         var currExp = pt.data.args.exp[pt.text]
//         ptout.push(currOut)
//         ptoutText.push(Number(currOut).toFixed(2))
//         pttext.push(pt.text);
//         ptexp.push(currExp)
//         ptexpText.push(Number(currExp).toFixed(2))
//         // ptbase.push(currOut<0?currOut:0)
//         ptcolorexp.push(currExp<0?'blue':'red')
//         ptcolorGT.push(currOut<0?'blue':'red')
//         console.log(pt.x);
//         console.log(pt.y);
//         console.log(pt.text);
//     });
//     var barTraceOuput = [{
//         x: pttext,
//         y: ptout,
//         type: 'bar',
//         base: 0,
//         text: ptoutText.map(String),
//         textposition: 'auto',
//         hoverinfo: 'none',
//         width: 0.5,
//         // text: pttext,
//         marker: {color: ptcolorGT}
//     }];
//     var barTraceExp = [{
//         x: pttext,
//         y: ptexp,
//         type: 'bar',
//         base: 0,
//         text: ptexpText.map(String),
//         textposition: 'auto',
//         hoverinfo: 'none',
//         width: 0.5,
//         // text: pttext,
//         marker: {color: ptcolorexp}
//     }];
//     var plotLayout = {
//         width:768,
//         height:768,
//         showlegend: true,
//         legend: {
//             x: 0.8,
//             // xanchor: 'right',
//             y: 1.05,
//             // bgcolor: 'E2E2E2'
//             bgcolor: 'transparent'
//         },
//         font:{
//             color:"black",
//             size:12,
//         }
//         }
//     var barsLayout1 = JSON.parse(JSON.stringify(plotLayout));
//     barsLayout1['title']={
//         text:'<br>GeneTerrain Expression',
//         font: {
//         size: 24,
//         color: '#7f7f7f'
//         },
//         xref: 'paper',
//     }
//     var barsLayout2 = JSON.parse(JSON.stringify(plotLayout));
//     barsLayout2['title']={
//         text:'<br><b>GeneTerrain Intensity<b>',
//             font: {
//             size: 24,
//             color: '#7f7f7f'
//             },
//             xref: 'paper',
//     }
//     barsLayout1['showlegend']=false
//     barsLayout2['showlegend']=false
    
//     Plotly.newPlot('bar-chart-exp',barTraceExp, barsLayout1);
//     Plotly.newPlot('bar-chart-output',barTraceOuput, barsLayout2);
//     })
    
// }, {once:true})

var tab2div01 = document.getElementById('canvas-tab2-01');
var tab2div02 = document.getElementById('canvas-tab2-02');
var showGene2 = document.getElementById("show gene2")
var barTraceOuput,plotLayout,barTraceExp;

// tab2div01.on = function(eventType, callback) {
//     if (eventType === 'plotly_selected') {
//       // Your code to handle the click event goes here
//       alert('plotly selected')
//       callback();
//     }
//   };

//console.log(openaiAPI('How are you'))
var event = new Event('change');
// document.getElementById("nav-api-tab").addEventListener('mouseenter',()=>{
// })
tab2div01.addEventListener('mouseenter',()=>{
    isplotlySelected=false;
    // alert('show gene changed')
    // tab2div01.addEventListener('mouseleave',()=>{
    //     alert('out')
    //     tab2div01.removeEventListener('mouseenter')
    // })
// tab2div01.addEventListener("change", function() {
    // var flag='inside'
    // tab2div01.addEventListener('mouseout',()=>{
    //     flag='left'
    //     return
    // })
    console.log(tab2div01.attributes)
    tab2div01.on('plotly_legendclick',async function(eventData){
        console.log('plotly click')
        console.log(eventData)
        var op=0
        if(eventData.data[1]['opacity']==0)
            op=1
        else
            op=0
        console.log(eventData.data[1]['opacity'])
        console.log(op)
        await Plotly.restyle(tab2div01,{opacity:op},[1]);
    })
    tab2div02.on('plotly_selected',async function(eventData){
        isplotlySelected=true;
        console.log('insde tab2div01 plotly selected')
        console.log(eventData)
        // document.getElementById("store-event-data").innerText=JSON.stringify(eventData)
        
        selectedPointsIndices=[];
        var ptGene=[], ptx=[], pty=[], pt01Out=[], pt02Out=[],pt01OutText=[],pt02OutText=[]
        var ptSTD1=[],ptSTD2=[],ptExp01=[], ptExp02=[],ptExp01Text=[],ptExp02Text=[],ptPvalue=[]
        var tab2Table = document.getElementById('tab2-table');
        var tab2BarPlot = document.getElementById('tab2-barplot');
        var tab2BarPlot02 = document.getElementById('tab2-barplot02')
        eventData.points.forEach(async function(pt) {
            ptGene.push(pt.text);
            selectedPointsIndices.push(pt.pointIndex)
            ptx.push(pt.x);
            pty.push(pt.y);
            var currPt01out = pt.data.args.z1[~~(pt.y)][~~(pt.x)]
            var currPt02out = pt.data.args.z2[~~(pt.y)][~~(pt.x)]
            var expGeneMap1 = pt.data.args.expGeneMap1;
            var expGeneMap2 = pt.data.args.expGeneMap2;
            var currExp1 = pt.data.args.exp1[pt.text]/pt.data.args.selectionLen1;
            var currExp2 = pt.data.args.exp2[pt.text]/pt.data.args.selectionLen2;
            ptExp01.push(currExp1)
            ptExp02.push(currExp2)
            ptExp01Text.push(Number(currExp1).toFixed(2))
            ptExp02Text.push(Number(currExp2).toFixed(2))
            ptSTD1.push(calculateStandardDeviation(expGeneMap1[pt.text]))
            ptSTD2.push(calculateStandardDeviation(expGeneMap2[pt.text]))
            ptPvalue.push(calculatePValue(expGeneMap1[pt.text], expGeneMap2[pt.text]))
            pt01Out.push(currPt01out);
            pt02Out.push(currPt02out);
            pt01OutText.push(Number(currPt01out).toFixed(2))
            pt02OutText.push(Number(currPt02out).toFixed(2))
        });
        
        // ptSTD1=normalize(ptSTD1)
        // ptSTD2=normalize(ptSTD2)
        console.log(ptGene+" "+ptGene.length)
        console.log(selectedPointsIndices+" "+selectedPointsIndices.length)
        document.getElementById("hidden-input").innerText=ptGene.toString()
        document.getElementById("store-genes-input").innerText=ptGene.toString()
        document.getElementById("store-genes-x").innerText=ptx.toString()
        document.getElementById("store-genes-y").innerText=pty.toString()
        document.getElementById("store-genes-index").innerText=selectedPointsIndices.toString()
        document.getElementById("hidden-input").dispatchEvent(event);
        document.getElementById("store-genes-input").dispatchEvent(event);
        // console.log(ptExp01)
        // console.log(ptExp02)
        barTraceOuput = [{
                x: ptGene,
                y: pt01Out,
                type: 'bar',
                marker:{color:'#131313'},
                error_y:{
                    type:'data',
                    array: ptSTD1,
                    visible:true
                },
                name: 'GeneTerrain 1',
                base: 0,
                text: pt01OutText,
                textposition: 'auto',
                hoverinfo: 'none',
                width: 0.5,
                // text: pttext,
            },
            {
                x: ptGene,
                y: pt02Out,
                type: 'bar',
                marker:{color:'gray'},
                error_y:{
                    type:'data',
                    array: ptSTD2,
                    visible:true
                },
                name: 'GeneTerrain 2',
                base: 0,
                text: pt02OutText,
                textposition: 'auto',
                hoverinfo: 'none',
                width: 0.5,
                // text: pttext,
            }];
        barTraceExp = [{
                x: ptGene,
                y: ptExp01,
                error_y:{
                    type:'data',
                    array: ptSTD1,
                    visible:true
                },
                type: 'bar',
                marker:{color:'#131313'},
                name: 'GeneTerrain 1',
                base: 0,
                text: ptExp01Text,
                textposition: 'auto',
                hoverinfo: 'none',
                width: 0.5,
                // text: pttext,
            },
            {
                x: ptGene,
                y: ptExp02,
                type: 'bar',
                error_y:{
                    type:'data',
                    array: ptSTD2,
                    visible:true
                },
                name: 'GeneTerrain 2',
                base: 0,
                marker:{color:'gray'},
                text: ptExp02Text,
                textposition: 'auto',
                hoverinfo: 'none',
                width: 0.5,
                // text: pttext,
            }];
        plotLayout = {
                barmode: 'group',
                width:0,
                height:0,
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
        var layout1 = JSON.parse(JSON.stringify(plotLayout));
        layout1['title']={
            text:'<br>Gene Intensity<br>'+ptExp01.length+' Genes',
            font: {
            size: 20,
            color: '#7f7f7f'
            },
            xref: 'paper',
        }
        var layout2 = JSON.parse(JSON.stringify(plotLayout));
        layout2['title']={
            text:'<br>Gene Expression<br>'+ptExp01.length+' Genes',
            font: {
            size: 20,
            color: '#7f7f7f'
            },
            xref: 'paper',
        }
        // layout2['annotations']= [{
        //     xref: 'paper',
        //     yref: 'paper',
        //     x: 1,
        //     xanchor: 'left',
        //     y: 0.95,
        //     yanchor: 'top',
        //     text: ptExp01.length+'',
        //     showarrow: false
        //   }],
        layout2['updatemenus']= [{
            x: 0,
            y: 1.1,
            yanchor: 'top',
            buttons: [{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', '#131313',[0]],
                label: 'Black'
            },{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'red',[0]],
                label: 'Red'
            }, {
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'blue',[0]],
                label: 'Blue'
            }, {
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'green',[0]],
                label: 'Green'
            },{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'pink',[0]],
                label: 'Pink'
            },{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'yellow',[0]],
                label: 'Yellow'
            }]
        },{
            x: 0.15,
            y: 1.1,
            yanchor: 'top',
            buttons: [{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'gray',[1]],
                label: 'Gray'
            },{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'red',[1]],
                label: 'Red'
            }, {
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'blue',[1]],
                label: 'Blue'
            }, {
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'green',[1]],
                label: 'Green'
            },{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'pink',[1]],
                label: 'Pink'
            },{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'yellow',[1]],
                label: 'Yellow'
            }]
        }]
        layout1['updatemenus']= [{
            x: 0,
            y: 1.1,
            yanchor: 'top',
            buttons: [{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', '#131313',[0]],
                label: 'Black'
            },{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'red',[0]],
                label: 'Red'
            }, {
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'blue',[0]],
                label: 'Blue'
            }, {
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'green',[0]],
                label: 'Green'
            }]
        },{
            x: 0.15,
            y: 1.1,
            yanchor: 'top',
            buttons: [{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'gray',[1]],
                label: 'Gray'
            },{
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'red',[1]],
                label: 'Red'
            }, {
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'blue',[1]],
                label: 'Blue'
            }, {
                name: 'GeneTerrain 1',
                method: 'restyle',
                args: ['marker.color', 'green',[1]],
                label: 'Green'
            }]
        }]
        await Plotly.newPlot(tab2BarPlot02, barTraceExp, layout2);
        await Plotly.newPlot(tab2BarPlot, barTraceOuput, layout1);
        // await Plotly.restyle(tab2div02, {'selectedpoints': [selectedPointsIndices], opacity:1},[1]);
        // await Plotly.restyle(tab2div01, {'selectedpoints': [selectedPointsIndices], opacity:1},[1]);
        // await Plotly.restyle(
        //     tab2div02,  // The target div or element where the plot is located
        //     {           // The new style properties to apply
        //         opacity: 0  // Setting opacity to 0 for all points
        //     },
        //     [1]  // The trace indices to apply the style changes to, replace n with the index of the last trace
        // );
        console.log(ptGene)
        console.log(selectedPointsIndices)
        await Plotly.restyle(tab2div02, {'selectedpoints': [selectedPointsIndices], opacity:1,unselected: {
            marker: {
              color: '#00ff00',
              opacity: 0
            }, textfont: {
              color: 'transparent',
              opacity: 0
            }
          },
          
        },[1]);
        
        await Plotly.restyle(tab2div01, {'selectedpoints': [selectedPointsIndices], opacity:1,unselected: {
            marker: {
              color: '#00ff00',
              opacity: 0
            }, textfont: {
              color: 'transparent',
              opacity: 0
            }
          }},[1]);
        // saveDataToProperties(ptGene, pt01Out, pt02Out, pt01OutText, pt02OutText);
        agGridd(ptGene, pt01Out, pt02Out, pt01OutText, pt02OutText,ptPvalue);
        //tempGrid();
        var generatePathway = document.getElementById('Generate_Pathway');
        generatePathway.style.display="block"
        generatePathway.addEventListener('click',()=>{
            pathway(ptGene, pt01Out, pt02Out, pt01OutText, pt02OutText)
        })
        // await drawNetwork(ptGene, pt01Out, pt02Out, pt01OutText, pt02OutText);
    },{once:true})
})

async function saveDataToProperties(ptGene, pt01Out, pt02Out, pt01OutText, pt02OutText){
fs.writeFile('sdf.txt','sdfsf')
}

async function agGridd(ptGene, pt01Out, pt02Out, pt01OutText, pt02OutText,ptPvalue){
    console.log(ptPvalue)
    var pathwayTable=document.querySelector("#gene-pathway-table")
    pathwayTable.innerHTML="";
    const columnDefs = [
        { field: 'GeneName',checkboxSelection: true,filter: 'agSetColumnFilter',headerCheckboxSelection:true},
        { field: 'Group1_Score', filter: 'agNumberColumnFilter'},
        { field: 'Group2_Score', filter:'agNumberColumnFilter'},
        { field: 'P_value', filter:'agNumberColumnFilter'},
      ];
    const rowData = []
    for(var i=0;i<ptGene.length;i++){
        rowData.push({GeneName:ptGene[i],Group1_Score:pt01OutText[i],Group2_Score:pt02OutText[i],P_value:ptPvalue[i]})
    }
    const gridOptions = {
        columnDefs: columnDefs,
        rowData: rowData,
        rowSelection: 'multiple',
        autoGroupColumnDef: {
          minWidth: 200,
          filter: 'agGroupColumnFilter',
        },
        animateRows: true,
        // sideBar: {id:'filters',hiddenByDefault:true},
        sideBar: {
          toolPanels: [
              {
                  id: 'columns',
                  labelDefault: 'Columns',
                  labelKey: 'columns',
                  iconKey: 'columns',
                  toolPanel: 'agColumnsToolPanel',
              },
              {
                  id: 'filters',
                  labelDefault: 'Filters',
                  labelKey: 'filters',
                  iconKey: 'filter',
                  toolPanel: 'agFiltersToolPanel',
              }
          ],
          defaultToolPanel: 'columns',
          hiddenByDefault:true
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
        columnTypes: {
            nonEditableColumn: { editable: false },
        },
      };
    new agGrid.Grid(pathwayTable, gridOptions);
    pathwayTable.addEventListener('click',()=>{
        console.log('inside grid div click event')
        const selectedRows = gridOptions.api.getSelectedRows();
        console.log(selectedRows)
        // pathwayTableSelection={}
        pathwayTableSelection=[]
        var index=0
        for(var row of selectedRows){
            // console.log(row)
            pathwayTableSelection.push(row['GeneName'])
            // pathwayTableSelection[row['GeneName']]=[row['GeneName']]
        }
        console.log(pathwayTableSelection)
    })
}
function convertToPowerOf10(decimalValue) {
    // Handle special cases
    if (decimalValue === 0) {
      return "0 * 10^0";
    }
  
    // Calculate the exponent
    const exponent = Math.floor(Math.log10(Math.abs(decimalValue)));
  
    // Calculate the significand
    const significand = Number(decimalValue / Math.pow(10, exponent)).toFixed(2);
  
    return `${significand} x 10^${exponent}`;
  }
var colorIndex = 0
function generateRandomColorName(pvalueArray=undefined) {
    const adjectives = ['red', 'blue', 'green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown', 'Gray', 'Cyan'];
    // // const adjectives = ['red', 'blue', 'green','yellow','purple','orange','pink']
    // var res=[];
    // var map = {};
    // var k=0;
    // for(var i=0;i<arr.length;i++){
    //     // res.push(adjectives[Math.floor(Math.random() * adjectives.length)])
    //     if(map[arr[i]]==undefined){
    //         res.push(adjectives[k%adjectives.length])
    //         map[arr[i]]=adjectives[k%adjectives.length]
    //         k++;
    //     }
    //     else
    //         res.push(map[arr[i]])
    //     // res.push('Red')
    // }
    // console.log(arr.length+" "+res.length);
    // console.log(res);
    var len = adjectives.length;
    if(pvalueArray==undefined)
        return adjectives[colorIndex++%len]
    else{
        var output=[]
        for(var i=0;i<pvalueArray.length;i++){
            console.log(parseInt(pvalueArray[i]))
            output.push(adjectives[parseInt(pvalueArray[i])%len])
        }
        // console.log(output)
        return output
    }
    // return res;
  }
var geneCountMap = new Map();
var genePValueMap = new Map();
var s=[],p=[]
const rowData = []
var k=1;
var lineColor = []
var sources = []
var colors, normalizedSelectedIntersectionSize,normalizedSelectedIntersectionSizeBKP,sIsize1=100000,sIsize2=0,baseValue=1;
var selectedRowMap = {}, selectedRowMapName={},selectedColor=[],selectedSource = [];
var selectedPvalue = [],selectedPvalueBubble=[], selectedIntersectionSize=[],selectedNames=[],selectedPvalueBKP=[],selectedPvalueBubbleBKP=[],selectedNamesBKP=[],selectedIntersectionSizeBKP=[]
var selectedGeneNameInteractionsMap = {},selectedPvalueRange=[1000000,-1000000]
var traces = [],apiOutputLen;
// await pathway([],[],[],[],[])   
async function pathway(ptGene, pt01Out, pt02Out, pt01OutText, pt02OutText){
    // var pValue = await calculatePValue(pt01Out, pt02Out);
    var pValue = 0;
    document.getElementById("");
    var geneSize1 = document.getElementById("gene-size1");
    var geneSize2 = document.getElementById("gene-size2");
    var similarityScore = document.getElementById("");
    var overlapGenes = document.getElementById("overlap-genes");
    var cohesion = document.getElementById("cohesion")
    var pValueFilter = document.getElementById("p-value");
    var fDR = document.getElementById("FDR");
    var dataSource = document.getElementById("data-source");
    var params = {
        geneSize1:geneSize1, geneSize2:geneSize2,
        similarityScore: similarityScore, overlapGenes:overlapGenes,
        cohesion:cohesion, pValueFilter:pValueFilter,
        fDR:fDR, dataSource:dataSource,
    }
    // var params = {
    //     "genes": "MYC",
    //     "source": "WikiPathway_2021_HUMAN%20Reactome_2021%20KEGG_2021%20Spike%20BioCarta%20NCI-Nature Curated",
    //     "type": "All",
    //     "sim": 0,
    //     "olap": 1,
    //     "organism": "Homo sapiens",
    //     "cohesion": "0",
    //     "pvalue": 0.05,
    //     "FDR": 0.05,
    //     "ge": 1,
    //     "le": 2000
    // }
    // var url = 'http://discovery.informatics.uab.edu/PAGER/index.php/geneset/pagerapi';
    // var headers = {'Access-Control-Allow-Origin':'http://127.0.0.1:5500'}
    // var headers = {}

    //pager api
    //     var myHeaders = new Headers();
    //     myHeaders.append("Cookie", "PHPSESSID=7bp6d6h1gbsfp0aliqko136114");
    //     var formdata = new FormData();
    //     formdata.append("genes", "ACTB%20ACTG1");
    //     formdata.append("type", "ALL");
    //     formdata.append("ge", "2");
    //     formdata.append("le", "5000");
    //     formdata.append("sim", "0");
    //     formdata.append("olap", "1");
    //     formdata.append("organism", "All");
    //     formdata.append("source", "KEGG_2021%20WikiPathway_2021_HUMAN");
    //     formdata.append("cohesion", "0");
    //     formdata.append("pvalue", ".05");
    //     formdata.append("FDR", "1");

    //     var requestOptions = {
    //     method: 'POST',
    //     headers: myHeaders,
    //     body: formdata,
    //     redirect: 'follow'
    //     };

    // var response = await fetch("http://discovery.informatics.uab.edu/PAGER/index.php/geneset/pagerapi", requestOptions)
    // G-profile api
    var url = 'https://biit.cs.ut.ee/gprofiler/api/gost/profile/'
    var body = {
        organism:"hsapiens",
        query:pathwayTableSelection
    }
    console.log(pathwayTableSelection)
    // var response = await fetch(url, {body:JSON.stringify(body), method:'POST'})
    // var responseJson = await response.json()
    // gProfilerResponse = responseJson
    // Pager API
    var RUN_PAGER_URL = "http://127.0.0.1:5000/"
    var formdata = {
        "genes": pathwayTableSelection,
        "source": ["WikiPathway_2021"],
        "type": "All",
        "sim": 0,
        "olap": 1,
        "organism": "Homo sapiens",
        "cohesion": "0",
        "pvalue": 0.05,
        "FDR": 0.05,
        "ge": 1,
        "le": 2000
      }
      
      var requestOptions = {
        method: 'POST',
        // headers: myHeaders,
        body: formdata,
        redirect: 'follow',
      };
      //   var response = fetch("http://discovery.informatics.uab.edu/PAGER/index.php/geneset/pagerapi", requestOptions).catch(error=>console.log('error : '+error));
      var responseJson;
      await fetch(RUN_PAGER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formdata)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json(); // Parse response body as JSON
      })
      .then(dataArray => {
        // Iterate over the array of JSON objects
        console.log('Pager API result for MYC gene')
        console.log(dataArray);
        responseJson = dataArray
      })
      .catch(error => console.error('Error:', error));

    console.log(responseJson)
    var geneCountMap = new Map();
    var genePValueMap = new Map();
    var s=[],p=[]
    const rowData = []
    var k=1;
    var lineColor = []
    var sources = []
    var querySourceMap = new Map();
    pagGenesMap = {}
    console.log(Object.keys(responseJson[0]))
    for(var i=0;i<responseJson.length;i++){
        responseJson[i]['source'] = responseJson[i]['GS_ID']
        responseJson[i]['query']=responseJson[i]['MVC']
        responseJson[i]['p_value']=responseJson[i]['pvalue']
        responseJson[i]['name']=responseJson[i]['DESCRIPTION']
        responseJson[i]['intersections'] = ['a', 'b', 'c']
        responseJson[i]['intersection_size'] = responseJson[i]['OLAP']

        var obj = responseJson[i];
        var source = responseJson[i]['source'];
        var query = responseJson[i]['query']
        var pvaluee = -1*Math.log10(responseJson[i]['p_value'])


        var allPagGenesResponse = await getGenesFromPags(source)
        var allPagGenes = allPagGenesResponse.map(entry => entry.GENE_SYM);
        var commonGens = allPagGenes.filter(value => ptGene.includes(value));
        console.log(commonGens)
        pagGenesMap[source]=commonGens
        responseJson[i]['intersections'] = commonGens

        // rowData.push({Id:k++,Source:obj['source'],Term_Id:obj['native'],PathWay:obj['name'],intersection_size:obj['intersection_size'],P_value:convertToPowerOf10(obj['p_value']),hiddenPvalue:pvaluee,name:obj['name'], intersections:[...new Set(obj['intersections'].flat())]})
        rowData.push({Id:k++,Source:obj['source'],Term_Id:obj['native'],PathWay:obj['name'],intersection_size:obj['intersection_size'],P_value:convertToPowerOf10(obj['p_value']),hiddenPvalue:pvaluee,name:obj['name'], intersections:''})
        if(querySourceMap[source]==undefined)
            querySourceMap[source]=[query]
        else
            querySourceMap[source].push(query)
        s.push(source)
        lineColor.push('rgba(255,255,255,0)')
        p.push(pvaluee)
        if(genePValueMap[source]!=undefined){
            genePValueMap[source][0].push(source)
            genePValueMap[source][1].push(pvaluee)
            genePValueMap[source][2]++;
        }
        else{
            genePValueMap[source]=[[source],[pvaluee],1]
            sources.push(source);
        }
    }
    // for(var key in responseJson['meta']['query_metadata']['queries']){
    //     if(pathwayGeneMap[querySourceMap[key]]!=undefined)
    //         pathwayGeneMap[querySourceMap[key]] = pathwayGeneMap[querySourceMap[key]].concat(responseJson['meta']['query_metadata']['queries'][key])
    //     else
    //         pathwayGeneMap[querySourceMap[key]] = responseJson['meta']['query_metadata']['queries'][key]
    // }
    // console.log(pathwayGeneMap)
    apiOutputLen = s.length
    console.log(genePValueMap)
    // var traces = []
    for(var key in genePValueMap){
        var width = 0.2+genePValueMap[key][2]/apiOutputLen;
        var randomColor = generateRandomColorName();
        var trace = {
            // x: genePValueMap[key][0],
            y: genePValueMap[key][1],
            name: genePValueMap[key][0][0]+"("+genePValueMap[key][2]+")",
            mode: 'markers+bar',
            // marker:{size:20},
            // orientation:'h',
            type: 'box',
            boxpoints: 'all',
            jitter: 1,
            pointpos:0,
            width:width,
            line: {color: 'rgba(255,255,255,0)', opacity:0.8},
            // line: {color: 'rgba(255,255,255,0)'},
            // marker: {color: markerColor},
            // box:{color:'white'},
            marker: {color: randomColor,
            size:10},
            // colorscale: 'Jet',
            hoverinfo:true,
            // visible: 'true',
            // name: 'Gene_Name',
        }
        var scatter = {
            x: [genePValueMap[key][0][0]+"("+genePValueMap[key][2]+")"],
            y: [0.3],
            width: [width],
            type:'bar',
            marker:{color:[randomColor]},
        }
        traces.push(trace)
        traces.push(scatter)
    }
    console.log(s)
    console.log(p)
    var layout = {
        // width:568,
        // height:568,
        showlegend: false,
        yaxis:{
            title:{text:'-log(Pvalue)'},
            showgrid:false,
            autotick: true,
            showticklabels: true,
            zeroline: true,
        },
        xaxis:{
            tickangle:45,
            autotick: true,
            zeroline: true,
            showticklabels: true,
        },
        boxmode: 'group',
        bargap: 0.4,
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
        //   bgcolor: 'E2E2E2'
        bgcolor: 'transparent'
        },
        font:{
          color:"black",
          size:12,
        },
      }
    var heatmap = [{
        x: s,
        y: p,
        name: s,
        // mode: 'markers+bar',
        // marker:{size:20},
        orientation:'h',
        type: 'box',
        boxpoints: 'all',
        jitter: 9,
        pointpos:0,
        line: {color: 'rgba(255,255,255,0'},
        // line: {color: 'rgba(255,255,255,0)'},
        // marker: {color: markerColor},
        // box:{color:'white'},
        // marker: {color: 'red'},
        // colorscale: 'Jet',
        hoverinfo:true,
        visible: 'true',
        name: 'Gene_Name',
    }]
    Plotly.newPlot('pathway-scatter',traces,layout)
    const colData = [{ field: 'Id',filter: 'agSetColumnFilter',checkboxSelection: true,headerCheckboxSelection:true},
    { field: 'Source', filter: 'agNumberColumnFilter'},
    { field: 'Term_Id', filter:'agNumberColumnFilter'},
    { field: 'PathWay', filter:'agNumberColumnFilter'},
    { field: 'intersection_size', filter:'agNumberColumnFilter'},
    { field: 'P_value', filter:'agNumberColumnFilter'},
    { field: 'hiddenPvalue', filter:'agNumberColumnFilter', hide:true},
    { field: 'name', filter:'agNumberColumnFilter', hide:true},
    { field: 'intersections', filter:'agNumberColumnFilter'},]
    const gridOptions = {
        columnDefs: colData,
        rowData: rowData,
        rowSelection: 'multiple',
        autoGroupColumnDef: {
          minWidth: 200,
          filter: 'agGroupColumnFilter',
        },
        animateRows: true,
        // sideBar: {id:'filters',hiddenByDefault:true},
        sideBar: {
          toolPanels: [
              {
                  id: 'columns',
                  labelDefault: 'Columns',
                  labelKey: 'columns',
                  iconKey: 'columns',
                  toolPanel: 'agColumnsToolPanel',
              },
              {
                  id: 'filters',
                  labelDefault: 'Filters',
                  labelKey: 'filters',
                  iconKey: 'filter',
                  toolPanel: 'agFiltersToolPanel',
              }
          ],
          defaultToolPanel: 'columns',
          hiddenByDefault:true
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
        columnTypes: {
            nonEditableColumn: { editable: false },
        },
      };
    var table = document.querySelector('#pathwayResultInfo')
    var pathwayDetailsTable=document.querySelector("#gene-pathway-details-table")
    table.innerHTML='';
    pathwayDetailsTable.innerHTML='';
    new agGrid.Grid(table, gridOptions);
    var gridOptionsforPathwayDetails = {...gridOptions};
    new agGrid.Grid(pathwayDetailsTable, gridOptionsforPathwayDetails);
    table.addEventListener('click',()=>{
        console.log('inside grid div click event')
        const selectedRows = gridOptions.api.getSelectedRows();
        console.log(selectedRows)
        resultSelection=[]
        selectedSource = [], selectedPvalue = [], selectedPvalueBubble=[], selectedIntersectionSize=[],selectedColor=[],selectedNames=[]
        selectedRowMap = {}, selectedRowMapName = {}, selectedGeneNameInteractionsMap={}
        sIsize1=10000000,sIsize2=-10000000,selectedPvalueRange=[1000000,-1000000];
        sIsize1 = parseInt(sIsize1)
        sIsize2 = parseInt(sIsize2)
        for(var row of selectedRows){
            if(selectedRowMapName[toTitleCase(row['name'])]!=undefined)
                continue
            if(selectedRowMap[row['Source']]==undefined){
                selectedRowMap[row['Source']] = [row['Source'],row['hiddenPvalue'],row['intersection_size'],1,row['name']]
            }
            else{
                var temp = selectedRowMap[row['Source']]
                selectedRowMap[row['Source']]=[row['Source'],temp[1]+row['hiddenPvalue'],temp[2]+row['intersection_size']*0.1,temp[3]+1,row['name']]
            }
            selectedRowMapName[toTitleCase(row['name'])]=true;
            selectedSource = [row['Source']].concat(selectedSource)
            selectedNames = [toTitleCase(row['name'])+' '].concat(selectedNames)
            selectedPvalue = [row['hiddenPvalue']].concat(selectedPvalue)
            selectedPvalueBubble = [row['hiddenPvalue']+base].concat(selectedPvalueBubble)
            if(sIsize1>parseInt(row['intersection_size']))
                sIsize1 = parseInt(row['intersection_size'])
            if(sIsize2<parseInt(row['intersection_size']))
                sIsize2 = parseInt(row['intersection_size'])
            if(selectedPvalueRange[0]>row['hiddenPvalue'])
                selectedPvalueRange[0]=row['hiddenPvalue']
            if(selectedPvalueRange[1]<row['hiddenPvalue'])
                selectedPvalueRange[1]=row['hiddenPvalue']
            selectedIntersectionSize= [row['intersection_size']].concat(selectedIntersectionSize)
            selectedGeneNameInteractionsMap[row['name']]=[row['intersections'],row['hiddenPvalue'],row['intersection_size'], row['Source']]
        }
        // for(var key in selectedRowMap){
        //     selectedSource.push(key)
        //     selectedNames.push(selectedRowMap[key][4])
        //     selectedPvalue.push(selectedRowMap[key][1]/selectedRowMap[key][3])
        //     selectedIntersectionSize.push(10+selectedRowMap[key][1]/selectedRowMap[key][3])
        //     selectedColor.push(generateRandomColorName())
        // }
        // console.log(selectedSource)
        // console.log(selectedPvalue[0])
        // console.log(selectedPvalueBubble[0])
        // console.log(selectedNames[0])
        // console.log(selectedIntersectionSize)
        // console.log(resultSelection)
        // console.log(sIsize1)
        // console.log(sIsize2)
        // console.log(selectedGeneNameInteractionsMap)
        console.log(selectedIntersectionSize);
        colors = generateRandomColorName(selectedPvalue)
        normalizedSelectedIntersectionSize = normalizeArray(selectedIntersectionSize,baseValue);
        normalizedSelectedIntersectionSizeBKP = normalizedSelectedIntersectionSize
        selectedNamesBKP = selectedNames
        selectedPvalueBKP = selectedPvalue
        selectedPvalueBubbleBKP = selectedPvalueBubble
        selectedIntersectionSizeBKP = selectedIntersectionSize
        console.log('bubble: '+selectedPvalueBubble);
        console.log(selectedPvalue)
        var tracee = [{
            // y:[0],
            // x:[0],
            y:[selectedNames[0]],
            x:[selectedPvalueBubble[0]],
            mode: 'markers',
            type:'scatter',
            name: sIsize1+'',
            // name: '30',
            showlegend: true,
            // visible:false,
            marker: {
                size: [8],
                sizemode: 'area',
                // colorscale:'Bluered',
                // color:selectedPvalue[0],
                color:'black'
            }
        },{
            y:[selectedNames[0]],
            x:[selectedPvalueBubble[0]],
            type:'scatter',
            mode: 'markers',
            name:Math.round(sIsize1+((sIsize2-sIsize1)/3))+'',
            // name: '50',
            showlegend: true,
            // visible:false,
            marker: {
                size: [11],
                sizemode: 'area',
                // colorscale:'Bluered',
                // color:selectedPvalue[0],
                color:'black'
            }
        },{
            y:[selectedNames[0]],
            x:[selectedPvalueBubble[0]],
            type:'scatter',
            mode: 'markers',
            name:Math.round(sIsize1+(2*(sIsize2-sIsize1)/3))+'',
            // name: '50',
            showlegend: true,
            // visible:false,
            marker: {
                size: [14],
                sizemode: 'area',
                // colorscale:'Bluered',
                // color:selectedPvalue[0],
                color:'black'
            }
        },{
            y:[selectedNames[0]],
            x:[selectedPvalueBubble[0]],
            type:'scatter',
            mode: 'markers',
            name:sIsize2+'',
            // name: '80',
            showlegend: true,
            // visible:false,
            marker: {
                size: [18],
                sizemode: 'area',
                // colorscale:'Bluered',
                // color:selectedPvalue[0],
                color:'black'
            }
        },{
            y:selectedNames,
            // x:selectedPvalue,
            x: Array(selectedNames.length).fill(Math.max(...selectedPvalue)+2),
            type:'bar',
            orientation:'h',
            // base:base,
            base: 0,
            showlegend: false,
            // colorscale:'jet',
            width: 0.000001,
            // marker:{color:selectedPvalue, colorscale:'Bluered', colorbar:{title:'-log10(p-value)',y:0.4,len:0.4, thickness:20}}
            // marker:{color:'black', colorbar:{title:'-log10(p-value)',y:0.4,len:0.4, thickness:20}}
            marker:{color:'black'}
        },{
            y:selectedNames,
            x:selectedPvalueBubble,
            type:'scatter',
            mode:'markers',
            showlegend: false,
            // marker:{size:normalizedSelectedIntersectionSize,color:selectedPvalue,colorscale:'Bluered',colorbar:{title:'No of Genes',y:0.6,len:0.4,thickness:15}}
            marker:{size:normalizedSelectedIntersectionSize,color:selectedPvalue, colorscale:'Bluered',opacity:1,colorbar:{title:'-log10(p-value)',y:0.4,len:0.4, thickness:10}}
        }
        ]
        var layout = {
            barmode:'relative',
            showlegend:true,
            legend:{
                title:"Size",
                color:'black',
                x:1.015,y:0.9
            },
            width:768,
            height:568,
            // plot_bgcolor:'#ECECEC',
            plot_bgcolor:'white',
            yaxis:{
                // title:{text:'Pathway',font:{size:20}},
                automargin:'width+right',
                showgrid:false,
                autotick: true,
                showticklabels: true,
                zeroline: false,
                ticks:'inside',
                linecolor: 'black',
                linewidth: 1,
                mirror: true
            },
            xaxis:{
                title:{text:'<b>-log10(p-value)</b>',font:{size:20}},
                showgrid:false,
                autotick: true,
                zeroline: false,
                showticklabels: true,
                linecolor: 'black',
                linewidth: 1,
                mirror: true
            },
            annotations: [{
                xref: 'paper',
                yref: 'paper',
                x: 1,
                xanchor: 'left',
                y: 0.95,
                yanchor: 'top',
                text: '    N. of Genes',
                showarrow: false
              }],
        }
        Plotly.react('selectedResultBarPlot',tracee,layout)
        if(selectedSource.length==0){
            Plotly.purge('selectedResultBarPlot');
        }
        drawNetwork()
      })
    // pathwat details
    // pathwayDetailsTable.addEventListener('click',async ()=>{
    //     const selectedRows = gridOptionsforPathwayDetails.api.getSelectedRows();
    //     var pathwayDetailsPlot = document.getElementById("canvas-tab2-01-copy")
    //     var selectedGeneIndecies = []
    //     var index=0
    //     for(var row of selectedRows){
    //         // console.log(row)
    //         // console.log('row source', row['Source'])
    //         // console.log('pathway genemap',pathwayGeneMap[row['Source']])
    //         // for(var gene in pathwayGeneMap[row['Source']]){
    //         //     selectedGeneIndecies.push(selectedPointsIndices[ptGene.indexOf(querySourceMap[row['Source']][gene])])
    //         // }
    //         console.log(row['Source'])
    //         for(var gene of querySourceMap[row['Source']]){
    //             console.log(gene+" "+ptGene.indexOf(gene))
    //             selectedGeneIndecies.push(selectedPointsIndices[ptGene.indexOf(gene)])
    //         }
    //     }
    //     var tab2div01Copy = document.getElementById('canvas-tab2-01-copy');
    //     await Plotly.restyle(tab2div01Copy, {'selectedpoints': [selectedGeneIndecies], opacity:1,unselected: {
    //         marker: {
    //           color: '#00ff00',
    //           opacity: 0
    //         }, textfont: {
    //           color: 'transparent',
    //           opacity: 0
    //         }
    //       }},[1]);

    //     console.log(ptGene)
    //     console.log(querySourceMap)
    //     console.log(selectedPointsIndices)
    //     console.log(selectedGeneIndecies)
    //     console.log(selectedRows)
    //     console.log(pathwayTableSelection)
    // })
    // drawNetwork()
}

// var inputs = document.querySelectorAll('pathway-selection')
var inputs = document.querySelectorAll('.pathway-selection')
inputs.forEach(function(input){
    input.addEventListener('change',()=>{
        console.log('Inside input listener')
        var value = input.value;
        var name = input.name;
        chart(name,value)
    })
})

var dowloadPathwayPlot = document.getElementById('dowload-pathway-plot')
dowloadPathwayPlot.addEventListener('click',()=>{
    Plotly.downloadImage('selectedResultBarPlot',{format:'png'})
})

function chart(name,value){
    console.log(name+" "+value)
    if(name=='Circle Size'){
        baseValue=+value;
        normalizedSelectedIntersectionSize = normalizeArray(selectedIntersectionSize, baseValue)
    }
    else if(name=='Plot Theme'){
        plt_bgcolor=value
    }
    else if(name=='Aspect Ratio'){
        pltWidth=+value
    }
    else if(name=='Color'){
        colorscale=value;
    }
    else if(name=="Font Size"){
        yaxisFontSize = value
    }
    else if(name=="Sort by no of Genes"){
        if(value=="None"){
            selectedNames = selectedNamesBKP
            selectedPvalue = selectedPvalueBKP
            selectedPvalueBubble = selectedPvalueBubbleBKP
            selectedIntersectionSize = selectedIntersectionSizeBKP
            normalizedSelectedIntersectionSize = normalizedSelectedIntersectionSizeBKP
        }
        else
            Sort_by_no_of_Genes(value)
    }
    else{
        baseValue=baseValue
    }
    var tracee = [{
            // y:[0],
            // x:[0],
            y:[selectedNames[0]],
            x:[selectedPvalueBubble[0]],
            mode: 'markers',
            type:'scatter',
            name: sIsize1+'',
            // name: '30',
            showlegend: true,
            // visible:false,
            marker: {
                size: [8],
                sizemode: 'area',
                color:'black',
            }
        },{
            y:[selectedNames[0]],
            x:[selectedPvalueBubble[0]],
            type:'scatter',
            mode: 'markers',
            name:Math.round(sIsize1+((sIsize2-sIsize1)/3))+'',
            // name: '50',
            showlegend: true,
            // visible:false,
            marker: {
                size: [11],
                sizemode: 'area',
                // colorscale:'Bluered',
                // color:selectedPvalue[0],
                color:'black'
            }
        },{
            y:[selectedNames[0]],
            x:[selectedPvalueBubble[0]],
            type:'scatter',
            mode: 'markers',
            name:Math.round(sIsize1+(2*(sIsize2-sIsize1)/3))+'',
            // name: '50',
            showlegend: true,
            // visible:false,
            marker: {
                size: [14],
                sizemode: 'area',
                // colorscale:'Bluered',
                // color:selectedPvalue[0],
                color:'black'
            }
        },{
            y:[selectedNames[0]],
            x:[selectedPvalueBubble[0]],
            type:'scatter',
            mode: 'markers',
            name:sIsize2+'',
            // name: '80',
            showlegend: true,
            // visible:false,
            marker: {
                size: [18],
                sizemode: 'area',
                color:'black',
            }
        },{
            y:selectedNames,
            // x:selectedPvalue,
            x: Array(selectedPvalue.length).fill(Math.max(...selectedPvalue)+2),
            type:'bar',
            // base:base,
            orientation:'h',
            showlegend: false,
            // colorscale:'jet',
            width: 0.000001,
            marker:{color:'black'}
        },{
            y:selectedNames,
            x:selectedPvalueBubble,
            type:'scatter',
            mode:'markers',
            showlegend: false,
            // marker:{size:normalizedSelectedIntersectionSize,color:selectedPvalue,colorscale:'Bluered',colorbar:{title:'No of Genes',y:0.6,len:0.4,thickness:15}}
            marker:{size:normalizedSelectedIntersectionSize,color:selectedPvalue,opacity:1,colorscale:colorscale, colorbar:{title:'-log10(p-value)',y:0.4,len:0.4, thickness:10}}
        }
        ]
        var layout = {
            barmode:'relative',
            showlegend:true,
            legend:{
                title:"Size",
                color:'black',
                x:1.015,y:0.9
            },
            width:pltWidth,
            height:568,
            plot_bgcolor:plt_bgcolor,
            yaxis:{
                // title:{text:'Pathway',font:{size:20}},
                automargin:'width+right',
                showgrid:false,
                autotick: true,
                showticklabels: true,
                zeroline: false,
                tickfont:{size:yaxisFontSize},
                ticks:'inside',
                font:{
                    size:yaxisFontSize
                },
                linecolor: 'black',
                linewidth: 1,
                mirror: true,
            },
            xaxis:{
                title:{text:'<b>-log10(p-value)<b>',font:{size:20}},
                showgrid:false,
                autotick: true,
                zeroline: false,
                showticklabels: true,
                linecolor: 'black',
                linewidth: 1,
                mirror: true,
            },
            annotations: [{
                xref: 'paper',
                yref: 'paper',
                x: 1,
                xanchor: 'left',
                y: 0.95,
                yanchor: 'top',
                text: '  N. of Genes',
                showarrow: false
              }]
        }
        Plotly.react('selectedResultBarPlot',tracee,layout)
        if(selectedSource.length==0){
            Plotly.purge('selectedResultBarPlot');

        }
}

// drawNetwork()
// async function drawNetwork(ptGene, pt01Out, pt02Out, pt01OutText, pt02OutText){
// async function drawNetwork(){
//     if(drawNetworkVisited==true){
//         return
//     }
//     drawNetworkVisited=true
//     // if(gProfilerResponse==undefined || gProfilerResponse.length==0){
//     //     document.getElementById("cy").innerText="No Pathways"
//     // }
//     var pathwayName = [], pathwayGenes = {}
//     var elements = []
//     for(var i=0;i<gProfilerResponse.length;i++){
//         var intersections = selectedGeneNameInteractionsMap[key][0];
//         pathwayName.push(gProfilerResponse[i]['name'])
//         elements.push(
//             {
//                 data:{id:gProfilerResponse[i]['name']}
//             }
//         )

//         var uniqueList = [...new Set(intersections.flat())];
//         console.log(uniqueList)
//         for(var j=0;j<uniqueList.length;j++){
//             if(pathwayGenes[uniqueList[j]]==undefined)
//                 pathwayGenes[uniqueList[j]]=[gProfilerResponse[i]['name']]
//             else
//                 pathwayGenes[uniqueList[j]].push(gProfilerResponse[i]['name'])
//             console.log(uniqueList[j])
//             console.log(pathwayGenes[uniqueList[j]])
//         }
//         console.log(gProfilerResponse[i]['name'])
//         console.log(elements)
//     }
//     var edges = []
//     console.log(pathwayGenes)
//     for(var key in pathwayGenes){
//         console.log(pathwayGenes[key])
//         edges = edges.concat(await pairElements(pathwayGenes[key]))
//     }
//     console.log(elements)
//     elements=elements.concat(edges)
//     console.log(elements)
//     //cytoscape.warnings(false)
//     var cy = cytoscape({

//         container: document.getElementById('cy'), // container to render in
      
//         layout: {
//               name: 'cose',
//               idealEdgeLength: 100,
//               nodeOverlap: 20,
//               refresh: 20,
//               fit: true,
//               padding: 30,
//               randomize: false,
//               componentSpacing: 100,
//               nodeRepulsion: 400000,
//               edgeElasticity: 100,
//               nestingFactor: 5,
//               gravity: 80,
//               numIter: 1000,
//               initialTemp: 200,
//               coolingFactor: 0.95,
//               minTemp: 1.0
//             },
//         elements: elements,
      
//     //     style: [{
//     //     "selector": "core",
//     //     "style": {
//     //       "selection-box-color": "#AAD8FF",
//     //       "selection-box-border-color": "#8BB0D0",
//     //       "selection-box-opacity": "0.5"
//     //     }
//     //   }, {
//     //     "selector": "node",
//     //     "style": {
//     //       "width": "mapData(score, 0, 0.006769776522008331, 20, 60)",
//     //       "height": "mapData(score, 0, 0.006769776522008331, 20, 60)",
//     //       "content": "data(name)",
//     //       "font-size": "12px",
//     //       "text-valign": "center",
//     //       "text-halign": "center",
//     //       "background-color": "#555",
//     //       "text-outline-color": "#555",
//     //       "text-outline-width": "2px",
//     //       "color": "#fff",
//     //       "overlay-padding": "6px",
//     //       "z-index": "10",
//     //       "label":"data(id)",
//     //     }
//     //   }, {
//     //     "selector": "node[?attr]",
//     //     "style": {
//     //       "shape": "rectangle",
//     //       "background-color": "#aaa",
//     //       "text-outline-color": "#aaa",
//     //       "width": "16px",
//     //       "height": "16px",
//     //       "font-size": "6px",
//     //       "z-index": "1"
//     //     }
//     //   }, {
//     //     "selector": "node[?query]",
//     //     "style": {
//     //       "background-clip": "none",
//     //       "background-fit": "contain"
//     //     }
//     //   }, {
//     //     "selector": "node:selected",
//     //     "style": {
//     //       "border-width": "6px",
//     //       "border-color": "#AAD8FF",
//     //       "border-opacity": "0.5",
//     //       "background-color": "#77828C",
//     //       "text-outline-color": "#77828C"
//     //     }
//     //   }, {
//     //     "selector": "edge",
//     //     "style": {
//     //       "curve-style": "haystack",
//     //       "haystack-radius": "0.5",
//     //       "opacity": "0.4",
//     //       "line-color": "#bbb",
//     //       "width": "mapData(weight, 0, 1, 1, 8)",
//     //       "overlay-padding": "3px",
//     //     }
//     //   }, {
//     //     "selector": "node.unhighlighted",
//     //     "style": {
//     //       "opacity": "0.2"
//     //     }
//     //   }, {
//     //     "selector": "edge.unhighlighted",
//     //     "style": {
//     //       "opacity": "0.05"
//     //     }
//     //   }, {
//     //     "selector": ".highlighted",
//     //     "style": {
//     //       "z-index": "999999"
//     //     }
//     //   }, {
//     //     "selector": "node.highlighted",
//     //     "style": {
//     //       "border-width": "6px",
//     //       "border-color": "#AAD8FF",
//     //       "border-opacity": "0.5",
//     //       "background-color": "#394855",
//     //       "text-outline-color": "#394855"
//     //     }
//     //   }, {
//     //     "selector": "edge.filtered",
//     //     "style": {
//     //       "opacity": "0"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"coexp\"]",
//     //     "style": {
//     //       "line-color": "#d0b7d5"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"coloc\"]",
//     //     "style": {
//     //       "line-color": "#a0b3dc"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"gi\"]",
//     //     "style": {
//     //       "line-color": "#90e190"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"path\"]",
//     //     "style": {
//     //       "line-color": "#9bd8de"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"pi\"]",
//     //     "style": {
//     //       "line-color": "#eaa2a2"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"predict\"]",
//     //     "style": {
//     //       "line-color": "#f6c384"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"spd\"]",
//     //     "style": {
//     //       "line-color": "#dad4a2"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"spd_attr\"]",
//     //     "style": {
//     //       "line-color": "#D0D0D0"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"reg\"]",
//     //     "style": {
//     //       "line-color": "#D0D0D0"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"reg_attr\"]",
//     //     "style": {
//     //       "line-color": "#D0D0D0"
//     //     }
//     //   }, {
//     //     "selector": "edge[group=\"user\"]",
//     //     "style": {
//     //       "line-color": "#f0ec86"
//     //     }
//     //   }]
//     //   ,
//     style: [ // the stylesheet for the graph
//     {
//       selector: 'node',
//       style: {
//         'background-color': '#666',
//         'label': 'data(id)'
//       }
//     },

//     {
//       selector: 'edge',
//       style: {
//         'width': 3,
//         'line-color': '#ccc',
//         'target-arrow-color': '#ccc',
//         'target-arrow-shape': 'triangle',
//         'curve-style': 'bezier'
//       }
//     }
//   ],
      
//       });

// }

var edgeCutOffEle = document.getElementById('edgeCutOff'),edgeCutOff=0
var cy;
edgeCutOffEle.addEventListener('change',()=>{
    edgeCutOff=+edgeCutOffEle.value
    drawNetwork();
})

async function drawNetwork(){
    // if(drawNetworkVisited==true){
    //     return
    // }
    // drawNetworkVisited=true
    // if(gProfilerResponse==undefined || gProfilerResponse.length==0){
    //     document.getElementById("cy").innerText="No Pathways"
    // }
    var pathwayName = [], pathwayGenes = {}
    var elements = []
    edgesMap={},maxGeneCountInPathway=0
    console.log(selectedGeneNameInteractionsMap)
    for(var key in selectedGeneNameInteractionsMap){
        // var intersections = selectedGeneNameInteractionsMap[key][0];
        // var intersections = pagGenes.filter(value => ptGene.includes(value))
        var intersections = pagGenesMap[selectedGeneNameInteractionsMap[key][3]]
        console.log(intersections)
        var name = key
        pathwayName.push(name)
        elements.push(
            {
                data:{id:name,weight:selectedGeneNameInteractionsMap[key][1],intersectionSize:selectedGeneNameInteractionsMap[key][2]}
            }
        )
        
        // var uniqueList = [...new Set(intersections.flat())];
        var uniqueList = intersections
        console.log(uniqueList)
        for(var j=0;j<uniqueList.length;j++){
            if(pathwayGenes[uniqueList[j]]==undefined)
                pathwayGenes[uniqueList[j]]=[name]
            else
                pathwayGenes[uniqueList[j]].push(name)
            console.log(uniqueList[j])
            console.log(pathwayGenes[uniqueList[j]])
        }
        console.log(name)
        console.log(elements)
    }
    var edgesList = []
    console.log(pathwayGenes)
    for(var key in pathwayGenes){
        console.log(pathwayGenes[key])
        // edgesList = edgesList.concat(await pairElements(pathwayGenes[key],key))
        await pairElements(pathwayGenes[key],key)
    }
    var tempEdgeList = []
    console.log(edgesMap)
    edgesList = Object.values(edgesMap)
    var sumIntersectionSize=selectedIntersectionSize.reduce((a, b) => a + b);
    console.log(maxGeneCountInPathway)
    for(var i=0;i<edgesList.length;i++){
        if(edgesList[i]['data']['geneCount']>maxGeneCountInPathway*edgeCutOff)
            tempEdgeList.push(edgesList[i]) 
    }
    edgesList=tempEdgeList
    console.log(edgesList)
    console.log(elements)
    elements=elements.concat(edgesList)
    console.log(elements)
    cytoscape.warnings(false)
    cy = cytoscape({

        container: document.getElementById('cy'), // container to render in
      
        layout: {
            //   name: 'cola',
              name: 'cose',
            //   name:'cose-bilkent',
              idealEdgeLength: 100,
              nodeOverlap: 20,
              refresh: 20,
              fit: true,
              padding: 30,
              randomize: false,
              componentSpacing: 100,
              nodeRepulsion: 400000,
              edgeElasticity: 100,
              nestingFactor: 5,
              gravity: 80,
              numIter: 1000,
              initialTemp: 200,
              coolingFactor: 0.95,
              minTemp: 1.0
            },
        elements: elements,
      
    //     style: [{
    //     "selector": "core",
    //     "style": {
    //       "selection-box-color": "#AAD8FF",
    //       "selection-box-border-color": "#8BB0D0",
    //       "selection-box-opacity": "0.5"
    //     }
    //   }, {
    //     "selector": "node",
    //     "style": {
    //       "width": "mapData(score, 0, 0.006769776522008331, 20, 60)",
    //       "height": "mapData(score, 0, 0.006769776522008331, 20, 60)",
    //       "content": "data(name)",
    //       "font-size": "12px",
    //       "text-valign": "center",
    //       "text-halign": "center",
    //       "background-color": "#555",
    //       "text-outline-color": "#555",
    //       "text-outline-width": "2px",
    //       "color": "#fff",
    //       "overlay-padding": "6px",
    //       "z-index": "10",
    //       "label":"data(id)",
    //     }
    //   }, {
    //     "selector": "node[?attr]",
    //     "style": {
    //       "shape": "rectangle",
    //       "background-color": "#aaa",
    //       "text-outline-color": "#aaa",
    //       "width": "16px",
    //       "height": "16px",
    //       "font-size": "6px",
    //       "z-index": "1"
    //     }
    //   }, {
    //     "selector": "node[?query]",
    //     "style": {
    //       "background-clip": "none",
    //       "background-fit": "contain"
    //     }
    //   }, {
    //     "selector": "node:selected",
    //     "style": {
    //       "border-width": "6px",
    //       "border-color": "#AAD8FF",
    //       "border-opacity": "0.5",
    //       "background-color": "#77828C",
    //       "text-outline-color": "#77828C"
    //     }
    //   }, {
    //     "selector": "edge",
    //     "style": {
    //       "curve-style": "haystack",
    //       "haystack-radius": "0.5",
    //       "opacity": "0.4",
    //       "line-color": "#bbb",
    //       "width": "mapData(weight, 0, 1, 1, 8)",
    //       "overlay-padding": "3px",
    //     }
    //   }, {
    //     "selector": "node.unhighlighted",
    //     "style": {
    //       "opacity": "0.2"
    //     }
    //   }, {
    //     "selector": "edge.unhighlighted",
    //     "style": {
    //       "opacity": "0.05"
    //     }
    //   }, {
    //     "selector": ".highlighted",
    //     "style": {
    //       "z-index": "999999"
    //     }
    //   }, {
    //     "selector": "node.highlighted",
    //     "style": {
    //       "border-width": "6px",
    //       "border-color": "#AAD8FF",
    //       "border-opacity": "0.5",
    //       "background-color": "#394855",
    //       "text-outline-color": "#394855"
    //     }
    //   }, {
    //     "selector": "edge.filtered",
    //     "style": {
    //       "opacity": "0"
    //     }
    //   }, {
    //     "selector": "edge[group=\"coexp\"]",
    //     "style": {
    //       "line-color": "#d0b7d5"
    //     }
    //   }, {
    //     "selector": "edge[group=\"coloc\"]",
    //     "style": {
    //       "line-color": "#a0b3dc"
    //     }
    //   }, {
    //     "selector": "edge[group=\"gi\"]",
    //     "style": {
    //       "line-color": "#90e190"
    //     }
    //   }, {
    //     "selector": "edge[group=\"path\"]",
    //     "style": {
    //       "line-color": "#9bd8de"
    //     }
    //   }, {
    //     "selector": "edge[group=\"pi\"]",
    //     "style": {
    //       "line-color": "#eaa2a2"
    //     }
    //   }, {
    //     "selector": "edge[group=\"predict\"]",
    //     "style": {
    //       "line-color": "#f6c384"
    //     }
    //   }, {
    //     "selector": "edge[group=\"spd\"]",
    //     "style": {
    //       "line-color": "#dad4a2"
    //     }
    //   }, {
    //     "selector": "edge[group=\"spd_attr\"]",
    //     "style": {
    //       "line-color": "#D0D0D0"
    //     }
    //   }, {
    //     "selector": "edge[group=\"reg\"]",
    //     "style": {
    //       "line-color": "#D0D0D0"
    //     }
    //   }, {
    //     "selector": "edge[group=\"reg_attr\"]",
    //     "style": {
    //       "line-color": "#D0D0D0"
    //     }
    //   }, {
    //     "selector": "edge[group=\"user\"]",
    //     "style": {
    //       "line-color": "#f0ec86"
    //     }
    //   }]
    //   ,
    
    style: [ // the stylesheet for the graph
    {
      selector: 'node',
      style: {
        'width': "mapData(intersectionSize, "+sIsize1+","+ sIsize2+", 20, 60)",
        'height': "mapData(intersectionSize, "+sIsize1+","+ sIsize2+", 20, 60)",
        'background-color': "mapData(weight, "+selectedPvalueRange[0]+","+ selectedPvalueRange[1]+", blue, red)",
        'label': 'data(id)'
      }
    },

    {
      selector: 'edge',
      style: {
        // "display":function(ele){
        //     console.log(ele.data('geneCount')/maxGeneCountInPathway)
        //     if(ele.data('geneCount')/maxGeneCountInPathway>=edgeCutOff)
        //         return 'visible'
        //     else
        //         return 'none'
        // },
        // 'width': "mapData(geneCount, "+0+","+maxGeneCountInPathway+", 1, 10)",
        "width": 1,
        'line-color': '#ccc',
        // 'target-arrow-color': '#ccc',
        // 'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    }
  ],
      
      });
    //cy.remove('edge[geneCount<='+maxGeneCountInPathway*edgeCutOff+']');
    // cy.run()
}

async function pairElements(originalList,gene){
    // alert(originalList)
    // Initialize an empty array to store the pairs
    const pairs = [];
    // var edgees = []
    var listLen = originalList.length;
    // alert(listLen)
    if(listLen<2)
        return []
    // Use nested loops to generate pairs
    for (let i = 0; i < listLen-1; i++) {
        for (let j = i + 1; j < listLen; j++) {
            pairs.push([originalList[i], originalList[j]]);
            if(edgesMap[originalList[i]+originalList[j]]==undefined){
                edgesMap[originalList[i]+originalList[j]]={
                    data:{id:originalList[i]+originalList[j], source:originalList[i], target:originalList[j],geneList:[gene],geneCount:1}
                }
            }
            else{
                console.log(edgesMap[originalList[i]+originalList[j]]['data']['geneList'])
                edgesMap[originalList[i]+originalList[j]]={
                    data:{id:originalList[i]+originalList[j], source:originalList[i], target:originalList[j], geneList:edgesMap[originalList[i]+originalList[j]]['data']['geneList'].concat(gene), geneCount:edgesMap[originalList[i]+originalList[j]]['data']['geneCount']+1}
                }
                if(maxGeneCountInPathway<edgesMap[originalList[i]+originalList[j]]['data']['geneCount'])
                    maxGeneCountInPathway = edgesMap[originalList[i]+originalList[j]]['data']['geneCount']
            }
        }
    }
    // alert(edgees)
    // return edgees
}

function Sort_by_no_of_Genes(asc){

    const indexedArray = selectedIntersectionSize.map((value, index) => ({ value, index }));

    if(asc=="true")
        indexedArray.sort((a, b) => a.value - b.value);
    else
        indexedArray.sort((a, b) => b.value - a.value);

    selectedNames = indexedArray.map((item) => selectedNames[item.index]);
    selectedPvalue = indexedArray.map((item) => selectedPvalue[item.index]);
    selectedPvalueBubble = indexedArray.map((item) => selectedPvalueBubble[item.index]);
    normalizedSelectedIntersectionSize = indexedArray.map((item) => normalizedSelectedIntersectionSize[item.index]);
    selectedIntersectionSize = indexedArray.map((item) => selectedIntersectionSize[item.index]);
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

let percentile = (arr, p) => {
    if (arr.length === 0) return 0;
    if (typeof p !== 'number') throw new TypeError('p must be a number');
    if (p <= 0) return arr[0];
    if (p >= 1) return arr[arr.length - 1];

    let index = arr.length * p,
        lower = Math.floor(index),
        upper = lower + 1,
        weight = index % 1;
    if (upper >= arr.length) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
};

function normalizeArray(arr,baseValue) {
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
    const stdDev = Math.sqrt(arr.reduce((acc, val) => 0.1+acc + Math.pow(val - mean, 2), 0) / arr.length);
    const normalizedArr = arr.map((value) => baseValue+20+(value - mean) * 5 / stdDev);
    return normalizedArr;
  }

// Function to calculate the p-value for a two-sample t-test without using libraries
const calculatePValue = (array1, array2) => {
    "use strict";
    const length = Math.max(array1.length, array2.length);
    const mean1 = array1.reduce((a, b) => a + b, 0) / array1.length;
    const mean2 = array2.reduce((a, b) => a + b, 0) / array2.length;
    const variance1 = array1.map((a) => a - mean1).reduce((a, b) => a + b * b, 0) / array1.length;
    const variance2 = array2.map((a) => a - mean2).reduce((a, b) => a + b * b, 0) / array2.length;
    const t = (mean1 - mean2) / Math.sqrt(variance1 / array1.length + variance2 / array2.length);
    const p = 2 * Math.min(1, Math.exp(-t * t / 2));
    return p;
  };
  
  // Function to calculate the cumulative distribution function (CDF) of the t-distribution
  async function tCDF(x, df) {
    const beta = Math.atan2(x, Math.sqrt(df));
    const alpha = df / 2;
    const incompleteBeta = (z, a, b) => {
      const betainc = (t, x, d) => {
        const betacf = (z, a, b) => {
          const maxIterations = 100;
          const epsilon = 1e-8;
  
          let m = 1;
          let qab = a + b;
          let qap = a + 1;
          let qam = a - 1;
          let c = 1;
          let d = 1 - qab * x / qap;
  
          while (Math.abs(d) > epsilon && m < maxIterations) {
            const m2 = 2 * m;
            const aa = m * (b - m) * x / ((qam + m2) * (a + m2));
            d = 1 + aa * d;
            c = 1 + aa / c;
            d = 1 / d;
            const del = d * c;
            const h = del * Math.exp(m2 * Math.log(x) + (qam - 1) * Math.log(1 - x));
            d = -h;
            m++;
          }
  
          return d;
        };
  
        return t < (a + 1) / (a + b + 2) ? 1 - betacf(z, a, b) : betacf(z, b, a);
      };
  
      return (Math.pow(Math.sin(beta), 2 * alpha) * Math.exp(-alpha * Math.log(1 + Math.pow(Math.tan(beta), 2) / df))) / (Math.PI * df * betainc(Math.tan(beta), alpha, 0.5));
    };
  
    return 0.5 + (x > 0 ? 1 - 0.5 * incompleteBeta(x * x / (x * x + df), df / 2, 0.5) : 0.5 * incompleteBeta(x * x / (x * x + df), df / 2, 0.5));
  }
  

const getGenesFromPags = async(PAGids)=>{
    var response;
    await fetch(PAGIDGENE_URL+PAGids)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json(); 
    })
    .then(dataArray => {
      
      console.log(dataArray);
      response = dataArray
    })
    .catch(error => console.error('Error:', error));
    return response
  }
var pagGenes=[]
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

  var myHeaders = new Headers();
  myHeaders.append("Cookie", "PHPSESSID=9he1k1idc849k6j6gki3jlbn23");
  myHeaders.append('Access-Control-Allow-Origin','http://127.0.0.1:5500/')
//   myHeaders.append("Access-Control-Allow-Origin", "*");
//   myHeaders.append('Accept','*/*');
//   myHeaders.append('Connection','keep-alive')
//   myHeaders.append('Accept-Encoding','gzip, deflate, br')
//   myHeaders.append('User-Agent','PostmanRuntime/7.32.3')
//   myHeaders.append('Content-Length','');
//   myHeaders.append('Content-Type','multipart/form-data;boundary=141');
//   myHeaders.append('Content-Type','');
//   myHeaders.append('Host','');
//   myHeaders.append('Content-Length',200)
  
//   var formdata = new FormData();
//   formdata.append("genes", "BRCA1%20BRCA2");
//   formdata.append("type", "All");
//   formdata.append("ge", "2");
//   formdata.append("le", "5000");
//   formdata.append("sim", "0");
//   formdata.append("olap", "1");
//   formdata.append("organism", "All");
//   formdata.append("source", "KEGG_2021_HUMAN%20WikiPathway_2021");
//   formdata.append("cohesion", "0");
//   formdata.append("pvalue", ".05");
//   formdata.append("FDR", "0.05");

//   var formdata = {
//     "genes": ["MYC"],
//     "source": ["WikiPathway_2021"],
//     "type": "All",
//     "sim": 0,
//     "olap": 1,
//     "organism": "Homo sapiens",
//     "cohesion": "0",
//     "pvalue": 0.05,
//     "FDR": 0.05,
//     "ge": 1,
//     "le": 2000
// }
  
//   var requestOptions = {
//     method: 'POST',
//     // headers: myHeaders,
//     body: formdata,
//     redirect: 'follow',
//   };
// //   var response = fetch("http://discovery.informatics.uab.edu/PAGER/index.php/geneset/pagerapi", requestOptions).catch(error=>console.log('error : '+error));
// var response;
// fetch("http://127.0.0.1:5000/", {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify(formdata)
// })
// .then(response => {
//   if (!response.ok) {
//     throw new Error('Network response was not ok');
//   }
//   return response.json(); // Parse response body as JSON
// })
// .then(dataArray => {
//   // Iterate over the array of JSON objects
//   console.log('Pager API result for MYC gene')
//   console.log(dataArray);
// })
// .catch(error => console.error('Error:', error));

// console.log(response)
