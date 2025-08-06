// FeaturesContent now showcases the top GeneTerrain features for new users, using clear, welcoming language and matching icons.
// Each feature is presented as a card with a friendly heading and benefit-focused description.
// The design remains modular, responsive, and consistent with the app's style.

import React from "react";
import { Heading, VStack, Grid, useBreakpointValue } from "@chakra-ui/react";
import {
  FaLayerGroup,
  FaTable,
  FaDatabase,
  FaHighlighter,
  FaUserPlus,
} from "react-icons/fa";
import FeatureCard from "../features/FeatureCard";
import { MotionBox } from "../common/MotionComponents";

const features = [
  {
    icon: FaLayerGroup,
    title: "Interactive Multi-Layer GeneTerrain Visualization",
    description:
      "Explore your data like never before! GeneTerrain lets you view information in different layers—such as peaks, valleys, and smooth surfaces—so you can easily spot patterns and interesting areas in your data, all with just a few clicks.",
    delay: 0.1,
  },
  {
    icon: FaTable,
    title: "Easy-to-Use Table and Graph Views for Clinical Data",
    description:
      "See your clinical data the way you like! Switch between a simple table view for details or a colorful scatter plot for a big-picture overview. This makes it easy to find trends, compare results, and understand your data at a glance.",
    delay: 0.2,
  },
  {
    icon: FaDatabase,
    title: "Access to Multiple Datasets",
    description:
      "GeneTerrain gives you the power to explore a variety of important datasets, like TCGA and GBM, or even your own data. Easily switch between different sources to compare and discover new insights—all in one place.",
    delay: 0.3,
  },
  {
    icon: FaHighlighter,
    title: "Instant Gene Selection Highlights",
    description:
      "Curious about certain genes? Just select them, and GeneTerrain will instantly show you helpful summaries and highlights. This makes it quick and easy to learn more about the genes that matter most to you.",
    delay: 0.4,
  },
  {
    icon: FaUserPlus,
    title: "Create Your Own GeneTerrains",
    description:
      "Make GeneTerrain your own! Upload your own gene expression data and layouts to create personalized visualizations. This way, you can explore and understand your unique data with all the powerful tools GeneTerrain offers.",
    delay: 0.5,
  },
];

const FeaturesContent: React.FC = () => {
  // Responsive columns: 1 on mobile, 2 on tablet, 3 on desktop+
  const columns = useBreakpointValue({ base: 1, md: 2, lg: 3 });

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      p={{ base: 4, md: 8 }}
      minH="80vh"
    >
      <VStack spacing={8} align="center" w="full">
        <Heading
          bgGradient="linear(to-r, geneTerrain.primary, geneTerrain.accent1)"
          bgClip="text"
          textAlign="center"
        >
          Discover GeneTerrain's Top Features
        </Heading>
        <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={8} w="full">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </Grid>
      </VStack>
    </MotionBox>
  );
};

export default FeaturesContent;
