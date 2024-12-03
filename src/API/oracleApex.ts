import { METHODS } from "http";
import { GeneTerrainProps } from "../app";
import { error } from "console";

const saveToOracleApex = async (geneTerrainProps: GeneTerrainProps) => {
  console.log("body data", geneTerrainProps);
  const url = process.env.saveGTURL;

  const formData = new FormData();

  // Append each property to the FormData
  formData.append("cancerType", geneTerrainProps.cancerType);
  formData.append("resolution", geneTerrainProps.resolution.toString());
  formData.append("sampleID", geneTerrainProps.sampleID);
  formData.append("scaleMin", geneTerrainProps.scaleMin.toString());
  formData.append("scaleMax", geneTerrainProps.scaleMax.toString());
  formData.append("sigma", geneTerrainProps.sigma.toString());
  formData.append("geneTerrain", geneTerrainProps.geneTerrain);

  // if (geneTerrainProps.geneTerrain instanceof Blob) {
  //   formData.append(
  //     "geneTerrain",
  //     geneTerrainProps.geneTerrain,
  //     "geneterrain.png"
  //   );
  // } else {
  //   console.error("geneTerrain must be a Blob.");
  // }

  // Append the userID
  formData.append("userID", geneTerrainProps.userID);

  await fetch(url, {
    method: "POST",
    body: JSON.stringify(geneTerrainProps),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      console.log("resp: ", response);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log("here is the GT fetch data", data);
    })
    .catch((error) =>
      console.log("Error while fetching GT info with error code", error)
    );
};

export default saveToOracleApex;
