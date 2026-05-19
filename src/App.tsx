import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Flex, Box } from "@chakra-ui/react";
import Sidebar from "./components/layout/Sidebar";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import { AuthProvider } from "./components/context/AuthContext";
import HomeContent from "./components/context/HomeContent";
import FeaturesContent from "./components/context/FeaturesContent";
import DocumentationPage from "./pages/DocumentationPage";
import WhatIsGeneTerrain from "./pages/docs/WhatIsGeneTerrain";
import BuiltInDatasets from "./pages/docs/BuiltInDatasets";
import GeneExpressionVisualization from "./pages/docs/GeneExpressionVisualization";
import CaseStudyGBMClinician from "./pages/docs/CaseStudyGBMClinician";
import CaseStudies from "./pages/docs/CaseStudies";
import FAQ from "./pages/docs/FAQ";
import AboutContent from "./components/context/AboutContent";
import ContactContent from "./components/context/ContactContent";
import { PremiumProvider } from "./components/context/PremiumContext";
import { ChatProvider } from "./components/context/ChatContext";
import CustomGeneTerrain from "./pages/CustomGeneTerrain";
import GBMAnalysis from "./pages/GBMAnalysis";
import FeedbackModal from "./components/common/FeedbackModal";
import { useAuth } from "./components/context/AuthContext";
import UnifiedPathwayNetwork from "./components/common/UnifiedPathwayNetwork";
import KnowledgeGraph from "./components/common/KnowledgeGraph";
import SelectionSummaryPage from "./pages/SelectionSummaryPage";
import ComparisonSummaryPage from "./pages/ComparisonSummaryPage";
import LassoComparisonPage from "./pages/LassoComparisonPage";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import FloatingChat from "./components/common/FloatingChat";
import TerrainComparisonOverlay from "./components/common/TerrainComparisonOverlay";


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
    <AuthProvider>
      <PremiumProvider>
        <ChatProvider>
          <Flex minH="100vh" direction={{ base: "column", md: "row" }} bg="white">
            <Sidebar />
            <Box
              flex="1"
              ml={{ base: 0, md: "72px" }}
              w={{ base: "full", md: "calc(100% - 72px)" }}
              p={0}
              transition="all 0.3s"
              overflowX="hidden"
            >
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
                <Route path="/docs/case-studies" element={<CaseStudies />} />
                <Route path="/docs/faq" element={<FAQ />} />
                <Route path="/about" element={<AboutContent />} />
                <Route path="/contact" element={<ContactContent />} />
                <Route
                  path="/enrichment-analysis"
                  element={<UnifiedPathwayNetwork />}
                />
                <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
                <Route
                  path="/selection-summary"
                  element={<SelectionSummaryPage />}
                />
                <Route
                  path="/comparison-summary"
                  element={<ComparisonSummaryPage />}
                />
                <Route
                  path="/lasso-comparison"
                  element={<LassoComparisonPage />}
                />
                <Route path="/analytics" element={<AnalyticsDashboard />} />

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
            </Box>
          </Flex>
          <FeedbackModal />
          <FloatingChat />
          {/* Terrain comparison overlay — always mounted so it responds to chat
              cart requests regardless of which page the user is currently on */}
          <TerrainComparisonOverlay />
        </ChatProvider>
      </PremiumProvider>
    </AuthProvider>
  );
};

export default App;
