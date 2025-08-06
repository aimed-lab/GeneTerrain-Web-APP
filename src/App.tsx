import React from "react";
import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "./theme";
import Navbar from "./components/layout/Navbar";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import Layout from "./components/layout/Layout";
import { AuthProvider } from "./components/context/AuthContext";
import HomeContent from "./components/context/HomeContent";
import FeaturesContent from "./components/context/FeaturesContent";
import AboutContent from "./components/context/AboutContent";
import ContactContent from "./components/context/ContactContent";
import { PremiumProvider } from "./components/context/PremiumContext";
import CustomGeneTerrain from "./pages/CustomGeneTerrain";
import GBMAnalysis from "./pages/GBMAnalysis";
import FeedbackModal from "./components/common/FeedbackModal";

const App: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <PremiumProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomeContent />} />
            <Route path="/features" element={<FeaturesContent />} />
            <Route path="/about" element={<AboutContent />} />
            <Route path="/contact" element={<ContactContent />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/custom" element={<CustomGeneTerrain />} />
            <Route path="/gbm-analysis" element={<GBMAnalysis />} />
          </Routes>
          <FeedbackModal />
        </PremiumProvider>
      </AuthProvider>
    </ChakraProvider>
  );
};

export default App;
