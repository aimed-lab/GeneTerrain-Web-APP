import exp from "constants";
import { stringify } from "querystring";
const csvtojson=require("csvtojson");
var store = require('store')

interface myObject {id:number;sampleId: string; overal_survival__days_:number; overal_survival_status:number; gbm_subtype:string; age_at_gbm_diagnosis:number }
var output=[];
var layoutOutput=[];
var expOutput=[];
var genes=[];
var geneRelationMapName= new Map<string, any>();
var geneRelationMapScore= new Map<string, any>();
var expGeneMap = new Map<string, any>();
// var plotDataURLS = ['https://discovery.informatics.uab.edu/apex/gtkb/sample/all?offset=',
//                     'https://discovery.informatics.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/MRNA_301?offset=',
//                     'https://discovery.informatics.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/MRNA_325?offset=',
//                     'https://discovery.informatics.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/GLSS?offset=']

// var expURLS = {
//     "TCGA":"https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/cleaned_GBM/TCGA/",
//   "GSM":"https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/CGGA_Illumina_HiSeq_2000/",
//   "CGGA":"https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/CGGA_Illumina_HiSeq_2000_or_2500/",
//   "IVYGAP": "https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/IvyGap/",
//   "GLSS":"https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/GLSS/"
// }

var plotDataURLS = ['https://aimed.uab.edu/apex/gtkb/sample/all?offset=',
                    'https://aimed.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/MRNA_301?offset=',
                    'https://aimed.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/MRNA_325?offset=',
                    'https://aimed.uab.edu/apex/gtkb/clinical_data/GBM/CGGA/GLSS?offset=']

var expURLS = {
    "TCGA":"https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_GBM/TCGA/",
  "GSM":"https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/CGGA_Illumina_HiSeq_2000/",
  "CGGA":"https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/CGGA_Illumina_HiSeq_2000_or_2500/",
  "IVYGAP": "https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/IvyGap/",
  "GLSS":"https://aimed.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/GLSS/"
}

export async function loadAllExpData(){

    const url = 'https://aimed.uab.edu/apex/gtkb/gene_exp/all?offset='
    // const url = 'https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/GBM?offset='
    // const url = 'https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/cleaned_gbm?offset='
    var i=0,limit=10000;
    while(true){
        var updatedURL=url+(i++*limit).toString();
        var jsonData;
        const plotData = async ()=>{
            const response = await fetch(updatedURL,{method:'GET'});
            jsonData = await response.json();
            // console.log('exp data: '+jsonData)
        }
        await plotData().then(()=>{
            console.log(jsonData['items'])
            setAllExpData(jsonData['items'])
        })
        if(jsonData==undefined || jsonData['count']==0){
            // console.log('reason :'+jsonData);
            break;
        }
    }
    //setGenes();
    return [];
}

export async function loadExpData(selectedDataset: string, sampleIDS: string[]){
    expOutput=[]
    console.log('rest.ts || loadExpData || Start');
    const startTime = new Date().getTime();
    const urls = [];
    // const urll = 'https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/';
    var urll;
    // for(var sample of sampleIDS){
    //     if(sample.search('_')!=-1)
    //         urll = expURLS[sample.split("_")[0]]
    //     else
    //         urll = expURLS[sample.split("-")[0]]
    //     urls.push(urll+sample)
    //     // urls.push(urll+sample+'?offset=10000')
    //     //urls.push(urll+sample+'?offset=20000')
    // }
    sampleIDS.map((sample)=>{
        if(sample.search('_')!=-1)
            urll = expURLS[sample.split("_")[0]]
        else
            urll = expURLS[sample.split("-")[0]]
        urls.push(urll+sample)
    })
    let requests = urls.map(url =>    fetch(url, {
        method: 'GET',
    }).then(response => response.json()).then(response => {expOutput=expOutput.concat(response['items']);console.log(expOutput.length)})
    );
    await Promise.all(requests)
    .then(responses => {
        // responses is an array of responses        // responses[0] is the response for the first request        // responses[1] is the response for the second request, etc.        
        // console.log(responses);
    })
    .catch(error => {
        console.error(error);
    });
    const endTime = new Date().getTime();
    console.log('load exp time taken: '+(endTime-startTime));
    console.log('rest.ts || loadExpData || End');
}

