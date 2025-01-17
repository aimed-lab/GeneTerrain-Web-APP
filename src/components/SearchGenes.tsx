import React, { useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import {
  Box,
  Input,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
  IconButton,
} from "@chakra-ui/react";
import SearchInterface from "./SearchInterface";
import { CloseIcon } from "@chakra-ui/icons";

// Wrapper component to manage trigger re-renders
const SearchGenesWrapper = () => {
  const [key, setKey] = useState(0);

  // Method to force re-render and call useEffect
  const refreshComponent = () => setKey((prevKey) => prevKey + 1);

  useEffect(() => {
    // Attach the method to the global scope
    (window as any).refreshSearchGenes = refreshComponent;
  }, []);

  return <SearchGenes key={key} />;
};

const SearchGenes = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [navbarHeight, setNavbarHeight] = useState("60px");

  useEffect(() => {
    onOpen();
    const navbar = document.querySelector("nav");
    if (navbar) {
      setNavbarHeight(`${navbar.offsetHeight}px`);
    }
  }, [onOpen]);

  return (
    <Box mt={navbarHeight}>
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent
          bg="white"
          maxW="30%"
          p={4}
          border="1px solid"
          borderColor="gray.300"
          overflowY="auto"
          mt={navbarHeight}
          boxShadow="md"
          borderRadius="lg"
        >
          <IconButton
            icon={<CloseIcon />}
            onClick={onClose}
            aria-label="Close drawer"
            position="absolute"
            top={3}
            right={3}
            size="md"
            padding={4}
            variant="ghost"
          />
          <DrawerBody>
            <SearchInterface />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

// Modified openSearchModal to use the wrapper and trigger re-render
export const openSearchModal = () => {
  const element = document.getElementById("SearchGenes");
  if (element) {
    ReactDOM.render(<SearchGenesWrapper />, element);
    (window as any).refreshSearchGenes(); // Trigger useEffect
  }
};

export default SearchGenesWrapper;
