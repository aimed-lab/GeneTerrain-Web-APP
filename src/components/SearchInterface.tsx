import React, { useEffect, useState } from "react";
import customTheme from "../theme";

import {
  Box,
  Container,
  InputGroup,
  Input,
  InputLeftElement,
  InputRightElement,
  Text,
  VStack,
  List,
  ListItem,
  Heading,
  Collapse,
  Spinner,
  IconButton,
  ChakraProvider,
  Tag,
  TagLabel,
  TagCloseButton,
  HStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { SearchIcon, CloseIcon } from "@chakra-ui/icons";
import GeneInformation from "./GeneInformation";
import { pagIds } from "../pager/pagIds";
import PathwayInformation from "./PathwayInformation";
var store = require("store");

interface GeneNamesInfo {
  geneName?: string[];
  [key: string]: any;
}

const SearchInterface: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGenePathwayNames, setFilteredGenePathwayNames] = useState<
    string[]
  >([]);
  const [geneNamesInformation, setGeneNamesInformation] =
    useState<GeneNamesInfo>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGene, setSelectedGene] = useState<string[]>([]);
  const [pathway, setPathway] = useState(pagIds);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const storedData = store.get("geneNamesInformation");
    if (storedData != null) {
      setGeneNamesInformation(storedData);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const debounceTimer = setTimeout(() => {
      if (geneNamesInformation.geneName && searchTerm.trim()) {
        const filtered = geneNamesInformation.geneName.filter((gene: string) =>
          gene.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const filterPathways = pathway.filter((pag: string) =>
          pag.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const filteredValues = [...filtered, ...filterPathways];
        setFilteredGenePathwayNames(filteredValues.slice(0, 5));
        // setIsOpen(true);
      } else {
        setFilteredGenePathwayNames([]);
        setIsOpen(false);
      }
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, geneNamesInformation]);

  const handleClear = () => {
    setSearchTerm("");
    setSelectedGene([]);
    setIsOpen(false);
  };

  const handleSelect = (gene: string) => {
    setSelectedGene([...selectedGene, gene]);
    setSearchTerm(gene);
    setIsOpen(false);
    setSearchTags([...searchTags, gene]);
    // setFilteredGenePathwayNames([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      setSearchTags([...searchTags, e.currentTarget.value]);
    }
  };

  const handleRemoveGene = (geneToRemove) => {
    setSearchTags((prevGenes) =>
      prevGenes.filter((gene) => gene !== geneToRemove)
    );
  };

  return (
    <ChakraProvider theme={customTheme}>
      <Box bg="#F7F7F7" minH="100vh" py={8}>
        <Container maxW="xl" px={4}>
          <VStack spacing={3}>
            <Heading as="h1" size="lg" textAlign="center" color="#1E6B52">
              Gene Search
            </Heading>

            <Box position="relative" width="full" p={8}>
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none" h="100%">
                  <SearchIcon color="#144B39" />
                </InputLeftElement>
                <Input
                  placeholder="Search for a gene..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                  }}
                  onClick={() => {
                    setIsOpen(true);
                  }}
                  onKeyPress={(e) => {
                    handleKeyPress(e);
                  }}
                  bg="white"
                  borderColor="#808285"
                  _hover={{ borderColor: "#88C408" }}
                  _focus={{
                    borderColor: "#1E6B52",
                    boxShadow: "0 0 0 1px #1E6B52",
                  }}
                  borderRadius="lg"
                />
                {searchTerm && (
                  <InputRightElement h="100%">
                    <IconButton
                      aria-label="Clear search"
                      icon={<CloseIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={handleClear}
                    />
                  </InputRightElement>
                )}
              </InputGroup>

              {!isOpen && (
                <Wrap spacing={4} padding={1}>
                  {searchTags.length > 0 &&
                    searchTags.map((tag) => (
                      <WrapItem key={tag}>
                        <Tag
                          size="md"
                          borderRadius="full"
                          variant="solid"
                          colorScheme="green"
                        >
                          <TagLabel>{tag}</TagLabel>
                          <TagCloseButton
                            onClick={() => handleRemoveGene(tag)}
                          />
                        </Tag>
                      </WrapItem>
                    ))}
                </Wrap>
              )}

              <Collapse
                in={isOpen && filteredGenePathwayNames.length > 0}
                animateOpacity
              >
                <Box
                  position="absolute"
                  width="full"
                  zIndex={10}
                  mt={2}
                  border="1px solid"
                  borderColor="#808285"
                  borderRadius="md"
                  boxShadow="lg"
                  bg="white"
                >
                  <List
                    spacing={0}
                    maxH="300px"
                    overflowY="auto"
                    borderRadius="md"
                    css={{
                      "&::-webkit-scrollbar": { width: "6px" },
                      "&::-webkit-scrollbar-thumb": {
                        background: "#1E6B52",
                        borderRadius: "4px",
                      },
                    }}
                  >
                    {isOpen &&
                      filteredGenePathwayNames.map((gene, index) => (
                        <ListItem
                          key={index}
                          px={4}
                          py={3}
                          cursor="pointer"
                          _hover={{
                            bg: "#88C408",
                            color: "white",
                          }}
                          borderBottom="1px solid"
                          borderColor="#808285"
                          _last={{ borderBottom: "none" }}
                          onClick={() => handleSelect(gene)}
                        >
                          <Text fontSize="md" fontWeight="medium">
                            {gene}
                          </Text>
                        </ListItem>
                      ))}
                  </List>
                </Box>
              </Collapse>

              {/* {searchTerm && !isLoading && (
                <Text mt={4} textAlign="center" color="#808285" fontSize="md">
                  No matching genes found
                </Text>
              )} */}
            </Box>

            {isLoading && (
              <Spinner
                thickness="4px"
                speed="0.65s"
                emptyColor="gray.200"
                color="#1E6B52"
                size="xl"
              />
            )}

            {selectedGene && <PathwayInformation pathwayName={selectedGene} />}
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
};

export default SearchInterface;
