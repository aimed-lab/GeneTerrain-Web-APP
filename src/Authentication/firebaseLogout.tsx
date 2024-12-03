import * as ReactDOM from "react-dom";
import * as React from "react";
import {GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup,
    signInWithRedirect, signInAnonymously, signOut
} from 'firebase/auth'
import app, { auth } from '../Firebase/googleFirebaseConfig'

export async function FireBaseLogout(){
    const provider = await new GoogleAuthProvider();
    return signOut(auth);
    return (<></>);
}

export default FireBaseLogout