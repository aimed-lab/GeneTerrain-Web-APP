import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Flex,
  Icon,
  IconButton,
  Collapse,
  useDisclosure,
  Badge,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import {
  FaDatabase,
  FaChevronDown,
  FaChevronUp,
  FaTable,
  FaChartLine,
} from "react-icons/fa";
import SamplesFilter from "./SamplesFilter";
import { useSamplesContext } from "../../context/SamplesContext";
import SamplesTable from "./SamplesTable";
import ScatterPlot from "./ScatterPlot";

interface SamplesSectionProps {
  onVisualize?: () => void;
  minimizeAfterVisualize?: boolean;
}

const SamplesSection: React.FC<SamplesSectionProps> = ({
  onVisualize,
  minimizeAfterVisualize = true,
}) => {
  const {
    selectedDataset,
    selectedSampleIds,
    searchTerm,
    columnFilters,
    filteredSamples,
    samples,
  } = useSamplesContext();
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  const [hasVisualized, setHasVisualized] = useState(false);
  const [showScatterPlot, setShowScatterPlot] = useState(false);

  // Custom handler for visualize button
  const handleVisualize = () => {
    if (onVisualize) {
      onVisualize();
    }

    // Auto-minimize when visualizing if option is enabled
    if (minimizeAfterVisualize) {
      setHasVisualized(true);
      if (isOpen) onToggle();
    }
  };

  // Reset minimized state when samples change
  useEffect(() => {
    if (hasVisualized && selectedSampleIds.size === 0) {
      if (!isOpen) onToggle();
      setHasVisualized(false);
    }
  }, [selectedSampleIds, hasVisualized, isOpen, onToggle]);

  if (!selectedDataset) {
    return null;
  }

  return (
    <Box
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
            <Icon as={FaDatabase} mr={2} color="white" />
            <Heading size="md" color="white" fontWeight="600">
              Sample Selection
              {!isOpen && selectedSampleIds.size > 0 && (
                <Badge
                  ml={2}
                  colorScheme="green"
                  fontSize="xs"
                  borderRadius="full"
                >
                  {selectedSampleIds.size} selected
                </Badge>
              )}
            </Heading>
          </Flex>
          <Flex align="center" gap={2}>
            <Tooltip
              label={showScatterPlot ? "Show Table View" : "Show Scatter Plot"}
            >
              <IconButton
                aria-label="Toggle view"
                icon={
                  showScatterPlot ? (
                    <FaTable size="12px" />
                  ) : (
                    <FaChartLine size="12px" />
                  )
                }
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: "rgba(255,255,255,0.2)" }}
                onClick={() => setShowScatterPlot(!showScatterPlot)}
              />
            </Tooltip>
            <IconButton
              aria-label={isOpen ? "Minimize section" : "Expand section"}
              icon={
                isOpen ? (
                  <FaChevronUp size="12px" />
                ) : (
                  <FaChevronDown size="12px" />
                )
              }
              size="sm"
              variant="ghost"
              color="white"
              _hover={{ bg: "rgba(255,255,255,0.2)" }}
              onClick={onToggle}
            />
          </Flex>
        </Flex>
      </Box>

      <Collapse in={isOpen} animateOpacity>
        <Box p={4}>
          <SamplesFilter onVisualize={handleVisualize} />
          {showScatterPlot ? (
            <ScatterPlot selectedSampleIds={selectedSampleIds} />
          ) : (
            <SamplesTable />
          )}
        </Box>
      </Collapse>

      {!isOpen && selectedSampleIds.size > 0 && (
        <Box
          px={5}
          py={4}
          onClick={onToggle}
          cursor="pointer"
          bg="white"
          borderTopWidth="1px"
          borderColor="geneTerrain.border"
          _hover={{ bg: "gray.50" }}
          transition="background 0.2s"
          role="button"
          aria-label="Expand sample selection"
        >
          <Flex direction="column" gap={3}>
            {/* Sample count and expand */}
            <Flex align="center" justify="space-between">
              <Flex align="center">
                <Badge
                  bg="geneTerrain.primary"
                  color="white"
                  fontSize="sm"
                  px={2}
                  py={1}
                  borderRadius="md"
                  mr={2}
                >
                  {selectedSampleIds.size}
                </Badge>
                <Text
                  fontSize="md"
                  fontWeight="semibold"
                  color="geneTerrain.textPrimary"
                >
                  samples selected
                </Text>
              </Flex>
              <Text
                fontSize="sm"
                color="geneTerrain.accent1"
                fontWeight="medium"
              >
                Click to expand
              </Text>
            </Flex>

            {/* Sample IDs with highlighted styling */}
            <Box
              py={2}
              px={3}
              bg="gray.50"
              borderRadius="md"
              borderLeft="3px solid"
              borderLeftColor="geneTerrain.accent1"
            >
              <Flex wrap="wrap" gap={2} mb={2}>
                {Array.from(selectedSampleIds)
                  .slice(0, 3)
                  .map((id) => (
                    <Badge
                      key={id}
                      bg="rgba(128, 188, 0, 0.15)"
                      color="geneTerrain.primary"
                      fontSize="sm"
                      fontWeight="500"
                      px={2}
                      py={1}
                    >
                      {id}
                    </Badge>
                  ))}
                {selectedSampleIds.size > 3 && (
                  <Badge
                    bg="rgba(96, 96, 96, 0.1)"
                    color="geneTerrain.neutral"
                    fontSize="sm"
                    px={2}
                    py={1}
                  >
                    +{selectedSampleIds.size - 3} more
                  </Badge>
                )}
              </Flex>
            </Box>

            {/* Dataset info with styled appearance */}
            <Box
              mt={3}
              py={2}
              px={3}
              borderRadius="md"
              bg="rgba(30, 107, 82, 0.05)"
              borderLeft="3px solid"
              borderLeftColor="geneTerrain.primary"
            >
              {selectedDataset && (
                <Flex align="center" justify="space-between" mb={1}>
                  <Flex align="center" gap={2}>
                    <Icon
                      as={FaDatabase}
                      color="geneTerrain.primary"
                      boxSize="12px"
                    />
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="geneTerrain.textPrimary"
                    >
                      {selectedDataset.name || selectedDataset.id}
                    </Text>
                  </Flex>
                  {filteredSamples && samples && (
                    <Badge
                      bg="geneTerrain.primary"
                      color="white"
                      fontSize="xs"
                      borderRadius="md"
                    >
                      {filteredSamples.length}/{samples.length} samples
                    </Badge>
                  )}
                </Flex>
              )}

              {/* Show applied filters with improved styling */}
              {(searchTerm || columnFilters.size > 0) && (
                <Box mt={2}>
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color="geneTerrain.textMuted"
                    mb={1}
                  >
                    Applied Filters:
                  </Text>
                  <Flex wrap="wrap" gap={1}>
                    {searchTerm && (
                      <Badge
                        bg="rgba(30, 107, 82, 0.1)"
                        color="geneTerrain.primary"
                        fontSize="xs"
                        px={2}
                        borderRadius="md"
                      >
                        Search: "{searchTerm}"
                      </Badge>
                    )}

                    {Array.from(columnFilters.entries()).map(
                      ([column, filter]) => (
                        <Badge
                          key={column}
                          bg="rgba(41, 81, 53, 0.1)"
                          color="geneTerrain.secondary"
                          fontSize="xs"
                          px={2}
                          borderRadius="md"
                        >
                          {column}:{" "}
                          {filter.type === "numeric"
                            ? `${filter.value[0]}-${filter.value[1]}`
                            : filter.value}
                        </Badge>
                      )
                    )}
                  </Flex>
                </Box>
              )}
            </Box>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export default SamplesSection;
