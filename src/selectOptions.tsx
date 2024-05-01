import * as ReactDOM from "react-dom";
import * as React from "react";

import Select from "react-select";
const options = [
  { value: 'GBM', label: 'GBM' },
  { value: 'CGGA', label: 'CGGA' },
  { value: 'COAD', label: 'COAD' },
  { value: 'UCEC', label: 'UCEC' },
  { value: 'KIRC', label: 'KIRC' },
  { value: 'LUAD', label: 'LUAD' },
  { value: 'LUSC', label: 'LUSC' },
]
export function react_select_options_cancer_type(){
  ReactDOM.render(
    <Select
      defaultValue={options[0]}
      name="colors"
      options={options}
      className="basic-single"
      classNamePrefix="select"
    />,
    document.getElementById("patient")
  );
}

export function react_select_options_select_genes(geneOptions){
  ReactDOM.render(
    <Select
      defaultValue={[]}
      isMulti
      name="colors"
      options={geneOptions}
      className="basic-multi-select"
      classNamePrefix="select"
    />,
    document.getElementById("selectGene")
  );
}