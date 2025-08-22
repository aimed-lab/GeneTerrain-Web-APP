import React from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Icon,
  SimpleGrid,
  Card,
  CardBody,
} from "@chakra-ui/react";
import {
  FaDatabase,
  FaLaptop,
  FaChartLine,
  FaUsers,
  FaInfo,
  FaQuestionCircle,
  FaRocket,
  FaShieldAlt,
  FaDownload,
  FaUpload,
  FaEye,
  FaCogs,
  FaUserMd,
  FaMicroscope,
  FaGraduationCap,
} from "react-icons/fa";

const FAQ: React.FC = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  const faqCategories = [
    {
      title: "Getting Started",
      icon: FaRocket,
      color: "green",
      questions: [
        {
                      question: "How do I get started with GeneTerrain?",
            answer:
              "Simply sign up for an account, log in, and select a built-in cancer dataset (TCGA, GBM, or Kidney). No data preparation or programming required - you can start analyzing immediately.",
        },
        {
                      question: "Do I need programming skills to use GeneTerrain?",
            answer:
              "No programming skills are required! GeneTerrain is designed as a web-based, point-and-click interface. All analysis tools are accessible through intuitive buttons and menus.",
        },
        {
                      question: "What browsers are supported?",
            answer:
              "GeneTerrain works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version of Chrome for the best experience.",
        },
        {
                      question: "Is there a mobile app available?",
            answer:
              "GeneTerrain is a web-based application that works on any device with a web browser. While optimized for desktop use, it's also accessible on tablets and mobile devices.",
        },
      ],
    },
    {
      title: "Data & Datasets",
      icon: FaDatabase,
      color: "blue",
      questions: [
        {
                      question: "What datasets are available in GeneTerrain?",
            answer:
              "GeneTerrain includes three pre-loaded cancer datasets: TCGA Pan-Cancer Atlas (10,000+ samples), GBM Glioblastoma (1,500+ samples), and Kidney Cell (800+ samples). All datasets include comprehensive clinical metadata.",
        },
        {
          question: "Can I upload my own data?",
          answer:
            "Yes! The Custom GeneTerrain feature allows you to upload your own gene expression and layout files in CSV format. See the Custom GeneTerrain documentation for supported file formats.",
        },
        {
                      question: "What file formats are supported for custom uploads?",
            answer:
              "GeneTerrain supports CSV and TSV files. Layout files need Gene, X, and Y columns, while expression files need a Gene column plus condition columns with numeric values.",
        },
        {
          question: "How is the data quality ensured?",
          answer:
            "All built-in datasets undergo rigorous quality control including expression normalization, quality metrics assessment, and missing data handling. Custom uploads are validated for format and content.",
        },
      ],
    },
    {
      title: "Visualization & Analysis",
      icon: FaChartLine,
      color: "purple",
      questions: [
        {
                      question: "What are the different visualization layers?",
            answer:
              "GeneTerrain offers four visualization layers: Terrain View (full Gaussian heatfield), Contour View (isoline visualization), Peak View (positive expression only), and Valley View (negative expression only).",
        },
        {
          question: "How do I interpret the 3D terrain maps?",
          answer:
            "In 3D terrain maps, mountains represent high gene expression and valleys represent low expression. The elevation and color intensity indicate expression levels, making patterns immediately visible.",
        },
        {
          question: "Can I compare different samples or conditions?",
          answer:
            "Yes! You can compare samples side-by-side, use lasso selection to analyze specific regions, and export comparison data. The platform supports multi-sample analysis and cohort comparisons.",
        },
        {
          question: "How do I perform pathway analysis?",
          answer:
            "Select regions of interest using lasso selection, then use the pathway analysis tools to identify enriched biological pathways. Results include statistical significance and gene lists.",
        },
      ],
    },
    {
      title: "Clinical Applications",
      icon: FaUserMd,
      color: "teal",
      questions: [
        {
                      question: "How can clinicians use GeneTerrain?",
            answer:
              "Clinicians can use GeneTerrain for treatment decision support, patient stratification, biomarker discovery, and tumor board presentations. The platform provides evidence-based insights in minutes.",
        },
        {
          question: "What clinical metadata is available?",
          answer:
            "Clinical metadata includes patient demographics, tumor information, molecular markers (IDH, MGMT, EGFR), treatment data, and survival outcomes. This enables comprehensive clinical analysis.",
        },
        {
                      question: "Can I export results for clinical reports?",
            answer:
              "Yes! GeneTerrain allows you to export high-resolution images, CSV data, and summary reports suitable for clinical documentation, tumor board presentations, and patient discussions.",
        },
        {
                      question: "Is the platform suitable for clinical decision-making?",
            answer:
              "GeneTerrain provides evidence-based insights that can support clinical decisions. However, all findings should be interpreted in the context of clinical expertise and validated through appropriate clinical pathways.",
        },
      ],
    },
    {
      title: "Research & Academic Use",
      icon: FaMicroscope,
      color: "orange",
      questions: [
        {
                      question: "Can I use GeneTerrain for research publications?",
            answer:
              "Absolutely! GeneTerrain generates publication-ready visualizations and data exports. Many researchers use the platform for exploratory analysis, hypothesis generation, and figure creation.",
        },
        {
                      question: "What statistical analyses are available?",
            answer:
              "GeneTerrain includes pathway enrichment analysis, statistical significance testing, correlation analysis, and comparative genomics tools. Results include P-values and effect sizes.",
        },
        {
          question: "Can I collaborate with other researchers?",
          answer:
            "Yes! You can share analysis results, export data for collaboration, and use the platform for team-based research projects. The web-based nature facilitates remote collaboration.",
        },
        {
                      question: "Is there support for educational use?",
            answer:
              "GeneTerrain is excellent for teaching genomics and bioinformatics. Built-in tutorials, guided workflows, and educational datasets make it suitable for classroom and laboratory instruction.",
        },
      ],
    },
    {
      title: "Technical Support",
      icon: FaCogs,
      color: "red",
      questions: [
        {
          question: "What if I encounter technical issues?",
          answer:
            "Check our troubleshooting guide first. If issues persist, contact our support team through the feedback form. We typically respond within 24 hours.",
        },
        {
                      question: "How do I save my analysis?",
            answer:
              "GeneTerrain automatically saves your analysis state. You can also export results as images or CSV files, and save specific views for later reference.",
        },
        {
                      question: "Is my data secure?",
            answer:
              "Yes! GeneTerrain uses industry-standard security measures. Built-in datasets are anonymized, and custom uploads are processed securely. We do not store sensitive patient information.",
        },
        {
                      question: "Can I access GeneTerrain offline?",
            answer:
              "GeneTerrain requires an internet connection as it's a web-based application. This ensures you always have access to the latest features and data updates.",
        },
      ],
    },
  ];

  const quickLinks = [
    {
      title: "Getting Started Guide",
      description: "Step-by-step tutorial for first-time users",
      icon: FaRocket,
      color: "green",
    },
    {
      title: "Custom Data Upload",
      description: "How to upload and analyze your own data",
      icon: FaUpload,
      color: "blue",
    },
    {
      title: "Visualization Guide",
      description: "Understanding 3D terrain maps and layers",
      icon: FaEye,
      color: "purple",
    },
    {
      title: "Clinical Applications",
              description: "Using GeneTerrain in clinical practice",
      icon: FaUserMd,
      color: "teal",
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
            Frequently Asked Questions
          </Heading>
          <Text fontSize="lg" color="gray.600" maxW="3xl" mx="auto">
                         Find answers to common questions about GeneTerrain. Can't find
             what you're looking for? Contact our support team through the
             feedback form.
          </Text>
        </Box>

        {/* Quick Links */}
        <Box>
          <Heading size="lg" mb={4}>
            Quick Navigation
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            {quickLinks.map((link, index) => (
              <Card
                key={index}
                bg={bgColor}
                shadow="md"
                _hover={{ shadow: "lg" }}
                cursor="pointer"
              >
                <CardBody p={4}>
                  <VStack spacing={3} align="center" textAlign="center">
                    <Icon
                      as={link.icon}
                      color={`${link.color}.500`}
                      boxSize={6}
                    />
                    <Heading size="sm">{link.title}</Heading>
                    <Text fontSize="xs" color="gray.600">
                      {link.description}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* FAQ Categories */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Common Questions by Category
          </Heading>
          <VStack spacing={6} align="stretch">
            {faqCategories.map((category, categoryIndex) => (
              <Card key={categoryIndex} bg={bgColor} shadow="lg">
                <CardBody p={6}>
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={3}>
                      <Icon
                        as={category.icon}
                        color={`${category.color}.500`}
                        boxSize={6}
                      />
                      <Heading size="lg">{category.title}</Heading>
                    </HStack>

                    <Accordion allowToggle>
                      {category.questions.map((faq, faqIndex) => (
                        <AccordionItem key={faqIndex} border="none">
                          <AccordionButton
                            py={3}
                            _hover={{ bg: cardBg }}
                            borderRadius="md"
                          >
                            <Box flex="1" textAlign="left">
                              <Text fontWeight="medium">{faq.question}</Text>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel pb={4} px={4}>
                            <Text fontSize="sm" color="gray.600">
                              {faq.answer}
                            </Text>
                          </AccordionPanel>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>

        {/* Common Issues */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" mb={4}>
                Common Issues & Solutions
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Heading size="md" mb={4} color="red.500">
                    Performance Issues
                  </Heading>
                  <VStack spacing={3} align="start">
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">
                        Slow loading times
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Try refreshing the page or clearing your browser cache.
                        Large datasets may take a few moments to load.
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">
                        Visualization not rendering
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Ensure your browser supports WebGL. Try updating to the
                        latest browser version.
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">
                        File upload errors
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Check file format (CSV/TSV) and ensure required columns
                        are present. File size should be under 50MB.
                      </Text>
                    </Box>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={4} color="blue.500">
                    Data & Analysis
                  </Heading>
                  <VStack spacing={3} align="start">
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">
                        No samples found
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Check your filter settings. Try clearing filters or
                        adjusting search criteria.
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">
                        Terrain looks flat
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Try zooming in or adjusting visualization settings. Some
                        gene sets may have limited expression variation.
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm">
                        Export not working
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Ensure you have selected data to export. Try refreshing
                        the page if the issue persists.
                      </Text>
                    </Box>
                  </VStack>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* User Types */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Questions by User Type
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Card bg={bgColor} shadow="lg">
              <CardBody p={6}>
                <VStack spacing={4} align="center" textAlign="center">
                  <Icon as={FaUserMd} color="blue.500" boxSize={12} />
                  <Heading size="lg">Clinicians</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Treatment decision support, patient stratification, and
                    clinical research applications.
                  </Text>
                  <VStack spacing={2} align="start" w="full">
                    <Text fontSize="xs" fontWeight="bold">
                      Common Questions:
                    </Text>
                    <Text fontSize="xs">
                      • How to interpret molecular profiles
                    </Text>
                    <Text fontSize="xs">• Clinical validation of findings</Text>
                    <Text fontSize="xs">
                      • Integration with clinical workflows
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="lg">
              <CardBody p={6}>
                <VStack spacing={4} align="center" textAlign="center">
                  <Icon as={FaMicroscope} color="green.500" boxSize={12} />
                  <Heading size="lg">Researchers</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Exploratory analysis, publication-ready figures, and
                    advanced genomic research.
                  </Text>
                  <VStack spacing={2} align="start" w="full">
                    <Text fontSize="xs" fontWeight="bold">
                      Common Questions:
                    </Text>
                    <Text fontSize="xs">
                      • Statistical significance testing
                    </Text>
                    <Text fontSize="xs">
                      • Data export for further analysis
                    </Text>
                    <Text fontSize="xs">• Collaboration features</Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bgColor} shadow="lg">
              <CardBody p={6}>
                <VStack spacing={4} align="center" textAlign="center">
                  <Icon as={FaGraduationCap} color="purple.500" boxSize={12} />
                  <Heading size="lg">Students</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Learning genomics, educational demonstrations, and academic
                    research projects.
                  </Text>
                  <VStack spacing={2} align="start" w="full">
                    <Text fontSize="xs" fontWeight="bold">
                      Common Questions:
                    </Text>
                    <Text fontSize="xs">• Understanding gene expression</Text>
                    <Text fontSize="xs">• Available tutorials and guides</Text>
                    <Text fontSize="xs">• Educational use cases</Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Contact Support */}
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Still Need Help?</AlertTitle>
            <AlertDescription>
                             Can't find the answer you're looking for? Contact our support team
               through the feedback form in the bottom right corner of the
               application. We're here to help you get the most out of
               GeneTerrain.
            </AlertDescription>
          </Box>
        </Alert>

        {/* Tips */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" mb={4}>
                Pro Tips for GeneTerrain AI
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Heading size="md" mb={4} color="geneTerrain.accent1">
                    Getting the Most Out of Visualizations
                  </Heading>
                  <VStack spacing={3} align="start">
                    <Text fontSize="sm">
                      • <strong>Zoom in</strong> to explore specific gene
                      clusters
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Use different layers</strong> to see patterns
                      from various perspectives
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Lasso selection</strong> to analyze specific
                      regions of interest
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Export images</strong> for presentations and
                      publications
                    </Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={4} color="geneTerrain.accent2">
                    Efficient Workflow
                  </Heading>
                  <VStack spacing={3} align="start">
                    <Text fontSize="sm">
                      • <strong>Start with built-in datasets</strong> to learn
                      the interface
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Use filters</strong> to focus on relevant
                      samples
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Save your analysis</strong> for future reference
                    </Text>
                    <Text fontSize="sm">
                      • <strong>Explore case studies</strong> for real-world
                      examples
                    </Text>
                  </VStack>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default FAQ;
