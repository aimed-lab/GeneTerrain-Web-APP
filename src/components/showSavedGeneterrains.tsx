import * as ReactDOM from "react-dom";

import {
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Box,
  Card,
  Image,
  Text,
  Grid,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import fetchGeneTerrainData from "../utilities/getFirebaseGeneTerrains";

const GeneTerrainCards = () => {
  const [data, setData] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleButtonClick = async () => {
    const output = await fetchGeneTerrainData();
    if (output) setData(output);
    onOpen();
  };

  const handleCardClick = (item) => {
    // Save the card data to localStorage
    sessionStorage.setItem("selectedItem", JSON.stringify(item));
    window.open("/card-details.html", "_blank");
  };

  return (
    <>
      <button className="btn btn-primary" onClick={handleButtonClick}>
        My Geneterrain's
      </button>

      <Modal
        blockScrollOnMount={false}
        isOpen={isOpen}
        onClose={onClose}
        isCentered
        closeOnEsc={true}
        motionPreset="scale"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(5px)" />
        <ModalContent
          maxW="70vw"
          maxH="70vh"
          minW="30vh"
          minH="50vh"
          overflow="hidden"
          backgroundColor="#f9f9f9"
          borderRadius="15px"
          boxShadow="2xl"
          p="6"
          marginTop="15vh"
          mx="auto"
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            p="4"
            position="relative"
          >
            <ModalHeader
              fontSize="lg"
              fontWeight="bold"
              textAlign="center"
              w="full"
              whiteSpace="nowrap"
            >
              Saved GeneTerrain's
            </ModalHeader>
            <ModalCloseButton
              position="absolute"
              top="4"
              right="4"
              size="sm"
              bg="transparent"
              border="none"
            />
          </Box>
          <ModalBody overflowY="auto" p="4">
            {data ? (
              <Grid templateColumns="repeat(3, 1fr)" gap={10}>
                {data.length == 0 ? (
                  <Text
                    textAlign="center"
                    fontSize="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    h="100%"
                    w="100%"
                  >
                    Nothing to display here
                  </Text>
                ) : (
                  data.map((item) => (
                    <Card
                      key={item.id}
                      maxW="xs"
                      borderRadius="10px"
                      boxShadow="md"
                      overflow="hidden"
                      _hover={{ boxShadow: "xl", transform: "scale(1.05)" }}
                      transition="all 0.3s ease"
                      onClick={() => handleCardClick(item)}
                    >
                      <Image
                        src={`data:image/png;base64,${item.geneTerrain}`}
                        alt={`GeneTerrain for ${item.sampleID}`}
                      />
                      <Box p="4">
                        <Text fontSize="xl" fontWeight="bold" mb="2">
                          {item.sampleID}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Resolution: {item.resolution}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Scale Min: {item.scaleMin}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Scale Max: {item.scaleMax}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Sigma: {item.sigma}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Cancer Type: {item.cancerType}
                        </Text>
                      </Box>
                    </Card>
                  ))
                )}
              </Grid>
            ) : (
              <Text textAlign="center" fontSize="lg">
                Loading...
              </Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export const callShowSavedGeneterrains = () => {
  ReactDOM.render(
    <GeneTerrainCards />,
    document.getElementById("show-saved-GT-basic-div")
  );
};

export default GeneTerrainCards;
