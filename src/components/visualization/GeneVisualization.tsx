import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  HStack,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { FaChartArea } from "react-icons/fa";
import { motion } from "framer-motion";
import { useSamplesContext } from "../../context/SamplesContext";
import GaussianMap from "../../GaussianPlots/GaussianMap";
import { fetchGeneExpressionData } from "../../modules/GeneExpressionDataFetcher/fetchGeneExpressionData";
import { SampleSummaryComponent } from "../../modules/SampleSummaryModule";
import theme from "../../theme";

const MotionBox = motion(Box);

// Helper for safe property access
// Always use this to get the unique sample ID for selection/matching, regardless of API field name
const getSampleId = (sample: any): string => {
  if (!sample || typeof sample !== "object") return "";
  return sample.sampleid || sample.sample_id || String(sample.id) || "";
};

const GeneVisualization: React.FC = () => {
  const {
    selectedDataset,
    selectedSamples,
    isMapVisible,
    activeSelectionSource,
    filteredSamples,
  } = useSamplesContext();
  const [points, setPoints] = useState<any[]>([]);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [visualizedSample, setVisualizedSample] = useState<any | null>(null);
  const [visualizeTrigger, setVisualizeTrigger] = useState(0);

  // Increment trigger when isMapVisible becomes true
  useEffect(() => {
    if (isMapVisible) {
      setVisualizeTrigger((v) => v + 1);
    }
  }, [isMapVisible]);

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
      console.log("[GeneVisualization] selectedSamples:", selectedSamples);
      if (selectedSamples.length > 0) {
        sampleToVisualize = selectedSamples[0]; // Use the first selected sample from table
      }

      setVisualizedSample(sampleToVisualize);
      console.log("[GeneVisualization] visualizedSample:", sampleToVisualize);

      if (!sampleToVisualize) {
        setPoints([]);
        setIsLoadingPoints(false);
        return;
      }

      // Fetch gene expression points for the selected samples
      const sampleIds = selectedSamples.map(getSampleId);
      const fetchedPoints = await fetchGeneExpressionData(
        sampleIds,
        selectedDataset,
        100
      );
      setPoints(fetchedPoints);
      console.log("[GeneVisualization] fetched points:", fetchedPoints);
      setIsLoadingPoints(false);
    };

    fetchAndSetPoints();
  }, [
    isMapVisible,
    activeSelectionSource,
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
            <Text fontWeight="semibold" mb={1} color="geneTerrain.textPrimary">
              Dataset: {selectedDataset?.name}
            </Text>
            <Text fontSize="sm" color="geneTerrain.textSecondary">
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

        <SampleSummaryComponent
          samples={selectedSamples}
          datasetName={selectedDataset?.name || "Unknown Dataset"}
          visualizeTrigger={visualizeTrigger}
        />

        <Box
          position="relative"
          bg="white"
          borderRadius="md"
          overflow="hidden"
          height="auto"
          borderWidth="1px"
          borderColor="geneTerrain.border"
        >
          {isLoadingPoints ? (
            <Text p={4} color="geneTerrain.textPrimary">
              Loading points...
            </Text>
          ) : hasPoints ? (
            <GaussianMap
              points={points}
              datasetId={selectedDataset?.id || ""}
              sampleId={getSampleId(visualizedSample)}
              datasets={selectedDataset ? [selectedDataset] : []}
            />
          ) : (
            <Text p={4} color="geneTerrain.textPrimary">
              No points available for the selected sample.
            </Text>
          )}
        </Box>
      </Box>
    </MotionBox>
  );
};

export default GeneVisualization;
