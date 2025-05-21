import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
  VStack,
  Alert,
  AlertIcon,
  AlertDescription,
  CloseButton,
  Spinner,
  Center,
  Fade,
} from "@chakra-ui/react";
import { motion } from "framer-motion";

import DatasetSelector from "../datasets/DatasetSelector";
import SamplesSection from "../samples/SamplesSection";
import GeneVisualization from "../visualization/GeneVisualization";
import { SamplesProvider } from "../../context/SamplesContext";
import { fetchDatasets } from "../../services/datasetService";
import { Dataset } from "../../types";

const MotionBox = motion(Box);

const HomeContent: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const visualizationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const fetchedDatasets = await fetchDatasets();
        setDatasets(fetchedDatasets);
      } catch (err) {
        console.error("Failed to fetch datasets:", err);
        setError(
          "Failed to connect to the dataset service. Using mock data instead."
        );

        // Generate mock data as a fallback
        const {
          generateMockDatasets,
        } = require("../../services/datasetService");
        setDatasets(generateMockDatasets());
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Function to scroll to visualization when it becomes visible
  const scrollToVisualization = () => {
    if (visualizationRef.current) {
      visualizationRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <SamplesProvider datasets={datasets}>
      <Box bg="geneTerrain.bg" minH="100vh" pb={10} color="geneTerrain.bg">
        <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {error && (
              <Alert
                status="warning"
                mb={6}
                borderRadius="md"
                bg="geneTerrain.accent2"
                color="geneTerrain.secondary"
              >
                <AlertIcon color="geneTerrain.secondary" />
                <AlertDescription>{error}</AlertDescription>
                <CloseButton
                  position="absolute"
                  right="8px"
                  top="8px"
                  onClick={() => setError(null)}
                  color="geneTerrain.secondary"
                />
              </Alert>
            )}

            {isLoading ? (
              <Center py={20}>
                <VStack spacing={4}>
                  <Spinner
                    thickness="4px"
                    speed="0.65s"
                    emptyColor="geneTerrain.primary"
                    color="geneTerrain.accent1"
                    size="xl"
                  />
                  <Box color="geneTerrain.neutral">Loading datasets...</Box>
                </VStack>
              </Center>
            ) : (
              <Fade in={!isLoading}>
                <VStack spacing={0.5} py={3} align="stretch">
                  <DatasetSelector datasets={datasets} isLoading={isLoading} />

                  <SamplesSection onVisualize={scrollToVisualization} />

                  <Box ref={visualizationRef}>
                    <GeneVisualization />
                  </Box>
                </VStack>
              </Fade>
            )}
          </MotionBox>
        </Container>
      </Box>
    </SamplesProvider>
  );
};

export default HomeContent;
