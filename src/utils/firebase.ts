// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBP5jt0bUj-4IHDS4BRhnpWDRXHZTmznVg",
  authDomain: "geneterrain-3ac62.firebaseapp.com",
  projectId: "geneterrain-3ac62",
  storageBucket: "geneterrain-3ac62.appspot.com",
  messagingSenderId: "307192964938",
  appId: "1:307192964938:web:090a26736ba0b8ccce43b3",
  measurementId: "G-VGW9ZPGHEE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export default app;
