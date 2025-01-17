import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { GeneTerrainProps } from "../app";
import { AlertMessage } from "../components/MessageAlert";

// Initialize Firestore and Storage
const db = getFirestore();
const storage = getStorage();

async function addGeneTerrain(data: GeneTerrainProps) {
  alert("Inside save geneterrain");
  try {
    let geneTerrainUrl;

    // // If geneTerrain is a Blob, upload it to Firebase Storage and get URL
    // if (data.geneTerrain instanceof Blob) {
    //   const storageRef = ref(storage, `geneTerrains/${data.sampleID}`);
    //   await uploadBytes(storageRef, data.geneTerrain);
    //   geneTerrainUrl = await getDownloadURL(storageRef);
    // } else if (typeof data.geneTerrain === "string") {
    //   geneTerrainUrl = data.geneTerrain; // Assume it’s already a URL
    // }

    geneTerrainUrl = data.geneTerrain;
    // Create document data object
    const docData = {
      geneTerrain: geneTerrainUrl,
      cancerType: data.cancerType,
      sigma: data.sigma,
      scaleMin: data.scaleMin,
      scaleMax: data.scaleMax,
      resolution: data.resolution,
      sampleID: data.sampleID,
      userID: data.userID,
    };

    // Add document to Firestore
    const docRef = await addDoc(collection(db, "geneTerrains"), data);
    // AlertMessage("Success");
    console.log("Document written with ID: ", docRef.id);
  } catch (error) {
    console.error("Error adding document: ", error);
  }
}

export default addGeneTerrain;
