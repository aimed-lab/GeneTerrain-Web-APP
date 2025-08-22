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
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
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
} from "react-icons/fa";

const CaseStudyGBMClinician: React.FC = () => {
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  const clinicalScenario = {
    patient: "65-year-old male with newly diagnosed GBM",
    challenge:
      "Determine optimal treatment approach based on molecular profile",
    timeframe: "15 minutes",
    outcome: "Evidence-based treatment decision with visual support",
  };

  const analysisSteps = [
    {
      step: 1,
      title: "Dataset Selection",
      description: "Select GBM Glioblastoma dataset",
      duration: "30 seconds",
      details: "Choose from pre-loaded GBM dataset with 1,500+ samples",
    },
    {
      step: 2,
      title: "Cohort Filtering",
      description: "Filter for EGFR-high vs EGFR-low patients",
      duration: "2 minutes",
      details: "Use clinical metadata filters to create comparison cohorts",
    },
    {
      step: 3,
      title: "Terrain Generation",
      description: "Generate 3D terrain visualizations",
      duration: "1 minute",
      details: "Create terrain maps showing gene expression patterns",
    },
    {
      step: 4,
      title: "Pattern Analysis",
      description: "Identify expression patterns and pathways",
      duration: "5 minutes",
      details:
        "Explore mountains (high expression) and valleys (low expression)",
    },
    {
      step: 5,
      title: "Clinical Correlation",
      description: "Correlate with treatment outcomes",
      duration: "3 minutes",
      details: "Review survival data and treatment response patterns",
    },
    {
      step: 6,
      title: "Decision Support",
      description: "Generate treatment recommendation",
      duration: "3 minutes",
      details: "Create visual report for tumor board presentation",
    },
  ];

  const keyFindings = [
    {
      category: "EGFR Expression Patterns",
      findings: [
        "EGFR-high tumors show distinct mountain peaks in RTK signaling regions",
        "EGFR-low tumors display valleys in growth factor pathways",
        "Clear visual separation between expression profiles",
      ],
    },
    {
      category: "Pathway Analysis",
      findings: [
        "Upregulated pathways: RTK/EGFR signaling, downstream MAPK/PI3K",
        "Downregulated pathways: Cell cycle control, DNA repair",
        "Statistical significance: P-values &lt; 0.05 for key pathways",
        "Clinical relevance: Correlates with treatment response data",
      ],
    },
    {
      category: "Treatment Implications",
      findings: [
        "EGFR-high patients: Consider EGFR-targeted therapies",
        "EGFR-low patients: Focus on standard chemoradiation",
        "Survival correlation: EGFR-high associated with better response to targeted treatment",
        "Risk stratification: Visual patterns predict treatment outcomes",
      ],
    },
  ];

  const clinicalBenefits = [
    {
      benefit: "Rapid Analysis",
      description:
        "Complete molecular analysis in 15 minutes vs. traditional 2-3 hours",
      icon: FaClock,
      color: "green",
    },
    {
      benefit: "Visual Clarity",
      description: "3D terrain maps make complex patterns immediately apparent",
      icon: FaEye,
      color: "blue",
    },
    {
      benefit: "Evidence-Based",
      description:
        "Data-driven decisions supported by comprehensive genomic analysis",
      icon: FaChartBar,
      color: "purple",
    },
    {
      benefit: "Patient Communication",
      description: "Visual aids help explain treatment rationale to patients",
      icon: FaUsers,
      color: "orange",
    },
    {
      benefit: "Tumor Board Ready",
      description:
        "Export high-quality images for multidisciplinary discussions",
      icon: FaFileAlt,
      color: "teal",
    },
    {
      benefit: "Treatment Optimization",
      description: "Personalized approach based on molecular profile",
      icon: FaRocket,
      color: "red",
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
            Case Study: GBM Clinician Focus
          </Heading>
          <Text fontSize="lg" color="gray.600" maxW="3xl" mx="auto">
                         How a neuro-oncologist uses GeneTerrain to make evidence-based
             treatment decisions for a newly diagnosed glioblastoma patient in
             just 15 minutes.
          </Text>
        </Box>

        {/* Clinical Scenario */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <HStack spacing={4}>
                <Icon as={FaUserMd} color="geneTerrain.accent1" boxSize={8} />
                <Box>
                  <Heading size="lg" mb={2}>
                    Clinical Scenario
                  </Heading>
                  <Text fontSize="lg">
                    A neuro-oncologist needs to determine the optimal treatment
                    approach for a 65-year-old male with newly diagnosed
                    glioblastoma multiforme (GBM).
                  </Text>
                </Box>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box p={4} bg={cardBg} borderRadius="md">
                  <Text fontWeight="bold" color="geneTerrain.accent1" mb={2}>
                    Patient Profile
                  </Text>
                  <Text>{clinicalScenario.patient}</Text>
                </Box>
                <Box p={4} bg={cardBg} borderRadius="md">
                  <Text fontWeight="bold" color="geneTerrain.accent2" mb={2}>
                    Clinical Challenge
                  </Text>
                  <Text>{clinicalScenario.challenge}</Text>
                </Box>
                <Box p={4} bg={cardBg} borderRadius="md">
                  <Text fontWeight="bold" color="green.500" mb={2}>
                    Time Available
                  </Text>
                  <Text>{clinicalScenario.timeframe}</Text>
                </Box>
                <Box p={4} bg={cardBg} borderRadius="md">
                  <Text fontWeight="bold" color="purple.500" mb={2}>
                    Expected Outcome
                  </Text>
                  <Text>{clinicalScenario.outcome}</Text>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Analysis Workflow */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            15-Minute Analysis Workflow
          </Heading>
          <VStack spacing={4} align="stretch">
            {analysisSteps.map((step) => (
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
                      <HStack justify="space-between" align="start" mb={2}>
                        <Heading size="md">{step.title}</Heading>
                        <Badge colorScheme="blue" variant="outline">
                          {step.duration}
                        </Badge>
                      </HStack>
                      <Text fontWeight="bold" color="gray.600" mb={2}>
                        {step.description}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {step.details}
                      </Text>
                    </Box>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>

        {/* Key Findings */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Key Findings & Clinical Insights
          </Heading>
          <VStack spacing={6} align="stretch">
            {keyFindings.map((category, index) => (
              <Card key={index} bg={bgColor} shadow="lg">
                <CardBody p={6}>
                  <VStack spacing={4} align="stretch">
                    <Heading
                      size="lg"
                      color={`${
                        index === 0 ? "blue" : index === 1 ? "green" : "purple"
                      }.500`}
                    >
                      {category.category}
                    </Heading>
                    <List spacing={2}>
                      {category.findings.map((finding, findingIndex) => (
                        <ListItem key={findingIndex}>
                          <ListIcon as={FaLightbulb} color="yellow.500" />
                          <Text fontSize="sm">{finding}</Text>
                        </ListItem>
                      ))}
                    </List>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>

        {/* Clinical Benefits */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Clinical Benefits & Impact
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {clinicalBenefits.map((benefit, index) => (
              <Card
                key={index}
                bg={bgColor}
                shadow="md"
                _hover={{ shadow: "lg" }}
              >
                <CardBody p={6}>
                  <VStack spacing={4} align="center" textAlign="center">
                    <Icon
                      as={benefit.icon}
                      color={`${benefit.color}.500`}
                      boxSize={8}
                    />
                    <Heading size="md">{benefit.benefit}</Heading>
                    <Text fontSize="sm" color="gray.600">
                      {benefit.description}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Before vs After */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" mb={4}>
                                 Before vs. After GeneTerrain
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                <Box>
                  <Heading size="lg" mb={4} color="red.500">
                    Traditional Approach
                  </Heading>
                  <List spacing={3}>
                    <ListItem>
                      <ListIcon as={FaClock} color="red.500" />
                      <Text fontWeight="bold">2-3 hours analysis time</Text>
                      <Text fontSize="sm" color="gray.600">
                        Manual data processing and statistical analysis
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaClock} color="red.500" />
                      <Text fontWeight="bold">Complex statistical outputs</Text>
                      <Text fontSize="sm" color="gray.600">
                        Difficult to interpret for clinical decision-making
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaClock} color="red.500" />
                      <Text fontWeight="bold">Limited visualization</Text>
                      <Text fontSize="sm" color="gray.600">
                        Static charts and tables
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaClock} color="red.500" />
                      <Text fontWeight="bold">IT support required</Text>
                      <Text fontSize="sm" color="gray.600">
                        Need bioinformatics expertise
                      </Text>
                    </ListItem>
                  </List>
                </Box>

                <Box>
                                     <Heading size="lg" mb={4} color="green.500">
                     With GeneTerrain
                   </Heading>
                  <List spacing={3}>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">15 minutes total time</Text>
                      <Text fontSize="sm" color="gray.600">
                        Immediate access to pre-processed data
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">Intuitive 3D visualizations</Text>
                      <Text fontSize="sm" color="gray.600">
                        Patterns immediately apparent
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">Clinical decision support</Text>
                      <Text fontSize="sm" color="gray.600">
                        Clear treatment implications
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">
                        No technical expertise needed
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Web-based, point-and-click interface
                      </Text>
                    </ListItem>
                  </List>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Treatment Decision Table */}
        <Box>
          <Heading size="xl" mb={6} textAlign="center">
            Evidence-Based Treatment Decision
          </Heading>
          <TableContainer>
            <Table
              variant="simple"
              bg={bgColor}
              borderRadius="lg"
              overflow="hidden"
            >
              <Thead bg={cardBg}>
                <Tr>
                  <Th>Molecular Profile</Th>
                  <Th>Terrain Pattern</Th>
                  <Th>Recommended Treatment</Th>
                  <Th>Expected Outcome</Th>
                  <Th>Evidence Level</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td fontWeight="bold">EGFR-High</Td>
                  <Td>Mountain peaks in RTK regions</Td>
                  <Td>EGFR-targeted therapy + standard chemoradiation</Td>
                  <Td>Improved progression-free survival</Td>
                  <Td>
                    <Badge colorScheme="green">Strong</Badge>
                  </Td>
                </Tr>
                <Tr>
                  <Td fontWeight="bold">EGFR-Low</Td>
                  <Td>Valleys in growth factor pathways</Td>
                  <Td>Standard chemoradiation protocol</Td>
                  <Td>Standard survival outcomes</Td>
                  <Td>
                    <Badge colorScheme="blue">Moderate</Badge>
                  </Td>
                </Tr>
                <Tr>
                  <Td fontWeight="bold">Mixed Pattern</Td>
                  <Td>Variable terrain with some peaks</Td>
                  <Td>Individualized approach based on dominant patterns</Td>
                  <Td>Variable response to treatment</Td>
                  <Td>
                    <Badge colorScheme="yellow">Limited</Badge>
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {/* Next Steps */}
        <Card bg={bgColor} shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" mb={4}>
                Implementation & Next Steps
              </Heading>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="green" p={2} borderRadius="md">
                      1
                    </Badge>
                    <Heading size="md">Immediate Actions</Heading>
                  </HStack>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">
                        Present findings at tumor board
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">
                        Discuss with patient and family
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheck} color="green.500" />
                      <Text fontWeight="bold">
                        Initiate recommended treatment
                      </Text>
                    </ListItem>
                  </List>
                </VStack>

                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="blue" p={2} borderRadius="md">
                      2
                    </Badge>
                    <Heading size="md">Follow-up Analysis</Heading>
                  </HStack>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaEye} color="blue.500" />
                      <Text fontWeight="bold">Monitor treatment response</Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaEye} color="blue.500" />
                      <Text fontWeight="bold">Track survival outcomes</Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaEye} color="blue.500" />
                      <Text fontWeight="bold">Update molecular profile</Text>
                    </ListItem>
                  </List>
                </VStack>

                <VStack spacing={4} align="start">
                  <HStack spacing={3}>
                    <Badge colorScheme="purple" p={2} borderRadius="md">
                      3
                    </Badge>
                    <Heading size="md">Research Integration</Heading>
                  </HStack>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaMicroscope} color="purple.500" />
                      <Text fontWeight="bold">
                        Contribute to clinical trials
                      </Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaMicroscope} color="purple.500" />
                      <Text fontWeight="bold">Publish case study</Text>
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaMicroscope} color="purple.500" />
                      <Text fontWeight="bold">
                        Share with research community
                      </Text>
                    </ListItem>
                  </List>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Call to Action */}
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Ready to Transform Your Clinical Practice?</AlertTitle>
            <AlertDescription>
                             This case study demonstrates how GeneTerrain can revolutionize
               clinical decision-making for glioblastoma patients. Start your own
               analysis today and experience the power of visual genomics in
               clinical practice.
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Container>
  );
};

export default CaseStudyGBMClinician;
