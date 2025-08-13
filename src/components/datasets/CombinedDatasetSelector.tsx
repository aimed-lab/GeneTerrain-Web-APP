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
  VStack,
} from "@chakra-ui/react";
import { FaDatabase, FaInfoCircle } from "react-icons/fa";
import { motion } from "framer-motion";
import { Dataset } from "../../types";
import { useSamplesContext } from "../../context/SamplesContext";
import {
  fetchDatasetsByGroup,
  getCancerGroups,
} from "../../services/datasetService";

interface CombinedDatasetSelectorProps {
  isLoading: boolean;
}

const MotionBox = motion(Box);

const CombinedDatasetSelector: React.FC<CombinedDatasetSelectorProps> = ({
  isLoading,
}) => {
  const [selectedCancerGroup, setSelectedCancerGroup] = useState<string>("");
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  const {
    selectedDataset,
    setSelectedDataset,
    setSelectedSampleIds,
    setSearchTerm,
    setFilterCondition,
    setIsMapVisible,
    samples,
  } = useSamplesContext();

  const cancerGroups = getCancerGroups();

  // Handle cancer group change
  const handleCancerGroupChange = async (cancerGroup: string) => {
    setSelectedCancerGroup(cancerGroup);
    setSelectedDataset(null); // Reset dataset selection
    setSelectedSampleIds(new Set());
    setSearchTerm("");
    setFilterCondition(null);
    setIsMapVisible(false);

    if (cancerGroup) {
      setIsLoadingDatasets(true);
      try {
        const datasets = await fetchDatasetsByGroup(cancerGroup);
        setFilteredDatasets(datasets);
      } catch (error) {
        console.error("Error fetching datasets for group:", error);
        setFilteredDatasets([]);
      } finally {
        setIsLoadingDatasets(false);
      }
    } else {
      setFilteredDatasets([]);
    }
  };

  // Handle dataset change
  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const datasetId = e.target.value;
    const dataset = filteredDatasets.find((d) => d.id === datasetId) || null;
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
          <VStack spacing={4} align="stretch">
            {/* Cancer Group Selector */}
            <FormControl>
              <FormLabel
                fontWeight="bold"
                color="geneTerrain.accent2"
                fontSize="lg"
              >
                Select Cancer Group
              </FormLabel>
              <Select
                placeholder="Choose a cancer group"
                value={selectedCancerGroup}
                onChange={(e) => handleCancerGroupChange(e.target.value)}
                bg="white"
                size="lg"
                isDisabled={isLoading}
              >
                {cancerGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} - {group.description}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Dataset Selector */}
            <FormControl>
              <FormLabel
                fontWeight="bold"
                color="geneTerrain.accent2"
                fontSize="lg"
              >
                Select Dataset
              </FormLabel>
              <Select
                placeholder="Choose a dataset"
                value={selectedDataset?.id || ""}
                onChange={handleDatasetChange}
                bg="white"
                size="lg"
                isDisabled={
                  isLoading || !selectedCancerGroup || isLoadingDatasets
                }
              >
                {filteredDatasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} - {dataset.description}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Selected Dataset Info */}
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
                            {selectedCancerGroup} dataset
                          </Text>
                        </Flex>
                      </Tooltip>
                    </HStack>
                  )}
                </Box>
              </Box>
            )}
          </VStack>
        )}
      </Box>
    </MotionBox>
  );
};

export default CombinedDatasetSelector;
