
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box,
    Flex,
    Grid,
    Heading,
    Text,
    VStack,
    HStack,
    Button,
    useColorModeValue,
    Divider,
    Checkbox,
    CheckboxGroup,
    Badge,
    Spinner,
    Card,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Portal,
    IconButton,
    Icon,
    Tooltip,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
} from '@chakra-ui/react';
import {
    Database,
    ChevronDown,
    Filter,
    Layout,
    BarChart,
    ArrowLeftRight,
    Download,
    Printer,
    ChevronLeft,
    ChevronRight,
    Zap,
} from 'lucide-react';
import AnalyticalCard from './AnalyticalCard';
import StatsPanel from './StatsPanel';
import {
    AnalyticsChartConfig,
    DataRow,
    ViewMode,
    GeminiModel,
    DatasetProfile,
    DashboardConfig
} from './types';
import { DEFAULT_CHARTS } from './defaults';
import { processClinicalGenomicData } from './utils';
import { generateStandaloneHtml } from './exportHelper';
import { useChat } from '../context/ChatContext';

interface AnalyticsDashboardProps {
    externalData1?: DataRow[];
    externalData2?: DataRow[];
    externalHeaders1?: string[];
    externalProfile?: DatasetProfile | null;
    externalIsLoading?: boolean;
    dataset1Label?: string;
    dataset2Label?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    externalData1,
    externalData2,
    externalHeaders1,
    externalProfile,
    externalIsLoading = false,
    dataset1Label = "Dataset 1",
    dataset2Label = "Dataset 2"
}) => {
    const [data1, setData1] = useState<DataRow[]>(externalData1 || []);
    const [data2, setData2] = useState<DataRow[]>(externalData2 || []);
    const [headers1, setHeaders1] = useState<string[]>(externalHeaders1 || []);
    const [charts, setCharts] = useState<AnalyticsChartConfig[]>(DEFAULT_CHARTS);
    const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(externalData1 ? externalIsLoading : true);
    const [viewMode, setViewMode] = useState<ViewMode>('analysis');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-3-flash-preview');
    const [profile, setProfile] = useState<DatasetProfile | null>(externalProfile || null);
    const [hiddenChartIds, setHiddenChartIds] = useState<string[]>([]);

    // --- Global Chat Sync ---
    const { updatePageContext, sendMessage, setIsOpen: setIsChatOpen } = useChat();

    // UI Colors
    const bgColor = useColorModeValue('white', 'gray.900');
    const borderColor = useColorModeValue('#E2E8F0', 'gray.700');
    const headerBg = useColorModeValue('#31755f', '#1E6B52');
    const sidebarBg = useColorModeValue('gray.50', 'gray.800');
    const accentColor = "#80BC00";

    const allHeaders = useMemo(() => {
        const headerSet = new Set<string>(headers1);
        data1.forEach((row) => Object.keys(row || {}).forEach((key) => headerSet.add(key)));
        data2.forEach((row) => Object.keys(row || {}).forEach((key) => headerSet.add(key)));
        return Array.from(headerSet);
    }, [headers1, data1, data2]);

    // 1. Memoized Helpers First
    const getUniqueValues = useCallback((key: string) => {
        const allData = [...data1, ...data2];
        const vals = allData
            .map((r) => String(r[key]))
            .filter((v) => v !== 'null' && v !== 'undefined' && v !== '_CLINICAL_ONLY_' && v !== '');
        return Array.from(new Set(vals)).sort();
    }, [data1, data2]);

    const filterableColumns = useMemo(() => {
        const tcgaCols = [
            { label: 'Tumor Stage', key: 'ajcc_pathologic_tumor_stage' },
            { label: 'Race', key: 'race' },
            { label: 'Gender', key: 'gender' },
            { label: 'Vital Status', key: 'vital_status' },
            { label: 'Tumor Status', key: 'tumor_status' },
        ];
        const lassoCols = [
            { label: 'Gender', key: 'gender' },
            { label: 'Subtype', key: 'subtype' },
            { label: 'Grade', key: 'grade' },
            { label: 'Condition', key: 'condition' },
        ];
        const allAvailableKeys = new Set(headers1);
        const activeCols = [...tcgaCols, ...lassoCols].filter(col => allAvailableKeys.has(col.key));
        const uniqueCols: { label: string, key: string }[] = [];
        const seenKeys = new Set();
        activeCols.forEach(c => {
            if (!seenKeys.has(c.key)) {
                uniqueCols.push(c);
                seenKeys.add(c.key);
            }
        });
        return uniqueCols.length > 0 ? uniqueCols : tcgaCols.slice(0, 3);
    }, [headers1]);

    const filterDataset = useCallback((dataset: DataRow[]) => {
        const colsWithSelection = Object.keys(activeFilters).filter(
            (col) => activeFilters[col].length > 0
        );
        if (colsWithSelection.length === 0) return dataset;
        return dataset.filter((row) => {
            return colsWithSelection.every((col) => {
                const selectedValues = activeFilters[col];
                const rowVal = String(row[col] ?? 'null');
                return selectedValues.includes(rowVal);
            });
        });
    }, [activeFilters]);

    const filteredData1 = useMemo(() => filterDataset(data1), [data1, filterDataset]);
    const filteredData2 = useMemo(() => filterDataset(data2), [data2, filterDataset]);
    const hasAnyData = filteredData1.length > 0 || filteredData2.length > 0;
    const visibleCharts = useMemo(
        () => charts.filter((c) => !hiddenChartIds.includes(c.id)),
        [charts, hiddenChartIds]
    );

    // 2. Lifecycle Effects
    useEffect(() => {
        const availableFilters = filterableColumns.reduce<Record<string, string[]>>((acc, col) => {
            acc[col.key] = getUniqueValues(col.key);
            return acc;
        }, {});

        updatePageContext({
            currentConfig: { dashboardTitle: dataset1Label + " vs " + dataset2Label, charts, summary: "" },
            headers: headers1,
            profile: profile || undefined,
            dataSample1: filteredData1,
            dataSample2: filteredData2,
            availableFilters,
            activeFilters,
            datasetId: dataset1Label,
        });
    }, [dataset1Label, dataset2Label, charts, headers1, profile, filteredData1, filteredData2, filterableColumns, getUniqueValues, activeFilters, updatePageContext]);

    useEffect(() => {
        // If we have external data with actual contents, sync it and NEVER fallback to mock JSON
        if (externalData1 && externalData1.length > 0) {
            setData1(externalData1);
            if (externalData2) setData2(externalData2);
            if (externalHeaders1) setHeaders1(externalHeaders1);
            if (externalProfile !== undefined) setProfile(externalProfile);
            setIsLoading(false);
            return;
        }

        // Only load mock data if we're not in a lasso context and externalData1 is completely missing (e.g. standalone mode)
        const loadAllData = async () => {
            try {
                const [res1, res2] = await Promise.all([fetch('/gene_exp_1.json'), fetch('/gene_exp_2.json')]);
                const [json1, json2] = await Promise.all([res1.json(), res2.json()]);
                const p1 = processClinicalGenomicData(json1);
                const p2 = processClinicalGenomicData(json2);
                setData1(p1.data);
                setHeaders1(p1.headers);
                setProfile(p1.profile);
                setData2(p2.data);
            } catch (err) {
                console.error("Failed load:", err);
            } finally {
                setIsLoading(false);
            }
        };
        
        // If externalData1 was explicitly passed as an empty array (meaning waiting for lasso), don't fetch mock.
        if (externalData1 !== undefined) {
             setIsLoading(false);
        } else {
             loadAllData();
        }
    }, [externalData1, externalData2, externalHeaders1, externalProfile]);

    useEffect(() => {
        if (allHeaders.length === 0) return;

        const categoricalFallback =
            ['gene_symbol', 'race', 'gender', 'vital_status', 'tumor_status', 'condition'].find((key) =>
                allHeaders.includes(key)
            ) || allHeaders[0];
        const numericFallback =
            ['value', 'count', 'age_at_initial_pathologic_diagnosis'].find((key) =>
                allHeaders.includes(key)
            ) || allHeaders[0];

        setCharts((prev) =>
            prev.map((chart) => {
                const xAxisOptions = chart.xAxisOptions && chart.xAxisOptions.length > 0
                    ? chart.xAxisOptions.filter((opt) => allHeaders.includes(opt))
                    : allHeaders;
                const yAxisOptionsBase = chart.yAxisOptions && chart.yAxisOptions.length > 0
                    ? chart.yAxisOptions.filter((opt) => opt === 'count' || allHeaders.includes(opt))
                    : ['count', ...allHeaders];
                const yAxisOptions = Array.from(new Set(yAxisOptionsBase));

                const nextXAxis = xAxisOptions.includes(chart.xAxis)
                    ? chart.xAxis
                    : categoricalFallback;
                const nextYAxis = yAxisOptions.includes(chart.yAxis)
                    ? chart.yAxis
                    : numericFallback;

                return {
                    ...chart,
                    xAxis: nextXAxis,
                    yAxis: nextYAxis,
                    xAxisOptions,
                    yAxisOptions,
                };
            })
        );
    }, [allHeaders]);

    // Handlers
    const handleSendMessage = async (content: string) => {
        const result = await sendMessage(content);
        if (result && result.updatedConfig && result.updatedConfig.charts) {
            const incomingCharts = result.updatedConfig.charts;
            setCharts(prev => {
                const next = [...prev];
                incomingCharts.forEach(incoming => {
                    const idx = next.findIndex(c => c.id === incoming.id);
                    if (idx > -1) next[idx] = { ...next[idx], ...incoming };
                    else next.push(incoming);
                });
                return next;
            });
        }
        if (result && result.filters) {
            if (Object.keys(result.filters).length === 0) {
                setActiveFilters({});
            } else {
                setActiveFilters(prev => ({ ...prev, ...result.filters }));
            }
        }
    };

    const handleExportHTML = () => {
        const config: DashboardConfig = {
            dashboardTitle: "GeneTerrain Comparison Report",
            summary: "Comparative oncology dashboard.",
            charts: charts
        };
        const html = generateStandaloneHtml(config, headers1, 'dark');
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "GeneTerrain-Report.html";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFilterChange = (column: string, values: any[]) => {
        setActiveFilters((prev) => ({ ...prev, [column]: values }));
    };

    const handleAiSummary = async (id: string) => {
        const chart = charts.find(c => c.id === id);
        if (!chart) return;
        setIsChatOpen(true);
        await sendMessage(`Analyze trends in this chart: ${chart.title}`);
    };

    const handleChatQuery = (id: string) => {
        const chart = charts.find(c => c.id === id);
        if (!chart) return;
        setIsChatOpen(true);
        // Suggest a question to the user or pre-fill
    };

    const handlePrint = () => window.print();

    const handleMaximize = (id: string) => {
        console.log("Maximize chart:", id);
    };

    const clearFilters = () => setActiveFilters({});
    const handleDeleteChart = (id: string) => setCharts(prev => prev.filter(c => c.id !== id));

    if (isLoading) {
        return (
            <Flex h="100vh" align="center" justify="center" bg={bgColor}>
                <VStack spacing={4}>
                    <Spinner size="xl" color="green.500" thickness="4px" />
                    <Text fontSize="sm" fontWeight="bold" color="gray.500">MAPPING ANALYTICS...</Text>
                </VStack>
            </Flex>
        );
    }


    return (
        <Flex
            direction={{ base: 'column', lg: 'row' }}
            h="100%"
            minH="600px"
            bg={bgColor}
            overflow="hidden"
            position="relative"
        >
            {/* Sidebar Toggle Button (Floating) */}
            <IconButton
                aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                icon={<Icon as={isSidebarOpen ? ChevronLeft : ChevronRight} size={16} />}
                size="sm"
                position="absolute"
                left={{ base: 'auto', lg: isSidebarOpen ? "280px" : "70px" }}
                right={{ base: '16px', lg: 'auto' }}
                transform={{ base: 'none', lg: 'translate(-50%, 0)' }}
                top={{ base: '16px', lg: '25px' }}
                zIndex={100}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                colorScheme="blue"
                borderRadius="full"
                shadow="md"
                border="1px"
                borderColor="blue.200"
                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                _hover={{
                    transform: { base: 'none', lg: 'translate(-50%, 0) scale(1.1)' },
                    shadow: 'lg'
                }}
            />

            {/* Search/Filter Sidebar */}
            <Box
                w={{ base: '100%', lg: isSidebarOpen ? "280px" : "70px" }}
                maxH={{ base: isSidebarOpen ? '420px' : '76px', lg: 'none' }}
                bg={sidebarBg}
                borderRight={{ base: '0px', lg: '1px' }}
                borderBottom={{ base: '1px', lg: '0px' }}
                borderColor={borderColor}
                display="flex"
                flexDirection="column"
                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                className="no-print"
                overflow="hidden"
                position="relative"
            >
                <VStack
                    p={isSidebarOpen ? 6 : 4}
                    align={isSidebarOpen ? "stretch" : "center"}
                    spacing={6}
                    overflowY="auto"
                    h="full"
                    w="full"
                >
                    <HStack justify={isSidebarOpen ? "space-between" : "center"} mb={2} w="full">
                        <HStack spacing={3}>
                            <Box p={2} bg="blue.50" borderRadius="lg">
                                <Filter size={18} color="#3182CE" />
                            </Box>
                            {isSidebarOpen && (
                                <VStack align="start" spacing={0}>
                                    <Heading size="xs" textTransform="uppercase" letterSpacing="0.1em" color="gray.700">
                                        Filters
                                    </Heading>
                                    <Text fontSize="9px" color="gray.400" fontWeight="bold">COHORT DEFINITION</Text>
                                </VStack>
                            )}
                        </HStack>
                        {isSidebarOpen && Object.keys(activeFilters).length > 0 && (
                            <Button size="xs" variant="ghost" colorScheme="blue" onClick={clearFilters}>
                                Reset
                            </Button>
                        )}
                    </HStack>

                    <Divider />

                    <VStack align={isSidebarOpen ? "stretch" : "center"} spacing={isSidebarOpen ? 4 : 8} w="full">
                        {filterableColumns.map((col) => {
                            const options = getUniqueValues(col.key);
                            if (options.length === 0) return null;

                            const selectedCount = (activeFilters[col.key] || []).length;
                            const isAllSelected = selectedCount === options.length;

                            return (
                                <VStack
                                    key={col.key}
                                    align={isSidebarOpen ? "stretch" : "center"}
                                    spacing={3}
                                    p={isSidebarOpen ? 3 : 2}
                                    borderRadius="xl"
                                    bg={isSidebarOpen ? "white" : "transparent"}
                                    border={isSidebarOpen ? "1px" : "0px"}
                                    borderColor="gray.100"
                                    shadow={isSidebarOpen ? "sm" : "none"}
                                    w="full"
                                >
                                    {isSidebarOpen ? (
                                        <HStack spacing={2}>
                                            <Box w="2px" h="10px" bg="green.400" borderRadius="full" />
                                            <Text fontSize="10px" fontWeight="black" textTransform="uppercase" color="gray.500" letterSpacing="widest">
                                                {col.label}
                                            </Text>
                                        </HStack>
                                    ) : (
                                        <Tooltip label={col.label} placement="right" hasArrow>
                                            <Box p={2} bg="white" borderRadius="lg" shadow="sm" border="1px" borderColor="gray.100">
                                                <Database size={18} color="#48BB78" />
                                            </Box>
                                        </Tooltip>
                                    )}

                                    {isSidebarOpen && (
                                        <Menu closeOnSelect={false} autoSelect={false}>
                                            <MenuButton
                                                as={Button}
                                                size="sm"
                                                h="32px"
                                                variant="outline"
                                                rightIcon={<ChevronDown size={14} />}
                                                width="full"
                                                textAlign="left"
                                                fontSize="xs"
                                                fontWeight="medium"
                                                bg={bgColor}
                                                borderColor={borderColor}
                                                _hover={{ borderColor: 'green.300', bg: 'green.50' }}
                                                display="flex"
                                                alignItems="center"
                                                lineHeight="normal"
                                            >
                                                <Flex justify="space-between" align="center" width="full" h="full">
                                                    <Text noOfLines={1} lineHeight="normal">
                                                        {isAllSelected ? "All Selected" : selectedCount === 0 ? "None" : `${selectedCount} Selected`}
                                                    </Text>
                                                    {selectedCount > 0 && !isAllSelected && (
                                                        <Badge ml={2} colorScheme="green" variant="solid" borderRadius="full" fontSize="9px" display="flex" alignItems="center" h="14px">
                                                            {selectedCount}
                                                        </Badge>
                                                    )}
                                                </Flex>
                                            </MenuButton>
                                            <Portal>
                                                <MenuList
                                                    maxH="300px"
                                                    overflowY="auto"
                                                    zIndex={2000}
                                                    boxShadow="2xl"
                                                    borderRadius="xl"
                                                    borderColor={borderColor}
                                                    py={2}
                                                >
                                                    <MenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleFilterChange(col.key, isAllSelected ? [] : options);
                                                        }}
                                                        fontWeight="bold"
                                                        color="blue.600"
                                                        fontSize="xs"
                                                        _hover={{ bg: 'blue.50' }}
                                                    >
                                                        {isAllSelected ? "Clear All" : "Select All"}
                                                    </MenuItem>
                                                    <Divider my={1} />
                                                    <CheckboxGroup
                                                        value={activeFilters[col.key] || []}
                                                        onChange={(vals) => handleFilterChange(col.key, vals)}
                                                    >
                                                        {options.map((opt) => (
                                                            <MenuItem
                                                                key={opt}
                                                                _hover={{ bg: 'green.50' }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Checkbox
                                                                    size="sm"
                                                                    value={opt}
                                                                    colorScheme="green"
                                                                    w="full"
                                                                >
                                                                    <Text fontSize="xs">{opt}</Text>
                                                                </Checkbox>
                                                            </MenuItem>
                                                        ))}
                                                    </CheckboxGroup>
                                                </MenuList>
                                            </Portal>
                                        </Menu>
                                    )}
                                </VStack>
                            );
                        })}
                    </VStack>

                    <Divider />

                    <VStack align={isSidebarOpen ? "stretch" : "center"} spacing={4}>
                        {isSidebarOpen ? (
                            <>
                                <Text fontSize="10px" fontWeight="black" textTransform="uppercase" color="gray.500" letterSpacing="widest">
                                    Chart Visibility
                                </Text>
                                {charts.map(c => (
                                    <HStack key={c.id} justify="space-between">
                                        <Text fontSize="11px" fontWeight="bold" color={hiddenChartIds.includes(c.id) ? 'gray.400' : 'gray.700'} noOfLines={1} maxW="180px">
                                            {c.title}
                                        </Text>
                                        <Checkbox
                                            size="sm"
                                            colorScheme="green"
                                            isChecked={!hiddenChartIds.includes(c.id)}
                                            onChange={() => setHiddenChartIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                                        />
                                    </HStack>
                                ))}
                            </>
                        ) : (
                            <Tooltip label="Chart Visibility settings available when expanded" placement="right" hasArrow>
                                <Box p={2} bg="white" borderRadius="lg" shadow="sm" border="1px" borderColor="gray.100">
                                    <Layout size={18} color="#718096" />
                                </Box>
                            </Tooltip>
                        )}
                    </VStack>
                </VStack>
            </Box>

            {/* Main Content Area */}
            <Box
                flex="1"
                overflowY="auto"
                p={{ base: 4, md: 6, xl: 8 }}
                bg={bgColor}
                id="printable-area"
            >
                <VStack align="stretch" spacing={8} maxW="1600px" mx="auto">
                    {/* Header */}
                    <Flex
                        justify="space-between"
                        align={{ base: 'start', xl: 'end' }}
                        direction={{ base: 'column', xl: 'row' }}
                        gap={4}
                        className="no-print"
                    >
                        <Box>
                            <HStack spacing={3} mb={2}>
                                <Badge colorScheme="purple" variant="subtle" borderRadius="full" px={3} py={0.5}>
                                    Comparison Mode Enabled
                                </Badge>
                                <HStack spacing={1}>
                                    <ArrowLeftRight size={12} color="gray" />
                                    <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">
                                        Comparing Set 1 vs Set 2
                                    </Text>
                                </HStack>
                            </HStack>
                            <Heading size="xl" mb={2} fontWeight="black" letterSpacing="tight">
                                Exploratory Data Analysis Visualization
                            </Heading>
                            <Text fontSize="sm" color="gray.600" maxW="800px" lineHeight="tall">
                                Analyze trends across two oncology datasets. Figures show side-by-side comparisons of clinical and genomic metrics.
                            </Text>
                        </Box>

                        <Flex
                            wrap="wrap"
                            gap={3}
                            justify={{ base: 'flex-start', xl: 'flex-end' }}
                            w={{ base: 'full', xl: 'auto' }}
                        >
                            <Menu>
                                <MenuButton as={Button} size="sm" variant="outline" leftIcon={<Zap size={14} />} rightIcon={<ChevronDown size={14} />}>
                                    {selectedModel.replace('gemini-', '').replace('-preview', '')}
                                </MenuButton>
                                <MenuList fontSize="xs">
                                    <MenuItem onClick={() => setSelectedModel('gemini-3-flash-preview')}>Flash 3.0 (Latest)</MenuItem>
                                    <MenuItem onClick={() => setSelectedModel('gemini-2.5-flash')}>Flash 2.5 (Fast)</MenuItem>
                                    <MenuItem onClick={() => setSelectedModel('gemini-1.5-pro-latest')}>Pro 1.5 (Smart)</MenuItem>
                                    <MenuItem onClick={() => setSelectedModel('gemini-1.5-flash-latest')}>Flash 1.5 (Legacy)</MenuItem>
                                    <MenuItem onClick={() => setSelectedModel('gemini-flash-latest')}>Flash Latest</MenuItem>
                                    <MenuItem onClick={() => setSelectedModel('gemini-flash-lite-latest')}>Flash Lite</MenuItem>
                                </MenuList>
                            </Menu>

                            <Flex
                                bg={sidebarBg}
                                p={1}
                                borderRadius="lg"
                                border="1px"
                                borderColor={borderColor}
                                wrap="wrap"
                            >
                                <Button
                                    size="xs"
                                    variant={viewMode === 'analysis' ? 'solid' : 'ghost'}
                                    colorScheme={viewMode === 'analysis' ? 'green' : 'gray'}
                                    onClick={() => setViewMode('analysis')}
                                    bg={viewMode === 'analysis' ? accentColor : 'transparent'}
                                >
                                    Dashboard
                                </Button>
                                <Button
                                    size="xs"
                                    variant={viewMode === 'stats' ? 'solid' : 'ghost'}
                                    colorScheme={viewMode === 'stats' ? 'green' : 'gray'}
                                    onClick={() => setViewMode('stats')}
                                    bg={viewMode === 'stats' ? accentColor : 'transparent'}
                                >
                                    Metrics
                                </Button>
                                <Button
                                    size="xs"
                                    variant={viewMode === 'data' ? 'solid' : 'ghost'}
                                    colorScheme={viewMode === 'data' ? 'green' : 'gray'}
                                    onClick={() => setViewMode('data')}
                                    bg={viewMode === 'data' ? accentColor : 'transparent'}
                                >
                                    Data Table
                                </Button>
                            </Flex>

                            <HStack>
                                <Button variant="ghost" size="sm" onClick={handlePrint} p={2}><Printer size={18} /></Button>
                                <Button variant="ghost" size="sm" onClick={handleExportHTML} p={2}><Download size={18} /></Button>
                            </HStack>

                        </Flex>
                    </Flex>

                    <Divider className="no-print" />

                    {/* Print Header (Only visible on print) */}
                    <Box display="none" className="print-only" textAlign="center">
                        <Heading size="lg" mb={2}>GeneTerrain Oncology Comparison Report</Heading>
                        <Text fontSize="sm" mb={4}>Exported on {new Date().toLocaleDateString()} for comparison of TCGA Datasets</Text>
                        <Divider mb={8} />
                    </Box>

                    {/* Dashboard Content */}
                    {!hasAnyData ? (
                        <Card borderRadius="2xl" border="1px" borderColor={borderColor} shadow="sm">
                            <Flex minH="360px" align="center" justify="center" p={8}>
                                <VStack spacing={3} textAlign="center" maxW="520px">
                                    <Badge colorScheme="orange" variant="subtle" px={3} py={1} borderRadius="full">
                                        No records to visualize
                                    </Badge>
                                    <Heading size="md">The EDA dashboard needs data to render charts.</Heading>
                                    <Text color="gray.500" fontSize="sm">
                                        This usually happens when the current filters remove every row or the comparison context has not populated yet.
                                    </Text>
                                    {Object.keys(activeFilters).length > 0 && (
                                        <Button size="sm" colorScheme="green" onClick={clearFilters}>
                                            Clear Filters
                                        </Button>
                                    )}
                                </VStack>
                            </Flex>
                        </Card>
                    ) : viewMode === 'analysis' ? (
                        <Grid
                            templateColumns={{
                                base: '1fr',
                                lg: 'repeat(2, 1fr)',
                                xl: isSidebarOpen ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)'
                            }}
                            gap={8}
                        >
                            {visibleCharts.map((chart) => (
                                <AnalyticalCard
                                    key={chart.id}
                                    config={chart}
                                    data1={filteredData1}
                                    data2={filteredData2}
                                    dataset1Label={dataset1Label}
                                    dataset2Label={dataset2Label}
                                    onDelete={handleDeleteChart}
                                    onMaximize={handleMaximize}
                                    onAiSummary={handleAiSummary}
                                    onChatQuery={handleChatQuery}
                                    selectedModel={selectedModel}
                                />
                            ))}
                            {visibleCharts.length === 0 && (
                                <Card borderRadius="xl" border="1px" borderColor={borderColor} minH="320px">
                                    <Flex h="full" minH="320px" align="center" justify="center" p={8}>
                                        <VStack spacing={3}>
                                            <Text fontWeight="bold">All charts are hidden</Text>
                                            <Button size="sm" onClick={() => setHiddenChartIds([])}>
                                                Show All Charts
                                            </Button>
                                        </VStack>
                                    </Flex>
                                </Card>
                            )}
                            {/* New Figure Placeholder Card */}
                            <Card
                                variant="outline"
                                borderStyle="dashed"
                                borderColor="gray.300"
                                borderRadius="xl"
                                h="500px"
                                display="flex"
                                align="center"
                                justify="center"
                                cursor="pointer"
                                transition="all 0.2s"
                                _hover={{ bg: 'gray.50', borderColor: 'blue.400' }}
                                onClick={() => handleSendMessage("Suggest a new visualization for this data")}
                                className="no-print"
                            >
                                <VStack spacing={4}>
                                    <Box p={4} borderRadius="full" bg="blue.50">
                                        <BarChart size={32} color="#3182CE" />
                                    </Box>
                                    <VStack spacing={1}>
                                        <Text fontWeight="bold" fontSize="sm">Add New Figure</Text>
                                        <Text fontSize="xs" color="gray.500">Ask AI to design a chart</Text>
                                    </VStack>
                                </VStack>
                            </Card>
                        </Grid>
                    ) : viewMode === 'stats' && profile ? (
                        <StatsPanel
                            profile={profile}
                            dataset1Label={dataset1Label}
                            dataset2Label={dataset2Label}
                        />
                    ) : (
                        <Box bg="white" borderRadius="xl" border="1px" borderColor={borderColor} overflow="hidden" shadow="sm">
                            <Box overflowX="auto">
                                <Table size="sm">
                                    <Thead bg={headerBg}>
                                        <Tr>
                                            {allHeaders.map((h) => (
                                                <Th key={h} color="white" whiteSpace="nowrap">
                                                    {h.replace(/_/g, ' ')}
                                                </Th>
                                            ))}
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {filteredData1.slice(0, 50).map((row, i) => (
                                            <Tr key={i} bg={i % 2 === 0 ? 'white' : 'gray.50'}>
                                                {allHeaders.map((h) => (
                                                    <Td key={h} whiteSpace="nowrap" color="gray.700">
                                                        {String(row[h] ?? '-')}
                                                    </Td>
                                                ))}
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </Box>
                            {filteredData1.length > 50 && (
                                <Box p={4} textAlign="center" color="gray.500" fontSize="xs" fontStyle="italic" bg="gray.50">
                                    Showing first 50 of {filteredData1.length} records...
                                </Box>
                            )}
                        </Box>
                    )}
                </VStack>
            </Box>

            {/* Global Floating Chat handles AI interaction now */}

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    #printable-area { width: 100% !important; padding: 0 !important; }
                    body { background: white !important; }
                }
            `}</style>
        </Flex>
    );
};

export default AnalyticsDashboard;
