import React from "react";
import { Box, Container, Heading } from "@chakra-ui/react";
import { GBMSampleExplorer } from "../modules/GBMDataModule/GBMSampleExplorer";
import { GBMDataProvider } from "../modules/GBMDataModule/GBMDataProvider";

const GBMAnalysis: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={6}>GBM Cancer Analysis</Heading>
      <Box mb={8}>
        <GBMDataProvider>
          <GBMSampleExplorer />
        </GBMDataProvider>
      </Box>
    </Container>
  );
};

export default GBMAnalysis;
