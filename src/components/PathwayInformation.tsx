import React, { StrictMode, useEffect, useRef, useState } from "react";
import { getGenesFromPags } from "../pager/pager";
import {
  Box,
  Flex,
  Tag,
  TagCloseButton,
  TagLabel,
  Wrap,
  WrapItem,
  Text,
  Heading,
} from "@chakra-ui/react";
import { filterData, filterDataByGeneNames } from "../filter";
import { doPlotlyUpdate } from "../utilities/PlotlyUtility";

const PathwayInformation = ({ pathwayName }) => {
  const [genes, setGenes] = useState([]);
  const [pathwayResult, setPathwayResult] = useState([]);
  const isInitialRender = useRef(true); // Tracks if it's the initial render
  const [rows, setRows] = useState([]);

  const fetchGenesFromPathways = async (res) => {
    try {
      const mappedGenes = res.map((item) => item["GENE_SYM"]);
      // setGenes(mappedGenes);
      // console.log("Genes for", pathwayName, "are:", mappedGenes);
      const filteredResult = await filterDataByGeneNames(mappedGenes);
      setGenes(filteredResult.geneName || []);
      const updateDataForPlotly = {
        x: [filteredResult.layoutDataX],
        y: [filteredResult.layoutDataY],
        text: [filteredResult.geneName],
      };
      await doPlotlyUpdate("canvas-div", updateDataForPlotly);
      console.log(filteredResult);
      // console.log("Genes for", pathwayName, "are:", mappedGenes);
    } catch (error) {
      console.error("Error in fetchGenesFromPathways:", error);
    }
  };

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false; // Mark the first render as completed
      return; // Skip execution on the initial render
    }
    const executeFlow = async () => {
      try {
        // Step 1: Run getGenesFromPags
        const result = await getGenesFromPags(pathwayName);
        console.log("Pathway result for", pathwayName, "is:", result);
        setPathwayResult(result);

        // Step 2: Run fetchGenesFromPathways with the result
        await fetchGenesFromPathways(result);
      } catch (error) {
        console.error("Error in pathway flow:", error);
      }
    };

    executeFlow();
  }, [pathwayName]);

  // Divide the genes into rows
  useEffect(() => {
    if (genes.length > 0) {
      // Divide the genes into a maximum of 3 rows
      const numRows = 1;
      const itemsPerRow = Math.ceil(genes.length / numRows); // Calculate items per row
      const dividedRows = [];
      for (let i = 0; i < genes.length; i += itemsPerRow) {
        dividedRows.push(genes.slice(i, i + itemsPerRow));
      }
      setRows(dividedRows);
    }
  }, [genes]);

  const handleRemoveGene = (geneToRemove) => {
    setGenes((prevGenes) => prevGenes.filter((gene) => gene !== geneToRemove));
  };

  return (
    <StrictMode>
      <Box width="100%" p={4}>
        {rows.length === 0 ? (
          <Flex justify="center">No genes found</Flex>
        ) : (
          <Heading fontSize="lg" fontWeight="bold" color="green" mb={4}>
            Genes found: {genes.length}
          </Heading>
        )}
        {rows.map((row, rowIndex) => (
          <Wrap key={rowIndex} spacing={4} mb={4} justify="center">
            {row.map((gene, geneIndex) =>
              geneIndex >= 10 ? null : (
                <WrapItem key={geneIndex}>
                  <Tag
                    size="lg"
                    borderRadius="full"
                    variant="solid"
                    colorScheme="green"
                  >
                    <TagLabel>{gene}</TagLabel>
                    <TagCloseButton onClick={() => handleRemoveGene(gene)} />
                  </Tag>
                </WrapItem>
              )
            )}
          </Wrap>
        ))}
      </Box>
    </StrictMode>
  );
};

export default PathwayInformation;
