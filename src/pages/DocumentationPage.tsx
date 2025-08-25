import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Link,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  List,
  ListItem,
  ListIcon,
  Highlight,
  Flex,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Divider,
} from "@chakra-ui/react";
import {
  FaBook,
  FaRocket,
  FaUsers,
  FaShieldAlt,
  FaCogs,
  FaGraduationCap,
  FaUserMd,
  FaMicroscope,
  FaLaptop,
  FaHeadset,
  FaCheck,
  FaSearch,
  FaTimes,
  FaChevronRight,
  FaHome,
  FaDatabase,
  FaChartLine,
  FaFileAlt,
  FaQuestionCircle,
  FaBrain,
} from "react-icons/fa";
import { Link as RouterLink } from "react-router-dom";
import WhatIsGeneTerrain from "./docs/WhatIsGeneTerrain";
import BuiltInDatasets from "./docs/BuiltInDatasets";
import CaseStudyGBMClinician from "./docs/CaseStudyGBMClinician";
import FAQ from "./docs/FAQ";
import GeneExpressionVisualization from "./docs/GeneExpressionVisualization";

const DocumentationPage: React.FC = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");
  const sidebarBg = useColorModeValue("gray.100", "gray.900");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState("home");

  // Search data - all documentation content
  const searchData = useMemo(
    () => [
      {
        title: "What is GeneTerrain?",
        path: "/docs/what-is-geneterrain",
        category: "Welcome",
        content:
          "GeneTerrain transforms complex gene expression data into intuitive 3D terrain maps where mountains and valleys represent gene expression patterns. No programming required, web-based interface, pre-loaded cancer datasets, clinical metadata integration.",
        keywords: [
          "introduction",
          "overview",
          "what is",
          "3D terrain",
          "visualization",
          "no programming",
          "web-based",
          "cancer datasets",
        ],
      },
      {
        title: "Built-in Datasets",
        path: "/docs/built-in-datasets",
        category: "Welcome",
        content:
          "GeneTerrain comes with pre-loaded cancer datasets ready for immediate analysis. TCGA Pan-Cancer Atlas, GBM Glioblastoma, Kidney Cell datasets. No upload required, start analyzing immediately.",
        keywords: [
          "datasets",
          "TCGA",
          "GBM",
          "kidney",
          "pre-loaded",
          "no upload",
          "cancer data",
          "immediate analysis",
        ],
      },
      {
        title: "GBM - Clinician Focus",
        path: "/docs/case-study-gbm-clinician",
        category: "Case Studies",
        content:
          "Case study showing how clinicians use GeneTerrain for GBM analysis. EGFR-high vs EGFR-low comparison, pathway analysis, treatment decision support, clinical relevance.",
        keywords: [
          "case study",
          "GBM",
          "clinician",
          "EGFR",
          "pathway",
          "treatment",
          "clinical",
          "brain tumor",
        ],
      },
      {
        title: "FAQ",
        path: "/docs/faq",
        category: "Support",
        content:
          "Frequently asked questions about GeneTerrain. Getting started, data upload, terrain visualization, clinical use, research applications, troubleshooting.",
        keywords: [
          "FAQ",
          "questions",
          "help",
          "troubleshooting",
          "getting started",
          "how to",
          "problems",
        ],
      },
      {
        title: "Getting Started",
        path: "/docs/getting-started",
        category: "Getting Started",
        content:
          "Quick start guide for GeneTerrain. Sign up, choose dataset, explore terrain, compare samples, export results. Step-by-step instructions.",
        keywords: [
          "getting started",
          "quick start",
          "tutorial",
          "first time",
          "beginner",
          "setup",
        ],
      },
      {
        title: "Gene Expression Visualization",
        path: "/docs/gene-expression-visualization",
        category: "Core Workflows",
        content:
          "Master the core visualization workflow in GeneTerrain. Learn how to generate, explore, and analyze 3D terrain maps with interactive tools, multiple visualization layers, lasso selection, and gene interactions.",
        keywords: [
          "gene expression",
          "visualization",
          "terrain generation",
          "layers",
          "lasso selection",
          "dynamic layout",
          "gene interaction",
          "save export",
          "3D terrain",
          "interactive",
        ],
      },
      {
        title: "Terrain Visualization",
        path: "/docs/terrain-visualization",
        category: "Core Workflows",
        content:
          "Learn how to use 3D terrain visualizations in GeneTerrain. Zoom, pan, select regions, explore gene clusters, understand elevation patterns.",
        keywords: [
          "terrain",
          "3D",
          "visualization",
          "zoom",
          "pan",
          "interactive",
          "elevation",
          "mountains",
          "valleys",
        ],
      },
      {
        title: "Pathway Analysis",
        path: "/docs/pathway-analysis",
        category: "Core Workflows",
        content:
          "Analyze biological pathways using GeneTerrain. Pathway enrichment, statistical significance, gene clusters, biological processes.",
        keywords: [
          "pathway",
          "enrichment",
          "biological",
          "genes",
          "clusters",
          "statistics",
          "significance",
        ],
      },
      {
        title: "Sample Comparison",
        path: "/docs/sample-comparison",
        category: "Core Workflows",
        content:
          "Compare different samples and conditions in GeneTerrain. Side-by-side analysis, control vs treatment, cohort comparison.",
        keywords: [
          "comparison",
          "samples",
          "conditions",
          "control",
          "treatment",
          "cohort",
          "side-by-side",
        ],
      },
      {
        title: "Save & Export",
        path: "/docs/save-export",
        category: "Core Workflows",
        content:
          "Save your analysis and export results from GeneTerrain. High-resolution images, CSV data, publication-ready figures.",
        keywords: [
          "export",
          "save",
          "download",
          "images",
          "CSV",
          "publication",
          "results",
        ],
      },
    ],
    []
  );

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return searchData.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.keywords.some((keyword) =>
          keyword.toLowerCase().includes(query)
        ) ||
        item.category.toLowerCase().includes(query)
    );
  }, [searchQuery, searchData]);

  // Sidebar navigation structure
  const sidebarItems = [
    {
      title: "Welcome",
      icon: FaHome,
      color: "blue",
      items: [
        { title: "What is GeneTerrain?", id: "what-is-geneterrain" },
        { title: "Built-in Datasets", id: "built-in-datasets" },
        { title: "Who is it for?", id: "who-is-it-for" },
        { title: "Data Sources Supported", id: "data-sources" },
      ],
    },
    {
      title: "Getting Started",
      icon: FaRocket,
      color: "green",
      items: [
        { title: "Sign Up & Login", id: "sign-up-login" },
        { title: "Quick Tour", id: "quick-tour" },
        { title: "First 2 Minutes", id: "first-2-minutes" },
        { title: "No Programming Required", id: "no-programming" },
      ],
    },
    {
      title: "Core Workflows",
      icon: FaCogs,
      color: "purple",
      items: [
        { title: "Home & Filters", id: "home-filters" },
        {
          title: "Gene Expression Visualization",
          id: "gene-expression-visualization",
        },
        { title: "Terrain Visualization", id: "terrain-visualization" },
        { title: "Pathway Analysis", id: "pathway-analysis" },
        { title: "Sample Comparison", id: "sample-comparison" },
        { title: "Save & Export", id: "save-export" },
      ],
    },
    {
      title: "Tutorials",
      icon: FaGraduationCap,
      color: "orange",
      items: [
        { title: "GBM Analysis End-to-End", id: "tutorial-gbm" },
        { title: "Pathway Insights", id: "tutorial-pathway" },
        { title: "No-Upload Workflow", id: "tutorial-no-upload" },
        { title: "Clinical Metadata Analysis", id: "tutorial-clinical" },
      ],
    },
    {
      title: "Case Studies",
      icon: FaMicroscope,
      color: "teal",
      items: [
        { title: "GBM - Clinician Focus", id: "case-study-gbm-clinician" },
        { title: "Kidney Cell Research", id: "case-study-kidney" },
        { title: "Pan-Cancer PhD", id: "case-study-pan-cancer" },
        { title: "Undergraduate Lab", id: "case-study-undergrad" },
      ],
    },
    {
      title: "Support",
      icon: FaHeadset,
      color: "red",
      items: [
        { title: "FAQ", id: "faq" },
        { title: "Troubleshooting", id: "troubleshooting" },
        { title: "Terrain Visualization Help", id: "terrain-help" },
        { title: "Glossary", id: "glossary" },
      ],
    },
  ];

  const audienceTabs = [
    {
      name: "Clinicians",
      icon: FaUserMd,
      description: "Quick cohort comparisons for treatment decisions",
      features: [
        "Clinical metadata integration",
        "Treatment response prediction",
        "Patient stratification",
        "Educational tool",
      ],
    },
    {
      name: "Researchers",
      icon: FaMicroscope,
      description:
        "Pathway-level exploration and publication-ready visualizations",
      features: [
        "Advanced statistical analysis",
        "Publication-ready exports",
        "Multi-sample comparison",
        "Pathway enrichment",
      ],
    },
    {
      name: "Students",
      icon: FaLaptop,
      description: "Guided exploration with built-in educational datasets",
      features: [
        "Learning-friendly interface",
        "Built-in tutorials",
        "Visual pattern recognition",
        "Collaborative features",
      ],
    },
  ];

  // Content components
  const renderContent = () => {
    switch (selectedContent) {
      case "home":
        return (
          <VStack spacing={8} align="stretch">
            <Box textAlign="center" py={8}>
              <Heading
                size="2xl"
                mb={4}
                bgGradient="linear(to-r, geneTerrain.accent1, geneTerrain.accent2)"
                bgClip="text"
              >
                GeneTerrain Documentation
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="2xl" mx="auto">
                Transform complex gene expression data into intuitive 3D terrain
                maps. No programming required - start analyzing cancer datasets
                immediately.
              </Text>
            </Box>

            {/* Choose Your Path */}
            <Box>
              <Heading size="lg" mb={4}>
                Choose Your Path
              </Heading>
              <Tabs variant="enclosed">
                <TabList>
                  {audienceTabs.map((tab, index) => (
                    <Tab key={index}>
                      <HStack spacing={2}>
                        <Icon as={tab.icon} />
                        <Text>{tab.name}</Text>
                      </HStack>
                    </Tab>
                  ))}
                </TabList>
                <TabPanels>
                  {audienceTabs.map((tab, index) => (
                    <TabPanel key={index}>
                      <VStack align="stretch" spacing={4}>
                        <Text fontSize="lg" fontWeight="medium">
                          {tab.description}
                        </Text>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          {tab.features.map((feature, featureIndex) => (
                            <HStack
                              key={featureIndex}
                              p={3}
                              bg={cardBg}
                              borderRadius="md"
                            >
                              <Icon as={FaCheck} color="green.500" />
                              <Text>{feature}</Text>
                            </HStack>
                          ))}
                        </SimpleGrid>
                      </VStack>
                    </TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </Box>

            {/* Quick Start Guide */}
            <Box bg={cardBg} p={6} borderRadius="lg">
              <Heading size="lg" mb={4}>
                🚀 Quick Start Guide
              </Heading>
              <VStack spacing={4} align="stretch">
                <HStack spacing={4}>
                  <Badge colorScheme="green" p={2} borderRadius="md">
                    1
                  </Badge>
                  <Text>Sign up and log in to GeneTerrain</Text>
                </HStack>
                <HStack spacing={4}>
                  <Badge colorScheme="green" p={2} borderRadius="md">
                    2
                  </Badge>
                  <Text>
                    Choose a built-in cancer dataset (TCGA, GBM, Kidney)
                  </Text>
                </HStack>
                <HStack spacing={4}>
                  <Badge colorScheme="green" p={2} borderRadius="md">
                    3
                  </Badge>
                  <Text>Explore the 3D terrain visualization</Text>
                </HStack>
                <HStack spacing={4}>
                  <Badge colorScheme="green" p={2} borderRadius="md">
                    4
                  </Badge>
                  <Text>Compare samples and analyze pathways</Text>
                </HStack>
                <HStack spacing={4}>
                  <Badge colorScheme="green" p={2} borderRadius="md">
                    5
                  </Badge>
                  <Text>Export results for presentations or publications</Text>
                </HStack>
              </VStack>
            </Box>

            {/* Key Features */}
            <Box>
              <Heading size="lg" mb={4}>
                ✨ Key Features
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                <VStack p={4} bg={cardBg} borderRadius="lg" align="start">
                  <Icon as={FaShieldAlt} color="blue.500" boxSize={8} />
                  <Text fontWeight="bold">Pre-loaded Datasets</Text>
                  <Text fontSize="sm">
                    Start analyzing immediately with TCGA, GBM, and Kidney
                    datasets
                  </Text>
                </VStack>
                <VStack p={4} bg={cardBg} borderRadius="lg" align="start">
                  <Icon as={FaRocket} color="green.500" boxSize={8} />
                  <Text fontWeight="bold">3D Terrain Visualization</Text>
                  <Text fontSize="sm">
                    Interactive mountains and valleys representing gene
                    expression patterns
                  </Text>
                </VStack>
                <VStack p={4} bg={cardBg} borderRadius="lg" align="start">
                  <Icon as={FaUsers} color="purple.500" boxSize={8} />
                  <Text fontWeight="bold">No Programming Required</Text>
                  <Text fontSize="sm">
                    Web-based interface accessible to all skill levels
                  </Text>
                </VStack>
              </SimpleGrid>
            </Box>
          </VStack>
        );

      case "what-is-geneterrain":
        return <WhatIsGeneTerrain />;

      case "built-in-datasets":
        return <BuiltInDatasets />;

      case "gene-expression-visualization":
        return <GeneExpressionVisualization />;

      case "case-study-gbm-clinician":
        return <CaseStudyGBMClinician />;

      case "faq":
        return <FAQ />;

      default:
        return (
          <Box textAlign="center" py={20}>
            <Icon as={FaFileAlt} color="gray.400" boxSize={16} mb={4} />
            <Heading size="lg" color="gray.500" mb={2}>
              Content Coming Soon
            </Heading>
            <Text color="gray.400">
              This documentation section is under development.
            </Text>
          </Box>
        );
    }
  };

  return (
    <Flex h="calc(100vh - 64px)" overflow="hidden">
      {/* Left Sidebar */}
      <Box
        w={{ base: "280px", lg: "320px" }}
        bg={sidebarBg}
        borderRight="1px"
        borderColor="gray.200"
        overflowY="auto"
        p={3}
      >
        {/* Search Bar */}
        <Box mb={4}>
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <Icon as={FaSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg={bgColor}
              border="1px"
              borderColor="gray.300"
              _focus={{
                borderColor: "geneTerrain.accent1",
                boxShadow: "0 0 0 1px var(--chakra-colors-geneTerrain-accent1)",
              }}
            />
            {searchQuery && (
              <InputRightElement>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchQuery("")}
                  color="gray.500"
                  _hover={{ color: "gray.700" }}
                >
                  <Icon as={FaTimes} />
                </Button>
              </InputRightElement>
            )}
          </InputGroup>
        </Box>

        {/* Search Results */}
        {searchQuery && (
          <Box mb={4}>
            <Text fontSize="xs" color="gray.600" mb={2}>
              {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""} found
            </Text>
            <VStack spacing={1} align="stretch">
              {searchResults.map((result, index) => (
                <Box
                  key={index}
                  p={2}
                  bg={bgColor}
                  borderRadius="sm"
                  cursor="pointer"
                  _hover={{ bg: cardBg }}
                  onClick={() => {
                    setSelectedContent(result.path.split("/").pop() || "home");
                    setSearchQuery("");
                  }}
                >
                  <Text
                    fontWeight="bold"
                    fontSize="xs"
                    color="geneTerrain.accent1"
                  >
                    {result.title}
                  </Text>
                  <Text fontSize="xs" color="gray.500" mt={0.5}>
                    {result.category}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Navigation Menu */}
        {!searchQuery && (
          <VStack spacing={1} align="stretch">
            {/* Home */}
            <Box
              p={2}
              bg={
                selectedContent === "home"
                  ? "geneTerrain.accent1"
                  : "transparent"
              }
              color={selectedContent === "home" ? "white" : "inherit"}
              borderRadius="sm"
              cursor="pointer"
              _hover={{
                bg: selectedContent === "home" ? "geneTerrain.accent1" : cardBg,
              }}
              onClick={() => setSelectedContent("home")}
            >
              <HStack spacing={2}>
                <Icon as={FaHome} boxSize={4} />
                <Text fontWeight="medium" fontSize="sm">
                  Home
                </Text>
              </HStack>
            </Box>

            <Divider my={2} />

            {/* Documentation Sections */}
            {sidebarItems.map((section, sectionIndex) => (
              <Accordion key={sectionIndex} allowToggle>
                <AccordionItem border="none">
                  <AccordionButton
                    p={2}
                    _hover={{ bg: cardBg }}
                    borderRadius="sm"
                    _expanded={{ bg: cardBg }}
                  >
                    <HStack spacing={2} flex="1" justify="start">
                      <Icon
                        as={section.icon}
                        color={`${section.color}.500`}
                        boxSize={4}
                      />
                      <Text fontWeight="medium" fontSize="sm">
                        {section.title}
                      </Text>
                    </HStack>
                    <AccordionIcon boxSize={3} />
                  </AccordionButton>
                  <AccordionPanel p={0}>
                    <VStack spacing={0.5} align="stretch" pl={6}>
                      {section.items.map((item, itemIndex) => (
                        <Box
                          key={itemIndex}
                          p={1.5}
                          pl={3}
                          cursor="pointer"
                          borderRadius="sm"
                          bg={
                            selectedContent === item.id
                              ? "geneTerrain.accent1"
                              : "transparent"
                          }
                          color={
                            selectedContent === item.id ? "white" : "inherit"
                          }
                          _hover={{
                            bg:
                              selectedContent === item.id
                                ? "geneTerrain.accent1"
                                : cardBg,
                          }}
                          onClick={() => setSelectedContent(item.id)}
                        >
                          <HStack spacing={1.5}>
                            <Icon as={FaChevronRight} boxSize={2.5} />
                            <Text fontSize="xs">{item.title}</Text>
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            ))}
          </VStack>
        )}
      </Box>

      {/* Main Content Area */}
      <Box flex="1" overflowY="auto" p={6}>
        {renderContent()}
      </Box>
    </Flex>
  );
};

export default DocumentationPage;
