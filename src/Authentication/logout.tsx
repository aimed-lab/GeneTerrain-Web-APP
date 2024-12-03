import FireBaseLogout from "./firebaseLogout";

const logout = async () => {
  console.log("logout2");
  await FireBaseLogout();
  // document.getElementById('login_page').style.display='block';
  // document.getElementById('container').style.display='none';
};

document.getElementById("nav-login-tab").addEventListener("click", async () => {
  console.log("logout1");
  await logout();
});
