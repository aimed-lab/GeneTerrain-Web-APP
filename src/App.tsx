import React from "react";
import {
  Routes,
  Route,
  BrowserRouter as Router,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "./theme";
import Navbar from "./components/layout/Navbar";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import Layout from "./components/layout/Layout";
import { AuthProvider } from "./components/context/AuthContext";
import HomeContent from "./components/context/HomeContent";
import FeaturesContent from "./components/context/FeaturesContent";
import DocumentationPage from "./pages/DocumentationPage";
import WhatIsGeneTerrain from "./pages/docs/WhatIsGeneTerrain";
import BuiltInDatasets from "./pages/docs/BuiltInDatasets";
import GeneExpressionVisualization from "./pages/docs/GeneExpressionVisualization";
import CaseStudyGBMClinician from "./pages/docs/CaseStudyGBMClinician";
import FAQ from "./pages/docs/FAQ";
import AboutContent from "./components/context/AboutContent";
import ContactContent from "./components/context/ContactContent";
import { PremiumProvider } from "./components/context/PremiumContext";
import CustomGeneTerrain from "./pages/CustomGeneTerrain";
import GBMAnalysis from "./pages/GBMAnalysis";
import FeedbackModal from "./components/common/FeedbackModal";
import { useAuth } from "./components/context/AuthContext";

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page with the current location as the return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <PremiumProvider>
          <Navbar />
          <Routes>
            {/* Public routes - accessible without authentication */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/features" element={<FeaturesContent />} />
            <Route path="/docs" element={<DocumentationPage />} />
            <Route
              path="/docs/what-is-geneterrain"
              element={<WhatIsGeneTerrain />}
            />
            <Route
              path="/docs/built-in-datasets"
              element={<BuiltInDatasets />}
            />
            <Route
              path="/docs/gene-expression-visualization"
              element={<GeneExpressionVisualization />}
            />
            <Route
              path="/docs/case-study-gbm-clinician"
              element={<CaseStudyGBMClinician />}
            />
            <Route path="/docs/faq" element={<FAQ />} />
            <Route path="/about" element={<AboutContent />} />
            <Route path="/contact" element={<ContactContent />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomeContent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/custom"
              element={
                <ProtectedRoute>
                  <CustomGeneTerrain />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gbm-analysis"
              element={
                <ProtectedRoute>
                  <GBMAnalysis />
                </ProtectedRoute>
              }
            />
          </Routes>
          <FeedbackModal />
        </PremiumProvider>
      </AuthProvider>
    </ChakraProvider>
  );
};

export default App;
