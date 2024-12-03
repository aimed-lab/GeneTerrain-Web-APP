import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../Firebase/googleFirebaseConfig";

const checkLoginStatus = () => {
  {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log(user);
        window.location.href = "home.html";
        return true;
      } else return false;
    });
  }
};

export default checkLoginStatus;
