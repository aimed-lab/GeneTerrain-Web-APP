import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  HStack,
  Badge,
  Icon,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import { FaChartArea } from "react-icons/fa";
import { motion } from "framer-motion";
import { useSamplesContext } from "../../context/SamplesContext";
import GaussianMap from "../../GaussianPlots/GaussianMap";
import { fetchGeneExpressionData } from "../../modules/GeneExpressionDataFetcher/fetchGeneExpressionData";
import theme from "../../theme";

const MotionBox = motion(Box);

const GeneVisualization: React.FC = () => {
  const {
    selectedDataset,
    selectedSamples,
    isMapVisible,
    activeSelectionSource,
    activeSampleId,
    filteredSamples,
  } = useSamplesContext();
  const [points, setPoints] = useState<any[]>([]);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [visualizedSample, setVisualizedSample] = useState<any | null>(null);

  // Fetch points from the API or fallback to random points
  useEffect(() => {
    const fetchAndSetPoints = async () => {
      if (!isMapVisible) {
        setPoints([]);
        setVisualizedSample(null);
        return;
      }

      setIsLoadingPoints(true);

      let sampleToVisualize = null;
      if (
        activeSelectionSource === "scatter" &&
        activeSampleId &&
        selectedDataset
      ) {
        // Find the sample in the current dataset or filteredSamples
        sampleToVisualize =
          selectedDataset.samples.find(
            (s) => s.sampleid === activeSampleId || s.id === activeSampleId
          ) ||
          filteredSamples.find(
            (s) => s.sampleid === activeSampleId || s.id === activeSampleId
          );
      } else if (selectedSamples.length > 0) {
        sampleToVisualize = selectedSamples[0]; // Use the first selected sample from table
      }

      setVisualizedSample(sampleToVisualize);

      if (!sampleToVisualize) {
        setPoints([]);
        setIsLoadingPoints(false);
        return;
      }

      // Fetch gene expression points for the selected sample
      // Always fetch from API for the selected sample
      const fetchedPoints = await fetchGeneExpressionData(
        [sampleToVisualize.sampleid || sampleToVisualize.id],
        selectedDataset,
        100
      );
      setPoints(fetchedPoints);
      setIsLoadingPoints(false);
    };

    fetchAndSetPoints();
  }, [
    isMapVisible,
    activeSelectionSource,
    activeSampleId,
    selectedSamples,
    selectedDataset,
    filteredSamples,
  ]);

  // Check if points are available
  const hasPoints = points.length > 0;

  // Early return for invalid conditions
  if (!isMapVisible || !visualizedSample) {
    return null;
  }

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      bg="white"
      borderRadius="md"
      overflow="hidden"
      boxShadow="md"
      mb={6}
      borderWidth="1px"
      borderColor="geneTerrain.border"
      width="100%"
      maxW="1200px"
      mx="auto"
    >
      <Box bg="geneTerrain.headerBg" px={4} py={3}>
        <Flex align="center" justify="space-between">
          <Flex align="center">
            <Icon as={FaChartArea} mr={2} color="white" />
            <Heading size="md" color="white">
              Gene Expression Visualization
            </Heading>
          </Flex>
        </Flex>
      </Box>

      <Box p={4}>
        <Flex justify="space-between" mb={4} wrap="wrap">
          <Box mb={2}>
            <Text
              fontWeight="semibold"
              mb={1}
              color="geneTerrain.textPrimary" // ADDED
            >
              Dataset: {selectedDataset?.name}
            </Text>
            <Text
              fontSize="sm"
              color="geneTerrain.textSecondary" // CHANGED from gray.300
            >
              Displaying gene expression for {selectedSamples.length}{" "}
              {selectedSamples.length === 1 ? "sample" : "samples"}
            </Text>
          </Box>

          <HStack spacing={3}>
            {selectedSamples.map((sample) => (
              <Badge
                key={sample.id}
                colorScheme="green"
                variant="solid"
                px={2}
                py={1}
              >
                {sample.sampleid}
              </Badge>
            ))}
          </HStack>
        </Flex>

        {selectedSamples.length > 1 && (
          <Alert
            mb={4}
            borderRadius="md"
            bg={`${theme.colors?.geneTerrain?.accent1}10`} // 10% opacity of accent1 (lime green)
            color="geneTerrain.textPrimary"
            borderLeftWidth="4px"
            borderLeftColor="geneTerrain.accent1"
          >
            <AlertIcon color="geneTerrain.accent1" />
            <AlertDescription>
              Multiple samples selected. Visualizing the average gene expression
              values across selected samples.
            </AlertDescription>
          </Alert>
        )}

        <Box
          position="relative"
          bg="white" // CHANGED from secondary to white
          borderRadius="md"
          overflow="hidden"
          height="auto"
          borderWidth="1px"
          borderColor="geneTerrain.border"
        >
          {isLoadingPoints ? (
            <Text
              p={4}
              color="geneTerrain.textPrimary" // ADDED
            >
              Loading points...
            </Text>
          ) : hasPoints ? (
            <GaussianMap
              points={points}
              datasetId={selectedDataset?.id || ""}
              sampleId={visualizedSample.sampleid || visualizedSample.id}
              datasets={selectedDataset ? [selectedDataset] : []}
            />
          ) : (
            <Text
              p={4}
              color="geneTerrain.textPrimary" // ADDED
            >
              No points available for the selected sample.
            </Text>
          )}
        </Box>
      </Box>
    </MotionBox>
  );
};

export default GeneVisualization;
