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
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  ListIcon,
  Badge,
  Divider,
} from "@chakra-ui/react";
import {
  FaDna,
  FaMountain,
  FaLaptop,
  FaDatabase,
  FaUserMd,
  FaMicroscope,
  FaGraduationCap,
  FaCheck,
  FaRocket,
  FaShieldAlt,
  FaUsers,
  FaChartLine,
  FaBrain,
  FaEye,
  FaCogs,
} from "react-icons/fa";

const WhatIsGeneTerrain: React.FC = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

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
            What is GeneTerrain?
          </Heading>
          <Text fontSize="lg" color="gray.600" maxW="3xl" mx="auto">
            GeneTerrain transforms complex gene expression data into intuitive
            3D terrain maps, making advanced genomic analysis accessible to
            researchers, clinicians, and students without requiring programming
            skills.
          </Text>
        </Box>

        {/* Core Concept */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <HStack spacing={4}>
                <Icon as={FaMountain} color="geneTerrain.accent1" boxSize={8} />
                <Box>
                  <Heading size="lg" mb={2}>
                    The GeneTerrain Concept
                  </Heading>
                  <Text fontSize="lg">
                    Imagine gene expression data as a landscape where{" "}
                    <strong>mountains represent highly expressed genes</strong>
                    and <strong>valleys represent low expression</strong>.
                    GeneTerrain creates these visual landscapes, allowing you to
                    explore patterns and relationships that would be invisible
                    in traditional tables or charts.
                  </Text>
                </Box>
              </HStack>

              <Divider />

              <HStack spacing={4}>
                <Icon as={FaEye} color="geneTerrain.accent2" boxSize={8} />
                <Box>
                  <Heading size="lg" mb={2}>
                    Visual Discovery
                  </Heading>
                  <Text fontSize="lg">
                    Our 3D terrain visualizations reveal gene clusters,
                    expression patterns, and biological pathways through
                    intuitive spatial relationships. What takes hours of
                    statistical analysis becomes immediately apparent through
                    visual exploration.
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Key Differentiators */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            What Makes GeneTerrain Unique?
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            <Card bg={bgColor} shadow="md" _hover={{ shadow: "lg" }}>
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <Icon as={FaRocket} color="green.500" boxSize={8} />
                  <Heading size="md">No Programming Required</Heading>
                  <Text fontSize="sm">
                    Start analyzing immediately with our web-based interface. No
                    R, Python, or bioinformatics expertise needed.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="md" _hover={{ shadow: "lg" }}>
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <Icon as={FaDatabase} color="blue.500" boxSize={8} />
                  <Heading size="md">Pre-loaded Cancer Datasets</Heading>
                  <Text fontSize="sm">
                    Access TCGA Pan-Cancer, GBM Glioblastoma, and Kidney Cell
                    datasets instantly. No data preparation required.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="md" _hover={{ shadow: "lg" }}>
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <Icon as={FaChartLine} color="purple.500" boxSize={8} />
                  <Heading size="md">Interactive 3D Visualization</Heading>
                  <Text fontSize="sm">
                    Zoom, pan, and explore gene expression patterns in
                    real-time. Multiple visualization layers for different
                    perspectives.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="md" _hover={{ shadow: "lg" }}>
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <Icon as={FaUsers} color="orange.500" boxSize={8} />
                  <Heading size="md">Multi-Audience Design</Heading>
                  <Text fontSize="sm">
                    Tailored workflows for clinicians, researchers, and
                    students. Each user type gets optimized tools and guidance.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="md" _hover={{ shadow: "lg" }}>
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <Icon as={FaCogs} color="teal.500" boxSize={8} />
                  <Heading size="md">Advanced Analysis Tools</Heading>
                  <Text fontSize="sm">
                    Pathway analysis, sample comparison, lasso selection, and
                    statistical summaries built into the interface.
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="md" _hover={{ shadow: "lg" }}>
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <Icon as={FaShieldAlt} color="red.500" boxSize={8} />
                  <Heading size="md">Publication Ready</Heading>
                  <Text fontSize="sm">
                    Export high-resolution images and data for presentations,
                    papers, and reports. Professional-quality outputs.
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Target Audiences */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Who is GeneTerrain For?
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Card bg={bgColor} shadow="lg">
              <CardBody p={6}>
                <VStack spacing={4} align="center" textAlign="center">
                  <Icon as={FaUserMd} color="blue.500" boxSize={12} />
                  <Heading size="lg">Clinicians</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Quick cohort comparisons for treatment decisions
                  </Text>
                  <List spacing={2} w="full">
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Clinical metadata integration
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Treatment response prediction
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Patient stratification
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Educational tool for patients
                    </ListItem>
                  </List>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="lg">
              <CardBody p={6}>
                <VStack spacing={4} align="center" textAlign="center">
                  <Icon as={FaMicroscope} color="green.500" boxSize={12} />
                  <Heading size="lg">Researchers</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Pathway-level exploration and publication-ready
                    visualizations
                  </Text>
                  <List spacing={2} w="full">
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Advanced statistical analysis
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Publication-ready exports
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Multi-sample comparison
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Pathway enrichment analysis
                    </ListItem>
                  </List>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="lg">
              <CardBody p={6}>
                <VStack spacing={4} align="center" textAlign="center">
                  <Icon as={FaGraduationCap} color="purple.500" boxSize={12} />
                  <Heading size="lg">Students</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Guided exploration with built-in educational datasets
                  </Text>
                  <List spacing={2} w="full">
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Learning-friendly interface
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Built-in tutorials
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Visual pattern recognition
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Collaborative features
                    </ListItem>
                  </List>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* How It Works */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" mb={4}>
                How GeneTerrain Works
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="green" p={2} borderRadius="md">
                      1
                    </Badge>
                    <Heading size="md">Select Your Data</Heading>
                  </HStack>
                  <Text>
                    Choose from pre-loaded cancer datasets (TCGA, GBM, Kidney)
                    or upload your own gene expression and layout files.
                  </Text>
                </VStack>

                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="green" p={2} borderRadius="md">
                      2
                    </Badge>
                    <Heading size="md">Choose Samples</Heading>
                  </HStack>
                  <Text>
                    Select samples using our table view or interactive scatter
                    plot. Use filters, search, or lasso selection to find your
                    cohort.
                  </Text>
                </VStack>

                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="green" p={2} borderRadius="md">
                      3
                    </Badge>
                    <Heading size="md">Generate Terrain</Heading>
                  </HStack>
                  <Text>
                    Our AI creates a 3D terrain map where mountains represent
                    high gene expression and valleys represent low expression.
                  </Text>
                </VStack>

                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="green" p={2} borderRadius="md">
                      4
                    </Badge>
                    <Heading size="md">Explore & Analyze</Heading>
                  </HStack>
                  <Text>
                    Zoom, pan, and explore the terrain. Use different
                    visualization layers, select regions, and analyze pathways.
                  </Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Technology Stack */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Technology & Data Sources
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Card bg={bgColor} shadow="md">
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <Heading size="lg" color="geneTerrain.accent1">
                    Frontend Technology
                  </Heading>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      React 18 with TypeScript
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Chakra UI for responsive design
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      D3.js, Plotly.js, Chart.js for visualizations
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      WebGL for 3D terrain rendering
                    </ListItem>
                  </List>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="md">
              <CardBody p={6}>
                <VStack spacing={4} align="start">
                  <Heading size="lg" color="geneTerrain.accent2">
                    Data Sources
                  </Heading>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      UAB AIMED database for cancer data
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      TCGA Pan-Cancer Atlas
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      GBM Glioblastoma datasets
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      Kidney Cell datasets
                    </ListItem>
                  </List>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Call to Action */}
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Ready to Start?</AlertTitle>
            <AlertDescription>
              GeneTerrain is designed to make advanced genomic analysis
              accessible to everyone. Whether you're a clinician making
              treatment decisions, a researcher exploring pathways, or a student
              learning genomics, our platform provides the tools you need
              without the complexity.
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Container>
  );
};

export default WhatIsGeneTerrain;
