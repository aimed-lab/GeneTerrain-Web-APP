import React, { useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import {
  FireBaseGoogleLogin,
  loginWithEmailandPassword,
} from "./firebaseLogin";
import FireBaseLogout from "./firebaseLogout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle, faFacebook } from "@fortawesome/free-brands-svg-icons";
import registerwithEmailPassword from "./firebaseRegister";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../Firebase/googleFirebaseConfig";
import "bootstrap/dist/css/bootstrap.css";
import checkLoginStatus from "./LoginStatus";
import { handleFirebaseError } from "../errors";

const LoginRegister: React.FC = () => {
  if (!checkLoginStatus()) {
    alert("Checking login status");
    window.location.href = "home.html";
    return <></>;
  }
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");
  const [registerFormData, registerSetFormData] = useState({
    userName: "",
    email: "",
    password: "",
    reEnterPassword: "",
  });
  const [loginFormData, setLoginFormData] = useState({
    loginUsername: "",
    loginPassword: "",
  });

  const showLogin = () => setIsLogin(true);
  const showRegister = () => setIsLogin(false);

  async function loginWithGoogle() {
    await FireBaseGoogleLogin();
    window.location.href = "./home.html";
    return <></>;
  }

  async function handleRegisterFormData(e) {
    e.preventDefault();
    const { name, value } = e.target;
    registerSetFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }

  async function handleLoginFormData(e) {
    e.preventDefault();
    const { name, value } = e.target;
    setLoginFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }

  async function submitRegisterFormData(e) {
    e.preventDefault();
    try {
      setMessage(await registerwithEmailPassword(registerFormData));
      showLogin();
    } catch (error) {
      throw error;
    }
  }

  async function submitLoginFormData(e) {
    e.preventDefault();
    setMessage(
      handleFirebaseError(await loginWithEmailandPassword(loginFormData))
    );
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center vh-100"
      style={{
        backgroundColor: "#144B39",
        color: "#f0f0f0",
      }}
    >
      <div
        className="card p-5"
        style={{
          width: "380px",
          minHeight: "580px",
          backgroundColor: "rgba(255, 255, 255, 0.95)", // Slight transparency for a softer look
          borderRadius: "20px", // Softer corners for a modern touch
          boxShadow: "0 15px 25px rgba(0, 0, 0, 0.3)", // Deeper shadow for a lifted appearance
        }}
      >
        {/* Tabs for Login and Register */}
        <ul className="nav nav-tabs mb-4 justify-content-center">
          <li className="nav-item">
            <a
              className={`nav-link ${isLogin ? "active" : ""}`}
              onClick={() => {
                showLogin();
                setMessage("");
              }}
              style={{
                cursor: "pointer",
                color: isLogin ? "#333" : "#555",
                fontWeight: "bold",
              }}
            >
              Login
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${!isLogin ? "active" : ""}`}
              onClick={() => {
                showRegister();
                setMessage("");
              }}
              style={{
                cursor: "pointer",
                color: !isLogin ? "#333" : "#555",
                fontWeight: "bold",
              }}
            >
              Register
            </a>
          </li>
        </ul>

        {/* Login Form */}
        {isLogin && (
          <div id="login-form">
            <p className="text-danger text-center">{message}</p>
            <form onSubmit={submitLoginFormData}>
              <div className="mb-4">
                <label htmlFor="loginUsername" className="form-label">
                  User Name
                </label>
                <input
                  type="text"
                  className="form-control shadow-sm"
                  id="loginUsername"
                  name="loginUsername"
                  placeholder="Enter user name"
                  onChange={handleLoginFormData}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="loginPassword" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  className="form-control shadow-sm"
                  id="loginPassword"
                  name="loginPassword"
                  placeholder="Enter password"
                  onChange={handleLoginFormData}
                />
              </div>
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-success btn-lg">
                  Login
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Register Form */}
        {!isLogin && (
          <div id="register-form">
            <p className="text-danger text-center">{message}</p>
            <form onSubmit={submitRegisterFormData}>
              <div className="mb-3">
                <label htmlFor="registerUsername" className="form-label">
                  User Name
                </label>
                <input
                  type="text"
                  className="form-control shadow-sm"
                  id="registerUsername"
                  placeholder="Enter user name"
                  name="userName"
                  onChange={handleRegisterFormData}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="registerEmail" className="form-label">
                  Email ID
                </label>
                <input
                  type="email"
                  className="form-control shadow-sm"
                  id="registerEmail"
                  placeholder="Enter email id"
                  name="email"
                  onChange={handleRegisterFormData}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="registerPassword" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  className="form-control shadow-sm"
                  id="registerPassword"
                  placeholder="Enter password"
                  name="password"
                  onChange={handleRegisterFormData}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="registerRePassword" className="form-label">
                  Re-enter Password
                </label>
                <input
                  type="password"
                  className="form-control shadow-sm"
                  id="registerRePassword"
                  placeholder="Re-enter password"
                  name="reEnterPassword"
                  onChange={handleRegisterFormData}
                />
              </div>
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-success btn-lg">
                  Register
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Social Login Icons */}
        <div className="d-flex justify-content-center mt-4">
          <button
            className="btn btn-outline-danger mx-2"
            onClick={loginWithGoogle}
            style={{ width: "50px", height: "50px", borderRadius: "50%" }}
          >
            <FontAwesomeIcon icon={faGoogle} />
          </button>
          <button
            className="btn btn-outline-primary mx-2"
            style={{ width: "50px", height: "50px", borderRadius: "50%" }}
          >
            <FontAwesomeIcon icon={faFacebook} />
          </button>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<LoginRegister />, document.getElementById("login_page"));

export default LoginRegister;
