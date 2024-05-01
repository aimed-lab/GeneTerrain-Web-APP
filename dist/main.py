import js

import requests
import pandas as pd
import numpy as np

nodes = ['ACTB', 'ACTG1', 'ACTN4', 'ALDOA', 'ANXA2', 'AP1S2', 'AP2M1']
sources = ["WikiPathway_2021_HUMAN","Reactome_2021","KEGG_2021","Spike","BioCarta","NCI-Nature Curated"]
olap = 1
sim = 0
fdr = 0.05
params = {
    'genes': '%20'.join(nodes),
    'source': '%20'.join(sources),
    'type': 'All',
    'sim': sim,
    'olap': olap,
    'organism': 'All',
    'cohesion': '0',
    'pvalue': 0.05,
    'FDR': np.float64(fdr),
    'ge': 1,
    'le': 2000
}
response = requests.post('http://discovery.informatics.uab.edu/PAGER/index.php/geneset/pagerapi', data=params)
df = pd.DataFrame(response.json())
print(df.head())

# from gprofiler import GProfiler

# gp = GProfiler(return_dataframe=True)
# df = gp.profile(organism='hsapiens',
#             query={'NR1H4': 'NR1H4',
#  'TRIP12': 'TRIP12',
#  'UBC': 'UBC',
#  'FCRL3': 'FCRL3',
#  'PLXNA3': 'PLXNA3',
#  'GDNF': 'GDNF',
#  'VPS11': 'VPS11'})

# print(df.head())

# def run_pager(genes, sources, olap, sim, fdr, organism):
#   # Set up the call parameters as a dict.
#   params = {}
#   # Work around PAGER API form encode issue.
#   if(len(genes)!=0):
#     #print(genes)
#     params['genes'] = '%20'.join(genes)
#   else:
#     params['genes'] = ''
#   params['source'] = '%20'.join(sources)
#   params['type'] = 'All'
#   params['sim'] = sim
#   params['olap'] = olap
#   params['organism'] = organism #'All'
#   params['cohesion'] = '0'
#   params['pvalue'] = 0.05
#   params['FDR'] = np.float64(fdr)
#   params['ge'] = 1
#   params['le'] = 2000

#   response = requests.post('http://discovery.informatics.uab.edu/PAGER/index.php/geneset/pagerapi', data=params)
#   #print(response.request.body)
#   return pd.DataFrame(response.json())
# def pathMember(PAGER):
#     PAGstring = ",".join(PAGER)
#     print(PAGstring)
#     params = {}
#     params['pag'] = PAGstring
#     response = requests.post(
#         "http://discovery.informatics.uab.edu/PAGER/index.php/geneset/get_members_by_ids/",
#         data=params
#     )
#     return(pd.DataFrame(response.json()['data']))
# def pathInt(PAGER):
#     PAGstring = ",".join(PAGER)
#     params = {}
#     params['pag'] = PAGstring
#     response = requests.post(
#         "http://discovery.informatics.uab.edu/PAGER/index.php/pag_pag/inter_network_int_api/",
#         data=params
#     )
#     return(pd.DataFrame(response.json()['data']))


# import pandas as pd
# import numpy as np
# import requests

# # nodes = pd.read_csv("node.txt",sep="\t",header = None)
# # nodes[0].values
# sources = ["WikiPathway_2021"]
# olap = 1
# sim = 0
# fdr = 0.05

# pager_output = run_pager(["MYC"], sources, olap, sim, fdr, 'Homo sapiens')
# js.document.getElementById("para").innerHTML=pager_output
# print(pager_output)
# genemembers = pathMember(pager_output['GS_ID'].values)
# genemember_filtered = genemembers[genemembers['GENE_SYM'].isin(nodes[0].values)]
# grouped_GS = genemember_filtered.groupby('GENE_SYM').agg(lambda x : '|'.join(set(x))).reset_index()
# grouped_GS.columns = ['id','set']
# grouped_GS.to_csv("./node_set.txt",sep = "\t" , index = None)
# pager_output.to_csv("./pathways.txt",sep = "\t" , index = None)