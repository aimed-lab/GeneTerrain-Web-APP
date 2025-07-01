import React, { useEffect, useState } from "react";
import {
  Box,
  Select,
  Heading,
  Text,
  Flex,
  Badge,
  HStack,
  Icon,
  Skeleton,
  Tooltip,
  FormControl,
  FormLabel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
} from "@chakra-ui/react";
import { FaDatabase, FaInfoCircle, FaChevronDown } from "react-icons/fa";
import { motion } from "framer-motion";
import { Dataset } from "../../types";
import { useSamplesContext } from "../../context/SamplesContext";

interface DatasetSelectorProps {
  datasets: Dataset[];
  isLoading: boolean;
}

const MotionBox = motion(Box);

const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  datasets: initialDatasets,
  isLoading,
}) => {
  // Create local state to manage datasets including the dynamic GBM dataset
  const [localDatasets, setLocalDatasets] =
    useState<Dataset[]>(initialDatasets);

  const {
    selectedDataset,
    setSelectedDataset,
    setSelectedSampleIds,
    setSearchTerm,
    setFilterCondition,
    setIsMapVisible,
    samples,
  } = useSamplesContext();

  // Update local datasets when prop datasets change
  useEffect(() => {
    setLocalDatasets(initialDatasets);
  }, [initialDatasets]);

  // Add Glioblastoma Multiforme dataset if it doesn't exist
  useEffect(() => {
    // Check if "Glioblastoma Multiforme" dataset is already in the available datasets
    const gbmDatasetExists = localDatasets.some(
      (dataset) => dataset.name === "Glioblastoma Multiforme"
    );

    // If not, add it
    if (!gbmDatasetExists) {
      const gbmDataset: Dataset = {
        id: "gbm",
        name: "Glioblastoma Multiforme",
        description: "GBM cancer samples from TCGA and CGGA datasets",
        samples: [], // Will be populated by the context when selected
      };

      setLocalDatasets((prev) => [...prev, gbmDataset]);
    }
  }, [localDatasets]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const datasetId = e.target.value;
    const dataset = localDatasets.find((d) => d.id === datasetId) || null;
    setSelectedDataset(dataset);

    // Reset selections when changing datasets
    setSelectedSampleIds(new Set());
    setSearchTerm("");
    setFilterCondition(null);
    setIsMapVisible(false);
  };

  return (
    <MotionBox
      initial={{ opacity: 0, y: -10 }}
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
      <Box bg="geneTerrain.headerBg" px={5} py={4}>
        <Flex align="center">
          <Icon as={FaDatabase} mr={2} color="white" boxSize="18px" />
          <Heading size="md" color="white" fontWeight="600">
            Dataset Selection
          </Heading>
        </Flex>
      </Box>

      <Box p={5}>
        {isLoading ? (
          <Skeleton height="40px" />
        ) : (
          <>
            <FormControl mb={4}>
              <Flex
                direction={{ base: "column", md: "row" }}
                align={{ base: "flex-start", md: "center" }}
                mb={3}
              >
                <FormLabel
                  minW="150px"
                  mb={{ base: 2, md: 0 }}
                  fontWeight="medium"
                  fontSize="md"
                  className="label-text"
                  color="geneTerrain.textPrimary"
                >
                  Select Dataset:
                </FormLabel>

                <Box flex="1">
                  <Select
                    value={selectedDataset?.id || ""}
                    onChange={handleDatasetChange}
                    placeholder="Choose a dataset..."
                    bg="white"
                    h="45px"
                    fontSize="md"
                    color="geneTerrain.textPrimary"
                    isDisabled={isLoading || localDatasets.length === 0}
                    _focus={{ borderColor: "geneTerrain.accent2" }}
                    borderColor="geneTerrain.border"
                    sx={{
                      "& option": {
                        padding: "10px",
                        fontSize: "md",
                      },
                    }}
                  >
                    {localDatasets.map((dataset) => (
                      <option key={dataset.id} value={dataset.id}>
                        {dataset.name} - {dataset.description}
                      </option>
                    ))}
                  </Select>

                  {/* {selectedDataset && (
                    <Box
                      mt={2}
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                      borderLeft="4px solid"
                      borderLeftColor="geneTerrain.primary"
                    >
                      <Flex justify="space-between" align="center">
                        <Box>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color="geneTerrain.textPrimary"
                          >
                            {selectedDataset.name}
                          </Text>
                          <Text
                            fontSize="sm"
                            color="geneTerrain.textSecondary"
                            mt={1}
                          >
                            {selectedDataset.description}
                          </Text>
                        </Box>
                        <Badge
                          bg="geneTerrain.primary"
                          color="white"
                          px={2}
                          py={1}
                          borderRadius="md"
                          fontSize="xs"
                        >
                          {selectedDataset.samples.length} Samples
                        </Badge>
                      </Flex>
                    </Box>
                  )} */}
                </Box>
              </Flex>
            </FormControl>

            {selectedDataset && (
              <Box
                p={4}
                borderRadius="md"
                bg="gray.50"
                borderLeft="4px solid"
                borderLeftColor="geneTerrain.primary"
                mb={3}
                boxShadow="sm"
              >
                <Flex justify="space-between" align="center" mb={3}>
                  <Heading
                    size="sm"
                    fontWeight="600"
                    color="geneTerrain.textPrimary"
                  >
                    {selectedDataset.name}
                  </Heading>
                  <Badge
                    bg="geneTerrain.primary"
                    color="light"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="x-small"
                  >
                    {samples.length} Samples
                  </Badge>
                </Flex>
                <Text
                  fontSize="sm"
                  color="geneTerrain.textSecondary"
                  mb={3}
                  lineHeight="1.5"
                >
                  {selectedDataset.description}
                </Text>
                <Box
                  bg="white"
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="geneTerrain.border"
                >
                  {samples && samples.length > 0 && (
                    <HStack spacing={4} fontSize="sm">
                      <Tooltip
                        label="Sample conditions in this dataset"
                        placement="top"
                        hasArrow
                      >
                        <Flex align="center">
                          <Icon
                            as={FaInfoCircle}
                            mr={2}
                            color="geneTerrain.primary"
                          />
                          <Text
                            color="geneTerrain.textSecondary"
                            fontWeight="medium"
                          >
                            {new Set(samples.map((s) => s.condition)).size}{" "}
                            Conditions
                          </Text>
                        </Flex>
                      </Tooltip>
                      <Tooltip label="Data source" placement="top" hasArrow>
                        <Flex align="center">
                          <Icon
                            as={FaDatabase}
                            mr={2}
                            color="geneTerrain.accent2"
                          />
                          <Text color="geneTerrain.textSecondary">
                            Brain tumor gene expression data
                          </Text>
                        </Flex>
                      </Tooltip>
                    </HStack>
                  )}
                </Box>
              </Box>
            )}

            {/* {selectedDataset && (
              <MotionBox
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                mt={4}
                p={3}
                bg="white" // CHANGED from secondary to white
                borderRadius="md"
                boxShadow="inner"
                borderWidth="1px"
                borderColor="geneTerrain.border"
              >
                <Flex justify="space-between" align="flex-start" mb={2}>
                  <Heading
                    size="md"
                    mt={4}
                    className="dataset-name"
                    color="geneTerrain.textPrimary" // ADDED
                  >
                    {selectedDataset.name}
                  </Heading>
                  <Badge colorScheme="teal" px={2} py={1}>
                    {selectedDataset.samples.length} Samples
                  </Badge>
                </Flex>

                <Text
                  fontSize="sm"
                  color="geneTerrain.textPrimary" // CHANGED from accent1
                  mb={3}
                  className="dataset-description"
                >
                  {selectedDataset.description}
                </Text>

                <HStack spacing={4} fontSize="sm">
                  <Tooltip
                    label="Sample conditions in this dataset"
                    placement="top"
                    hasArrow
                  >
                    <Flex align="center">
                      <Icon
                        as={FaInfoCircle}
                        mr={1}
                        color="geneTerrain.primary"
                      />
                      <Text
                        className="metadata-text"
                        color="geneTerrain.textPrimary" // ADDED
                      >
                        {
                          new Set(
                            selectedDataset.samples.map((s) => s.condition)
                          ).size
                        }{" "}
                        Conditions
                      </Text>
                    </Flex>
                  </Tooltip>
                </HStack>
              </MotionBox>
            )} */}
          </>
        )}
      </Box>
    </MotionBox>
  );
};

export default DatasetSelector;
