import React from "react";
import {
  Box,
  Flex,
  VStack,
  Icon,
  Text,
  HStack,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Tooltip,
  Tag,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FaHome,
  FaFlask,
  FaLayerGroup,
  FaBook,
  FaInfoCircle,
  FaEnvelope,
  FaSignOutAlt,
  FaUser,
  FaChartPie,
} from "react-icons/fa";
import { HamburgerIcon } from "@chakra-ui/icons";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface NavItemProps {
  icon: any;
  label: string;
  to: string;
  onClose?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, to, onClose }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const activeBg = "geneTerrain.accent1";
  const hoverBg = "rgba(255, 255, 255, 0.1)";

  return (
    <Tooltip label={label} placement="right" hasArrow>
      <RouterLink to={to} style={{ width: "100%" }} onClick={onClose}>
        <Flex
          w="full"
          px={4}
          py={4}
          bg={isActive ? "rgba(255, 255, 255, 0.05)" : "transparent"}
          _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
          borderRadius="lg"
          transition="all 0.3s"
          cursor="pointer"
          color={isActive ? "geneTerrain.accent2" : "white"}
          justifyContent="center"
          align="center"
          position="relative"
        >
          {/* Active Marker Line */}
          {isActive && (
            <Box 
              position="absolute" 
              left="0" 
              w="4px" 
              h="60%" 
              bg="geneTerrain.accent2" 
              borderRadius="full" 
              boxShadow="0 0 10px rgba(255, 212, 0, 0.5)"
            />
          )}
          
          <Icon 
            as={icon} 
            fontSize="xl" 
            filter={isActive ? "drop-shadow(0 0 4px rgba(255, 212, 0, 0.5))" : "none"}
          />
        </Flex>
      </RouterLink>
    </Tooltip>
  );
};

const SidebarContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
    if (onClose) onClose();
  };

  return (
    <Flex
      direction="column"
      h="full"
      bg="geneTerrain.headerBg"
      color="white"
      py={6}
      px={3}
      boxShadow="2xl"
      overflow="hidden"
      align="center"
    >
      {/* Brand Section */}
      <Box mb={10} cursor="pointer" onClick={() => navigate("/")} textAlign="center">
        <Text
          fontSize="2xl"
          fontWeight="black"
          letterSpacing="tight"
          bgGradient="linear(to-r, white, geneTerrain.accent2)"
          bgClip="text"
        >
          GT
        </Text>
      </Box>

      {/* Navigation Links */}
      <VStack spacing={2} align="stretch" flex="1" w="full">
        <NavItem icon={FaHome} label="Home" to="/" onClose={onClose} />
        <NavItem 
          icon={FaFlask} 
          label="Custom GeneTerrain" 
          to="/custom" 
          onClose={onClose} 
        />
        <NavItem icon={FaChartPie} label="Analytics" to="/analytics" onClose={onClose} />
        <NavItem icon={FaLayerGroup} label="Features" to="/features" onClose={onClose} />
        <NavItem icon={FaBook} label="Documentation" to="/docs" onClose={onClose} />
        
        <Box py={4} w="full">
          <Divider opacity={0.2} />
        </Box>
        
        <NavItem icon={FaInfoCircle} label="About" to="/about" onClose={onClose} />
        <NavItem icon={FaEnvelope} label="Contact" to="/contact" onClose={onClose} />
      </VStack>

      {/* User Area */}
      <Box pt={4} w="full">
        <Divider opacity={0.2} mb={6} />
        {user ? (
          <Menu placement="right-start">
            <MenuButton w="full">
              <Flex justify="center" p={2} borderRadius="lg" _hover={{ bg: "rgba(255, 255, 255, 0.1)" }} transition="all 0.2s">
                <Avatar 
                  size="sm" 
                  name={user.displayName || "User"} 
                  src={user.photoURL || undefined} 
                  bg="geneTerrain.accent1"
                />
              </Flex>
            </MenuButton>
            <MenuList bg="geneTerrain.headerBg" borderColor="rgba(255,255,255,0.1)" color="white">
              <Box px={4} py={2} borderBottom="1px solid" borderColor="rgba(255,255,255,0.1)">
                <Text fontSize="sm" fontWeight="bold">{user.displayName || "User"}</Text>
                <Text fontSize="xs" opacity={0.6}>{user.email}</Text>
              </Box>
              <MenuItem 
                icon={<FaSignOutAlt />} 
                bg="transparent" 
                _hover={{ bg: "red.500" }}
                onClick={handleLogout}
              >
                Sign Out
              </MenuItem>
            </MenuList>
          </Menu>
        ) : (
          <VStack spacing={2} w="full">
            <NavItem icon={FaUser} label="Sign In" to="/login" onClose={onClose} />
            <NavItem icon={FaUser} label="Sign Up" to="/register" onClose={onClose} />
          </VStack>
        )}
      </Box>
    </Flex>
  );
};

const Sidebar: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      {/* Mobile Hamburger (Only visible on base, hidden on md) */}
      <Box
        display={{ base: "flex", md: "none" }}
        position="fixed"
        top={4}
        left={4}
        zIndex={1100}
      >
        <IconButton
          aria-label="Open Menu"
          icon={<HamburgerIcon />}
          onClick={onOpen}
          colorScheme="teal"
          variant="outline"
          bg="white"
          boxShadow="md"
        />
      </Box>

      {/* Desktop Sidebar (Only visible on md and up) */}
      <Box
        display={{ base: "none", md: "block" }}
        position="fixed"
        left={0}
        top={0}
        h="100vh"
        w="72px"
        zIndex={1400} 
      >
        <SidebarContent />
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent bg="geneTerrain.headerBg" p={0}>
          <DrawerCloseButton color="white" zIndex={2000} />
          <SidebarContent onClose={onClose} />
        </DrawerContent>
      </Drawer>
    </>
  );
};



export default Sidebar;
