import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  Input,
  FormControl,
  FormLabel,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Center,
  Spinner,
  Grid,
  GridItem,
  Badge,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  HStack,
  Tag,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  UnorderedList,
  ListItem,
  Code,
} from "@chakra-ui/react";
import {
  FaUpload,
  FaDownload,
  FaShare,
  FaCheck,
  FaFileAlt,
  FaQuestion,
} from "react-icons/fa";
import { usePremium } from "../components/context/PremiumContext";
import { GaussianMap } from "../GaussianPlots/GaussianMap";
import { Point, Dataset } from "../GaussianPlots/types";
import Papa from "papaparse";

// Types for file data
interface LayoutData {
  Gene: string;
  X: number;
  Y: number;
}

interface ExpressionData {
  Gene: string;
  [key: string]: number | string; // The rest are expression values for different conditions
}

const CustomGeneTerrain: React.FC = () => {
  const { isPremiumUser } = usePremium();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isHelpOpen,
    onOpen: onHelpOpen,
    onClose: onHelpClose,
  } = useDisclosure();

  // File upload states
  const [layoutFile, setLayoutFile] = useState<File | null>(null);
  const [expressionFile, setExpressionFile] = useState<File | null>(null);
  const [layoutData, setLayoutData] = useState<LayoutData[]>([]);
  const [expressionData, setExpressionData] = useState<ExpressionData[]>([]);
  const [availableConditions, setAvailableConditions] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("");

  // Visualization data
  const [points, setPoints] = useState<Point[]>([]);
  const [isDataReady, setIsDataReady] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Settings
  const [colorScheme, setColorScheme] = useState("spectral");
  const [pointSize, setPointSize] = useState(2);
  const [gaussianSigma, setGaussianSigma] = useState(0.5);

  // Validate layout file structure
  const validateLayoutFile = (
    data: any[]
  ): { valid: boolean; message: string } => {
    if (!data || data.length === 0) {
      return { valid: false, message: "File is empty or invalid" };
    }

    // Find first non-empty row
    let firstRow = null;
    for (const row of data) {
      if (row && typeof row === "object" && Object.keys(row).length > 0) {
        firstRow = row;
        break;
      }
    }

    if (!firstRow) {
      return { valid: false, message: "No valid data rows found in file" };
    }

    // Check if required columns exist (case-insensitive)
    const columns = Object.keys(firstRow).map((key) => key.toLowerCase());

    const hasGene = columns.some(
      (col) =>
        col === "gene" ||
        col === "geneid" ||
        col === "gene_id" ||
        col === "symbol"
    );

    const hasX = columns.some(
      (col) =>
        col === "x" ||
        col === "xcoord" ||
        col === "x_coord" ||
        col === "xcoordinate"
    );

    const hasY = columns.some(
      (col) =>
        col === "y" ||
        col === "ycoord" ||
        col === "y_coord" ||
        col === "ycoordinate"
    );

    if (!hasGene) {
      return {
        valid: false,
        message:
          "Missing gene identifier column. Layout file must have a column for gene names/IDs.",
      };
    }

    if (!hasX || !hasY) {
      return {
        valid: false,
        message:
          "Missing coordinate columns. Layout file must have X and Y columns for gene positions.",
      };
    }

    return { valid: true, message: "Valid layout file" };
  };

  // Validate expression file structure
  const validateExpressionFile = (
    data: any[]
  ): { valid: boolean; message: string } => {
    if (!data || data.length === 0) {
      return { valid: false, message: "File is empty or invalid" };
    }

    // Find first non-empty row
    let firstRow = null;
    for (const row of data) {
      if (row && typeof row === "object" && Object.keys(row).length > 0) {
        firstRow = row;
        break;
      }
    }

    if (!firstRow) {
      return { valid: false, message: "No valid data rows found in file" };
    }

    // Check for gene column (case-insensitive)
    const columns = Object.keys(firstRow).map((key) => key.toLowerCase());

    const hasGene = columns.some(
      (col) =>
        col === "gene" ||
        col === "geneid" ||
        col === "gene_id" ||
        col === "symbol"
    );

    if (!hasGene) {
      return {
        valid: false,
        message:
          "Missing gene identifier column. Expression file must have a column for gene names/IDs.",
      };
    }

    // Check if there are additional columns besides the gene column
    if (columns.length < 2) {
      return {
        valid: false,
        message:
          "Expression file must have at least one expression value column besides the gene identifier",
      };
    }

    return { valid: true, message: "Valid expression file" };
  };

  // Parse the layout file
  const handleLayoutFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file extension first
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (fileExt !== "csv" && fileExt !== "tsv" && fileExt !== "txt") {
        toast({
          title: "Invalid file format",
          description: "Please upload a CSV, TSV, or TXT file",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setLayoutFile(file);
      setIsLoading(true);

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        delimiter: ",", // Explicitly set comma as delimiter
        skipEmptyLines: true, // Skip empty lines
        complete: (results) => {
          setIsLoading(false);

          // Add debug information
          console.log("Layout file parse results:", results);

          if (results.errors && results.errors.length > 0) {
            console.error("Parse errors:", results.errors);
            toast({
              title: "Error parsing layout file",
              description: results.errors[0].message,
              status: "error",
              duration: 5000,
              isClosable: true,
            });
            setLayoutFile(null);
            return;
          }

          if (results.data && Array.isArray(results.data)) {
            // Validate file structure
            const validation = validateLayoutFile(results.data);

            if (!validation.valid) {
              toast({
                title: "Invalid layout file format",
                description: validation.message,
                status: "error",
                duration: 5000,
                isClosable: true,
              });
              setLayoutFile(null);
              return;
            }

            // Find column names (case-insensitive)
            const firstRow = results.data.find(
              (row) =>
                row && typeof row === "object" && Object.keys(row).length > 0
            );
            if (!firstRow) {
              toast({
                title: "No valid data found",
                description: "The file doesn't contain any valid data rows",
                status: "error",
                duration: 5000,
                isClosable: true,
              });
              setLayoutFile(null);
              return;
            }

            // Find column names for Gene, X, and Y (case-insensitive)
            const columns = Object.keys(firstRow);
            const geneColumn =
              columns.find(
                (col) =>
                  col.toLowerCase() === "gene" ||
                  col.toLowerCase() === "geneid" ||
                  col.toLowerCase() === "gene_id" ||
                  col.toLowerCase() === "symbol"
              ) || "Gene";

            const xColumn =
              columns.find(
                (col) =>
                  col.toLowerCase() === "x" ||
                  col.toLowerCase() === "xcoord" ||
                  col.toLowerCase() === "x_coord" ||
                  col.toLowerCase() === "xcoordinate"
              ) || "X";

            const yColumn =
              columns.find(
                (col) =>
                  col.toLowerCase() === "y" ||
                  col.toLowerCase() === "ycoord" ||
                  col.toLowerCase() === "y_coord" ||
                  col.toLowerCase() === "ycoordinate"
              ) || "Y";

            // Filter out any empty rows and normalize data
            const validData = results.data
              .filter(
                (row) =>
                  row &&
                  typeof row === "object" &&
                  geneColumn in row &&
                  xColumn in row &&
                  yColumn in row &&
                  !isNaN(Number((row as Record<string, any>)[xColumn])) &&
                  !isNaN(Number((row as Record<string, any>)[yColumn]))
              )
              .map((row) => ({
                Gene: (row as Record<string, any>)[geneColumn],
                X: Number((row as Record<string, any>)[xColumn]),
                Y: Number((row as Record<string, any>)[yColumn]),
              })) as LayoutData[];

            if (validData.length === 0) {
              toast({
                title: "No valid data found",
                description:
                  "The file doesn't contain any valid rows with gene identifiers and numeric X,Y coordinates",
                status: "error",
                duration: 5000,
                isClosable: true,
              });
              setLayoutFile(null);
              return;
            }

            setLayoutData(validData);

            toast({
              title: "Layout file uploaded",
              description: `Successfully parsed ${validData.length} genes with coordinates.`,
              status: "success",
              duration: 3000,
              isClosable: true,
            });

            checkIfDataReady(validData, expressionData);
          }
        },
        error: (error) => {
          setIsLoading(false);
          toast({
            title: "Error parsing layout file",
            description: error.message,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          setLayoutFile(null);
        },
      });
    }
  };

  // Preprocess CSV files with potential formatting issues
  const preprocessCSV = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target || !event.target.result) {
          reject(new Error("Failed to read file"));
          return;
        }

        const content = event.target.result as string;

        // Remove BOM if present (sometimes added by Excel)
        const cleanContent = content.replace(/^\uFEFF/, "");

        // Check if there are any issues with line endings or delimiters
        // Split by newlines to check each row
        const lines = cleanContent
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0);

        if (lines.length <= 1) {
          reject(new Error("File appears to be empty or has only one line"));
          return;
        }

        // Check if commas are present as expected
        const firstLineCommas = (lines[0].match(/,/g) || []).length;
        const firstLineQuotes = (lines[0].match(/"/g) || []).length;

        // Handle quoted CSV (which might contain commas inside quotes)
        if (firstLineQuotes > 0 && firstLineQuotes % 2 === 0) {
          // This is likely a quoted CSV, let PapaParse handle it
          resolve(new File([cleanContent], file.name, { type: "text/csv" }));
          return;
        }

        // If first line doesn't have commas, we might need to guess the delimiter
        let delimiter = ",";
        if (firstLineCommas === 0) {
          // Check for tabs or semicolons
          const tabCount = (lines[0].match(/\t/g) || []).length;
          const semicolonCount = (lines[0].match(/;/g) || []).length;

          if (tabCount > 0) {
            delimiter = "\t";
            console.log("Detected tab delimiter");
          } else if (semicolonCount > 0) {
            delimiter = ";";
            console.log("Detected semicolon delimiter");
          }

          // Replace the detected delimiter with comma
          const processedContent = cleanContent.replace(
            new RegExp(delimiter, "g"),
            ","
          );

          // Create a new Blob and File
          const blob = new Blob([processedContent], { type: "text/csv" });
          const processedFile = new File([blob], file.name, {
            type: "text/csv",
          });

          resolve(processedFile);
        } else {
          // No preprocessing needed
          resolve(new File([cleanContent], file.name, { type: "text/csv" }));
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };

      reader.readAsText(file);
    });
  };

  // Inspect file contents to help debugging
  const inspectFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target || !event.target.result) {
          console.error("Failed to read file");
          resolve();
          return;
        }

        const content = event.target.result as string;

        // Look at first few lines of the file
        const lines = content.split(/\r?\n/).slice(0, 5);
        console.log("File first 5 lines:", lines);

        // Check for common delimiters
        const firstLine = lines[0];
        console.log(
          "Commas in first line:",
          (firstLine.match(/,/g) || []).length
        );
        console.log(
          "Tabs in first line:",
          (firstLine.match(/\t/g) || []).length
        );
        console.log(
          "Semicolons in first line:",
          (firstLine.match(/;/g) || []).length
        );

        resolve();
      };

      reader.onerror = () => {
        console.error("Error reading file");
        resolve();
      };

      reader.readAsText(file);
    });
  };

  // Manual CSV parsing for problematic files
  const parseCSVManually = (
    file: File
  ): Promise<{ data: any[]; errors: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target || !event.target.result) {
          reject(new Error("Failed to read file"));
          return;
        }

        const content = event.target.result as string;

        try {
          // Split by newlines
          const lines = content
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0);

          if (lines.length === 0) {
            reject(new Error("File is empty"));
            return;
          }

          // Try to determine delimiter - check first line for commas, tabs, semicolons
          let delimiter = ",";
          const firstLine = lines[0];
          const commaCount = (firstLine.match(/,/g) || []).length;
          const tabCount = (firstLine.match(/\t/g) || []).length;
          const semicolonCount = (firstLine.match(/;/g) || []).length;

          if (tabCount > commaCount && tabCount > semicolonCount) {
            delimiter = "\t";
          } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
            delimiter = ";";
          }

          console.log("Using delimiter:", delimiter);

          // Parse headers
          const headers = lines[0].split(delimiter).map((h) => h.trim());

          const data = [];
          const errors = [];

          // Parse rows
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = line.split(delimiter).map((v) => v.trim());

            // Make sure we have the right number of values
            if (values.length !== headers.length) {
              errors.push({
                message: `Line ${i + 1} has ${values.length} fields, expected ${
                  headers.length
                }`,
                row: i,
              });
              continue;
            }

            // Create object from headers and values
            const obj: Record<string, string> = {};
            headers.forEach((header, index) => {
              obj[header] = values[index];
            });

            data.push(obj);
          }

          resolve({ data, errors });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };

      reader.readAsText(file);
    });
  };

  // Helper to process expression data after parsing
  const processExpressionData = (results: { data: any[]; errors: any[] }) => {
    setIsLoading(false);

    console.log("Processing expression data:", results);

    if (results.errors && results.errors.length > 0) {
      console.error("Parse errors:", results.errors);
      toast({
        title: "Error parsing expression file",
        description: results.errors[0].message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setExpressionFile(null);
      return;
    }

    if (results.data && Array.isArray(results.data)) {
      // Validate file structure
      const validation = validateExpressionFile(results.data);

      if (!validation.valid) {
        toast({
          title: "Invalid expression file format",
          description: validation.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setExpressionFile(null);
        return;
      }

      // Find first non-empty row
      const firstRow = results.data.find(
        (row) => row && typeof row === "object" && Object.keys(row).length > 0
      );
      if (!firstRow) {
        toast({
          title: "No valid data found",
          description: "The file doesn't contain any valid data rows",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setExpressionFile(null);
        return;
      }

      // Find gene column name (case-insensitive)
      const columns = Object.keys(firstRow);
      const geneColumn =
        columns.find(
          (col) =>
            col.toLowerCase() === "gene" ||
            col.toLowerCase() === "geneid" ||
            col.toLowerCase() === "gene_id" ||
            col.toLowerCase() === "symbol"
        ) || "Gene";

      // Normalize data and filter out empty rows
      const validData = results.data
        .filter((row) => row && typeof row === "object" && geneColumn in row)
        .map((row) => {
          const typedRow = row as Record<string, any>;
          const newRow: ExpressionData = {
            Gene: typedRow[geneColumn] as string,
          };
          // Copy all other columns except gene column
          for (const col of columns) {
            if (col !== geneColumn) {
              newRow[col] = typedRow[col];
            }
          }
          return newRow;
        }) as ExpressionData[];

      if (validData.length === 0) {
        toast({
          title: "No valid data found",
          description:
            "The file doesn't contain any valid rows with gene identifiers and expression values",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setExpressionFile(null);
        return;
      }

      setExpressionData(validData);

      // Extract all column names except gene column as available conditions
      if (validData.length > 0) {
        const conditions = Object.keys(validData[0]).filter(
          (key) => key !== "Gene"
        );

        if (conditions.length === 0) {
          toast({
            title: "No expression conditions found",
            description:
              "The file contains a gene column but no expression value columns",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          setExpressionFile(null);
          return;
        }

        setAvailableConditions(conditions);

        // Set default selected condition
        if (conditions.length > 0) {
          setSelectedCondition(conditions[0]);
        }
      }

      toast({
        title: "Expression file uploaded",
        description: `Successfully parsed ${
          validData.length
        } genes with expression data across ${
          Object.keys(validData[0]).length - 1
        } conditions.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      checkIfDataReady(layoutData, validData);
    }
  };

  // Helper for error handling
  const handleParseError = (error: any) => {
    setIsLoading(false);
    console.error("Parse error:", error);
    toast({
      title: "Error parsing expression file",
      description: error.message || "Unknown parsing error",
      status: "error",
      duration: 5000,
      isClosable: true,
    });
    setExpressionFile(null);
  };

  // Update the expression file handler to use the manual parser as a fallback
  const handleExpressionFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // First, inspect the file
      await inspectFile(file);

      // Validate file extension first
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (fileExt !== "csv" && fileExt !== "tsv" && fileExt !== "txt") {
        toast({
          title: "Invalid file format",
          description: "Please upload a CSV, TSV, or TXT file",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setExpressionFile(file);
      setIsLoading(true);

      try {
        // Preprocess the file to ensure correct format
        const processedFile = await preprocessCSV(file);

        // Try PapaParse first
        Papa.parse(processedFile, {
          header: true,
          dynamicTyping: true,
          delimiter: ",", // Explicitly set comma as delimiter
          skipEmptyLines: true,
          complete: async (results) => {
            if (
              results.errors &&
              results.errors.length > 0 &&
              results.errors[0].message.includes("Too few fields")
            ) {
              console.log("Falling back to manual CSV parsing");

              try {
                // If PapaParse fails with "Too few fields", try manual parsing
                const manualResults = await parseCSVManually(file);
                processExpressionData(manualResults);
              } catch (err) {
                handleParseError(err);
              }
            } else {
              // Process normal results
              processExpressionData(results);
            }
          },
          error: (error) => handleParseError(error),
        });
      } catch (error) {
        handleParseError(error);
      }
    }
  };

  // Check if both files are uploaded and generate points
  const checkIfDataReady = (
    layouts: LayoutData[],
    expressions: ExpressionData[]
  ) => {
    if (layouts.length > 0 && expressions.length > 0) {
      setIsDataReady(true);
    }
  };

  // Debug console for data ready state
  useEffect(() => {
    console.log("Data ready state changed:", isDataReady);
    console.log("Layout data count:", layoutData.length);
    console.log("Expression data count:", expressionData.length);
    console.log("Selected condition:", selectedCondition);
    console.log("Available conditions:", availableConditions);
  }, [
    isDataReady,
    layoutData,
    expressionData,
    selectedCondition,
    availableConditions,
  ]);

  // Generate points when condition changes or Generate button is clicked
  const generatePoints = useCallback(() => {
    if (!isDataReady || !selectedCondition) {
      toast({
        title: "Missing data",
        description: "Please upload both layout and expression files first.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create a map for fast lookup of expression values
      const expressionMap = new Map<string, ExpressionData>();
      expressionData.forEach((row) => {
        expressionMap.set(row.Gene as string, row);
      });

      // Generate points by combining layout and expression data
      const generatedPoints: Point[] = layoutData
        .filter((layout) => expressionMap.has(layout.Gene as string))
        .map((layout) => {
          const expressionRow = expressionMap.get(layout.Gene as string)!;
          const value = Number(expressionRow[selectedCondition]) || 0;

          return {
            x: layout.X,
            y: layout.Y,
            geneId: layout.Gene as string,
            geneName: layout.Gene as string,
            pathways: [], // Empty pathways as we don't have this data
            description: `Expression in ${selectedCondition}: ${value.toFixed(
              2
            )}`,
            value: value,
          };
        });

      // Check if we have matching genes
      if (generatedPoints.length === 0) {
        setIsLoading(false);
        toast({
          title: "No matching genes found",
          description:
            "There are no genes that match between your layout and expression files.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Warn if we lost many genes during matching
      if (generatedPoints.length < layoutData.length * 0.5) {
        toast({
          title: "Gene matching warning",
          description: `Only ${generatedPoints.length} out of ${layoutData.length} genes from your layout file were found in the expression file.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
      }

      setPoints(generatedPoints);

      setTimeout(() => {
        setIsLoading(false);
        setActiveTabIndex(1); // Switch to Visualize tab
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error generating visualization",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [
    layoutData,
    expressionData,
    selectedCondition,
    isDataReady,
    toast,
    setActiveTabIndex,
  ]);

  // If not a premium user, show upgrade prompt
  if (!isPremiumUser) {
    return (
      <Container maxW="container.xl" py={10}>
        <Alert
          status="warning"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="400px"
          borderRadius="md"
        >
          <AlertIcon boxSize="50px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="xl">
            Premium Feature
          </AlertTitle>
          <AlertDescription maxWidth="md">
            <Text mb={4}>
              Custom GeneTerrain is a premium feature that allows you to create
              your own personalized gene terrain visualizations with your data.
            </Text>
            <Button
              colorScheme="yellow"
              onClick={() => {
                /* Navigate to pricing */
              }}
            >
              Upgrade to Premium
            </Button>
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Flex justify="flex-end" mt={2} mb={-2}>
        <Button
          variant="ghost"
          size="xs"
          colorScheme="gray"
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? "Hide Debug" : "Debug"}
        </Button>
      </Flex>
      <Flex justify="space-between" align="center" mb={8}>
        <Box>
          <Heading mb={2} size="lg">
            Custom GeneTerrain
          </Heading>
          <Text color="gray.500">
            Create and visualize your own gene terrain with custom data
          </Text>
        </Box>
        <Button
          leftIcon={<FaQuestion />}
          colorScheme="teal"
          variant="outline"
          onClick={onHelpOpen}
          size="sm"
        >
          File Format Help
        </Button>
      </Flex>
      <Tabs
        colorScheme="teal"
        isLazy
        index={activeTabIndex}
        onChange={setActiveTabIndex}
      >
        <TabList>
          <Tab>Upload Data</Tab>
          <Tab isDisabled={!isDataReady}>Visualize</Tab>
        </TabList>

        <TabPanels>
          {/* Upload Data Panel */}
          <TabPanel>
            <Grid
              templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
              gap={6}
            >
              {/* Layout File Upload */}
              <GridItem>
                <Box
                  border="2px dashed"
                  borderColor={layoutFile ? "teal.400" : "gray.300"}
                  borderRadius="md"
                  p={6}
                  textAlign="center"
                  bg={layoutFile ? "teal.50" : "gray.50"}
                  _hover={{ borderColor: "teal.300" }}
                  position="relative"
                >
                  <Input
                    id="layout-file-input"
                    type="file"
                    display="none"
                    accept=".csv,.tsv,.txt"
                    onChange={handleLayoutFileUpload}
                  />
                  <VStack spacing={3}>
                    {layoutFile ? (
                      <Box as={FaCheck} size="40px" color="teal.500" />
                    ) : (
                      <Box as={FaUpload} size="40px" color="teal.500" />
                    )}
                    <Heading size="md">
                      {layoutFile
                        ? "Layout File Uploaded"
                        : "Upload Layout File"}
                    </Heading>
                    <Text color="gray.500">
                      {layoutFile ? (
                        `${layoutFile.name} (${layoutData.length} genes)`
                      ) : (
                        <VStack spacing={1}>
                          <Text>CSV with Gene, X, Y columns</Text>
                          <Text fontSize="xs">Example format:</Text>
                          <Box
                            bg="gray.700"
                            color="green.300"
                            p={1}
                            borderRadius="md"
                            fontSize="xs"
                            fontFamily="mono"
                            maxW="180px"
                            overflowX="auto"
                            whiteSpace="pre"
                          >
                            {`Gene,X,Y
IGKC,842.4,779.5
IGHA1,948.0,586.5`}
                          </Box>
                        </VStack>
                      )}
                    </Text>
                    {layoutFile ? (
                      <Badge colorScheme="teal" p={2} borderRadius="md">
                        <Flex align="center" gap={2}>
                          <FaFileAlt />
                          <Text>File Ready</Text>
                        </Flex>
                      </Badge>
                    ) : (
                      <Button
                        colorScheme="teal"
                        as="label"
                        htmlFor="layout-file-input"
                        cursor="pointer"
                      >
                        Browse Files
                      </Button>
                    )}
                  </VStack>
                </Box>
              </GridItem>

              {/* Expression File Upload */}
              <GridItem>
                <Box
                  border="2px dashed"
                  borderColor={expressionFile ? "teal.400" : "gray.300"}
                  borderRadius="md"
                  p={6}
                  textAlign="center"
                  bg={expressionFile ? "teal.50" : "gray.50"}
                  _hover={{ borderColor: "teal.300" }}
                  position="relative"
                >
                  <Input
                    id="expression-file-input"
                    type="file"
                    display="none"
                    accept=".csv,.tsv,.txt"
                    onChange={handleExpressionFileUpload}
                  />
                  <VStack spacing={3}>
                    {expressionFile ? (
                      <Box as={FaCheck} size="40px" color="teal.500" />
                    ) : (
                      <Box as={FaUpload} size="40px" color="teal.500" />
                    )}
                    <Heading size="md">
                      {expressionFile
                        ? "Expression File Uploaded"
                        : "Upload Expression File"}
                    </Heading>
                    <Text color="gray.500">
                      {expressionFile ? (
                        `${expressionFile.name} (${expressionData.length} genes)`
                      ) : (
                        <VStack spacing={1}>
                          <Text>CSV with Gene and expression values</Text>
                          <Text fontSize="xs">Example format:</Text>
                          <Box
                            bg="gray.700"
                            color="green.300"
                            p={1}
                            borderRadius="md"
                            fontSize="xs"
                            fontFamily="mono"
                            maxW="200px"
                            overflowX="auto"
                            whiteSpace="pre"
                          >
                            {`Gene,ATL,DCT,PT
IGKC,0.5,1.2,-0.3
IGHA1,1.4,-0.2,0.8`}
                          </Box>
                        </VStack>
                      )}
                    </Text>
                    {expressionFile ? (
                      <Badge colorScheme="teal" p={2} borderRadius="md">
                        <Flex align="center" gap={2}>
                          <FaFileAlt />
                          <Text>File Ready</Text>
                        </Flex>
                      </Badge>
                    ) : (
                      <Button
                        colorScheme="teal"
                        as="label"
                        htmlFor="expression-file-input"
                        cursor="pointer"
                      >
                        Browse Files
                      </Button>
                    )}
                  </VStack>
                </Box>
              </GridItem>
            </Grid>

            {/* Visualization Settings (when both files are uploaded) */}
            {isDataReady && (
              <Box
                mt={10}
                p={6}
                borderRadius="md"
                bg="gray.100"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <Heading size="md" mb={4} color="gray.800">
                  Visualization Settings
                </Heading>

                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                  gap={6}
                >
                  <GridItem>
                    <FormControl mb={4}>
                      <FormLabel fontWeight="medium" color="gray.700">
                        Select Condition
                      </FormLabel>
                      <Select
                        value={selectedCondition}
                        onChange={(e) => setSelectedCondition(e.target.value)}
                        bg="white"
                        borderColor="gray.300"
                      >
                        {availableConditions.map((condition) => (
                          <option key={condition} value={condition}>
                            {condition}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </GridItem>

                  <GridItem>
                    <FormControl mb={4}>
                      <FormLabel fontWeight="medium" color="gray.700">
                        Color Scheme
                      </FormLabel>
                      <Select
                        value={colorScheme}
                        onChange={(e) => setColorScheme(e.target.value)}
                        bg="white"
                        borderColor="gray.300"
                      >
                        <option value="spectral">Spectral</option>
                        <option value="viridis">Viridis</option>
                        <option value="plasma">Plasma</option>
                        <option value="inferno">Inferno</option>
                      </Select>
                    </FormControl>
                  </GridItem>

                  <GridItem>
                    <FormControl mb={4}>
                      <FormLabel fontWeight="medium" color="gray.700">
                        Gaussian Sigma:{" "}
                        <Text as="span" fontWeight="bold">
                          {gaussianSigma}
                        </Text>
                      </FormLabel>
                      <Slider
                        value={gaussianSigma}
                        onChange={(val) => setGaussianSigma(val)}
                        min={0.1}
                        max={2}
                        step={0.1}
                        colorScheme="teal"
                      >
                        <SliderTrack bg="gray.200">
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb boxSize={6} />
                      </Slider>
                    </FormControl>
                  </GridItem>

                  <GridItem>
                    <FormControl mb={4}>
                      <FormLabel fontWeight="medium" color="gray.700">
                        Point Size:{" "}
                        <Text as="span" fontWeight="bold">
                          {pointSize}
                        </Text>
                      </FormLabel>
                      <Slider
                        value={pointSize}
                        onChange={(val) => setPointSize(val)}
                        min={1}
                        max={5}
                        step={0.5}
                        colorScheme="teal"
                      >
                        <SliderTrack bg="gray.200">
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb boxSize={6} />
                      </Slider>
                    </FormControl>
                  </GridItem>
                </Grid>

                <Flex justify="center" mt={6}>
                  <Button
                    colorScheme="teal"
                    size="lg"
                    onClick={generatePoints}
                    isLoading={isLoading}
                    loadingText="Generating Visualization"
                    boxShadow="md"
                  >
                    Generate Visualization
                  </Button>
                </Flex>
              </Box>
            )}

            {/* Sample Datasets Section */}
            <Box mt={10}>
              <Heading size="md" mb={4}>
                Sample Datasets
              </Heading>
              <Text mb={4}>
                Not sure what to upload? Try one of our sample datasets:
              </Text>
              <Flex gap={4} flexWrap="wrap">
                <Button variant="outline" colorScheme="teal">
                  Kidney Cell Atlas
                </Button>
                <Button variant="outline" colorScheme="teal">
                  COVID-19 Transcriptome
                </Button>
                <Button variant="outline" colorScheme="teal">
                  Cancer Cell Lines
                </Button>
              </Flex>
            </Box>
          </TabPanel>

          {/* Visualize Panel */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <HStack spacing={4}>
                <Tag size="lg" colorScheme="teal" variant="outline">
                  {selectedCondition || "No condition selected"}
                </Tag>
                <Tag size="lg" colorScheme="blue" variant="outline">
                  {points.length} genes
                </Tag>
                <Button
                  size="sm"
                  colorScheme="teal"
                  variant="ghost"
                  onClick={onOpen}
                >
                  Change settings
                </Button>
              </HStack>

              <Box
                height="700px"
                bg="white"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                position="relative"
                overflow="hidden"
              >
                {isLoading ? (
                  <Center height="100%">
                    <VStack>
                      <Spinner size="xl" color="teal.500" />
                      <Text>Generating visualization...</Text>
                    </VStack>
                  </Center>
                ) : points.length > 0 ? (
                  <GaussianMap
                    points={points}
                    datasetId="custom"
                    sampleId={selectedCondition}
                    datasets={[
                      {
                        id: "custom",
                        name: "Custom Dataset",
                        description: "User uploaded data",
                        samples: [
                          {
                            id: selectedCondition,
                            name: selectedCondition,
                            description: `Expression values for ${selectedCondition}`,
                            condition: "",
                            date: "",
                            points: points, // Make sure points are passed here too
                          },
                        ],
                      },
                    ]}
                  />
                ) : (
                  <Center height="100%">
                    <Text color="gray.500">
                      No data to visualize. Please generate visualization first.
                    </Text>
                  </Center>
                )}
              </Box>

              <Flex justify="space-between">
                <Button
                  leftIcon={<FaDownload />}
                  colorScheme="teal"
                  variant="outline"
                  isDisabled={points.length === 0}
                >
                  Download
                </Button>
                <Button
                  leftIcon={<FaShare />}
                  colorScheme="teal"
                  isDisabled={points.length === 0}
                >
                  Share
                </Button>
              </Flex>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      {/* Settings Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Visualization Settings</DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel>Select Condition</FormLabel>
                <Select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                >
                  {availableConditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Color Scheme</FormLabel>
                <Select
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value)}
                >
                  <option value="spectral">Spectral</option>
                  <option value="viridis">Viridis</option>
                  <option value="plasma">Plasma</option>
                  <option value="inferno">Inferno</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Gaussian Sigma: {gaussianSigma}</FormLabel>
                <Slider
                  value={gaussianSigma}
                  onChange={(val) => setGaussianSigma(val)}
                  min={0.1}
                  max={2}
                  step={0.1}
                  colorScheme="teal"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <FormLabel>Point Size: {pointSize}</FormLabel>
                <Slider
                  value={pointSize}
                  onChange={(val) => setPointSize(val)}
                  min={1}
                  max={5}
                  step={0.5}
                  colorScheme="teal"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>
            </VStack>
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="teal"
              onClick={() => {
                generatePoints();
                onClose();
              }}
            >
              Apply & Regenerate
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>{" "}
      {/* Help Modal */}
      <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="white">
          <ModalHeader bg="geneTerrain.headerBg" color="white">
            File Format Guidelines
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody px={0} pt={0} pb={4}>
            <Tabs colorScheme="teal" variant="line" width="100%">
              <TabList
                borderBottom="1px solid"
                borderColor="geneTerrain.border"
                mb={4}
                width="100%"
                display="flex"
              >
                <Tab
                  borderRadius="0"
                  borderTop="none"
                  borderLeft="none"
                  borderRight="none"
                  borderBottom="2px solid transparent"
                  _selected={{
                    color: "geneTerrain.primary",
                    borderBottom: "2px solid",
                    borderBottomColor: "geneTerrain.primary",
                    fontWeight: "600",
                  }}
                  color="geneTerrain.textPrimary"
                  flex="1"
                  py={3}
                  textAlign="center"
                >
                  Layout File
                </Tab>
                <Tab
                  borderRadius="0"
                  borderTop="none"
                  borderLeft="none"
                  borderRight="none"
                  borderBottom="2px solid transparent"
                  _selected={{
                    color: "geneTerrain.primary",
                    borderBottom: "2px solid",
                    borderBottomColor: "geneTerrain.primary",
                    fontWeight: "600",
                  }}
                  color="geneTerrain.textPrimary"
                  flex="1"
                  py={3}
                  textAlign="center"
                >
                  Expression File
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={6}>
                  <VStack align="start" spacing={4}>
                    <Text fontWeight="bold" color="geneTerrain.textPrimary">
                      Layout File Requirements:
                    </Text>
                    <UnorderedList
                      spacing={2}
                      color="geneTerrain.textSecondary"
                    >
                      <ListItem>CSV, TSV or TXT format with headers</ListItem>
                      <ListItem>
                        Must contain columns for Gene, X, and Y
                      </ListItem>
                      <ListItem>X and Y must be numeric coordinates</ListItem>
                      <ListItem>
                        Gene IDs should match those in the expression file
                      </ListItem>
                    </UnorderedList>

                    <Text
                      fontWeight="bold"
                      mt={2}
                      color="geneTerrain.textPrimary"
                    >
                      Example Layout File:
                    </Text>
                    <Box
                      bg="gray.50"
                      p={3}
                      borderRadius="md"
                      fontFamily="mono"
                      fontSize="sm"
                      width="100%"
                      overflowX="auto"
                      whiteSpace="pre"
                      borderWidth="1px"
                      borderColor="geneTerrain.border"
                      color="geneTerrain.textPrimary"
                    >
                      {`Gene,X,Y
IGKC,842.4008541,779.5752251
IGHA1,948.0169146,586.5196132
IGHG1,991.4563523,538.7067884
JCHAIN,962.9523498,502.0087415`}
                    </Box>
                  </VStack>
                </TabPanel>
                <TabPanel px={6}>
                  <VStack align="start" spacing={4}>
                    <Text fontWeight="bold" color="geneTerrain.textPrimary">
                      Expression File Requirements:
                    </Text>
                    <UnorderedList
                      spacing={2}
                      color="geneTerrain.textSecondary"
                    >
                      <ListItem>CSV, TSV or TXT format with headers</ListItem>
                      <ListItem>Must contain a Gene column</ListItem>
                      <ListItem>
                        Additional columns represent different conditions or
                        cell types
                      </ListItem>
                      <ListItem>
                        Values should be numeric (expression levels)
                      </ListItem>
                      <ListItem>
                        Gene IDs should match those in the layout file
                      </ListItem>
                    </UnorderedList>

                    <Text
                      fontWeight="bold"
                      mt={2}
                      color="geneTerrain.textPrimary"
                    >
                      Example Expression File:
                    </Text>
                    <Box
                      bg="gray.50"
                      p={3}
                      borderRadius="md"
                      fontFamily="mono"
                      fontSize="sm"
                      width="100%"
                      overflowX="auto"
                      whiteSpace="pre"
                      borderWidth="1px"
                      borderColor="geneTerrain.border"
                      color="geneTerrain.textPrimary"
                    >
                      {`Gene,B_Cell,T_Cell,Macrophage
IGKC,2.41,-0.08,0.52
IGHA1,1.93,0.14,-0.63
IGHG1,1.47,-0.22,0.11
JCHAIN,1.81,0.02,-0.79`}
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button
              bg="geneTerrain.primary"
              color="white"
              _hover={{ bg: "geneTerrain.accent1" }}
              onClick={onHelpClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {showDebug && (
        <Box mt={8} p={4} bg="gray.100" borderRadius="md" fontSize="xs">
          <Heading size="sm" mb={2}>
            Debug Information
          </Heading>
          <Tabs size="sm">
            <TabList>
              <Tab>Layout File</Tab>
              <Tab>Expression File</Tab>
              <Tab>Generated Points</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Text fontWeight="bold">
                  Layout File Name: {layoutFile?.name || "None"}
                </Text>
                <Text>Layout Data Count: {layoutData.length}</Text>
                <Box mt={2} maxH="200px" overflowY="auto">
                  <pre>{JSON.stringify(layoutData.slice(0, 5), null, 2)}</pre>
                </Box>
              </TabPanel>
              <TabPanel>
                <Text fontWeight="bold">
                  Expression File Name: {expressionFile?.name || "None"}
                </Text>
                <Text>Expression Data Count: {expressionData.length}</Text>
                <Text>
                  Available Conditions: {availableConditions.join(", ")}
                </Text>
                <Box mt={2} maxH="200px" overflowY="auto">
                  <pre>
                    {JSON.stringify(expressionData.slice(0, 5), null, 2)}
                  </pre>
                </Box>
              </TabPanel>
              <TabPanel>
                <Text>Points Count: {points.length}</Text>
                <Box mt={2} maxH="200px" overflowY="auto">
                  <pre>{JSON.stringify(points.slice(0, 5), null, 2)}</pre>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      )}
    </Container>
  );
};

export default CustomGeneTerrain;
