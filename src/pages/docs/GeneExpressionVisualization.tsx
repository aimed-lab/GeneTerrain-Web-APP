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
  List,
  ListItem,
  ListIcon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Divider,
  Icon,
  Button,
  Image,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import {
  FaEye,
  FaLayerGroup,
  FaMousePointer,
  FaSearch,
  FaSave,
  FaDownload,
  FaUndo,
  FaRedo,
  FaHandPaper,
  FaInfo,
  FaCheck,
  FaTimes,
  FaMountain,
  FaChartLine,
  FaDatabase,
  FaCog,
  FaLightbulb,
  FaExclamationTriangle,
} from "react-icons/fa";

const GeneExpressionVisualization: React.FC = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // Feature data
  const visualizationLayers = [
    {
      name: "Terrain View",
      description:
        "Full Gaussian heatfield visualization showing complete gene expression landscape",
      icon: FaMountain,
      color: "blue",
      features: [
        "Complete expression overview",
        "3D terrain mapping",
        "Interactive exploration",
      ],
    },
    {
      name: "Contour View",
      description:
        "Isoline visualization highlighting expression boundaries and patterns",
      icon: FaChartLine,
      color: "green",
      features: [
        "Expression boundaries",
        "Pattern recognition",
        "Clean visualization",
      ],
    },
    {
      name: "Peak View",
      description: "Positive expression only - mountains and elevated regions",
      icon: FaMountain,
      color: "orange",
      features: ["High expression focus", "Gene clusters", "Upregulated genes"],
    },
    {
      name: "Valley View",
      description:
        "Negative expression only - valleys and low expression regions",
      icon: FaChartLine,
      color: "purple",
      features: [
        "Low expression focus",
        "Downregulated genes",
        "Expression gaps",
      ],
    },
  ];

  const workflowSteps = [
    {
      step: 1,
      title: "GeneTerrain Generation",
      description: "AI creates 3D terrain maps from your selected samples",
      details: [
        "Select samples from dataset or upload custom data",
        "AI processes gene expression data",
        "Generates interactive 3D terrain visualization",
        "Provides AI-generated summary for selected samples",
      ],
    },
    {
      step: 2,
      title: "Layer Selection",
      description: "Choose from four different visualization perspectives",
      details: [
        "Access layers through the Layers Icon",
        "Switch between Terrain, Contour, Peak, and Valley views",
        "Each layer provides unique insights into your data",
        "Real-time switching without regenerating terrain",
      ],
    },
    {
      step: 3,
      title: "Interactive Exploration",
      description: "Zoom, pan, and explore the gene expression landscape",
      details: [
        "Dynamic layout updates as you zoom in/out",
        "Pan across different regions of the terrain",
        "Real-time rendering and smooth interactions",
        "Responsive design adapts to your exploration",
      ],
    },
    {
      step: 4,
      title: "Lasso Selection",
      description: "Select specific regions for detailed analysis",
      details: [
        "Draw lasso around regions of interest",
        "Select multiple regions simultaneously",
        "Analyze specific gene clusters or pathways",
        "Compare selected regions with statistical tools",
      ],
    },
    {
      step: 5,
      title: "Gene Interaction",
      description: "Click on genes for detailed information and management",
      details: [
        "View gene metadata and expression details",
        "Remove genes from visualization",
        "Restore previously removed genes",
        "Update terrain in real-time",
      ],
    },
    {
      step: 6,
      title: "Save & Export",
      description: "Save your analysis and export results",
      details: [
        "Save current terrain state",
        "Export high-resolution images",
        "Download analysis data",
        "Share results with collaborators",
      ],
    },
  ];

  const geneInteractionFeatures = [
    {
      feature: "Gene Metadata",
      description: "View comprehensive information about selected genes",
      details: [
        "Expression levels",
        "Gene symbols and names",
        "Biological functions",
        "Pathway associations",
      ],
    },
    {
      feature: "Gene Removal",
      description: "Temporarily exclude genes from visualization",
      details: [
        "Click to remove individual genes",
        "Terrain updates immediately",
        "Maintains analysis context",
        "Reversible action",
      ],
    },
    {
      feature: "Gene Restoration",
      description: "Restore previously removed genes",
      details: [
        "Access removed genes list",
        "Select genes to restore",
        "Terrain regenerates automatically",
        "Preserves analysis history",
      ],
    },
    {
      feature: "Real-time Updates",
      description: "See changes immediately as you interact",
      details: [
        "Instant terrain updates",
        "Smooth transitions",
        "No page refreshes needed",
        "Maintains zoom/pan position",
      ],
    },
  ];

  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Heading size="2xl" mb={4} color="geneTerrain.accent1">
            Gene Expression Visualization
          </Heading>
          <Text fontSize="lg" color="gray.600" maxW="3xl" mx="auto">
                         Master the core visualization workflow in GeneTerrain. Learn how
             to generate, explore, and analyze 3D terrain maps of gene expression
             data with interactive tools and multiple visualization layers.
          </Text>
        </Box>

        {/* Overview Alert */}
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Core Visualization Workflow</AlertTitle>
            <AlertDescription>
                             GeneTerrain transforms gene expression data into interactive 3D
               terrain maps where mountains represent high expression and valleys
               represent low expression. This guide covers the complete workflow
               from generation to analysis.
            </AlertDescription>
          </Box>
        </Alert>

        {/* Workflow Overview */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Complete Visualization Workflow
          </Heading>
          <VStack spacing={4} align="stretch">
            {workflowSteps.map((step) => (
              <Card key={step.step} bg={bgColor} shadow="md">
                <CardBody p={6}>
                  <HStack spacing={4} align="start">
                    <Badge
                      colorScheme="green"
                      p={3}
                      borderRadius="md"
                      fontSize="lg"
                    >
                      {step.step}
                    </Badge>
                    <Box flex="1">
                      <Heading
                        size="md"
                        mb={2}
                        color={`${
                          step.step === 1
                            ? "blue"
                            : step.step === 2
                            ? "green"
                            : step.step === 3
                            ? "orange"
                            : step.step === 4
                            ? "purple"
                            : step.step === 5
                            ? "teal"
                            : "red"
                        }.500`}
                      >
                        {step.title}
                      </Heading>
                      <Text fontSize="lg" mb={3}>
                        {step.description}
                      </Text>
                      <List spacing={2}>
                        {step.details.map((detail, index) => (
                          <ListItem key={index}>
                            <ListIcon as={FaCheck} color="green.500" />
                            {detail}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>

        {/* Visualization Layers */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Visualization Layers
          </Heading>
          <Text fontSize="lg" textAlign="center" mb={6} color="gray.600">
            Access different visualization perspectives through the Layers Icon
            to gain unique insights into your data
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {visualizationLayers.map((layer, index) => (
              <Card key={index} bg={bgColor} shadow="lg">
                <CardHeader>
                  <HStack spacing={3}>
                    <Icon
                      as={layer.icon}
                      color={`${layer.color}.500`}
                      boxSize={6}
                    />
                    <Heading size="md">{layer.name}</Heading>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    {layer.description}
                  </Text>
                  <List spacing={2}>
                    {layer.features.map((feature, featureIndex) => (
                      <ListItem key={featureIndex}>
                        <ListIcon as={FaCheck} color={`${layer.color}.500`} />
                        {feature}
                      </ListItem>
                    ))}
                  </List>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Interactive Features */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Interactive Features
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Card bg={bgColor} shadow="lg">
              <CardHeader>
                <HStack spacing={3}>
                  <Icon as={FaMousePointer} color="blue.500" boxSize={6} />
                  <Heading size="md">Lasso Selection</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Select specific regions of the terrain for detailed analysis
                </Text>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={FaCheck} color="blue.500" />
                    Draw lasso around regions of interest
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="blue.500" />
                    Select multiple regions simultaneously
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="blue.500" />
                    Analyze specific gene clusters
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="blue.500" />
                    Perform pathway analysis on selections
                  </ListItem>
                </List>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="lg">
              <CardHeader>
                <HStack spacing={3}>
                  <Icon as={FaSearch} color="green.500" boxSize={6} />
                  <Heading size="md">Dynamic Layout</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Zoom and pan with real-time layout updates
                </Text>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={FaCheck} color="green.500" />
                    Zoom in/out with mouse wheel or buttons
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="green.500" />
                    Pan across different terrain regions
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="green.500" />
                    Real-time rendering updates
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="green.500" />
                    Smooth, responsive interactions
                  </ListItem>
                </List>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Gene Interaction */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Gene Click Interactions
          </Heading>
          <Text fontSize="lg" textAlign="center" mb={6} color="gray.600">
            Click on any gene in the terrain to access detailed information and
            management options
          </Text>
          <VStack spacing={4} align="stretch">
            {geneInteractionFeatures.map((feature, index) => (
              <Card key={index} bg={bgColor} shadow="md">
                <CardBody p={6}>
                  <VStack spacing={4} align="start">
                    <HStack spacing={3}>
                      <Icon
                        as={FaInfo}
                        color={`${
                          index === 0
                            ? "blue"
                            : index === 1
                            ? "red"
                            : index === 2
                            ? "green"
                            : "purple"
                        }.500`}
                        boxSize={5}
                      />
                      <Heading size="md">{feature.feature}</Heading>
                    </HStack>
                    <Text fontSize="lg">{feature.description}</Text>
                    <List spacing={2} w="full">
                      {feature.details.map((detail, detailIndex) => (
                        <ListItem key={detailIndex}>
                          <ListIcon
                            as={FaCheck}
                            color={`${
                              index === 0
                                ? "blue"
                                : index === 1
                                ? "red"
                                : index === 2
                                ? "green"
                                : "purple"
                            }.500`}
                          />
                          {detail}
                        </ListItem>
                      ))}
                    </List>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>

        {/* Save & Export */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Save & View Features
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Card bg={bgColor} shadow="lg">
              <CardHeader>
                <HStack spacing={3}>
                  <Icon as={FaSave} color="blue.500" boxSize={6} />
                  <Heading size="md">Save GeneTerrains</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Save your current analysis state for future reference
                </Text>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={FaCheck} color="blue.500" />
                    Save current terrain configuration
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="blue.500" />
                    Preserve selected samples and filters
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="blue.500" />
                    Store lasso selections and gene removals
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="blue.500" />
                    Access saved terrains from your dashboard
                  </ListItem>
                </List>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="lg">
              <CardHeader>
                <HStack spacing={3}>
                  <Icon as={FaDownload} color="green.500" boxSize={6} />
                  <Heading size="md">Export Results</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Export high-quality images and data for presentations and
                  analysis
                </Text>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={FaCheck} color="green.500" />
                    High-resolution terrain images
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="green.500" />
                    CSV data exports
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="green.500" />
                    Publication-ready figures
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FaCheck} color="green.500" />
                    Analysis summary reports
                  </ListItem>
                </List>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Pro Tips */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" mb={4}>
                Pro Tips for Gene Expression Visualization
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Heading size="md" mb={4} color="geneTerrain.accent1">
                    Efficient Exploration
                  </Heading>
                  <VStack spacing={3} align="start">
                    <Text fontSize="sm">
                      • <strong>Start with Terrain View</strong> for complete
                      overview
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Use Contour View</strong> to identify expression
                      boundaries
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Switch to Peak/Valley</strong> for focused
                      analysis
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Combine lasso selection</strong> with different
                      layers
                    </Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={4} color="geneTerrain.accent2">
                    Advanced Analysis
                  </Heading>
                  <VStack spacing={3} align="start">
                    <Text fontSize="sm">
                      • <strong>Remove genes</strong> to focus on specific
                      patterns
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Save frequently</strong> to preserve analysis
                      states
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Export images</strong> at different zoom levels
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Compare layers</strong> to understand expression
                      patterns
                    </Text>
                  </VStack>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Call to Action */}
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Ready to Explore Gene Expression?</AlertTitle>
            <AlertDescription>
              Now that you understand the visualization workflow, start
              exploring your data! Choose a dataset, generate your first
              terrain, and discover the power of interactive gene expression
              visualization.
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Container>
  );
};

export default GeneExpressionVisualization;
