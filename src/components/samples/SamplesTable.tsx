import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Spinner,
  Center,
  Checkbox,
  Flex,
  IconButton,
  Button,
  Tooltip,
  Badge,
  Collapse,
  Grid,
  GridItem,
  Divider,
  Heading,
  useDisclosure,
  VStack,
  HStack,
  ButtonGroup,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  InfoIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@chakra-ui/icons";
import { useSamplesContext } from "../../context/SamplesContext";
import { Sample } from "../../types"; // Make sure to import your Sample type
import { FaTimes } from "react-icons/fa";
import theme from "../../theme";

// Add this to a utility file or directly in SamplesTable.tsx
type FieldCategory = {
  name: string;
  fields: string[];
  color: string;
};

// Organize fields into categories for better display
const organizeGBMFields = (): FieldCategory[] => {
  return [
    {
      name: "Patient Info",
      color: "blue",
      fields: [
        "patient_id",
        "sample_id",
        "case_id",
        "gender",
        "age",
        "race",
        "ethnicity",
        "kps_score",
      ],
    },
    {
      name: "Tumor Characteristics",
      color: "green",
      fields: [
        "subtype",
        "disease_type",
        "grade",
        "stage",
        "histology",
        "primary_site",
        "tumor_size",
        "tumor_status",
        "tumor_location",
      ],
    },
    {
      name: "Molecular Markers",
      color: "purple",
      fields: [
        "idh_status",
        "mgmt_status",
        "1p19q_status",
        "egfr_status",
        "tp53_status",
        "atrx_status",
        "tert_status",
        "braf_status",
        "mib1_index",
      ],
    },
    {
      name: "Treatment & Outcome",
      color: "orange",
      fields: [
        "treatment",
        "surgery",
        "radiation",
        "chemotherapy",
        "survival_days",
        "survival_months",
        "vital_status",
        "recurrence",
        "progression_free_survival",
      ],
    },
    {
      name: "Study Info",
      color: "gray",
      fields: [
        "project",
        "study",
        "dataset",
        "source",
        "platform",
        "batch",
        "year",
        "date",
      ],
    },
  ];
};

// Function to categorize a field
const getFieldCategory = (field: string): FieldCategory | undefined => {
  const categories = organizeGBMFields();
  return categories.find((category) => category.fields.includes(field));
};

// Helper for safe property access
// Always use this to get the unique sample ID for selection/matching, regardless of API field name
const getSampleId = (sample: any): string => {
  if (!sample || typeof sample !== "object") return "";
  return sample.sampleid || sample.sample_id || String(sample.id) || "";
};

