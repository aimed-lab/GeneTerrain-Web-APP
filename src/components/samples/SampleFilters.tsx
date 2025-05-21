import React from "react";
import {
  Flex,
  InputGroup,
  InputLeftElement,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Box,
  Text,
  MenuDivider,
} from "@chakra-ui/react";
import { SearchIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { FaTimes, FaCheck, FaCheckSquare, FaSquare } from "react-icons/fa";
import { useSamplesContext } from "../../context/SamplesContext";

const SampleFilters: React.FC = () => {
  const {
    searchTerm,
    setSearchTerm,
    filterCondition,
    setFilterCondition,
    conditionSearchTerm,
    setConditionSearchTerm,
    batchConditionSearchTerm,
    setBatchConditionSearchTerm,
    availableConditions,
    filteredConditions,
    filteredBatchConditions,
    handleSelectAllFiltered,
    handleDeselectAll,
    handleSelectByCondition,
  } = useSamplesContext();
  return (
    <Flex mb={4} gap={3} flexWrap="wrap">
      <InputGroup maxWidth={{ base: "100%", md: "250px" }}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="white" />
        </InputLeftElement>
        <Input
          placeholder="Search samples..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          bg="geneTerrain.secondary"
        />
      </InputGroup>

      <Menu closeOnSelect={false}>
        <MenuButton
          as={Button}
          rightIcon={<ChevronDownIcon />}
          variant="outline"
          _hover={{ bg: "geneTerrain.accent1" }}
        >
          {filterCondition
            ? `Condition: ${filterCondition}`
            : "Filter by condition"}
        </MenuButton>
        <MenuList
          zIndex={10}
          bg="geneTerrain.secondary"
          borderColor="geneTerrain.accent1"
          maxHeight="300px"
          overflowY="auto"
          css={{
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(128, 188, 0, 0.3)",
              borderRadius: "6px",
            },
          }}
        >
          <Box
            px={3}
            py={2}
            position="sticky"
            top="0"
            bg="geneTerrain.secondary"
            zIndex="1"
          >
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="white" fontSize="xs" />
              </InputLeftElement>
              <Input
                placeholder="Search conditions"
                size="sm"
                variant="filled"
                bg="geneTerrain.primary"
                _hover={{ bg: "geneTerrain.primary" }}
                _focus={{ bg: "geneTerrain.primary" }}
                value={conditionSearchTerm}
                onChange={(e) => setConditionSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Box>

          {filterCondition && (
            <MenuItem
              onClick={() => setFilterCondition(null)}
              fontWeight="bold"
              _hover={{ bg: "geneTerrain.accent1" }}
            >
              <Box
                as="span"
                w="5"
                h="5"
                mr="2"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
              >
                <FaTimes />
              </Box>
              Clear filter
            </MenuItem>
          )}

          <Box maxHeight="250px" overflowY="auto">
            {filteredConditions.length > 0 ? (
              filteredConditions.map((condition: string) => (
                <MenuItem
                  key={condition}
                  onClick={() => setFilterCondition(condition)}
                  _hover={{ bg: "geneTerrain.accent1" }}
                  icon={
                    filterCondition === condition ? (
                      <Box as={FaCheck} color="geneTerrain.accent1" />
                    ) : undefined
                  }
                >
                  {condition}
                </MenuItem>
              ))
            ) : (
              <MenuItem isDisabled>No matching conditions</MenuItem>
            )}
          </Box>
        </MenuList>
      </Menu>

      <Menu>
        <MenuButton
          as={Button}
          rightIcon={<ChevronDownIcon />}
          colorScheme="yellow"
          variant="solid"
          bg="geneTerrain.accent2"
          color="black"
          _hover={{ bg: "geneTerrain.accent2", opacity: 0.9 }}
        >
          Batch Select
        </MenuButton>
        <MenuList
          zIndex={10}
          bg="geneTerrain.secondary"
          borderColor="geneTerrain.accent1"
          maxHeight="350px"
          overflowY="auto"
          css={{
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(128, 188, 0, 0.3)",
              borderRadius: "6px",
            },
          }}
        >
          <MenuItem
            onClick={() => handleSelectAllFiltered(true)}
            _hover={{ bg: "geneTerrain.accent1" }}
            fontWeight="semibold"
          >
            <Box
              as="span"
              w="5"
              h="5"
              mr="2"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
            >
              <FaCheckSquare />
            </Box>
            Select all matching samples
          </MenuItem>
          <MenuItem
            onClick={handleDeselectAll}
            _hover={{ bg: "geneTerrain.accent1" }}
            fontWeight="semibold"
          >
            <Box
              as="span"
              w="5"
              h="5"
              mr="2"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
            >
              <FaSquare />
            </Box>
            Deselect all samples
          </MenuItem>

          <MenuDivider />

          {availableConditions.length > 0 && (
            <>
              <MenuItem opacity={0.7} disabled _hover={{ bg: "transparent" }}>
                <Text fontWeight="bold">Select by condition:</Text>
              </MenuItem>

              {availableConditions.length > 10 && (
                <Box px={3} py={2}>
                  <InputGroup size="sm">
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon color="white" fontSize="xs" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search conditions"
                      size="sm"
                      variant="filled"
                      bg="geneTerrain.primary"
                      _hover={{ bg: "geneTerrain.primary" }}
                      _focus={{ bg: "geneTerrain.primary" }}
                      value={batchConditionSearchTerm}
                      onChange={(e) =>
                        setBatchConditionSearchTerm(e.target.value)
                      }
                    />
                  </InputGroup>
                </Box>
              )}

              <Box maxHeight="200px" overflowY="auto">
                {filteredBatchConditions.map((condition: string) => (
                  <MenuItem
                    key={condition}
                    onClick={() => handleSelectByCondition(condition)}
                    pl={6}
                    _hover={{ bg: "geneTerrain.accent1" }}
                  >
                    Select all "{condition}"
                  </MenuItem>
                ))}
              </Box>
            </>
          )}
        </MenuList>
      </Menu>
    </Flex>
  );
};

export default SampleFilters;
