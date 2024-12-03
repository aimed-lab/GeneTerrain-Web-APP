import { getAuth, createUserWithEmailAndPassword, Auth } from "firebase/auth";
import app, { auth } from "../Firebase/googleFirebaseConfig";

const registerwithEmailPassword = async (formData) => {
  try {
    const email = formData["email"];
    const password = formData["password"];
    alert("user: " + email + " password: " + password);
    const userCredentails = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    alert(userCredentails.user);
    return userCredentails.user;
  } catch (error) {
    alert(error.message);
    return error.message;
  }
};

export default registerwithEmailPassword;
