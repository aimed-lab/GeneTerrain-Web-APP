import React from "react";
import {
  Box,
  Flex,
  Heading,
  Spacer,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  HStack,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { ChevronDownIcon, HamburgerIcon, QuestionIcon } from "@chakra-ui/icons";
import {
  FaHome,
  FaDatabase,
  FaChartBar,
  FaBook,
  FaGithub,
} from "react-icons/fa";

const MotionBox = motion(Box);

const Header: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box
      bg="geneTerrain.primary"
      color="white"
      px={4}
      py={3}
      position="sticky"
      top="0"
      zIndex="sticky"
      boxShadow="md"
    >
      <Flex maxW="container.xl" mx="auto" align="center">
        <MotionBox whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <HStack spacing={3}>
            <Icon as={FaChartBar} color="geneTerrain.accent2" fontSize="2xl" />
            <Heading size="md" fontWeight="semibold">
              Gene Terrain
            </Heading>
          </HStack>
        </MotionBox>

        <Spacer />

        {/* Desktop Navigation */}
        <HStack spacing={5} display={{ base: "none", md: "flex" }}>
          <Button
            variant="ghost"
            leftIcon={<FaHome />}
            _hover={{ bg: "geneTerrain.accent1", color: "white" }}
          >
            Home
          </Button>

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              variant="ghost"
              _hover={{ bg: "geneTerrain.accent1", color: "white" }}
            >
              Datasets
            </MenuButton>
            <MenuList
              bg="geneTerrain.secondary"
              borderColor="geneTerrain.accent1"
            >
              <MenuItem _hover={{ bg: "geneTerrain.accent1" }}>
                Browse Datasets
              </MenuItem>
              <MenuItem _hover={{ bg: "geneTerrain.accent1" }}>
                Upload New Dataset
              </MenuItem>
              <MenuItem _hover={{ bg: "geneTerrain.accent1" }}>
                Recent Datasets
              </MenuItem>
            </MenuList>
          </Menu>

          <Button
            variant="ghost"
            leftIcon={<FaBook />}
            _hover={{ bg: "geneTerrain.accent1", color: "white" }}
          >
            Documentation
          </Button>

          <Tooltip label="Visit GitHub Repository" placement="bottom">
            <IconButton
              aria-label="GitHub Repo"
              icon={<FaGithub />}
              variant="ghost"
              _hover={{ bg: "geneTerrain.accent1", color: "white" }}
            />
          </Tooltip>

          <Tooltip label="Help & Tutorials" placement="bottom">
            <IconButton
              aria-label="Help"
              icon={<QuestionIcon />}
              variant="ghost"
              _hover={{ bg: "geneTerrain.accent1", color: "white" }}
            />
          </Tooltip>
        </HStack>

        {/* Mobile Menu Button */}
        <IconButton
          aria-label="Open Menu"
          icon={<HamburgerIcon />}
          variant="ghost"
          display={{ base: "flex", md: "none" }}
          onClick={onOpen}
        />
      </Flex>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent bg="geneTerrain.secondary" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Gene Terrain Menu</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch" mt={4}>
              <Button
                leftIcon={<FaHome />}
                justifyContent="flex-start"
                variant="ghost"
                _hover={{ bg: "geneTerrain.accent1" }}
                onClick={onClose}
              >
                Home
              </Button>

              <Button
                leftIcon={<FaDatabase />}
                justifyContent="flex-start"
                variant="ghost"
                _hover={{ bg: "geneTerrain.accent1" }}
                onClick={onClose}
              >
                Datasets
              </Button>

              <Button
                leftIcon={<FaBook />}
                justifyContent="flex-start"
                variant="ghost"
                _hover={{ bg: "geneTerrain.accent1" }}
                onClick={onClose}
              >
                Documentation
              </Button>

              <Button
                leftIcon={<FaGithub />}
                justifyContent="flex-start"
                variant="ghost"
                _hover={{ bg: "geneTerrain.accent1" }}
                onClick={onClose}
              >
                GitHub Repository
              </Button>

              <Button
                leftIcon={<QuestionIcon />}
                justifyContent="flex-start"
                variant="ghost"
                _hover={{ bg: "geneTerrain.accent1" }}
                onClick={onClose}
              >
                Help & Tutorials
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default Header;
