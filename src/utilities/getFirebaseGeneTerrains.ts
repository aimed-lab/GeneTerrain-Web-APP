// Backend Code - Firebase Firestore Query to Fetch Data Based on User ID
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const fetchGeneTerrainData = async () => {
  try {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.error("No user logged in");
      return;
    }

    const userID = user.uid;
    const q = query(
      collection(db, "geneTerrains"),
      where("userID", "==", userID)
    );
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });

    return data;
  } catch (error) {
    console.error("Error fetching data: ", error);
  }
};

export default fetchGeneTerrainData;