const SamplesTable: React.FC = () => {
  const {
    selectedDataset,
    selectedSampleIds,
    setSelectedSampleIds,
    isLoading,
    filteredSamples,
  } = useSamplesContext();

  // Add state for expanded sample details
  const [expandedSampleId, setExpandedSampleId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10; // Show 10 samples per page

  // Add state for select all mode
  const [selectAllMode, setSelectAllMode] = useState(false);

  // Reset to first page when filteredSamples changes
  useEffect(() => {
    setCurrentPage(0);
  }, [filteredSamples?.length]);

  // Reset selectAllMode when filteredSamples changes
  useEffect(() => {
    setSelectAllMode(false);
  }, [filteredSamples]);

  // Guard against null/undefined filteredSamples with safe access and memoization
  const safeFilteredSamples = useMemo(() => {
    return Array.isArray(filteredSamples) ? filteredSamples : [];
  }, [filteredSamples]);

  // Calculate pagination values using useMemo to avoid recalculations
  const {
    totalPages,
    paginatedSamples,
    areAllCurrentPageSamplesSelected,
    areSomeCurrentPageSamplesSelected,
  } = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(safeFilteredSamples.length / pageSize)
    );

    // Make sure currentPage is in bounds
    const validCurrentPage = Math.min(Math.max(0, currentPage), totalPages - 1);

    const paginatedSamples = safeFilteredSamples.slice(
      validCurrentPage * pageSize,
      (validCurrentPage + 1) * pageSize
    );

    // Check selection states with null guards
    const areAllSelected =
      paginatedSamples.length > 0 &&
      paginatedSamples.every((sample) => {
        const sampleId = getSampleId(sample);
        return sampleId && selectedSampleIds.has(sampleId);
      });

    const areSomeSelected =
      paginatedSamples.some((sample) => {
        const sampleId = getSampleId(sample);
        return sampleId && selectedSampleIds.has(sampleId);
      }) && !areAllSelected;

    return {
      totalPages,
      paginatedSamples,
      areAllCurrentPageSamplesSelected: areAllSelected,
      areSomeCurrentPageSamplesSelected: areSomeSelected,
    };
  }, [safeFilteredSamples, pageSize, currentPage, selectedSampleIds]);

  // Ensure current page is valid if sample count changes
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  // Handle checkbox click for a single sample
  const handleSampleSelect = (sampleId: string) => {
    if (!sampleId) return;

    setSelectedSampleIds((prev: Set<string>) => {
      const newSelection = new Set<string>(prev);

      if (newSelection.has(sampleId)) {
        newSelection.delete(sampleId);
      } else {
        newSelection.add(sampleId);
      }

      return newSelection;
    });
  };

  // Handle "select all" checkbox
  const handleSelectAllOnPage = () => {
    const shouldSelectAll = !selectAllMode;

    setSelectedSampleIds((prev: Set<string>) => {
      const newSelection = new Set<string>(prev);

      if (shouldSelectAll) {
        // Select ALL samples across ALL pages
        safeFilteredSamples.forEach((sample) => {
          const sampleId = getSampleId(sample);
          if (sampleId) {
            newSelection.add(sampleId);
          }
        });
      } else {
        // Deselect ALL samples
        newSelection.clear();
      }

      return newSelection;
    });

    // Update select all mode
    setSelectAllMode(shouldSelectAll);
  }; // Function to toggle expanded sample
  const toggleSampleDetails = (sampleId: string) => {
    setExpandedSampleId((prevId) => (prevId === sampleId ? null : sampleId));
  };

  // Move all useColorModeValue calls to the top level of the component
  const detailsBgColor = "white"; // Always use white background in light mode
  const headingColor = "geneTerrain.primary"; // Use theme primary color
  const labelColor = "geneTerrain.textSecondary";
  const valueColor = "geneTerrain.textPrimary";
  const headerBgColor = "geneTerrain.headerBg";
  const headerTextColor = "white";
  const rowTextColor = "geneTerrain.textPrimary";

  // Function to render organized sample details
  const renderOrganizedSampleDetails = (sample: any) => {
    if (!sample) return null;

    // Get all fields in the sample
    const allFields = Object.keys(sample).filter(
      (key) =>
        // Filter out empty values and non-data fields
        sample[key] !== undefined &&
        sample[key] !== null &&
        sample[key] !== "" &&
        key !== "id" &&
        key !== "name" &&
        key !== "points" &&
        typeof sample[key] !== "function"
    );

    // Organize fields by category
    const categories = organizeGBMFields();
    const categorizedFields = new Map<
      string,
      { name: string; color: string; fields: string[] }
    >();

    // Initialize categories
    categories.forEach((category) => {
      categorizedFields.set(category.name, {
        name: category.name,
        color: category.color,
        fields: [],
      });
    });

    // Add "Other" category for uncategorized fields
    categorizedFields.set("Other", {
      name: "Other",
      color: "gray",
      fields: [],
    });

    // Sort fields into categories
    allFields.forEach((field) => {
      const category = getFieldCategory(field);
      if (category) {
        const existingCategory = categorizedFields.get(category.name);
        if (existingCategory) {
          existingCategory.fields.push(field);
        }
      } else {
        // Add to "Other" if not categorized
        const other = categorizedFields.get("Other");
        if (other) {
          other.fields.push(field);
        }
      }
    });

    // Remove empty categories
    Array.from(categorizedFields.keys()).forEach((key) => {
      const category = categorizedFields.get(key);
      if (category && category.fields.length === 0) {
        categorizedFields.delete(key);
      }
    });

    // Use the color values defined at the top instead of inline hooks
    return (
      <Box
        p={4}
        bg={detailsBgColor}
        borderRadius="md"
        boxShadow="sm"
        mt={2}
        mb={2}
        borderWidth="0"
        ml={-2}
      >
        <Grid templateColumns="repeat(3, 1fr)" gap={4}>
          {categories.map((category) => (
            <Box
              key={category.name}
              bg="white"
              boxShadow="0 1px 3px rgba(0,0,0,0.05)"
              p={4}
              borderRadius="lg"
              transition="all 0.2s"
              _hover={{
                boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
                transform: "translateY(-2px)",
              }}
            >
              <Heading
                size="sm"
                mb={3}
                color="geneTerrain.primary"
                fontWeight="600"
                display="flex"
                alignItems="center"
              >
                <Box
                  as="span"
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg={`${category.color}.400`}
                  mr={2}
                />
                {category.name}
              </Heading>
              <VStack align="start" spacing={3}>
                {/* For each field in this category that exists in the sample */}
                {category.fields.map((field) =>
                  sample[field] !== undefined && sample[field] !== null ? (
                    <Box key={field} w="100%">
                      <Text
                        fontWeight="600"
                        fontSize="xs"
                        color="gray.500"
                        mb={1}
                        textTransform="uppercase"
                        letterSpacing="wide"
                        className="sample-detail-label"
                      >
                        {formatFieldName(field)}
                      </Text>
                      <Text
                        fontSize="sm"
                        color="geneTerrain.textPrimary"
                        fontWeight="500"
                        className="sample-detail-value"
                      >
                        {formatFieldValue(sample[field])}
                      </Text>
                    </Box>
                  ) : null
                )}
              </VStack>
            </Box>
          ))}
        </Grid>
      </Box>
    );
  };

  // Helper function to format field names
  const formatFieldName = (field: string): string => {
    return field
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper function to format field values
  const formatFieldValue = (value: any): string => {
    if (value === undefined || value === null) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  // Early return for loading and empty states
  if (!selectedDataset) {
    return null;
  }

  if (isLoading) {
    return (
      <Center
        p={8}
        my={4}
        bg="white"
        borderRadius="lg"
        boxShadow="sm"
        border="1px solid"
        borderColor="gray.100"
      >
        <Box textAlign="center">
          <Spinner
            size="md"
            color="geneTerrain.accent1"
            thickness="3px"
            speed="0.8s"
            emptyColor="gray.200"
          />
          <Text mt={3} fontWeight="medium" color="gray.600">
            Loading samples...
          </Text>
          <Text color="gray.400" fontSize="sm" mt={1}>
            This may take a moment
          </Text>
        </Box>
      </Center>
    );
  }

  if (safeFilteredSamples.length === 0) {
    return (
      <Box
        p={6}
        textAlign="center"
        bg="white"
        borderRadius="lg"
        boxShadow="sm"
        border="1px dashed"
        borderColor="gray.200"
        my={4}
      >
        <Box
          p={3}
          borderRadius="full"
          bg="gray.50"
          width="50px"
          height="50px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          mx="auto"
          mb={3}
        >
          <InfoIcon color="gray.400" boxSize={5} />
        </Box>
        <Text color="gray.500" fontSize="md" fontWeight="medium">
          No samples match your criteria.
        </Text>
        <Text color="gray.400" fontSize="sm" mt={2}>
          Try adjusting your filters or selection.
        </Text>
      </Box>
    );
  }

  // Render the table
  return (
    <Box>
      {/* Table container */}
      <Box
        overflowX="auto"
        mt={4}
        borderRadius="xl"
        boxShadow="0 4px 20px rgba(0,0,0,0.06)"
        bg="white"
        pb={2}
        borderWidth="1px"
        borderColor="gray.100"
      >
        <Table
          variant="simple"
          size="sm"
          mb={2}
          bg="white"
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
          sx={{
            "th, td": {
              transition: "all 0.2s ease",
            },
          }}
        >
          <Thead>
            <Tr>
              <Th
                width="40px"
                bg="geneTerrain.primary"
                color="white"
                py={3.5}
                fontSize="xs"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="wider"
                borderTopLeftRadius="xl"
                border="none"
                _first={{ borderTopLeftRadius: "xl" }}
                boxShadow="0 2px 4px rgba(0,0,0,0.1)"
                position="relative"
                zIndex={1}
              >
                <Checkbox
                  isChecked={areAllCurrentPageSamplesSelected}
                  isIndeterminate={areSomeCurrentPageSamplesSelected}
                  onChange={handleSelectAllOnPage}
                  colorScheme="green"
                  size="md"
                  sx={{
                    "& > span": {
                      borderColor: "white",
                      borderRadius: "sm",
                    },
                  }}
                />
              </Th>
              <Th
                bg="geneTerrain.primary"
                color="white"
                py={3.5}
                fontSize="xs"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="wider"
                border="none"
                boxShadow="0 2px 4px rgba(0,0,0,0.1)"
                position="relative"
                zIndex={1}
              >
                Sample ID
              </Th>
              <Th
                bg="geneTerrain.primary"
                color="white"
                py={3.5}
                fontSize="xs"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="wider"
                border="none"
                boxShadow="0 2px 4px rgba(0,0,0,0.1)"
                position="relative"
                zIndex={1}
              >
                Summary
              </Th>
              <Th
                bg="geneTerrain.primary"
                color="white"
                textAlign="right"
                py={3.5}
                fontSize="xs"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="wider"
                borderTopRightRadius="xl"
                border="none"
                _last={{ borderTopRightRadius: "xl" }}
                boxShadow="0 2px 4px rgba(0,0,0,0.1)"
                position="relative"
                zIndex={1}
              >
                Details
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginatedSamples.map((sample, index) => {
              // Type guard to ensure sample is object with expected properties
              if (!sample || typeof sample !== "object") {
                return null; // Skip invalid samples
              }

              const sampleId = getSampleId(sample);
              const displayName =
                sample.sampleid || sample.name || `Sample ${index + 1}`;
              const isSelected = sampleId && selectedSampleIds.has(sampleId);
              const isExpanded = sampleId === expandedSampleId;

              // Create a summary of key fields
              const summaryFields = [
                (sample as any).subtype,
                (sample as any).gender && `${(sample as any).gender}`,
                (sample as any).age && `Age: ${(sample as any).age}`,
                (sample as any).idh_status &&
                  `IDH: ${(sample as any).idh_status}`,
                (sample as any).mgmt_status &&
                  `MGMT: ${(sample as any).mgmt_status}`,
                (sample as any).grade && `Grade ${(sample as any).grade}`,
              ].filter(Boolean);

              return (
                <React.Fragment key={sampleId || `sample-${index}`}>
                  <Tr
                    _hover={{
                      bg: `${theme.colors?.geneTerrain?.accent1}08`, // Using theme with lighter opacity
                      transform: "translateY(-1px)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      transition: "all 0.3s ease",
                    }}
                    bg={
                      isSelected
                        ? `${theme.colors?.geneTerrain?.accent1}12`
                        : index % 2 === 0
                        ? "white"
                        : "gray.50"
                    } // Using theme with lighter opacity and zebra striping
                    cursor="pointer"
                    transition="all 0.3s"
                    borderBottom="1px solid"
                    borderColor="gray.100"
                  >
                    <Td
                      onClick={(e) => e.stopPropagation()}
                      py={3}
                      pl={4}
                      border="none"
                    >
                      <Checkbox
                        isChecked={!!isSelected}
                        onChange={() =>
                          sampleId && handleSampleSelect(sampleId)
                        }
                        colorScheme="green"
                        isDisabled={!sampleId}
                        borderColor="geneTerrain.accent1"
                        size="md"
                        sx={{
                          "& > span": {
                            bg: isSelected
                              ? "geneTerrain.accent1"
                              : "transparent",
                            borderColor: isSelected
                              ? "geneTerrain.accent1"
                              : "gray.300",
                            borderRadius: "sm",
                            transition: "all 0.2s",
                            _hover: {
                              borderColor: "geneTerrain.primary",
                              boxShadow: "0 0 0 1px rgba(0,0,0,0.05)",
                            },
                          },
                        }}
                      />
                    </Td>
                    <Td
                      onClick={() => sampleId && handleSampleSelect(sampleId)}
                      color="geneTerrain.textPrimary"
                      fontWeight="medium"
                      py={3}
                      border="none"
                    >
                      <Text
                        color={
                          isSelected
                            ? "geneTerrain.primary"
                            : "geneTerrain.textPrimary"
                        }
                        fontWeight="600"
                        fontSize="sm"
                        mb={sample.condition ? 1 : 0}
                        letterSpacing="tight"
                        display="flex"
                        alignItems="center"
                      >
                        {isSelected && (
                          <Box
                            as="span"
                            w="2px"
                            h="14px"
                            bg="geneTerrain.accent1"
                            mr={2}
                            borderRadius="full"
                          />
                        )}
                        {displayName}
                      </Text>
                      {/* {sample.condition && (
                        <Badge
                          borderRadius="full"
                          px={2}
                          py="1px"
                          colorScheme="blue"
                          fontSize="xs"
                          fontWeight="medium"
                          boxShadow="0 1px 2px rgba(0,0,0,0.05)"
                        >
                          {sample.condition}
                        </Badge>
                      )} */}
                    </Td>
                    <Td
                      onClick={() => sampleId && handleSampleSelect(sampleId)}
                      color="geneTerrain.textPrimary"
                      py={3}
                      border="none"
                    >
                      <Flex wrap="wrap" gap={1.5} alignItems="center">
                        {summaryFields.length > 0 ? (
                          summaryFields.map((field, i) => (
                            <Badge
                              key={i}
                              bg={getBadgeBackgroundColor(field || "")}
                              color={getBadgeTextColor(field || "")}
                              fontSize="xs"
                              borderRadius="md"
                              px={2}
                              py="1px"
                              fontWeight="medium"
                              boxShadow="none"
                              opacity={0.9}
                              _hover={{
                                opacity: 1,
                                transform: "translateY(-1px)",
                              }}
                              transition="all 0.2s"
                            >
                              {field}
                            </Badge>
                          ))
                        ) : (
                          <Text
                            fontSize="xs"
                            color="gray.400"
                            fontStyle="italic"
                          >
                            No summary available
                          </Text>
                        )}
                      </Flex>
                    </Td>
                    <Td textAlign="right" border="none" pr={4}>
                      <IconButton
                        aria-label="Toggle details"
                        icon={
                          isExpanded ? (
                            <ChevronUpIcon boxSize={4} />
                          ) : (
                            <ChevronDownIcon boxSize={4} />
                          )
                        }
                        size="sm"
                        onClick={() =>
                          sampleId && toggleSampleDetails(sampleId)
                        }
                        variant={isExpanded ? "solid" : "outline"}
                        colorScheme={isExpanded ? "green" : "gray"}
                        color={isExpanded ? "white" : "gray.600"}
                        borderRadius="md"
                        borderColor={
                          isExpanded ? "geneTerrain.accent1" : "gray.300"
                        }
                        boxShadow={
                          isExpanded ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                        }
                        _hover={{
                          bg: isExpanded
                            ? "geneTerrain.accent1"
                            : `${theme.colors?.geneTerrain?.accent1}10`,
                          transform: "translateY(-1px)",
                        }}
                        transition="all 0.2s"
                      />
                    </Td>
                  </Tr>

                  {isExpanded && (
                    <Tr bg="gray.50">
                      <Td colSpan={4} p={0} border="none">
                        <Collapse in={isExpanded} animateOpacity>
                          <Box
                            borderLeft="4px solid"
                            borderColor="geneTerrain.accent1"
                            mx={4}
                          >
                            {renderOrganizedSampleDetails(sample)}
                          </Box>
                        </Collapse>
                      </Td>
                    </Tr>
                  )}
                </React.Fragment>
              );
            })}
          </Tbody>
        </Table>
      </Box>

      {/* Modern pagination controls */}
      {totalPages > 1 && (
        <Box
          mt={5}
          bg="white"
          p={5}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.100"
        >
          <Flex
            w="100%"
            justify="space-between"
            align="center"
            wrap={{ base: "wrap", md: "nowrap" }}
            gap={3}
          >
            {/* Showing text - moved from a separate flex to be inline with pagination */}
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="geneTerrain.textSecondary"
              mr={{ base: 0, md: 4 }}
              mb={{ base: 2, md: 0 }}
              flexShrink={0}
            >
              Showing {currentPage * pageSize + 1}-
              {Math.min(
                (currentPage + 1) * pageSize,
                safeFilteredSamples.length
              )}{" "}
              of {safeFilteredSamples.length} samples
            </Text>

            <Flex
              align="center"
              justify="flex-end"
              flexGrow={1}
              gap={2}
              flexWrap="nowrap"
            >
              {/* First page button */}
              <IconButton
                aria-label="First page"
                icon={<ArrowLeftIcon />}
                size="sm"
                isDisabled={currentPage === 0}
                onClick={() => setCurrentPage(0)}
                variant="outline"
                colorScheme="green"
                borderRadius="md"
                opacity={currentPage === 0 ? 0.5 : 1}
                _hover={{
                  transform: currentPage === 0 ? "none" : "translateY(-1px)",
                  shadow: currentPage === 0 ? "none" : "md",
                }}
              />

              {/* Previous page button */}
              <IconButton
                aria-label="Previous page"
                icon={<ChevronLeftIcon />}
                size="sm"
                isDisabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                variant="outline"
                colorScheme="green"
                borderRadius="md"
                opacity={currentPage === 0 ? 0.5 : 1}
                _hover={{
                  transform: currentPage === 0 ? "none" : "translateY(-1px)",
                  shadow: currentPage === 0 ? "none" : "md",
                }}
              />

              {/* Smart page number display */}
              <Flex align="center">
                {/* Always show first page */}
                {currentPage > 3 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="gray"
                      onClick={() => setCurrentPage(0)}
                      mx={1}
                      minW="30px"
                      fontWeight="normal"
                      transition="all 0.2s"
                      bg="white"
                    >
                      1
                    </Button>
                    {currentPage > 4 && (
                      <Text mx={1} color="geneTerrain.textSecondary">
                        ...
                      </Text>
                    )}
                  </>
                )}

                {/* Show pages around current page */}
                {Array.from({ length: totalPages })
                  .slice(
                    Math.max(0, Math.min(currentPage - 2, totalPages - 5)),
                    Math.min(totalPages, Math.max(5, currentPage + 3))
                  )
                  .map((_, idx) => {
                    const pageNumber =
                      Math.max(0, Math.min(currentPage - 2, totalPages - 5)) +
                      idx;
                    return (
                      <Button
                        key={pageNumber}
                        size="sm"
                        variant={
                          currentPage === pageNumber ? "solid" : "outline"
                        }
                        colorScheme={
                          currentPage === pageNumber ? "green" : "gray"
                        }
                        onClick={() => setCurrentPage(pageNumber)}
                        mx={0.5}
                        minW="30px"
                        fontWeight={
                          currentPage === pageNumber ? "600" : "normal"
                        }
                        boxShadow={currentPage === pageNumber ? "sm" : "none"}
                        bg={currentPage === pageNumber ? undefined : "white"}
                        transform={
                          currentPage === pageNumber ? "scale(1.05)" : "none"
                        }
                        transition="all 0.2s"
                      >
                        {pageNumber + 1}
                      </Button>
                    );
                  })}

                {/* Always show last page */}
                {currentPage < totalPages - 4 && (
                  <>
                    {currentPage < totalPages - 5 && (
                      <Text mx={1} color="geneTerrain.textSecondary">
                        ...
                      </Text>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="gray"
                      onClick={() => setCurrentPage(totalPages - 1)}
                      mx={1}
                      minW="30px"
                      fontWeight="normal"
                      transition="all 0.2s"
                      bg="white"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </Flex>

              {/* Next page button */}
              <IconButton
                aria-label="Next page"
                icon={<ChevronRightIcon />}
                size="sm"
                isDisabled={currentPage >= totalPages - 1}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                }
                variant="outline"
                colorScheme="green"
                borderRadius="md"
                opacity={currentPage >= totalPages - 1 ? 0.5 : 1}
                _hover={{
                  transform:
                    currentPage >= totalPages - 1 ? "none" : "translateY(-1px)",
                  shadow: currentPage >= totalPages - 1 ? "none" : "md",
                }}
              />

              {/* Last page button */}
              <IconButton
                aria-label="Last page"
                icon={<ArrowRightIcon />}
                size="sm"
                isDisabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(totalPages - 1)}
                variant="outline"
                colorScheme="green"
                borderRadius="md"
                opacity={currentPage >= totalPages - 1 ? 0.5 : 1}
                _hover={{
                  transform:
                    currentPage >= totalPages - 1 ? "none" : "translateY(-1px)",
                  shadow: currentPage >= totalPages - 1 ? "none" : "md",
                }}
              />
            </Flex>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

// Function for background color - updated to use theme colors with 10% opacity
const getBadgeBackgroundColor = (field: string): string => {
  const lowercased = field.toLowerCase();

  // Use cleaner, more modern colors with appropriate opacity
  if (lowercased.includes("proneural"))
    return `${theme.colors?.geneTerrain?.accent1}30` || "#80BC0030"; // Lighter opacity for a modern look
  if (lowercased.includes("neural"))
    return `${theme.colors?.geneTerrain?.primary}30` || "#1E6B5230"; // Lighter opacity for primary
  if (lowercased.includes("classical"))
    return `${theme.colors?.geneTerrain?.accent2}30` || "#FFD40030"; // Lighter opacity for accent2
  if (lowercased.includes("mesenchymal")) return "#F8C3B830"; // Light coral with lighter opacity

  // Status indicators with soft colors for a modern look
  if (lowercased.includes("idh")) return "#EBF8FF"; // Light blue background
  if (lowercased.includes("mgmt")) return "#F0FFF4"; // Light green background
  if (lowercased.includes("grade")) return "#FFFAEB"; // Light yellow background
  if (lowercased.includes("age")) return "#F7FAFC"; // Very light gray
  if (
    lowercased.includes("gender") ||
    lowercased.includes("male") ||
    lowercased.includes("female")
  )
    return "#FAE8FF"; // Light purple

  return "#F7FAFC"; // Default very light gray for a clean look
};

// Function for text color (ensures good contrast)
const getBadgeTextColor = (field: string): string => {
  const lowercased = field.toLowerCase();

  // Consistent text colors for better readability
  if (lowercased.includes("proneural")) return "green.800";
  if (lowercased.includes("neural")) return "teal.800";
  if (lowercased.includes("classical")) return "orange.800";
  if (lowercased.includes("mesenchymal")) return "pink.800";

  // Matched text colors for status indicators
  if (lowercased.includes("idh")) return "blue.700";
  if (lowercased.includes("mgmt")) return "green.700";
  if (lowercased.includes("grade")) return "yellow.700";
  if (lowercased.includes("age")) return "gray.700";
  if (
    lowercased.includes("gender") ||
    lowercased.includes("male") ||
    lowercased.includes("female")
  )
    return "purple.700";

  // Default dark text for all other indicators
  return "gray.700";
};

export default SamplesTable;
