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
  SimpleGrid,
  Badge,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  ListIcon,
} from "@chakra-ui/react";
import {
  FaUserMd,
  FaBrain,
  FaClock,
  FaDatabase,
  FaChartLine,
  FaCheck,
  FaLightbulb,
  FaDownload,
  FaShare,
  FaEye,
  FaMicroscope,
  FaUsers,
  FaRocket,
  FaChartBar,
  FaFileAlt,
  FaGraduationCap,
  FaFlask,
  FaSearch,
  FaFilter,
  FaLayerGroup,
  FaMousePointer,
  FaUpload,
} from "react-icons/fa";

const CaseStudies: React.FC = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="2xl" mb={4} color="geneTerrain.primary">
            Case Studies
          </Heading>
          <Text fontSize="lg" color="gray.600" maxW="3xl" mx="auto">
            Real-world examples of how GeneTerrain is being used across clinical
            research, drug discovery, and education to transform gene expression
            analysis.
          </Text>
        </Box>

        {/* Case Study 1: GBM Sample Exploration */}
        <Card bg={bgColor} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <HStack spacing={4}>
                <Icon as={FaBrain} color="blue.500" boxSize={6} />
                <Box>
                  <Heading size="lg" color="blue.600">
                    Case Study 1: Glioblastoma Sample Exploration & Pattern
                    Discovery
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Clinical Research • Sample Analysis • Pattern Recognition
                  </Text>
                </Box>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Heading size="md" mb={3} color="gray.700">
                    The Challenge
                  </Heading>
                  <Text mb={4}>
                    A researcher is working with GBM (Glioblastoma Multiforme)
                    gene expression data and needs to understand the
                    heterogeneity across different patient samples. They have
                    access to clinical metadata but struggle to identify
                    meaningful patterns in the complex gene expression
                    landscape.
                  </Text>

                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Key Problem</AlertTitle>
                      <AlertDescription>
                        Complex gene expression data with clinical metadata that
                        needs spatial pattern recognition and sample comparison
                        capabilities.
                      </AlertDescription>
                    </Box>
                  </Alert>
                </Box>

                <Box>
                  <Heading size="md" mb={3} color="gray.700">
                    GeneTerrain Solution
                  </Heading>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaDatabase} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Sample Metadata Analysis:
                      </Text>
                      Used field availability features to understand clinical
                      data across samples
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaSearch} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Pattern Identification:
                      </Text>
                      Discovered survival outcome clusters in gene expression
                      space
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaFilter} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Clinical Correlation:
                      </Text>
                      Filtered samples by treatment type to observe expression
                      differences
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaMousePointer} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Gene Selection:
                      </Text>
                      Used lasso selection to identify gene clusters in
                      long-term survivors
                    </ListItem>
                  </List>
                </Box>
              </SimpleGrid>

              <Box>
                <Heading size="md" mb={3} color="gray.700">
                  Realistic Impact
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Card bg={cardBg} p={4}>
                    <HStack mb={2}>
                      <Icon as={FaEye} color="blue.500" />
                      <Text fontWeight="semibold">Data Understanding</Text>
                    </HStack>
                    <Text fontSize="sm">
                      Clear understanding of data quality and sample
                      characteristics
                    </Text>
                  </Card>
                  <Card bg={cardBg} p={4}>
                    <HStack mb={2}>
                      <Icon as={FaLightbulb} color="yellow.500" />
                      <Text fontWeight="semibold">Hypothesis Generation</Text>
                    </HStack>
                    <Text fontSize="sm">
                      Identified potential gene signatures associated with
                      treatment response
                    </Text>
                  </Card>
                  <Card bg={cardBg} p={4}>
                    <HStack mb={2}>
                      <Icon as={FaUsers} color="green.500" />
                      <Text fontWeight="semibold">Collaboration</Text>
                    </HStack>
                    <Text fontSize="sm">
                      Shared visualizations with clinical colleagues for
                      immediate understanding
                    </Text>
                  </Card>
                </SimpleGrid>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Case Study 2: Custom Gene Expression Analysis */}
        <Card bg={bgColor} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <HStack spacing={4}>
                <Icon as={FaFlask} color="purple.500" boxSize={6} />
                <Box>
                  <Heading size="lg" color="purple.600">
                    Case Study 2: Custom Gene Expression Analysis for Research
                    Projects
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Research • Data Visualization • Pattern Discovery
                  </Text>
                </Box>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Heading size="md" mb={3} color="gray.700">
                    The Challenge
                  </Heading>
                  <Text mb={4}>
                    A graduate student is analyzing gene expression data from
                    their own experiment comparing control vs. treated cell
                    lines. They have CSV files with gene coordinates and
                    expression values but need to visualize the results in an
                    intuitive way.
                  </Text>

                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Key Problem</AlertTitle>
                      <AlertDescription>
                        Need for intuitive visualization of custom gene
                        expression data without programming skills, with ability
                        to compare experimental conditions.
                      </AlertDescription>
                    </Box>
                  </Alert>
                </Box>

                <Box>
                  <Heading size="md" mb={3} color="gray.700">
                    GeneTerrain Solution
                  </Heading>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaUpload} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Data Upload:
                      </Text>
                      Uploaded layout file (gene coordinates) and expression
                      file (expression values)
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaChartBar} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Visualization Generation:
                      </Text>
                      Created 3D terrain showing gene expression patterns across
                      conditions
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaLayerGroup} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Condition Comparison:
                      </Text>
                      Switched between control and treated conditions to see
                      expression changes
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaSearch} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Gene Discovery:
                      </Text>
                      Identified genes showing dramatic changes between
                      conditions
                    </ListItem>
                  </List>
                </Box>
              </SimpleGrid>

              <Box>
                <Heading size="md" mb={3} color="gray.700">
                  Realistic Impact
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Card bg={cardBg} p={4}>
                    <HStack mb={2}>
                      <Icon as={FaChartLine} color="blue.500" />
                      <Text fontWeight="semibold">Data Visualization</Text>
                    </HStack>
                    <Text fontSize="sm">
                      Created publication-quality visualizations of gene
                      expression data
                    </Text>
                  </Card>
                  <Card bg={cardBg} p={4}>
                    <HStack mb={2}>
                      <Icon as={FaLightbulb} color="yellow.500" />
                      <Text fontWeight="semibold">Pattern Recognition</Text>
                    </HStack>
                    <Text fontSize="sm">
                      Discovered unexpected gene clusters and expression
                      patterns
                    </Text>
                  </Card>
                  <Card bg={cardBg} p={4}>
                    <HStack mb={2}>
                      <Icon as={FaRocket} color="green.500" />
                      <Text fontWeight="semibold">Research Efficiency</Text>
                    </HStack>
                    <Text fontSize="sm">
                      Saved time compared to manual analysis of spreadsheets
                    </Text>
                  </Card>
                </SimpleGrid>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Case Study 3: Educational Exploration */}
        <Card bg={bgColor} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <HStack spacing={4}>
                <Icon as={FaGraduationCap} color="orange.500" boxSize={6} />
                <Box>
                  <Heading size="lg" color="orange.600">
                    Case Study 3: Educational Exploration of Cancer Genomics
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Education • Interactive Learning • Data Literacy
                  </Text>
                </Box>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Heading size="md" mb={3} color="gray.700">
                    The Challenge
                  </Heading>
                  <Text mb={4}>
                    An instructor wants to teach students about cancer genomics
                    using real data, but most students don't have programming
                    skills. They need a tool that makes complex genomic concepts
                    accessible and engaging.
                  </Text>

                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Key Problem</AlertTitle>
                      <AlertDescription>
                        Need for accessible, interactive tool to teach complex
                        genomic concepts without requiring programming skills,
                        using real cancer data.
                      </AlertDescription>
                    </Box>
                  </Alert>
                </Box>

                <Box>
                  <Heading size="md" mb={3} color="gray.700">
                    GeneTerrain Solution
                  </Heading>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaFileAlt} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Guided Exploration:
                      </Text>
                      Students followed documentation to understand core
                      concepts
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaDatabase} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Dataset Exploration:
                      </Text>
                      Examined built-in datasets (TCGA, GBM, Kidney Cell) for
                      different cancer types
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaMousePointer} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Interactive Learning:
                      </Text>
                      Used gene expression visualization workflow to learn
                      spatial organization
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaUserMd} color="green.500" />
                      <Text as="span" fontWeight="semibold">
                        Case Study Learning:
                      </Text>
                      Explored GBM case study to see clinical applications
                    </ListItem>
                  </List>
                </Box>
              </SimpleGrid>

              <Box>
                <Heading size="md" mb={3} color="gray.700">
                  Realistic Educational Outcomes
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <VStack spacing={3} align="stretch">
                    <Card bg={cardBg} p={4}>
                      <HStack mb={2}>
                        <Icon as={FaBrain} color="blue.500" />
                        <Text fontWeight="semibold">
                          Conceptual Understanding
                        </Text>
                      </HStack>
                      <Text fontSize="sm">
                        Students developed intuition for gene expression data
                        structure
                      </Text>
                    </Card>
                    <Card bg={cardBg} p={4}>
                      <HStack mb={2}>
                        <Icon as={FaChartBar} color="green.500" />
                        <Text fontWeight="semibold">Data Literacy</Text>
                      </HStack>
                      <Text fontSize="sm">
                        Students learned to interpret complex genomic
                        visualizations
                      </Text>
                    </Card>
                    <Card bg={cardBg} p={4}>
                      <HStack mb={2}>
                        <Icon as={FaMicroscope} color="purple.500" />
                        <Text fontWeight="semibold">Research Awareness</Text>
                      </HStack>
                      <Text fontSize="sm">
                        Students understood how computational tools are used in
                        modern biology
                      </Text>
                    </Card>
                  </VStack>
                  <VStack spacing={3} align="stretch">
                    <Card bg={cardBg} p={4}>
                      <HStack mb={2}>
                        <Icon as={FaRocket} color="orange.500" />
                        <Text fontWeight="semibold">Skill Development</Text>
                      </HStack>
                      <Text fontSize="sm">
                        Students gained experience with interactive data
                        exploration
                      </Text>
                    </Card>
                    <Card bg={cardBg} p={4}>
                      <HStack mb={2}>
                        <Icon as={FaUsers} color="teal.500" />
                        <Text fontWeight="semibold">Career Exposure</Text>
                      </HStack>
                      <Text fontSize="sm">
                        Students saw how computational biology tools work in
                        practice
                      </Text>
                    </Card>
                    <Card bg={cardBg} p={4}>
                      <HStack mb={2}>
                        <Icon as={FaCheck} color="green.500" />
                        <Text fontWeight="semibold">Engagement</Text>
                      </HStack>
                      <Text fontSize="sm">
                        Higher student engagement compared to traditional
                        methods
                      </Text>
                    </Card>
                  </VStack>
                </SimpleGrid>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default CaseStudies;
