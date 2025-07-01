import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Select,
  FormControl,
  FormLabel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Skeleton,
  Alert,
  AlertIcon,
  VStack,
  HStack,
  Button,
  useToast,
  Divider,
  Flex,
  Badge,
} from "@chakra-ui/react";
import { MotionBox, MotionHeading } from "../common/MotionComponents";
import GaussianMap, { normalizePoints } from "../../GaussianPlots/GaussianMap";
import { SearchIcon } from "@chakra-ui/icons";
import { FaDna } from "react-icons/fa";
import {
  generateRandomPoints,
  generateMockDatasets,
} from "../../services/datasetService";
import { useSamplesContext } from "../../context/SamplesContext";

// Define necessary interfaces
interface Point {
  x: number;
  y: number;
  geneId: string;
  geneName: string;
  pathways: string[];
  description: string;
  value: number;
}

interface Sample {
  id: string;
  name: string;
  description: string;
  condition: string;
  date: string;
  points: Point[];
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  samples: Sample[];
}

// Mock API services
const fetchDatasets = async (): Promise<Dataset[]> => {
  try {
    const response = await fetch("https://api.geneterrain.org/datasets");
    if (!response.ok) throw new Error("Failed to fetch datasets");
    return await response.json();
  } catch (error) {
    console.error("Error fetching datasets:", error);
    // Return mock data as fallback
    return generateMockDatasets(20);
  }
};

// Main HomeContent component
const HomeContent: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const { selectedDataset, setSelectedDataset, samples } = useSamplesContext();
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const toast = useToast();

  // Load datasets on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchDatasets();
        setDatasets(data);
        setError(null);
      } catch (err) {
        setError("Failed to load datasets. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle dataset selection
  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const datasetId = e.target.value;
    const dataset = datasets.find((d) => d.id === datasetId) || null;
    setSelectedDataset(dataset);
    setSelectedSample(null);
    setIsMapVisible(false);
  };

  // Handle sample selection
  const handleSampleSelect = (sample: Sample) => {
    setSelectedSample(sample);
    setIsMapVisible(false); // Reset map before showing a new one

    // Show success toast
    toast({
      title: "Sample selected",
      description: `Selected ${sample.name} from ${selectedDataset?.name}`,
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  // Handle visualization request
  const handleVisualize = () => {
    if (!selectedDataset || !selectedSample) return;
    setIsMapVisible(true);
  };
  return (
    <Container maxW="container.xl" py={8}>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box textAlign="center" mb={6}>
            <MotionHeading
              size="xl"
              bgGradient="linear(to-r, geneTerrain.accent1, geneTerrain.accent2)"
              bgClip="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              Gene Expression Analysis
            </MotionHeading>
            <Text mt={2} color="gray.600">
              Explore gene expression profiles across different datasets
            </Text>
          </Box>

          {/* Error display */}
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Dataset selection */}
          <FormControl>
            <FormLabel
              fontWeight="bold"
              color="geneTerrain.accent2"
              fontSize="lg"
            >
              Select Dataset Type
            </FormLabel>
            {isLoading ? (
              <Skeleton height="40px" mb={4} />
            ) : (
              <Select
                placeholder="Choose a dataset"
                onChange={handleDatasetChange}
                bg="white"
                size="lg"
                mb={4}
              >
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.samples.length} samples)
                  </option>
                ))}
              </Select>
            )}
          </FormControl>

          {/* Sample selection */}
          {selectedDataset && (
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color="geneTerrain.primary">
                  Available Samples
                </Heading>
                <HStack>
                  <Badge colorScheme="green" fontSize="md" px={2} py={1}>
                    {samples.length} samples
                  </Badge>
                  {selectedSample && (
                    <Button
                      colorScheme="blue"
                      size="sm"
                      leftIcon={<FaDna />}
                      onClick={handleVisualize}
                    >
                      Visualize
                    </Button>
                  )}
                </HStack>
              </Flex>

              <Box
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                bg="white"
                boxShadow="sm"
              >
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead bg="geneTerrain.secondary" color="white">
                      <Tr>
                        <Th color="white">Sample ID</Th>
                        <Th color="white">Name</Th>
                        <Th color="white">Condition</Th>
                        <Th color="white">Date</Th>
                        <Th color="white" width="120px">
                          Action
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {samples.slice(0, 10).map((sample) => (
                        <Tr
                          key={sample.id}
                          cursor="pointer"
                          bg={
                            selectedSample?.id === sample.id
                              ? "blue.50"
                              : undefined
                          }
                          _hover={{ bg: "gray.50" }}
                          onClick={() => handleSampleSelect(sample)}
                        >
                          <Td fontWeight="medium">{sample.id}</Td>
                          <Td>{sample.name}</Td>
                          <Td>{sample.condition}</Td>
                          <Td>{sample.date}</Td>
                          <Td>
                            <Button
                              size="sm"
                              colorScheme="teal"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSampleSelect(sample);
                              }}
                            >
                              Select
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
                {samples.length > 10 && (
                  <Box p={4} textAlign="center" borderTopWidth="1px">
                    <Text color="gray.500">
                      Showing 10 of {samples.length} samples
                    </Text>
                  </Box>
                )}
              </Box>
            </MotionBox>
          )}

          {/* Visualization area */}
          {isMapVisible && selectedSample && selectedDataset && (
            <MotionBox
              mt={8}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Divider my={4} />
              <Box mb={4}>
                <Heading size="md" mb={2}>
                  Gene Expression Visualization
                </Heading>
                <Text>
                  Sample: <strong>{selectedSample.name}</strong> | Dataset:{" "}
                  <strong>{selectedDataset?.name}</strong>
                </Text>
              </Box>
              <Box
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                bg="white"
                boxShadow="md"
                p={4}
              >
                <GaussianMap
                  points={normalizePoints(selectedSample.points)}
                  datasetId={selectedDataset.id}
                  sampleId={selectedSample.id}
                  datasets={datasets}
                />
              </Box>
            </MotionBox>
          )}
        </VStack>
      </MotionBox>
    </Container>
  );
};

export default HomeContent;
