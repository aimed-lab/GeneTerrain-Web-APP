import React from "react";
import {
  Box,
  Container,
  Grid,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Image,
} from "@chakra-ui/react";
import { FaChartLine, FaDna, FaMicroscope, FaDatabase } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  MotionBox,
  MotionHeading,
  MotionText,
} from "../../components/common/MotionComponents";
import FeatureCard from "../../components/features/FeatureCard";
import Navbar from "../../components/layout/Navbar";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Navbar />
      {/* Hero Section */}
      <Box
        bg="geneTerrain.secondary"
        py={20}
        backgroundImage="linear-gradient(120deg, rgba(30,107,82,0.9) 0%, rgba(41,81,53,0.9) 100%)"
      >
        <Container maxW="container.xl">
          <Grid
            templateColumns={{ base: "1fr", md: "1fr 1fr" }}
            gap={8}
            alignItems="center"
          >
            <VStack align="flex-start" spacing={6}>
              <MotionHeading
                size="2xl"
                bgGradient="linear(to-r, geneTerrain.accent1, geneTerrain.accent2)"
                bgClip="text"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                GeneTerrain
              </MotionHeading>
              <MotionText
                fontSize="xl"
                color="white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                Advanced genetic data analysis and visualization platform
              </MotionText>
              <MotionBox
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <HStack spacing={4}>
                  <Button
                    size="lg"
                    bg="geneTerrain.accent1"
                    _hover={{ bg: "geneTerrain.primary" }}
                    onClick={() => navigate("/login")}
                  >
                    Get Started
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    borderColor="geneTerrain.accent2"
                    color="geneTerrain.accent2"
                    _hover={{ bg: "geneTerrain.accent2", color: "black" }}
                  >
                    Learn More
                  </Button>
                </HStack>
              </MotionBox>
            </VStack>
            <MotionBox
              display={{ base: "none", md: "block" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Image
                src="/dna-illustration.png"
                alt="DNA Analysis"
                fallbackSrc="https://via.placeholder.com/500x400?text=DNA+Analysis"
              />
            </MotionBox>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxW="container.xl" py={20}>
        <VStack spacing={16}>
          <MotionHeading
            textAlign="center"
            color="geneTerrain.accent2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Key Features
          </MotionHeading>
          <Grid
            templateColumns={{
              base: "1fr",
              md: "1fr 1fr",
              lg: "repeat(4, 1fr)",
            }}
            gap={8}
          >
            <FeatureCard
              icon={FaChartLine}
              title="Data Analysis"
              description="Advanced genetic data analysis tools with real-time visualization"
              delay={0.2}
            />
            <FeatureCard
              icon={FaDna}
              title="Gene Mapping"
              description="Comprehensive gene mapping and sequence analysis capabilities"
              delay={0.4}
            />
            <FeatureCard
              icon={FaMicroscope}
              title="Research Tools"
              description="Specialized tools for genetic research and experimentation"
              delay={0.6}
            />
            <FeatureCard
              icon={FaDatabase}
              title="Data Management"
              description="Secure and efficient genetic data storage and management"
              delay={0.8}
            />
          </Grid>
        </VStack>
      </Container>

      {/* Call to Action */}
      <MotionBox
        bg="geneTerrain.primary"
        py={20}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Container maxW="container.xl">
          <VStack spacing={8} textAlign="center">
            <Heading color="white">Ready to Get Started?</Heading>
            <Text color="geneTerrain.neutral" fontSize="lg">
              Join our platform and discover the power of genetic data analysis
            </Text>
            <Button
              size="lg"
              bg="geneTerrain.accent1"
              _hover={{ bg: "geneTerrain.accent2", color: "black" }}
              onClick={() => navigate("/register")}
            >
              Create Account
            </Button>
          </VStack>
        </Container>
      </MotionBox>
    </Box>
  );
};

export default HomePage;
