import React from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Badge,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  List,
  ListItem,
  ListIcon,
  Divider,
} from "@chakra-ui/react";
import {
  FaDatabase,
  FaBrain,
  FaDna,
  FaUsers,
  FaChartLine,
  FaInfo,
  FaCheck,
  FaDownload,
  FaEye,
  FaMicroscope,
  FaUserMd,
  FaGraduationCap,
} from "react-icons/fa";

const BuiltInDatasets: React.FC = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  const datasets = [
    {
      id: "tcga",
      name: "TCGA Pan-Cancer Atlas",
      description: "Comprehensive cancer dataset covering 33 cancer types",
      icon: FaDatabase,
      color: "blue",
      samples: "Multiple",
      genes: "Comprehensive",
      cancerTypes: 33,
      features: [
        "Multi-cancer type analysis",
        "Clinical metadata integration",
        "Treatment response data",
        "Survival analysis support",
        "Molecular subtype information",
        "Tumor grade and stage data",
      ],
      useCases: [
        "Cross-cancer type comparisons",
        "Biomarker discovery",
        "Clinical outcome prediction",
        "Research publications",
      ],
      audience: ["Researchers", "PhDs", "Clinicians"],
    },
    {
      id: "gbm",
      name: "GBM Glioblastoma",
      description:
        "Focused dataset for brain cancer research and clinical applications",
      icon: FaBrain,
      color: "purple",
      samples: "Multiple",
      genes: "Comprehensive",
      cancerTypes: 1,
      features: [
        "EGFR pathway analysis",
        "IDH mutation status",
        "MGMT methylation data",
        "Treatment response tracking",
        "Survival outcome data",
        "Tumor location information",
      ],
      useCases: [
        "Treatment decision support",
        "Patient stratification",
        "Clinical research",
        "Educational demonstrations",
      ],
      audience: ["Clinicians", "Researchers", "Students"],
    },
    {
      id: "kidney",
      name: "Kidney Cell",
      description:
        "Specialized dataset for kidney cancer research and analysis",
      icon: FaDna,
      color: "green",
      samples: "Multiple",
      genes: "Comprehensive",
      cancerTypes: 1,
      features: [
        "Renal cell carcinoma subtypes",
        "Tumor microenvironment data",
        "Immune response markers",
        "Metastasis indicators",
        "Drug sensitivity profiles",
        "Pathological grading",
      ],
      useCases: [
        "Subtype classification",
        "Immunotherapy research",
        "Drug response prediction",
        "Educational purposes",
      ],
      audience: ["Researchers", "Students", "Clinicians"],
    },
  ];

  const clinicalMetadata = [
    {
      category: "Patient Demographics",
      fields: ["Age", "Gender", "Race", "Ethnicity"],
      description: "Basic patient information for cohort analysis",
    },
    {
      category: "Tumor Information",
      fields: ["Cancer Type", "Grade", "Stage", "Location", "Size"],
      description: "Tumor characteristics and classification data",
    },
    {
      category: "Molecular Markers",
      fields: [
        "IDH Status",
        "MGMT Status",
        "EGFR Expression",
        "TP53 Mutations",
      ],
      description: "Key molecular markers for treatment decisions",
    },
    {
      category: "Treatment Data",
      fields: ["Treatment Type", "Response", "Survival Time", "Progression"],
      description: "Treatment history and outcome information",
    },
    {
      category: "Study Information",
      fields: ["Study ID", "Collection Date", "Institution", "Protocol"],
      description: "Research study and data collection metadata",
    },
  ];

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading
            size="2xl"
            mb={4}
            bgGradient="linear(to-r, geneTerrain.accent1, geneTerrain.accent2)"
            bgClip="text"
          >
            Built-in Cancer Datasets
          </Heading>
          <Text fontSize="lg" color="gray.600" maxW="3xl" mx="auto">
            GeneTerrain comes with pre-loaded cancer datasets ready for
            immediate analysis. No data preparation required - start exploring
            gene expression patterns right away.
          </Text>
        </Box>

        {/* Overview */}
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Ready-to-Analyze Data</AlertTitle>
            <AlertDescription>
              All datasets include comprehensive clinical metadata, gene
              expression data, and quality controls. Simply select a dataset and
              start visualizing gene expression patterns in 3D terrain maps.
            </AlertDescription>
          </Box>
        </Alert>

        {/* Dataset Cards */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Available Datasets
          </Heading>
          <VStack spacing={6} align="stretch">
            {datasets.map((dataset) => (
              <Card key={dataset.id} bg={bgColor} shadow="lg">
                <CardHeader>
                  <HStack spacing={4}>
                    <Icon
                      as={dataset.icon}
                      color={`${dataset.color}.500`}
                      boxSize={8}
                    />
                    <Box flex="1">
                      <HStack justify="space-between" align="start">
                        <Box>
                          <Heading size="lg">{dataset.name}</Heading>
                          <Text color="gray.600" mt={1}>
                            {dataset.description}
                          </Text>
                        </Box>
                        <Badge colorScheme={dataset.color} size="lg" p={2}>
                          {dataset.samples} Samples
                        </Badge>
                      </HStack>
                    </Box>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    {/* Key Stats */}
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <Box
                        textAlign="center"
                        p={4}
                        bg={cardBg}
                        borderRadius="md"
                      >
                        <Text
                          fontSize="2xl"
                          fontWeight="bold"
                          color={`${dataset.color}.500`}
                        >
                          {dataset.samples}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Samples
                        </Text>
                      </Box>
                      <Box
                        textAlign="center"
                        p={4}
                        bg={cardBg}
                        borderRadius="md"
                      >
                        <Text
                          fontSize="2xl"
                          fontWeight="bold"
                          color={`${dataset.color}.500`}
                        >
                          {dataset.genes}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Genes
                        </Text>
                      </Box>
                      <Box
                        textAlign="center"
                        p={4}
                        bg={cardBg}
                        borderRadius="md"
                      >
                        <Text
                          fontSize="2xl"
                          fontWeight="bold"
                          color={`${dataset.color}.500`}
                        >
                          {dataset.cancerTypes}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Cancer Types
                        </Text>
                      </Box>
                    </SimpleGrid>

                    <Divider />

                    {/* Features and Use Cases */}
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Box>
                        <Heading
                          size="md"
                          mb={3}
                          color={`${dataset.color}.500`}
                        >
                          Key Features
                        </Heading>
                        <List spacing={2}>
                          {dataset.features.map((feature, index) => (
                            <ListItem key={index}>
                              <ListIcon as={FaCheck} color="green.500" />
                              {feature}
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                      <Box>
                        <Heading
                          size="md"
                          mb={3}
                          color={`${dataset.color}.500`}
                        >
                          Use Cases
                        </Heading>
                        <List spacing={2}>
                          {dataset.useCases.map((useCase, index) => (
                            <ListItem key={index}>
                              <ListIcon as={FaEye} color="blue.500" />
                              {useCase}
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </SimpleGrid>

                    {/* Target Audience */}
                    <Box>
                      <Heading size="md" mb={3} color={`${dataset.color}.500`}>
                        Ideal For
                      </Heading>
                      <HStack spacing={3} wrap="wrap">
                        {dataset.audience.map((audience, index) => (
                          <Badge
                            key={index}
                            colorScheme={dataset.color}
                            variant="outline"
                            p={2}
                            borderRadius="md"
                          >
                            <HStack spacing={1}>
                              <Icon
                                as={
                                  audience === "Clinicians"
                                    ? FaUserMd
                                    : audience === "Researchers"
                                    ? FaMicroscope
                                    : FaGraduationCap
                                }
                                boxSize={3}
                              />
                              <Text>{audience}</Text>
                            </HStack>
                          </Badge>
                        ))}
                      </HStack>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>

        {/* Clinical Metadata */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Clinical Metadata Integration
          </Heading>
          <Text fontSize="lg" textAlign="center" mb={6} color="gray.600">
            All datasets include comprehensive clinical metadata for enhanced
            analysis and cohort selection. Data is sourced from the UAB AIMED
            database and includes real cancer genomics data with detailed
            clinical information.
          </Text>
          <TableContainer>
            <Table
              variant="simple"
              bg={bgColor}
              borderRadius="lg"
              overflow="hidden"
            >
              <Thead bg={cardBg}>
                <Tr>
                  <Th>Category</Th>
                  <Th>Available Fields</Th>
                  <Th>Description</Th>
                </Tr>
              </Thead>
              <Tbody>
                {clinicalMetadata.map((category, index) => (
                  <Tr key={index}>
                    <Td fontWeight="bold">{category.category}</Td>
                    <Td>
                      <HStack spacing={1} wrap="wrap">
                        {category.fields.map((field, fieldIndex) => (
                          <Badge
                            key={fieldIndex}
                            colorScheme="blue"
                            variant="subtle"
                            size="sm"
                          >
                            {field}
                          </Badge>
                        ))}
                      </HStack>
                    </Td>
                    <Td fontSize="sm" color="gray.600">
                      {category.description}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {/* Data Quality */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" mb={4}>
                Data Quality & Standards
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                <Box>
                  <Heading size="lg" mb={4} color="geneTerrain.accent1">
                    Quality Controls
                  </Heading>
                  <List spacing={3}>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">Expression Normalization</Text>
                      <Text fontSize="sm" color="gray.600">
                        All gene expression data is normalized using
                        industry-standard methods
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">Quality Metrics</Text>
                      <Text fontSize="sm" color="gray.600">
                        Comprehensive quality control metrics for each sample
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">Missing Data Handling</Text>
                      <Text fontSize="sm" color="gray.600">
                        Robust handling of missing values and outliers
                      </Text>
                    </ListItem>
                  </List>
                </Box>

                <Box>
                  <Heading size="lg" mb={4} color="geneTerrain.accent2">
                    Data Sources
                  </Heading>
                  <List spacing={3}>
                    <ListItem>
                      <ListIcon as={FaDatabase} color="blue.500" />
                      <Text fontWeight="bold">UAB AIMED Database</Text>
                      <Text fontSize="sm" color="gray.600">
                        Primary source for cancer genomics data
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaDatabase} color="blue.500" />
                      <Text fontWeight="bold">TCGA Consortium</Text>
                      <Text fontSize="sm" color="gray.600">
                        The Cancer Genome Atlas data integration
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaDatabase} color="blue.500" />
                      <Text fontWeight="bold">Clinical Trials</Text>
                      <Text fontSize="sm" color="gray.600">
                        Data from ongoing and completed clinical studies
                      </Text>
                    </ListItem>
                  </List>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Getting Started */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" mb={4}>
                Getting Started with Datasets
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="green" p={2} borderRadius="md">
                      1
                    </Badge>
                    <Heading size="md">Choose Dataset</Heading>
                  </HStack>
                  <Text fontSize="sm">
                    Select from TCGA Pan-Cancer, GBM Glioblastoma, or Kidney
                    Cell datasets based on your research needs.
                  </Text>
                </VStack>

                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="green" p={2} borderRadius="md">
                      2
                    </Badge>
                    <Heading size="md">Filter Samples</Heading>
                  </HStack>
                  <Text fontSize="sm">
                    Use clinical metadata filters to select specific patient
                    cohorts or conditions for analysis.
                  </Text>
                </VStack>

                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="green" p={2} borderRadius="md">
                      3
                    </Badge>
                    <Heading size="md">Generate Terrain</Heading>
                  </HStack>
                  <Text fontSize="sm">
                    Create 3D terrain visualizations to explore gene expression
                    patterns in your selected samples.
                  </Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Call to Action */}
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Ready to Explore?</AlertTitle>
            <AlertDescription>
              All datasets are immediately available for analysis. No data
              preparation, upload, or programming required. Start exploring gene
              expression patterns in 3D terrain maps right away!
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Container>
  );
};

export default BuiltInDatasets;
