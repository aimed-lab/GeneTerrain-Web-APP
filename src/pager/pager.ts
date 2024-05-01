const axios = require('axios')

var BASEURL = "http://127.0.0.1:5000/"
var PAGIDGENE_URL = BASEURL+"pagRankedGene/"
var RUN_PAGER_URL = BASEURL

export async function runPager(genes, ...params) {

  var formdata = {
    "genes": genes,
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
  var response;
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
    response = dataArray
  })
  .catch(error => console.error('Error:', error));

//   response = [{
//     "COCO_V2": "8335.536272",
//     "DESCRIPTION": "Cell cycle checkpoints",
//     "GS_ID": "WAG002023",
//     "GS_SIZE": "289",
//     "LINK": "https://www.wikipathways.org/index.php/Pathway:WP1775",
//     "MULTI_N": "1333",
//     "NAME": "Cell cycle checkpoints",
//     "OLAP": "38",
//     "ORGANISM": "Homo sapiens",
//     "Rank": 1,
//     "SIMILARITY_SCORE": ".1030905216969390122987996540303356327659",
//     "SOURCE": "WikiPathway_2021",
//     "TYPE": "P",
//     "pFDR": 8.0475176420528e-41,
//     "pvalue": 1.4526205130059e-43
// }]
  return response
}

export const getGenesFromPags = async(PAGids)=>{
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

export async function callPagerAPI(){
console.log('insider callpager')
const sources = ["WikiPathway_2021_HUMAN", "Reactome_2021", "KEGG_2021", "Spike", "BioCarta", "NCI-Nature Curated"];
const olap = 1;
const sim = 0;
const fdr = 0.05;

// (async () => {
//   const pagerOutput = await runPager(['MYC'], sources, olap, sim, fdr, 'Homo sapiens');
//   console.log(pagerOutput);
// })();

}