// export async function loadExpData(selectedDataset: string, sampleIDS: string[]){
//     expOutput=[]
//     console.log('rest.ts || loadExpData || Start');
//     const startTime = new Date().getTime();
//     const urls = [];
//     // const urll = 'https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/cleaned_gbm/';
//     var datasetSampleidMap = new Map();
//     for(var sample of sampleIDS){
//         if(sample.search('_')!=-1){
//             var datasetName = sample.split("_")[0]
//             if(datasetSampleidMap[datasetName]!=undefined)
//                 datasetSampleidMap[datasetName] += sample+","
//             else   
//                 datasetSampleidMap[datasetName] = ""
//         }
//         else{
//             var datasetName = sample.split("-")[0]
//             if(datasetSampleidMap[datasetName]!=undefined)
//                 datasetSampleidMap[datasetName] += sample+","
//             else   
//                 datasetSampleidMap[datasetName] = ""
//         }
//     }
//     for (var key of Object.keys(datasetSampleidMap)) {
//         console.log(expURLS[key]+datasetSampleidMap[key])
//         urls.push(expURLS[key]+datasetSampleidMap[key])
//     }
//     for(var url of urls){
//         var i=0,limit=10000;
//         while(true){
//             var updatedURL = url+"?offset="+(i++*limit).toString();
//             console.log(updatedURL)
//             var jsonData;
//             const plotData = async ()=>{
//                 const response = await fetch(updatedURL,{method:'GET'});
//                 jsonData = await response.json();
//                 // console.log('exp data: '+jsonData)
//             }
//             await plotData().then(()=>{
//                 // console.log(jsonData['items'])
//                 console.log('exp json data loaded')
//                 setAllExpData(jsonData['items'])
//             })
//             if(jsonData==undefined || jsonData['count']==0){
//                 // console.log('reason :'+jsonData);
//                 break;
//             }
//         }
//     }
//     console.log(expOutput)
//     // for(var sample of sampleIDS){
//     //     var datasettName;
//     //     if(sample.search('_')!=-1){
//     //         urll = expURLS[sample.split("_")[0]]
//     //         datasettName=sample.split("_")[0]
//     //     }
//     //     else{
//     //         urll = expURLS[sample.split("-")[0]]
//     //         datasettName=sample.split("-")[0]
//     //     }
//     //     urls.push(urll+datasetSampleidMap[datasettName])
//     //     // urls.push(urll+sample+'?offset=10000')
//     //     //urls.push(urll+sample+'?offset=20000')
//     // }
//     // let requests = urls.map(url =>    fetch(url, {
//     //     method: 'GET',
//     // }).then(response => response.json()).then(response => {expOutput=expOutput.concat(response['items']);console.log(expOutput.length)})
//     // );
//     // await Promise.all(requests)
//     // .then(responses => {
//     //     // responses is an array of responses        // responses[0] is the response for the first request        // responses[1] is the response for the second request, etc.        
//     //     // console.log(responses);
//     // })
//     // .catch(error => {
//     //     console.error(error);
//     // });
//     // const endTime = new Date().getTime();
//     // console.log('load exp time taken: '+(endTime-startTime));
//     console.log('rest.ts || loadExpData || End');
// }

export async function loadExpData1(sampleIDS: string[]){
    const startTime = new Date().getTime();
    expOutput=[];
    // const url = 'https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/all?offset='
    // const url = 'https://discovery.informatics.uab.edu/apex/gtkb/gene_exp/GBM?offset='
    const url = 'https://aimed.uab.edu/apex/gtkb/gene_exp/'
    var i=0,limit=10000;
    for(var sample of sampleIDS){
        while(true){
        var updatedURL = url+sample+"?offset="+(i++*limit).toString();
        var jsonData;
        const plotData = async ()=>{
            const response = await fetch(updatedURL,{method:'GET'});
            jsonData = await response.json();
            // console.log('exp data: '+jsonData)
        }
        await plotData().then(()=>{
            // console.log(jsonData['items'])
            console.log('exp json data loaded')
            setAllExpData(jsonData['items'])
        })
        if(jsonData==undefined || jsonData['count']==0){
            // console.log('reason :'+jsonData);
            break;
        }
    }
    }
    // setGenes();
    const endTime = new Date().getTime();
    console.log(endTime-startTime);
    return [];
}

export async function loadLayoutData(){

    const url = 'https://aimed.uab.edu/apex/gtkb/layout/all?offset='
    var i=0,limit=100;
    while(true){
        var updatedURL=url+(i++*limit).toString();
        var jsonData;
        const plotData = async ()=>{
            const response = await fetch(updatedURL,{method:'GET'});
            jsonData = await response.json();
        }
        await plotData().then(()=>{
            setLayoutData(jsonData['items'])
            //console.log(jsonData['items'])
        })
        if(jsonData==undefined || jsonData['count']==0){
            // console.log('reason :'+jsonData);
            break;
        }
    }
    setGenes();
    return [];
}

export async function loadPlotData(){

    // var url = 'https://discovery.informatics.uab.edu/apex/gtkb/sample/all?offset='
    for(var urlIndex in plotDataURLS){
        var url = plotDataURLS[urlIndex]
        var i=0,limit=10000;
        while(true){
            var updatedURL=url+(i++*limit).toString();
            var jsonData;
            const plotData = async ()=>{
                const response = await fetch(updatedURL,{method:'GET'});
                jsonData = await response.json();
            }
            await plotData().then(()=>{
                setPlotData(jsonData['items'])
                // console.log((i++*limit).toString())
                // console.log(jsonData['items'])
            })
            if(jsonData==undefined || jsonData['count']==0){
                // console.log('reason :'+jsonData);
                break;
            }
        }
    }
    return [];
}

