import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Flex,
  InputGroup,
  InputLeftElement,
  Input,
  Button,
  Box,
  HStack,
  Badge,
  Tooltip,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Text,
  useBreakpointValue,
  InputRightElement,
  FormControl,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
} from "@chakra-ui/react";
import { SearchIcon, CloseIcon } from "@chakra-ui/icons";
import { FaDna, FaFilter, FaTable, FaTimes } from "react-icons/fa";
import { motion } from "framer-motion";
import { useSamplesContext } from "../../context/SamplesContext";

const MotionFlex = motion(Flex);
const MotionBadge = motion(Badge);
const MotionTag = motion(Tag);

interface SamplesFilterProps {
  onVisualize?: () => void;
}

// Define a type that allows string indexing
type SampleWithDynamicProps = Record<string, any>;

const SamplesFilter: React.FC<SamplesFilterProps> = ({ onVisualize }) => {
  const {
    // Existing properties
    searchTerm,
    setSearchTerm,
    // Update these properties
    columnFilters,
    addColumnFilter,
    removeColumnFilter,
    clearColumnFilters,
    // Other existing properties - remove filterCondition/availableConditions
    selectedSampleIds,
    handleVisualize,
    filteredSamples,
    selectedDataset,
    setSelectedSampleIds,
  } = useSamplesContext();

  const [showActiveFilters, setShowActiveFilters] = useState<boolean>(true);

  // New state for column-specific filtering
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [columnFilterValue, setColumnFilterValue] = useState<any>("");
  const [columnFilterRange, setColumnFilterRange] = useState<[number, number]>([
    0, 100,
  ]);

  // Move these state declarations to the component top level
  const [minInput, setMinInput] = useState<string>("");
  const [maxInput, setMaxInput] = useState<string>("");

  const handleVisualizeClick = () => {
    handleVisualize();
    if (onVisualize) {
      onVisualize();
    }
  };

  // Responsive design adjustments
  const buttonSize = useBreakpointValue({ base: "sm", md: "md" });

  // Add this function after getColumnType
  const hasTooManyUniqueValues = (columnName: string): boolean => {
    if (!filteredSamples || filteredSamples.length === 0 || !columnName)
      return false;

    // Sample a subset of rows to check for uniqueness (for performance)
    const sampleSize = Math.min(filteredSamples.length, 100);
    const sampleRows = filteredSamples.slice(0, sampleSize);

    // Get values from sample rows
    const values = sampleRows
      .map((s) => (s as SampleWithDynamicProps)[columnName])
      .filter((v) => v !== null && v !== undefined);

    // Check unique value ratio
    const uniqueValues = new Set(values);

    // If we have many unique values compared to our sample size,
    // this column probably has too many values
    return uniqueValues.size > 20 && uniqueValues.size > sampleSize * 0.5;
  };

  // Get all available columns from the samples
  const availableColumns = useMemo(() => {
    if (!filteredSamples || filteredSamples.length === 0) return [];

    // Extract all unique column keys from samples
    const columnSet = new Set<string>();
    filteredSamples.forEach((sample) => {
      Object.keys(sample as SampleWithDynamicProps).forEach((key) => {
        if (
          key !== "id" &&
          key !== "selected" &&
          !hasTooManyUniqueValues(key) // Only add columns with manageable unique values
        ) {
          columnSet.add(key);
        }
      });
    });

    return Array.from(columnSet);
  }, [filteredSamples]);

  // Determine column type (categorical or numeric)
  const getColumnType = (
    columnName: string
  ): "categorical" | "numeric" | "text" => {
    if (!filteredSamples || filteredSamples.length === 0 || !columnName)
      return "text";

    // Get first few non-null values
    const values = filteredSamples
      .map((s) => (s as SampleWithDynamicProps)[columnName])
      .filter((v) => v !== null && v !== undefined)
      .slice(0, 10);

    if (values.length === 0) return "text";

    // Check if numeric
    if (values.every((v) => !isNaN(Number(v)))) return "numeric";

    // If few unique values, treat as categorical
    const uniqueValues = new Set(values);
    if (uniqueValues.size <= 10) return "categorical";

    return "text";
  };

  // Get unique values for a categorical column
  const getCategoricalValues = (columnName: string): string[] => {
    if (!filteredSamples || filteredSamples.length === 0 || !columnName)
      return [];

    const valueSet = new Set<string>();
    filteredSamples.forEach((sample) => {
      const value = (sample as SampleWithDynamicProps)[columnName];
      if (value !== null && value !== undefined) {
        valueSet.add(String(value));
      }
    });

    return Array.from(valueSet).sort();
  };

  // Get min/max for numeric columns
  const getNumericRange = (columnName: string): [number, number] => {
    if (!filteredSamples || filteredSamples.length === 0 || !columnName)
      return [0, 100];

    const values = filteredSamples
      .map((s) => Number((s as SampleWithDynamicProps)[columnName]))
      .filter((v) => !isNaN(v));

    if (values.length === 0) return [0, 100];

    return [Math.min(...values), Math.max(...values)];
  };

  // Reset column filter
  const clearColumnFilter = (columnName: string) => {
    if (columnName === selectedColumn) {
      setSelectedColumn("");
      setColumnFilterValue("");
      setColumnFilterRange([0, 100]);
    }
    removeColumnFilter(columnName);
  };

  // Add this helper function to detect if a range covers the full spectrum
  const isFullRange = (
    value: [number, number],
    columnName: string
  ): boolean => {
    if (!columnName) return false;

    const [actualMin, actualMax] = getNumericRange(columnName);
    const [currentMin, currentMax] = value;

    // If the current range matches (or exceeds) the full range, consider it as "no filter"
    return currentMin <= actualMin && currentMax >= actualMax;
  };

  // Update the handleColumnFilterChange function
  const handleColumnFilterChange = (
    column: string,
    type: string,
    value: any
  ) => {
    if (!column) return;

    // Handle empty values as filter resets
    if (
      value === "" ||
      value === null ||
      (Array.isArray(value) && value.length === 0)
    ) {
      // For empty value, remove this column filter
      removeColumnFilter(column);
      return;
    }

    // For numeric type, check if the range covers the full spectrum
    if (type === "numeric" && Array.isArray(value) && value.length === 2) {
      if (isFullRange(value as [number, number], column)) {
        removeColumnFilter(column);
        return;
      }
    }

    // Add or update this column filter
    addColumnFilter({
      column,
      type: type as "categorical" | "numeric" | "text",
      value,
    });
  };

  // Add this to clear all column filters
  const clearAllFilters = () => {
    setSelectedColumn("");
    setColumnFilterValue("");
    setColumnFilterRange([0, 100]);
    clearColumnFilters();
    setSearchTerm("");
    // Remove setFilterCondition(null);
  };

  // Update the handleColumnChange function
  const handleColumnChange = (columnName: string) => {
    setSelectedColumn(columnName);

    if (!columnName) {
      // Use removeColumnFilter instead of setColumnFilter
      // No column selected means no filter for any column
      return;
    }

    const type = getColumnType(columnName);

    if (type === "numeric") {
      const range = getNumericRange(columnName);
      setColumnFilterRange(range);
      // Don't set a filter initially - only set when user changes the range
      // No need to call anything here since we're not setting a filter yet
    } else {
      setColumnFilterValue("");
      // Don't set any filter until a value is selected
      // No need to call anything here since we're not setting a filter yet
    }
  };

  // Effect to initialize range state when column changes - move to component level
  const prevFiltersRef = useRef(columnFilters);

  useEffect(() => {
    // Only run the filter update logic if columnFilters has actually changed
    if (prevFiltersRef.current !== columnFilters) {
      prevFiltersRef.current = columnFilters;

      if (selectedColumn && getColumnType(selectedColumn) === "numeric") {
        // Only initialize inputs if they're empty or when column changes
        // This prevents overwriting the current values when other filters change
        if (minInput === "" || maxInput === "") {
          const [rangeMin, rangeMax] = getNumericRange(selectedColumn);
          setMinInput(String(rangeMin));
          setMaxInput(String(rangeMax));
          setColumnFilterRange([rangeMin, rangeMax]);
        }

        // Check if there's an existing filter for this column
        const existingFilter = columnFilters.get(selectedColumn);
        if (existingFilter && existingFilter.type === "numeric") {
          // Only update if the values are different
          if (
            String(existingFilter.value[0]) !== minInput ||
            String(existingFilter.value[1]) !== maxInput
          ) {
            setColumnFilterRange(existingFilter.value);
            setMinInput(String(existingFilter.value[0]));
            setMaxInput(String(existingFilter.value[1]));
          }
        }
      } else if (selectedColumn) {
        // For categorical/text columns
        const existingFilter = columnFilters.get(selectedColumn);
        if (existingFilter) {
          setColumnFilterValue(existingFilter.value);
        } else {
          setColumnFilterValue("");
        }
      }
    }
  }, [selectedColumn, columnFilters]); // Remove columnFilters from the dependency array

  // Apply filter with valid values only when explicitly instructed
  const applyRangeFilter = (minVal: number, maxVal: number) => {
    const [min, max] = selectedColumn
      ? getNumericRange(selectedColumn)
      : [0, 100];

    // Ensure we have valid values
    const validMin = isNaN(minVal) ? min : minVal;
    const validMax = isNaN(maxVal) ? max : maxVal;

    // Update UI state
    setColumnFilterRange([validMin, validMax]);

    // Add a small epsilon for floating point comparison
    const epsilon = 0.0001;

    // Only apply filter if it's significantly different from the full range
    if (validMin > min + epsilon || validMax < max - epsilon) {
      addColumnFilter({
        column: selectedColumn,
        type: "numeric",
        value: [validMin, validMax],
      });
    } else {
      // If it's basically the full range, don't apply any filtering
      removeColumnFilter(selectedColumn);
    }
  };

  return (
    <Box>
      <Box
        bg="white"
        p={4}
        borderRadius="md"
        mb={4}
        borderWidth="1px"
        borderColor="geneTerrain.border"
      >
        {/* Search and Filter Controls - First Row */}
        <Flex
          direction={{ base: "column", md: "row" }}
          gap={4}
          align="flex-end"
          mb={3}
        >
          {/* Text Search */}
          <FormControl flex="1">
            <FormLabel fontSize="sm" mb={1} color="geneTerrain.textPrimary">
              Search Samples
            </FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.500" />
              </InputLeftElement>
              <Input
                placeholder="Search samples..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg="white"
                borderColor="geneTerrain.border"
                color="geneTerrain.textPrimary"
                _focus={{
                  borderColor: "geneTerrain.accent1",
                  boxShadow: "0 0 0 1px #1E6B52",
                }}
              />
              {searchTerm && (
                <InputRightElement
                  cursor="pointer"
                  onClick={() => setSearchTerm("")}
                >
                  <CloseIcon color="gray.500" boxSize={3} />
                </InputRightElement>
              )}
            </InputGroup>
          </FormControl>

          {/* Column Filter - First Dropdown */}
          <FormControl flex="1">
            <FormLabel fontSize="sm" mb={1} color="geneTerrain.textPrimary">
              Filter by Column
            </FormLabel>
            <Select
              placeholder="Select column"
              value={selectedColumn}
              onChange={(e) => handleColumnChange(e.target.value)}
              bg="white"
              color="geneTerrain.textPrimary"
              borderColor="geneTerrain.border"
            >
              {availableColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </Select>
          </FormControl>

          {/* Dynamic Filter Input */}
          {selectedColumn && (
            <FormControl flex="1">
              <FormLabel fontSize="sm" mb={1} color="geneTerrain.textPrimary">
                {getColumnType(selectedColumn) === "numeric"
                  ? "Range"
                  : "Value"}
              </FormLabel>
              <Box>
                {(() => {
                  const columnType = getColumnType(selectedColumn);

                  switch (columnType) {
                    case "categorical":
                      const options = getCategoricalValues(selectedColumn);
                      return (
                        <Select
                          placeholder={`All ${selectedColumn}`}
                          value={columnFilterValue}
                          onChange={(e) => {
                            setColumnFilterValue(e.target.value);
                            if (!e.target.value) {
                              removeColumnFilter(selectedColumn);
                            } else {
                              handleColumnFilterChange(
                                selectedColumn,
                                "categorical",
                                e.target.value
                              );
                            }
                          }}
                          bg="white"
                          color="geneTerrain.textPrimary"
                          borderColor="geneTerrain.border"
                        >
                          <option value="">All values</option>
                          {options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      );

                    case "numeric":
                      const [min, max] = getNumericRange(selectedColumn);

                      return (
                        <HStack w="100%">
                          <Input
                            value={minInput}
                            onChange={(e) => {
                              setMinInput(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const minVal = parseFloat(minInput);
                                const maxVal = parseFloat(maxInput);
                                applyRangeFilter(minVal, maxVal);
                              }
                            }}
                            onBlur={() => {
                              const minVal = parseFloat(minInput);
                              const maxVal = parseFloat(maxInput);
                              if (isNaN(minVal)) {
                                setMinInput(String(min));
                              }
                              const existingFilter =
                                columnFilters.get(selectedColumn);
                              if (
                                existingFilter &&
                                existingFilter.type === "numeric" &&
                                existingFilter.value[0] === minVal &&
                                existingFilter.value[1] === maxVal
                              ) {
                                return;
                              }
                              applyRangeFilter(minVal, maxVal);
                            }}
                            placeholder={String(min)}
                            size="sm"
                            bg="white"
                            color="geneTerrain.textPrimary"
                            borderColor="geneTerrain.border"
                            type="number"
                          />

                          <Text fontSize="sm" color="geneTerrain.textPrimary">
                            to
                          </Text>

                          <Input
                            value={maxInput}
                            onChange={(e) => {
                              setMaxInput(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const minVal = parseFloat(minInput);
                                const maxVal = parseFloat(maxInput);
                                applyRangeFilter(minVal, maxVal);
                              }
                            }}
                            onBlur={() => {
                              const minVal = parseFloat(minInput);
                              const maxVal = parseFloat(maxInput);
                              if (isNaN(maxVal)) {
                                setMaxInput(String(max));
                              }
                              const existingFilter =
                                columnFilters.get(selectedColumn);
                              if (
                                existingFilter &&
                                existingFilter.type === "numeric" &&
                                existingFilter.value[0] === minVal &&
                                existingFilter.value[1] === maxVal
                              ) {
                                return;
                              }
                              applyRangeFilter(minVal, maxVal);
                            }}
                            placeholder={String(max)}
                            size="sm"
                            bg="white"
                            color="geneTerrain.textPrimary"
                            borderColor="geneTerrain.border"
                            type="number"
                          />
                        </HStack>
                      );

                    default:
                      return (
                        <Input
                          placeholder={`Filter by ${selectedColumn}`}
                          value={columnFilterValue}
                          onChange={(e) => {
                            setColumnFilterValue(e.target.value);
                            if (!e.target.value.trim()) {
                              removeColumnFilter(selectedColumn);
                            } else {
                              handleColumnFilterChange(
                                selectedColumn,
                                "text",
                                e.target.value
                              );
                            }
                          }}
                          bg="white"
                          color="geneTerrain.textPrimary"
                          borderColor="geneTerrain.border"
                        />
                      );
                  }
                })()}
              </Box>
            </FormControl>
          )}
        </Flex>

        {/* Combined filters row with active filters */}
        <Flex
          mt={3}
          align="center"
          justify="space-between"
          wrap={{ base: "wrap", md: "nowrap" }}
          gap={2}
        >
          {/* Active filters */}
          <Wrap
            spacing={2}
            flex="1"
            display={
              (searchTerm || columnFilters.size > 0) && showActiveFilters
                ? "flex"
                : "none"
            }
          >
            {searchTerm && (
              <WrapItem>
                <MotionTag
                  size="sm"
                  borderRadius="full"
                  variant="subtle"
                  colorScheme="blue"
                  whileHover={{ scale: 1.05 }}
                  bg="gray.100"
                  color="geneTerrain.textPrimary"
                >
                  <HStack spacing={1}>
                    <SearchIcon boxSize={3} />
                    <TagLabel>"{searchTerm}"</TagLabel>
                    <TagCloseButton onClick={() => setSearchTerm("")} />
                  </HStack>
                </MotionTag>
              </WrapItem>
            )}

            {/* Display all active column filters */}
            {Array.from(columnFilters.entries()).map(([column, filter]) => (
              <WrapItem key={column}>
                <MotionTag
                  size="sm"
                  borderRadius="full"
                  variant="subtle"
                  colorScheme="purple"
                  whileHover={{ scale: 1.05 }}
                  bg="gray.100"
                  color="geneTerrain.textPrimary"
                >
                  <HStack spacing={1}>
                    <FaTable size="0.7em" />
                    <TagLabel>
                      {column}:
                      {filter.type === "numeric"
                        ? ` ${filter.value[0]}-${filter.value[1]}`
                        : ` ${filter.value}`}
                    </TagLabel>
                    <TagCloseButton onClick={() => clearColumnFilter(column)} />
                  </HStack>
                </MotionTag>
              </WrapItem>
            ))}
          </Wrap>

          {/* Sample count and action buttons */}
          <HStack spacing={3} justify="flex-end">
            <MotionBadge
              px={2}
              py={1}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              bg="#4A7768"
              color="white"
            >
              {filteredSamples.length} samples
            </MotionBadge>

            <MotionBadge
              px={2}
              py={1}
              initial={{ scale: 0.9 }}
              animate={{
                scale: selectedSampleIds.size > 0 ? [1, 1.1, 1] : 1,
                transition: { duration: 0.3 },
              }}
              bg="#4A7768"
              color="white"
            >
              {selectedSampleIds.size} selected
            </MotionBadge>

            {/* Add Clear Selection button here */}
            {selectedSampleIds.size > 0 && (
              <Button
                as={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                leftIcon={<FaTimes />}
                size="sm"
                bg="white"
                color="geneTerrain.textPrimary"
                borderColor="geneTerrain.border"
                borderWidth="1px"
                onClick={() => setSelectedSampleIds(new Set())}
                _hover={{ bg: "gray.50" }}
              >
                Clear Selection ({selectedSampleIds.size})
              </Button>
            )}
          </HStack>
        </Flex>

        {/* Visualize button */}
        <Flex mt={4} justify="center" align="center">
          {selectedSampleIds.size > 0 && (
            <Tooltip
              label={`Visualize gene expression for ${selectedSampleIds.size} selected samples`}
              placement="top"
              hasArrow
              bg="geneTerrain.primary"
              color="white"
            >
              <Button
                as={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                bg="#1E6B52"
                color="white"
                size="md"
                leftIcon={<FaDna size="1.2em" />}
                fontSize="1.1em"
                fontWeight="600"
                px={6}
                py={2}
                _hover={{ opacity: 0.9 }}
                onClick={handleVisualizeClick}
              >
                Visualize ({selectedSampleIds.size})
              </Button>
            </Tooltip>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default SamplesFilter;
