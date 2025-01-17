import React, { useState, useEffect } from "react";
import * as ReactDOM from "react-dom";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  Box,
  Badge,
  Heading,
  Text,
  Stack,
  Grid,
  Divider,
  Link,
  IconButton,
  Flex,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import { ExternalLinkIcon, CloseIcon } from "@chakra-ui/icons";
import { runPager } from "../pager/pager";
import { motion } from "framer-motion";

const InfoSection = ({ label, value }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Box mb={2}>
      <Text fontSize="md" color="gray.600" fontWeight="bold">
        {label}
      </Text>
      <Text fontSize="md" fontWeight="bold" color="gray.900">
        {value || "N/A"}
      </Text>
    </Box>
  </motion.div>
);

const GeneInformation = ({ geneName }) => {
  const [geneInfo, setGeneInfo] = useState(null);
  const [pagerData, setPagerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [navbarHeight, setNavbarHeight] = useState("60px");
  const [error, setError] = useState(null);

  useEffect(() => {
    onOpen();
    const fetchGeneInformation = async () => {
      try {
        const geneData = {
          name: geneName,
          description: "This gene is involved in biological processes.",
        };
        const pagerApiData = await runPager([geneName]);
        setGeneInfo(geneData);
        setPagerData(pagerApiData[0]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchGeneInformation();
    const navbar = document.querySelector("nav");
    if (navbar) {
      setNavbarHeight(`${navbar.offsetHeight}px`);
    }
  }, [geneName, onOpen]);

  if (loading) {
    return <Flex align="center" justify="center" h="100vh"></Flex>;
  }

  return (
    <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="lg">
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
          padding={4}
          size="md"
          variant="ghost"
        />
        {pagerData == null || pagerData == undefined ? (
          <Heading size="lg" color="red.500">
            No data found
          </Heading>
        ) : (
          <>
            <DrawerHeader borderBottomWidth="1px">
              <Flex justify="space-between" align="center">
                <Box>
                  <Heading size="lg" fontWeight="bold" color="blue.700">
                    {pagerData ? pagerData.NAME : "Loading..."}
                  </Heading>
                  <Text fontSize="md" color="gray.700" mt={1}>
                    {pagerData ? pagerData.DESCRIPTION : ""}
                  </Text>
                </Box>
                {pagerData && (
                  <Badge colorScheme="blue" fontSize="0.8em">
                    Rank {pagerData.Rank}
                  </Badge>
                )}
              </Flex>
            </DrawerHeader>

            <DrawerBody>
              <Stack spacing={4}>
                <Box>
                  <Heading size="md" color="teal.700">
                    Gene Information
                  </Heading>
                  <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                    <InfoSection label="Name" value={geneInfo.name} />
                    <InfoSection
                      label="Description"
                      value={geneInfo.description}
                    />
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Heading size="md" color="teal.700">
                    Basic Information
                  </Heading>
                  <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                    <InfoSection label="Source" value={pagerData.SOURCE} />
                    <InfoSection label="Organism" value={pagerData.ORGANISM} />
                    <InfoSection
                      label="Gene Set Size"
                      value={pagerData.GS_SIZE}
                    />
                    <InfoSection label="Type" value={pagerData.TYPE} />
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Heading size="md" color="green.700">
                    Statistical Metrics
                  </Heading>
                  <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                    <InfoSection
                      label="p-value"
                      value={Number(pagerData.pvalue).toExponential(3)}
                    />
                    <InfoSection
                      label="FDR"
                      value={Number(pagerData.pFDR).toExponential(3)}
                    />
                    <InfoSection
                      label="COCO Score"
                      value={Number(pagerData.COCO_V2).toFixed(2)}
                    />
                    <InfoSection
                      label="Similarity Score"
                      value={Number(pagerData.SIMILARITY_SCORE).toFixed(3)}
                    />
                    <InfoSection label="Overlap" value={pagerData.OLAP} />
                    <InfoSection label="Multi N" value={pagerData.MULTI_N} />
                  </Grid>
                </Box>

                {pagerData.LINK && (
                  <Box>
                    <Link
                      href={pagerData.LINK}
                      isExternal
                      color="blue.500"
                      fontWeight="bold"
                    >
                      <ExternalLinkIcon mr={2} /> View Pathway on WikiPathways
                    </Link>
                  </Box>
                )}
              </Stack>
            </DrawerBody>

            <DrawerFooter>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export const getGeneInfo = ({ geneName }) => {
  ReactDOM.render(
    <GeneInformation geneName={geneName} />,
    document.getElementById("gene-information-drawer")
  );
};

export default GeneInformation;
