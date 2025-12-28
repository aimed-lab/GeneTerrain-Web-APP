import * as React from "react";
import {
  Box, HStack, Button, Input, InputGroup, InputRightElement,
  IconButton, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Text,
  useColorModeValue, Checkbox
} from "@chakra-ui/react";
import {
  CloseIcon, DownloadIcon, ArrowUpDownIcon,
  TriangleUpIcon, TriangleDownIcon,
} from "@chakra-ui/icons";

type GeneRow = { geneName: string; value: number; x: number; y: number };
type SortKey = keyof GeneRow;
type SortDir = "asc" | "desc";

type Props = {
  data: GeneRow[];
  datasetId?: string;
  onSelectionChange?: (rows: GeneRow[]) => void;
  onEnrichment?: (rows: GeneRow[]) => void;   // NEW
};

export default function GeneTableChakra({
  data,
  onSelectionChange,
  onEnrichment,
  datasetId
}: Props) {
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("value");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  // selected rows tracking
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const cardBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("green.700", "green.600");
  const zebraBg = useColorModeValue("gray.100", "gray.700");
  const hoverBg = useColorModeValue("gray.200", "gray.600");
  const selectedBg = useColorModeValue("green.50", "green.900");

  const valueDecimals = 4;
  const coordDecimals = 2;
  const ENRICHMENT_STORAGE_KEY = "ENRICHMENT_SELECTED_GENES";

  const sourceData = React.useMemo(
    () => (Array.isArray(data) ? data : []),
    [data]
  );

    const openFullAnalysis = React.useCallback((genesInRegion: GeneRow[]) => {
      // console.log("Opening full analysis for selected genes:", list);
      const geneList = Array.from(
        new Set(genesInRegion.map(g => g.geneName).filter(Boolean))
      ) as string[];
  
      try {
        localStorage.setItem(
          ENRICHMENT_STORAGE_KEY,
          JSON.stringify({ genes: geneList, datasetId: datasetId, at: Date.now() })
        );
      } catch {
        // ignore storage write failures
      }
  
      window.open("/enrichment-analysis", "_blank", "noopener,noreferrer");
    }, []);

  // Search
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sourceData;
    return sourceData.filter((r) =>
      [r.geneName, r.value, r.x, r.y]
        .map((v) => String(v ?? "").toLowerCase())
        .some((s) => s.includes(q))
    );
  }, [query, sourceData]);

  // Sorting
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const A = a[sortKey] as any;
      const B = b[sortKey] as any;
      if (typeof A === "number" && typeof B === "number") {
        return sortDir === "asc" ? A - B : B - A;
      }
      return sortDir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  const SortIcon = ({
    active,
    dir,
  }: {
    active: boolean;
    dir: SortDir | null;
  }) =>
    !active ? (
      <ArrowUpDownIcon color="gray.300" boxSize={3.5} />
    ) : dir === "asc" ? (
      <TriangleUpIcon color="white" boxSize={3.5} />
    ) : (
      <TriangleDownIcon color="white" boxSize={3.5} />
    );

  const fmt = (n: any, d: number) =>
    Number.isFinite(Number(n)) ? Number(n).toFixed(d) : "";

  function csvCell(s: string) {
    return `"${String(s).replace(/"/g, '""')}"`;
  }

  function downloadCSV() {
    const header = ["Gene", "Value", "x", "y"].join(",");
    const lines = sorted.map(
      (r) => `${csvCell(r.geneName)},${r.value},${r.x},${r.y}`
    );
    const blob = new Blob([header, "\n", lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gene_expression_tabular_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ----------------------------
  // SELECTION LOGIC
  // ----------------------------

  const getId = (r: GeneRow) =>
    `${r.geneName}|${r.value}|${r.x}|${r.y}`;

  const selectedRows = React.useMemo(
    () => sorted.filter((r) => selectedIds.has(getId(r))),
    [sorted, selectedIds]
  );

  const toggleRow = (r: GeneRow) => {
    const id = getId(r);
    const updated = new Set(selectedIds);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    setSelectedIds(updated);

    onSelectionChange?.(sorted.filter((x) => updated.has(getId(x))));
  };

  const allFilteredIds = filtered.map(getId);
  const allFilteredSelected = allFilteredIds.every((id) =>
    selectedIds.has(id)
  );

  const toggleSelectAllFiltered = () => {
    const updated = new Set(selectedIds);
    if (allFilteredSelected) {
      allFilteredIds.forEach((id) => updated.delete(id));
    } else {
      allFilteredIds.forEach((id) => updated.add(id));
    }
    setSelectedIds(updated);
    onSelectionChange?.(sorted.filter((x) => updated.has(getId(x))));
  };

  
  // ----------------------------

  return (
    <Box borderWidth={0} borderRadius="2xl" p={4} bg={cardBg} boxShadow="sm">
      {/* Top bar */}
      <HStack justify="space-between" align="center" mb={3}>

        <HStack spacing={3} minW={{ base: "auto", md: "480px" }} w="full" justify="flex-end">

          {/* NEW: Enrichment Button */}
          {selectedRows.length >= 2 && (
            <Button
              size="sm"
              colorScheme="blue"
              // onClick={() => onEnrichment?.(selectedRows)}
              onClick={() => openFullAnalysis(selectedRows)}
            >
              View Analysis ({selectedRows.length})
            </Button>
          )}

          <InputGroup maxW={{ base: "60%", md: "360px" }}>
            <Input
              size="sm"
              placeholder="Search genes, values, x, y…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <InputRightElement h="full">
                <IconButton
                  aria-label="Clear"
                  size="sm"
                  variant="ghost"
                  icon={<CloseIcon boxSize={2} />}
                  onClick={() => setQuery("")}
                  _hover={{ bg: "transparent" }}
                  _active={{ bg: "transparent" }}
                  _focusVisible={{ boxShadow: "none" }}
                />
              </InputRightElement>
            )}
          </InputGroup>

          <Button
            size="sm"
            leftIcon={<DownloadIcon />}
            colorScheme="green"
            onClick={downloadCSV}
          >
            Export
          </Button>
        </HStack>
      </HStack>

      {/* Table */}
      <TableContainer maxH="280px" overflowY="auto">
        <Table variant="unstyled" size="sm" width="100%"
          sx={{
            borderCollapse: "separate",
            borderSpacing: 0,
            "th, td": {
              px: 3,
              py: 2.5,
              whiteSpace: "nowrap",
            },
            "thead th": {
              position: "sticky",
              top: 0,
              zIndex: 1,
              backgroundColor: `${headerBg} !important`,
              color: "white",
              fontWeight: 700,
            },
            "tbody tr:nth-of-type(odd) td": {
              backgroundColor: `${zebraBg} !important`,
            },
          }}
        >
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "34%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>

          <Thead>
            <Tr>
              <Th>
                <Checkbox
                  colorScheme="green"
                  isChecked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                />
              </Th>

              <Th cursor="pointer" onClick={() => toggleSort("geneName")}>
                <HStack>
                  <Text color="white" margin={0}>Gene</Text>
                  <SortIcon active={sortKey === "geneName"} dir={sortDir} />
                </HStack>
              </Th>

              <Th isNumeric cursor="pointer" onClick={() => toggleSort("value")}>
                <HStack>
                  <Text color="white" margin={0}>Value</Text>
                  <SortIcon active={sortKey === "value"} dir={sortDir} />
                </HStack>
              </Th>

              <Th isNumeric cursor="pointer" onClick={() => toggleSort("x")}>
                <HStack>
                  <Text color="white" margin={0}>x</Text>
                  <SortIcon active={sortKey === "x"} dir={sortDir} />
                </HStack>
              </Th>

              <Th isNumeric cursor="pointer" onClick={() => toggleSort("y")}>
                <HStack>
                  <Text color="white" margin={0}>y</Text>
                  <SortIcon active={sortKey === "y"} dir={sortDir} />
                </HStack>
              </Th>
            </Tr>
          </Thead>

          <Tbody>
            {sorted.map((r, i) => {
              const id = getId(r);
              const checked = selectedIds.has(id);

              return (
                <Tr
                  key={id}
                  bg={checked ? selectedBg : undefined}
                  _hover={{
                    bg: checked ? selectedBg : hoverBg,
                  }}
                >
                  <Td>
                    <Checkbox
                      colorScheme="green"
                      isChecked={checked}
                      onChange={() => toggleRow(r)}
                    />
                  </Td>

                  <Td>{r.geneName}</Td>
                  <Td isNumeric>{fmt(r.value, valueDecimals)}</Td>
                  <Td isNumeric>{fmt(r.x, coordDecimals)}</Td>
                  <Td isNumeric>{fmt(r.y, coordDecimals)}</Td>
                </Tr>
              );
            })}

            {sorted.length === 0 && (
              <Tr>
                <Td colSpan={5} textAlign="center" py={6} color="gray.500">
                  No rows found
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