export async function loadGeneRelation(){
  console.log('rest.ts || loadGeneRelation || start')
  var path = './csv/BEERE_PPI_GBM.csv';
  var data, fileContent;
  var reader = new FileReader();
  const response: Response = await fetch(path);
  await response.text().then(d=>{
    // console.log('response '+d);
    fileContent=d;
  })
  await csvtojson({noheader:true}).fromString(fileContent).then((jsonObjectArray) => {
    data = jsonObjectArray;
  })
  .catch((error) => {
    console.error(error);
  });
  var rowData = data;
    //   console.log(data.length);
    //   console.log(data[0].size);
    //   console.log(data[0]['field1'])
  for(var i=1;i<data.length;i++){
    geneRelationMapName[data[i]['field1'].toUpperCase()]=[];
    geneRelationMapScore[data[i]['field1'].toUpperCase()]=[];
  }
  for(var i=1;i<data.length;i++){
    geneRelationMapName[data[i]['field1'].toUpperCase()].push(data[i]['field1'].toUpperCase());
    geneRelationMapName[data[i]['field1'].toUpperCase()].push(data[i]['field2'].toUpperCase());
    geneRelationMapScore[data[i]['field1'].toUpperCase()].push([data[i]['field2'].toUpperCase(),data[i]['field3']]);
  }
  console.log('rest.ts || loadGeneRelation || end')
    // console.log(geneRelationMapName);
}


// loadGeneRelation()
// loadLayoutData()
// loadPlotData()
// loadExpData()



function setPlotData(jsonData){
    output=output.concat(jsonData);
}
function setLayoutData(jsonData){
    layoutOutput=layoutOutput.concat(jsonData);
    // console.log('layout output length: '+layoutOutput.length);
}
function setAllExpData(jsonData){
    expOutput=expOutput.concat(jsonData);
    // console.log('exp output length: '+expOutput.length);
}
function setGenes(){
    console.log('rest.ts || setGenes || start')
    // console.log('layout output: '+layoutOutput)
    if(layoutOutput==undefined){
        genes=[];
        return;
    }
    for(var i=0;i<layoutOutput.length;i++){
        genes.push(layoutOutput[i].gene.toUpperCase());
    }
    console.log('rest.ts || setGenes || end')
}



export function getPlotData(){
    return output;
}
export function getLayoutData(){
    return layoutOutput;
}
export function getExpData(){
    return expOutput;
}
export function getGenes(){
    // console.log('gene names: '+genes)
    return genes;
}
export function getXandY(){
    // console.log('layout in rest.ts '+layoutOutput);
    var layoutMap = new Map<string, any>();
    for(var i=0;i<layoutOutput.length;i++){
        layoutMap[layoutOutput[i].gene.toUpperCase()]=[layoutOutput[i].gene.toUpperCase(), layoutOutput[i].x, layoutOutput[i].y]
    }
    console.log('getXandY completed');
    return layoutMap;
}
export function getAllExp(){
    var expMap = new Map<string, any>();
    // console.log(expOutput)
    for(var i=0;i<expOutput.length;i++){
        expMap[expOutput[i].sampleid]=expOutput[i];
    }
    // console.log(expMap)
    return expMap;
}
export function getExp(){
    var expMap = new Map<string, any>();
    // console.log(expOutput);
    console.log('start getExp');
    // for(var i=0;i<expOutput.length;i++){
    //     expMap[expOutput[i].sampleid]={'sampleid': expOutput[i].sampleid};
    // }
    // for(var i=0;i<expOutput.length;i++){
    //     var map = new Map();
    //     // map[expOutput[i]['gene_symbol']]= expOutput[i]['value'];
    //     // expMap[expOutput[i].sampleid]=Object.assign({},expMap[expOutput[i].sampleid],map);
    //     expMap[expOutput[i].sampleid][expOutput[i]['gene_symbol'].toUpperCase()]=expOutput[i]['value'];
    // }
    // console.log('getExp completed');
    expMap['sampleKey']={'sample':'sample'};
    for(var i=0;i<expOutput.length;i++){
        if(expMap['sampleKey'][expOutput[i]['gene_symbol']]==undefined){
            expMap['sampleKey'][expOutput[i]['gene_symbol']]=+expOutput[i]['value'];
            expGeneMap[expOutput[i]['gene_symbol']]=[+expOutput[i]['value']];
        }
        else{
            expMap['sampleKey'][expOutput[i]['gene_symbol']]+=+expOutput[i]['value'];
            expGeneMap[expOutput[i]['gene_symbol']].push(+expOutput[i]['value']);
        }
    }
    store.set('expGeneMap', expGeneMap);
    // console.log(expMap)
    console.log('End getExp');
    return expMap;
}
export function getExpGeneMap(){
    return expGeneMap;
}
export function getGeneReationMapName(){
    return geneRelationMapName;
}
