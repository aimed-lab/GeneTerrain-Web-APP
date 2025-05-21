import React from "react";
import {
  Box,
  Flex,
  Text,
  Badge,
  Divider,
  Heading,
  HStack,
  VStack,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
  Tooltip,
  Button,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import {
  FaDna,
  FaProjectDiagram,
  FaChartLine,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaArrowRight,
} from "react-icons/fa";
import { Point } from "../../GaussianPlots/types";

const MotionBox = motion(Box);

interface GeneSelectionSummaryProps {
  selectedGene: Point | null;
  onClose: () => void;
}

const GeneSelectionSummary: React.FC<GeneSelectionSummaryProps> = ({
  selectedGene,
  onClose,
}) => {
  // Move the hook call to the top level - before any conditionals
  const bgColor = useColorModeValue(
    "rgba(23, 25, 35, 0.95)",
    "rgba(23, 25, 35, 0.95)"
  );

  if (!selectedGene) return null;

  // Determine expression level category and color
  const expressionLevel =
    selectedGene.value > 1
      ? "High"
      : selectedGene.value < -1
      ? "Low"
      : "Normal";

  const expressionColor =
    selectedGene.value > 1
      ? "red.500"
      : selectedGene.value < -1
      ? "blue.500"
      : "green.500";

  // Calculate a confidence score (mock data - in real app this would come from the data)
  const confidenceScore = Math.min(
    99,
    Math.round(Math.abs(selectedGene.value) * 20 + 50)
  );

  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      bg={bgColor} // Use the variable instead of the hook call
      borderRadius="lg"
      borderLeft="4px solid"
      borderColor={expressionColor}
      p={0}
      boxShadow="xl"
      maxW="100%"
      overflow="hidden"
    >
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        p={4}
        bg={`${expressionColor}20`}
        borderBottom="1px solid"
        borderColor={`${expressionColor}40`}
      >
        <HStack spacing={3}>
          <Box
            bg={expressionColor}
            borderRadius="full"
            p={2}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={FaDna} boxSize={5} color="white" />
          </Box>
          <Box>
            <Heading size="md" fontWeight="bold">
              {selectedGene.geneName}
            </Heading>
            <Text fontSize="sm" opacity={0.8} mt={0.5}>
              ID: {selectedGene.geneId}
            </Text>
          </Box>
        </HStack>

        <Tooltip label="Close summary" placement="top">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            _hover={{ bg: "rgba(255,255,255,0.1)" }}
          >
            Close
          </Button>
        </Tooltip>
      </Flex>

      {/* Content */}
      <Flex direction={{ base: "column", md: "row" }}>
        {/* Left side - Expression stats */}
        <Box p={4} flex="1">
          <VStack spacing={4} align="stretch">
            <Stat>
              <StatLabel color="gray.400">Expression Level</StatLabel>
              <HStack spacing={2}>
                <StatNumber color={expressionColor}>
                  {selectedGene.value.toFixed(2)}
                </StatNumber>
                <Badge
                  colorScheme={
                    selectedGene.value > 1
                      ? "red"
                      : selectedGene.value < -1
                      ? "blue"
                      : "green"
                  }
                  fontSize="sm"
                  px={2}
                  py={1}
                >
                  {expressionLevel}
                </Badge>
              </HStack>
              <StatHelpText>
                {selectedGene.value > 1
                  ? "Significantly upregulated"
                  : selectedGene.value < -1
                  ? "Significantly downregulated"
                  : "Normal expression range"}
              </StatHelpText>
            </Stat>

            <Divider borderColor="whiteAlpha.200" />

            <Box>
              <Text fontWeight="medium" mb={2} color="gray.400">
                <Icon as={FaProjectDiagram} mr={2} />
                Associated Pathways
              </Text>
              <List spacing={1}>
                {selectedGene.pathways.map((pathway) => (
                  <ListItem key={pathway} fontSize="sm" ml={1}>
                    <ListIcon
                      as={FaArrowRight}
                      color={`${expressionColor}80`}
                    />
                    {pathway}
                  </ListItem>
                ))}
              </List>
            </Box>
          </VStack>
        </Box>

        {/* Right side - Description and insights */}
        <Divider orientation="vertical" borderColor="whiteAlpha.200" />

        <Box p={4} flex="1">
          <VStack spacing={3} align="stretch">
            <Box>
              <Text fontWeight="medium" mb={1} color="gray.400">
                <Icon as={FaInfoCircle} mr={2} />
                Description
              </Text>
              <Text fontSize="sm" lineHeight="tall">
                {selectedGene.description}
              </Text>
            </Box>

            <Divider borderColor="whiteAlpha.200" />

            <Box>
              <Text fontWeight="medium" mb={1} color="gray.400">
                <Icon as={FaChartLine} mr={2} />
                Expression Insights
              </Text>
              <HStack bg="rgba(255,255,255,0.05)" p={2} borderRadius="md">
                <Box textAlign="center" flex={1}>
                  <Text fontSize="xs" color="gray.400">
                    Confidence
                  </Text>
                  <Text fontWeight="bold">{confidenceScore}%</Text>
                </Box>
                <Divider
                  orientation="vertical"
                  height="30px"
                  borderColor="whiteAlpha.200"
                />
                <Box textAlign="center" flex={1}>
                  <Text fontSize="xs" color="gray.400">
                    Percentile
                  </Text>
                  <Text fontWeight="bold">
                    {Math.round(
                      selectedGene.value > 0
                        ? 100 - Math.abs(selectedGene.value) * 10
                        : Math.abs(selectedGene.value) * 10
                    )}
                    %
                  </Text>
                </Box>
                <Divider
                  orientation="vertical"
                  height="30px"
                  borderColor="whiteAlpha.200"
                />
                <Box textAlign="center" flex={1}>
                  <Text fontSize="xs" color="gray.400">
                    Fold Change
                  </Text>
                  <Text fontWeight="bold">
                    {Math.pow(2, Math.abs(selectedGene.value)).toFixed(2)}x
                  </Text>
                </Box>
              </HStack>
            </Box>
          </VStack>
        </Box>
      </Flex>

      {/* Footer */}
      <Flex
        justify="space-between"
        align="center"
        borderTop="1px solid"
        borderColor="whiteAlpha.200"
        py={2}
        px={4}
        bg="rgba(0,0,0,0.2)"
      >
        <Text fontSize="xs" color="gray.400">
          Gene selected from sample plot
        </Text>
        <Button
          size="xs"
          variant="outline"
          colorScheme="blue"
          rightIcon={<FaExternalLinkAlt />}
          onClick={() =>
            window.open(
              `https://www.ncbi.nlm.nih.gov/gene/?term=${selectedGene.geneName}`,
              "_blank"
            )
          }
        >
          View in NCBI
        </Button>
      </Flex>
    </MotionBox>
  );
};

export default GeneSelectionSummary;
