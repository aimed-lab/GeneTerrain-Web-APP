import Plotly from "plotly.js";

const convertImageToBlob = async (divID: string) => {
  // return "";
  var blobText: Blob = null;
  Plotly.toImage(document.getElementById(divID), {
    format: "png",
    width: 600,
    height: 600,
  })
    .then(async function (dataUrl) {
      await fetch(dataUrl)
        .then(async (response) => response.blob())
        .then(async (blob) => {
          blobText = blob;
          console.log("Blob created:", blobText);
        })
        .catch((error) => console.error("Blob conversion error:", error));
    })
    .catch((error) => console.error("Image conversion error:", error));
  return blobText;
};

export default convertImageToBlob;
