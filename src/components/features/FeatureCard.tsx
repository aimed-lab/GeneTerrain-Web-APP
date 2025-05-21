import React from "react";
import {
  VStack,
  Icon,
  Heading,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { IconType } from "react-icons";
import { MotionBox } from "../common/MotionComponents";

interface FeatureCardProps {
  icon: IconType;
  title: string;
  description: string;
  delay: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  delay,
}) => (
  <MotionBox
    p={8}
    bg={useColorModeValue("white", "geneTerrain.primary")}
    borderRadius="xl"
    boxShadow="xl"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{
      duration: 0.5,
      delay,
      ease: "easeOut",
    }}
    _hover={{
      transform: "translateY(-5px)",
      boxShadow: "2xl",
    }}
  >
    <VStack spacing={4} align="start">
      <Icon as={icon} w={10} h={10} color="geneTerrain.accent1" />
      <Heading size="md" color="geneTerrain.accent2">
        {title}
      </Heading>
      <Text color="geneTerrain.neutral">{description}</Text>
    </VStack>
  </MotionBox>
);

export default FeatureCard;
