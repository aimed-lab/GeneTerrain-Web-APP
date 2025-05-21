import React from "react";
import { Heading, Text, VStack } from "@chakra-ui/react";
import { MotionBox } from "../common/MotionComponents";

const ContactContent: React.FC = () => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      p={8}
    >
      <VStack spacing={6} align="start">
        <Heading
          bgGradient="linear(to-r, geneTerrain.primary, geneTerrain.accent1)"
          bgClip="text"
        >
          Contact
        </Heading>
        <Text>Get in touch with the GeneTerrain team!</Text>
      </VStack>
    </MotionBox>
  );
};

export default ContactContent;
