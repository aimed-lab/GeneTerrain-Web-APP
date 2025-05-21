import React, { useState, useMemo } from "react";
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Input,
  Flex,
  Button,
  Badge,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { useGBMData } from "./useGBMData";

export const GBMSampleExplorer: React.FC = () => {
  const {
    samples,
    fetchStatus,
    refreshSamples,
    getFieldAvailability,
    getUniqueFieldValues,
  } = useGBMData();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);

  // Get the field availability statistics
  const fieldAvailability = useMemo(
    () => getFieldAvailability(),
    [getFieldAvailability]
  );

  // Get all available fields across all samples
  const availableFields = useMemo(
    () => Object.keys(fieldAvailability).sort(),
    [fieldAvailability]
  );

  // Get unique values for the selected field
  const uniqueFieldValues = useMemo(
    () => (selectedField ? getUniqueFieldValues(selectedField) : []),
    [selectedField, getUniqueFieldValues]
  );

  // Filter and search samples
  const filteredSamples = useMemo(() => {
    // Start with all samples
    let result = [...samples];

    // Apply field filter if selected
    if (selectedField && filterValue) {
      result = result.filter(
        (sample) => String(sample[selectedField]) === filterValue
      );
    }

    // Apply search term if provided
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter((sample) => {
        // Check if any field contains the search term
        return Object.entries(sample).some(
          ([key, value]) =>
            value && String(value).toLowerCase().includes(lowerSearchTerm)
        );
      });
    }

    return result;
  }, [samples, selectedField, filterValue, searchTerm]);

  // Get common fields present in at least 50% of samples for table display
  const commonFields = useMemo(() => {
    return Object.entries(fieldAvailability)
      .filter(([_, availability]) => availability >= 0.5)
      .map(([field]) => field)
      .slice(0, 8); // Limit to 8 columns for readability
  }, [fieldAvailability]);

  // Handle loading, error states
  if (fetchStatus.loading && samples.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading GBM samples...</Text>
      </Box>
    );
  }

  if (fetchStatus.error && samples.length === 0) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Error loading GBM data</Text>
          <Text>{fetchStatus.error}</Text>
          <Button mt={2} onClick={refreshSamples}>
            Retry
          </Button>
        </Box>
      </Alert>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={4}>
        GBM Sample Explorer
      </Heading>

      {/* Data statistics */}
      <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={6}>
        <GridItem>
          <Box p={4} borderRadius="md" borderWidth="1px" bg="blue.50">
            <Text fontSize="sm" color="blue.600">
              Total Samples
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {samples.length}
            </Text>
          </Box>
        </GridItem>

        <GridItem>
          <Box p={4} borderRadius="md" borderWidth="1px" bg="green.50">
            <Text fontSize="sm" color="green.600">
              Available Fields
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {availableFields.length}
            </Text>
          </Box>
        </GridItem>

        <GridItem>
          <Box p={4} borderRadius="md" borderWidth="1px" bg="purple.50">
            <Text fontSize="sm" color="purple.600">
              Filtered Samples
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {filteredSamples.length}
            </Text>
          </Box>
        </GridItem>
      </Grid>

      {/* Filters and search */}
      <Flex mb={6} gap={4} flexWrap={{ base: "wrap", md: "nowrap" }}>
        <Box flex="1">
          <Text mb={1} fontSize="sm">
            Search samples
          </Text>
          <Input
            placeholder="Search samples..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>

        <Box flex="1">
          <Text mb={1} fontSize="sm">
            Filter by field
          </Text>
          <Select
            placeholder="Select field"
            value={selectedField || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedField(value || null);
              setFilterValue(null); // Reset filter value when field changes
            }}
          >
            {availableFields.map((field) => (
              <option key={field} value={field}>
                {field} ({Math.round(fieldAvailability[field] * 100)}%)
              </option>
            ))}
          </Select>
        </Box>

        <Box flex="1">
          <Text mb={1} fontSize="sm">
            Filter value
          </Text>
          <Select
            placeholder="Select value"
            value={filterValue || ""}
            onChange={(e) => setFilterValue(e.target.value || null)}
            isDisabled={!selectedField}
          >
            {uniqueFieldValues.map((value) => (
              <option key={String(value)} value={String(value)}>
                {String(value)}
              </option>
            ))}
          </Select>
        </Box>

        <Box alignSelf="flex-end">
          <Button
            onClick={() => {
              setSearchTerm("");
              setSelectedField(null);
              setFilterValue(null);
            }}
            colorScheme="gray"
          >
            Clear Filters
          </Button>
        </Box>
      </Flex>

      {/* Samples table */}
      <Box overflowX="auto">
        {filteredSamples.length > 0 ? (
          <>
            <Text mb={2} fontSize="sm">
              Showing {filteredSamples.length} of {samples.length} samples
            </Text>
            <Table
              size="sm"
              variant="striped"
              borderWidth="1px"
              borderRadius="md"
            >
              <Thead>
                <Tr>
                  {commonFields.map((field) => (
                    <Th key={field}>
                      {field}
                      <Badge ml={1} colorScheme="blue" fontSize="xx-small">
                        {Math.round(fieldAvailability[field] * 100)}%
                      </Badge>
                    </Th>
                  ))}
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredSamples.slice(0, 100).map((sample, index) => (
                  <Tr key={index}>
                    {commonFields.map((field) => (
                      <Td key={field}>
                        {sample[field] !== undefined &&
                        sample[field] !== null ? (
                          String(sample[field])
                        ) : (
                          <Text color="gray.400">N/A</Text>
                        )}
                      </Td>
                    ))}
                    <Td>
                      <Button size="xs" colorScheme="blue">
                        Details
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {filteredSamples.length > 100 && (
              <Text mt={2} fontSize="sm" color="gray.500">
                Showing first 100 results. {filteredSamples.length - 100} more
                samples match your criteria.
              </Text>
            )}
          </>
        ) : (
          <Alert status="info">
            <AlertIcon />
            No samples match your search criteria
          </Alert>
        )}
      </Box>

      {/* Field availability visualization */}
      <Box mt={8}>
        <Heading size="md" mb={3}>
          Field Availability
        </Heading>
        <Flex flexWrap="wrap" gap={2}>
          {availableFields.map((field) => {
            const availability = fieldAvailability[field];
            let colorScheme = "gray";

            if (availability > 0.8) colorScheme = "green";
            else if (availability > 0.5) colorScheme = "blue";
            else if (availability > 0.2) colorScheme = "yellow";
            else colorScheme = "red";

            return (
              <Badge
                key={field}
                colorScheme={colorScheme}
                variant="subtle"
                p={1}
                cursor="pointer"
                onClick={() => setSelectedField(field)}
                opacity={selectedField === field ? 1 : 0.7}
                fontWeight={selectedField === field ? "bold" : "normal"}
              >
                {field} ({Math.round(availability * 100)}%)
              </Badge>
            );
          })}
        </Flex>
      </Box>
    </Box>
  );
};

export default GBMSampleExplorer;
