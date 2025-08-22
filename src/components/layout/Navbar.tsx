import React from "react";
import {
  Box,
  Flex,
  Button,
  HStack,
  IconButton,
  useDisclosure,
  Stack,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  useColorMode,
  Tag,
  Tooltip,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { MotionBox } from "../common/MotionComponents";
import { useAuth } from "../context/AuthContext";
import { usePremium } from "../context/PremiumContext";

interface NavLinkProps {
  children: React.ReactNode;
  to: string;
}

const NavLink: React.FC<NavLinkProps> = ({ children, to }) => (
  <RouterLink to={to}>
    <Text
      px={2}
      py={1}
      rounded="md"
      _hover={{
        textDecoration: "none",
        color: "geneTerrain.accent2",
      }}
      color="white"
      cursor="pointer"
    >
      {children}
    </Text>
  </RouterLink>
);

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const { premiumFeatures } = usePremium();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Add a constant to control dark mode toggle visibility
  const showDarkModeToggle = false; // Set to false to hide the button

  return (
    <MotionBox
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      bg="geneTerrain.headerBg" // CHANGED from being conditionally set
      px={4}
      position="sticky"
      top={0}
      zIndex={999}
    >
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <IconButton
          size="md"
          icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
          aria-label="Open Menu"
          display={{ md: "none" }}
          onClick={isOpen ? onClose : onOpen}
          bg="transparent"
          color="white"
          _hover={{ bg: "geneTerrain.secondary" }}
        />
        <HStack spacing={8} alignItems="center">
          <Box cursor="pointer" onClick={() => navigate("/")}>
            <Text
              fontSize="xl"
              fontWeight="bold"
              bgGradient="linear(to-r, geneTerrain.accent1, geneTerrain.accent2)"
              bgClip="text"
            >
              GeneTerrain
            </Text>
          </Box>
          <HStack as="nav" spacing={4} display={{ base: "none", md: "flex" }}>
            <NavLink to="/">Home</NavLink>
            <Tooltip
              label={
                !premiumFeatures.customGeneTerrain
                  ? "Premium feature - Upgrade to access custom gene terrain visualizations"
                  : "Create your own custom gene terrain visualizations"
              }
              placement="bottom"
              hasArrow
            >
              <Box position="relative" display="inline-flex">
                <NavLink to="/custom">Custom GeneTerrain</NavLink>
                <Tag
                  size="sm"
                  colorScheme="yellow"
                  position="absolute"
                  top="-10px"
                  right="-20px"
                  fontSize="0.6rem"
                >
                  PREMIUM
                </Tag>
              </Box>
            </Tooltip>
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/docs">Docs</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </HStack>
        </HStack>
        <HStack spacing={4}>
          {/* Replace the features.enableColorModeToggle check with the constant */}
          {showDarkModeToggle && (
            <IconButton
              aria-label="Toggle dark mode"
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              colorScheme={colorMode === "dark" ? "yellow" : "blue"}
              _hover={{
                bg:
                  colorMode === "light" ? "gray.100" : "rgba(255,255,255,0.1)",
              }}
              title={
                colorMode === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            />
          )}
          {isAuthenticated ? (
            <Menu>
              <MenuButton>
                <Avatar
                  size="sm"
                  name={user?.displayName || "User"}
                  src={user?.photoURL || undefined}
                  bg="geneTerrain.accent1"
                />
              </MenuButton>
              <MenuList bg="geneTerrain.bg">
                <MenuItem
                  bg="geneTerrain.bg"
                  _hover={{
                    bg: "geneTerrain.secondary",
                    color: "geneTerrain.bg",
                  }}
                  onClick={() => navigate("/profile")}
                >
                  Profile
                </MenuItem>
                <MenuItem
                  bg="geneTerrain.bg"
                  _hover={{
                    bg: "geneTerrain.secondary",
                    color: "geneTerrain.bg",
                  }}
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </MenuItem>
                <MenuItem
                  bg="geneTerrain.bg"
                  _hover={{
                    bg: "geneTerrain.secondary",
                    color: "geneTerrain.bg",
                  }}
                  onClick={handleLogout}
                >
                  Sign Out
                </MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <>
              <Button
                variant="ghost"
                color="white"
                _hover={{ bg: "geneTerrain.secondary" }}
                onClick={() => navigate("/login")}
                display={{ base: "none", md: "inline-flex" }}
              >
                Sign In
              </Button>
              <Button
                bg="geneTerrain.accent1"
                color="white"
                _hover={{ bg: "geneTerrain.accent2" }}
                onClick={() => navigate("/register")}
              >
                Sign Up
              </Button>
            </>
          )}
        </HStack>
      </Flex>

      {isOpen && (
        <Box pb={4} display={{ md: "none" }}>
          <Stack as="nav" spacing={4}>
            <NavLink to="/">Home</NavLink>
            <Box position="relative" display="inline-flex">
              <NavLink to="/custom">Custom GeneTerrain</NavLink>
              <Tag
                size="sm"
                colorScheme="yellow"
                position="absolute"
                top="-5px"
                right="-20px"
                fontSize="0.6rem"
              >
                PREMIUM
              </Tag>
            </Box>
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/docs">Docs</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            {!isAuthenticated && <NavLink to="/login">Sign In</NavLink>}
          </Stack>
        </Box>
      )}
    </MotionBox>
  );
};

export default Navbar;
