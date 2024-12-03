import * as ReactDOM from "react-dom";
import * as React from "react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  getAuth,
} from "firebase/auth";
import app, { auth } from "../Firebase/googleFirebaseConfig";

export async function FireBaseGoogleLogin() {
  const provider = await new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
  // return signInWithRedirect(auth, provider);
  return <></>;
}

export async function loginWithEmailandPassword(formData) {
  const auth = getAuth();
  const email = formData["loginUsername"];
  const password = formData["loginPassword"];

  try {
    alert("Email: " + email + " Password: " + password);
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // User successfully signed in
    const user = userCredential.user;
    alert("User signed in: " + user.email);
    window.location.href = "home.html";
    return user; // Return the user object or any relevant information
  } catch (error) {
    // Handle error
    const errorCode = error.code;
    const errorMessage = error.message;
    alert("Error: " + errorCode);
    return errorCode; // Return error message for further processing
  }
}

export default FireBaseGoogleLogin;
