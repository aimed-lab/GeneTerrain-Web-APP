
import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Select,
    IconButton,
    Tooltip,
    useColorModeValue,
    Flex,
    Badge,
    Grid,
    Card,
    CardHeader,
    CardBody,
    Heading,
    Icon,
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Checkbox,
    Portal,
    Divider
} from '@chakra-ui/react';
import { Maximize2, Dna, MessageSquare, Trash2, Info, ChevronDown } from 'lucide-react';
import { AnalyticsChartConfig, AnalyticsChartType, DataRow, GeminiModel } from './types';
import Plot from 'react-plotly.js';
import { analyzeChartInsights } from '../../services/geminiService';

interface AnalyticalCardProps {
    config: AnalyticsChartConfig;
    data1: DataRow[];
    data2?: DataRow[];
    dataset1Label?: string;
    dataset2Label?: string;
    onDelete?: (id: string) => void;
    onMaximize?: (id: string) => void;
    onAiSummary?: (id: string) => void;
    onChatQuery?: (id: string) => void;
    selectedModel?: GeminiModel;
}

const AnalyticalCard: React.FC<AnalyticalCardProps> = ({
    config,
    data1,
    data2,
    dataset1Label = "Dataset 1",
    dataset2Label = "Dataset 2",
    onDelete,
    onMaximize,
    onChatQuery,
    selectedModel = 'gemini-3-flash-preview',
}) => {
    const [activeX, setActiveX] = useState(config.xAxis);
    const [activeY, setActiveY] = useState(config.yAxis);

    // Sync state if config changes (e.g. from chat)
    useEffect(() => {
        setActiveX(config.xAxis);
        setActiveY(config.yAxis);
    }, [config.xAxis, config.yAxis]);

    // AI Insight states
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [insight, setInsight] = useState<string | null>(null);
    const [showInsight, setShowInsight] = useState(false);

    const handleAnalyze = async () => {
        if (insight) {
            setShowInsight(!showInsight);
            return;
        }
        setIsAnalyzing(true);
        try {
            const result = await analyzeChartInsights(config, data1, selectedModel);
            setInsight(result);
            setShowInsight(true);
        } catch (err) {
            console.error("Failed to analyze chart:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Gene symbols ranked by highest average absolute expression value (top 15 from lasso)
    const allGenes = useMemo(() => {
        const geneAbsMap: Record<string, { sum: number; count: number }> = {};

        const processRow = (r: DataRow) => {
            if (!r.gene_symbol || r.gene_symbol === '_CLINICAL_ONLY_') return;
            if (!geneAbsMap[r.gene_symbol]) geneAbsMap[r.gene_symbol] = { sum: 0, count: 0 };
            const val = Number(r.value);
            if (!isNaN(val)) {
                geneAbsMap[r.gene_symbol].sum += Math.abs(val);
                geneAbsMap[r.gene_symbol].count += 1;
            }
        };

        data1.forEach(processRow);
        data2?.forEach(processRow);

        // Sort by descending average |absolute value|, expose top 15 most impactful genes
        return Object.entries(geneAbsMap)
            .sort((a, b) => {
                const avgA = a[1].count > 0 ? a[1].sum / a[1].count : 0;
                const avgB = b[1].count > 0 ? b[1].sum / b[1].count : 0;
                return avgB - avgA;
            })
            .slice(0, 15)
            .map(([gene]) => gene);
    }, [data1, data2]);

    const [selectedGenes, setSelectedGenes] = useState<string[]>(allGenes.length > 0 ? allGenes.slice(0, Math.min(15, allGenes.length)) : []);

    // Re-sync selectedGenes when allGenes changes (e.g. new lasso selection)
    // Always auto-select top 15 genes by absolute value when the lasso changes
    useEffect(() => {
        if (allGenes.length > 0) {
            setSelectedGenes(allGenes.slice(0, Math.min(15, allGenes.length)));
        } else {
            setSelectedGenes([]);
        }
    }, [allGenes]);

    // Chakra UI color mode values
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const textColor = useColorModeValue('gray.800', 'gray.100');
    const subtextColor = useColorModeValue('gray.500', 'gray.400');
    const headerBg = useColorModeValue('gray.50', 'gray.900');
    const plotBgColor = useColorModeValue('rgba(255,255,255,0)', 'rgba(0,0,0,0)');

    const xAxisOptions = config.xAxisOptions || [config.xAxis];
    const yAxisOptions = config.yAxisOptions || [config.yAxis];
    const availableKeys = useMemo(() => {
        const keySet = new Set<string>();
        [...data1, ...(data2 || [])].forEach((row) => {
            Object.keys(row || {}).forEach((key) => keySet.add(key));
        });
        return keySet;
    }, [data1, data2]);

    useEffect(() => {
        if (xAxisOptions.length > 0 && !xAxisOptions.includes(activeX)) {
            setActiveX(xAxisOptions[0]);
        }
    }, [activeX, xAxisOptions]);

    useEffect(() => {
        if (yAxisOptions.length > 0 && !yAxisOptions.includes(activeY)) {
            setActiveY(yAxisOptions[0]);
        }
    }, [activeY, yAxisOptions]);

    const plotData = useMemo(() => {
        const traces: any[] = [];
        const hasSecondDataset = data2 && data2.length > 0;

        // Helper: filter dataset into gene rows or clinical-only rows
        const getContextRows = (dataset: DataRow[]) => {
            const isGeneMeasure = activeY === 'value';
            const isGeneDimension = activeX === 'gene_symbol';
            const isGeneType = config.type === AnalyticsChartType.AVG_GENE_BAR;
            const needsGeneRows = isGeneMeasure || isGeneDimension || isGeneType;

            const filtered = needsGeneRows
                ? dataset.filter(r => r.gene_symbol !== '_CLINICAL_ONLY_')
                : dataset.filter(r => r.gene_symbol === '_CLINICAL_ONLY_');

            return filtered.filter(r => r[activeX] !== null && r[activeX] !== undefined);
        };

        const d1 = getContextRows(data1);
        const d2 = hasSecondDataset ? getContextRows(data2!) : [];

        switch (config.type) {
            case AnalyticsChartType.AVG_GENE_BAR: {
                // Build a shared gene order so both traces align on the same x-axis
                const genes = selectedGenes.length > 0 ? selectedGenes : allGenes.slice(0, 10);

                const avg = (dataset: DataRow[], gene: string) => {
                    const vals = dataset
                        .filter(r => r.gene_symbol === gene)
                        .map(r => Number(r[activeY]))
                        .filter(v => !isNaN(v));
                    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                };

                // Trace for Selection A / Cohort 1
                if (d1.length > 0) {
                    traces.push({
                        x: genes,
                        y: genes.map(g => avg(d1, g)),
                        name: dataset1Label,
                        type: 'bar',
                        marker: { color: config.color || '#3182CE', opacity: 0.85 },
                    });
                }

                // Trace for Selection B / Cohort 2
                if (d2.length > 0) {
                    traces.push({
                        x: genes,
                        y: genes.map(g => avg(d2, g)),
                        name: dataset2Label,
                        type: 'bar',
                        marker: { color: '#ED8936', opacity: 0.85 },
                    });
                }
                break;
            }

            case AnalyticsChartType.BAR: {
                const buildBarTrace = (dataset: DataRow[], name: string, color: string) => {
                    const counts: Record<string, number> = {};
                    const values: Record<string, number[]> = {};

                    dataset.forEach(r => {
                        const k = String(r[activeX] || 'N/A');
                        if (activeY === 'count') {
                            counts[k] = (counts[k] || 0) + 1;
                        } else {
                            const v = Number(r[activeY]);
                            if (!isNaN(v)) {
                                if (!values[k]) values[k] = [];
                                values[k].push(v);
                            }
                        }
                    });

                    const barAgg = activeY === 'count'
                        ? Object.entries(counts).map(([k, v]) => ({ k, v }))
                        : Object.entries(values).map(([k, vs]) => ({ k, v: vs.reduce((a, b) => a + b, 0) / vs.length }));

                    const sorted = barAgg.sort((a, b) => b.v - a.v).slice(0, 15);

                    return {
                        x: sorted.map(e => e.k),
                        y: sorted.map(e => e.v),
                        name,
                        type: 'bar',
                        marker: { color, opacity: 0.85 },
                    };
                };

                if (d1.length > 0) traces.push(buildBarTrace(d1, dataset1Label, config.color || '#3182CE'));
                if (d2.length > 0) traces.push(buildBarTrace(d2, dataset2Label, '#ED8936'));
                break;
            }

            case AnalyticsChartType.SCATTER: {
                if (d1.length > 0) {
                    traces.push({
                        x: d1.map(r => r[activeX]),
                        y: d1.map(r => Number(r[activeY])).filter(v => !isNaN(v)),
                        mode: 'markers',
                        type: 'scatter',
                        name: dataset1Label,
                        marker: { color: config.color || '#3182CE', size: 6, opacity: 0.6 }
                    });
                }
                if (d2.length > 0) {
                    traces.push({
                        x: d2.map(r => r[activeX]),
                        y: d2.map(r => Number(r[activeY])).filter(v => !isNaN(v)),
                        mode: 'markers',
                        type: 'scatter',
                        name: dataset2Label,
                        marker: { color: '#ED8936', size: 6, opacity: 0.6 }
                    });
                }
                break;
            }

            case AnalyticsChartType.HEATMAP: {
                // Simplistic heatmap for the first dataset
                const z = d1.map(r => [Number(r[activeY]) || 0]);
                traces.push({
                    z,
                    x: [activeX],
                    y: d1.map(r => r[activeX]),
                    type: 'heatmap',
                    colorscale: 'Viridis',
                    showscale: true
                });
                break;
            }

            case AnalyticsChartType.TREEMAP: {
                const labels: string[] = [];
                const parents: string[] = [];
                const values: number[] = [];

                const buildTreemapData = (dataset: DataRow[], groupName: string) => {
                    const counts: Record<string, number> = {};
                    dataset.forEach(r => {
                        const k = String(r[activeX] || 'Unknown');
                        counts[k] = (counts[k] || 0) + 1;
                    });

                    labels.push(groupName);
                    parents.push("");
                    values.push(dataset.length);

                    Object.entries(counts).forEach(([k, v]) => {
                        labels.push(k);
                        parents.push(groupName);
                        values.push(v);
                    });
                };

                buildTreemapData(d1, dataset1Label);
                if (d2.length > 0) buildTreemapData(d2, dataset2Label);

                traces.push({
                    type: "treemap",
                    labels,
                    parents,
                    values,
                    textinfo: "label+value+percent parent",
                    marker: { colorscale: 'Blues' }
                });
                break;
            }

            case AnalyticsChartType.VIOLIN: {
                const genes = selectedGenes.length > 0 ? selectedGenes : allGenes.slice(0, 10);

                const buildViolinTrace = (dataset: DataRow[], name: string, color: string) => {
                    const filtered = activeX === 'gene_symbol'
                        ? dataset.filter(r => genes.includes(r.gene_symbol))
                        : dataset;
                    const dist = filtered.filter(r => !isNaN(Number(r[activeY])));
                    return {
                        y: dist.map(r => r[activeY]),
                        x: dist.map(r => r[activeX]),
                        name,
                        type: 'violin',
                        legendgroup: name,
                        scalegroup: name,
                        line: { color },
                        meanline: { visible: true },
                        fillcolor: `${color}40`,
                        opacity: 0.7,
                        side: hasSecondDataset ? (name === dataset1Label ? 'negative' : 'positive') : undefined,
                    };
                };

                if (d1.length > 0) traces.push(buildViolinTrace(d1, dataset1Label, config.color || '#3182CE'));
                if (d2.length > 0) traces.push(buildViolinTrace(d2, dataset2Label, '#ED8936'));
                break;
            }

            case AnalyticsChartType.BOX: {
                const genes = selectedGenes.length > 0 ? selectedGenes : allGenes.slice(0, 10);

                const buildBoxTrace = (dataset: DataRow[], name: string, color: string) => {
                    const filtered = activeX === 'gene_symbol'
                        ? dataset.filter(r => genes.includes(r.gene_symbol))
                        : dataset;
                    const dist = filtered.filter(r => !isNaN(Number(r[activeY])));
                    return {
                        y: dist.map(r => r[activeY]),
                        x: dist.map(r => r[activeX]),
                        name,
                        type: 'box',
                        legendgroup: name,
                        marker: { color },
                        boxpoints: 'outliers',
                        opacity: 0.7,
                    };
                };

                if (d1.length > 0) traces.push(buildBoxTrace(d1, dataset1Label, config.color || '#3182CE'));
                if (d2.length > 0) traces.push(buildBoxTrace(d2, dataset2Label, '#ED8936'));
                break;
            }

            case AnalyticsChartType.PIE: {
                const buildPieTrace = (dataset: DataRow[], name: string, index: number) => {
                    const counts: Record<string, number> = {};
                    dataset.forEach(r => {
                        const val = String(r[activeX] || 'N/A');
                        counts[val] = (counts[val] || 0) + 1;
                    });
                    const trace: any = {
                        labels: Object.keys(counts),
                        values: Object.values(counts),
                        type: 'pie',
                        name,
                        hole: 0.4,
                        marker: {
                            colors: ['#3182CE', '#48BB78', '#ED8936', '#9F7AEA', '#ECC94B', '#F56565'],
                        },
                        textinfo: 'label+percent',
                        insidetextorientation: 'radial',
                    };
                    if (hasSecondDataset) {
                        trace.domain = index === 0 ? { x: [0, 0.46] } : { x: [0.54, 1] };
                        trace.title = { text: name, font: { size: 11, color: '#718096' }, position: 'top center' };
                    }
                    return trace;
                };

                if (d1.length > 0) traces.push(buildPieTrace(d1, dataset1Label, 0));
                if (d2.length > 0) traces.push(buildPieTrace(d2, dataset2Label, 1));
                break;
            }

            case AnalyticsChartType.LINE:
            case AnalyticsChartType.AREA:
            case AnalyticsChartType.HISTOGRAM:
            case AnalyticsChartType.BUBBLE:
            default: {
                const buildFallbackTrace = (dataset: DataRow[], name: string, color: string) => {
                    const counts: Record<string, number> = {};
                    dataset.forEach((r) => {
                        const k = String(r[activeX] ?? 'N/A');
                        counts[k] = (counts[k] || 0) + 1;
                    });
                    const entries = Object.entries(counts).slice(0, 20);
                    return {
                        x: entries.map(([k]) => k),
                        y: entries.map(([, v]) => v),
                        name,
                        type: config.type === AnalyticsChartType.LINE || config.type === AnalyticsChartType.AREA ? 'scatter' : 'bar',
                        mode: config.type === AnalyticsChartType.LINE || config.type === AnalyticsChartType.AREA ? 'lines+markers' : undefined,
                        fill: config.type === AnalyticsChartType.AREA ? 'tozeroy' : undefined,
                        marker: { color, opacity: 0.85 },
                        line: { color },
                    };
                };

                if (d1.length > 0) traces.push(buildFallbackTrace(d1, dataset1Label, config.color || '#3182CE'));
                if (d2.length > 0) traces.push(buildFallbackTrace(d2, dataset2Label, '#ED8936'));
                break;
            }
        }

        return traces;
    }, [data1, data2, config, activeX, activeY, selectedGenes, allGenes, dataset1Label, dataset2Label]);

    const hasRequiredAxes =
        activeX === 'gene_symbol' || availableKeys.has(activeX);
    const hasRequiredMeasure =
        activeY === 'count' || availableKeys.has(activeY);
    const hasRenderableData = plotData.length > 0 && hasRequiredAxes && hasRequiredMeasure;

    const layout = {
        autosize: true,
        margin: { l: 50, r: 20, t: 20, b: 60 },
        paper_bgcolor: plotBgColor,
        plot_bgcolor: plotBgColor,
        font: {
            family: 'Inter, sans-serif',
            size: 10,
            color: textColor,
        },
        showlegend: plotData.length > 1,
        legend: {
            orientation: 'h',
            y: 1.1,
            font: { size: 10 }
        },
        xaxis: {
            title: { text: activeX, font: { size: 10, color: subtextColor } },
            gridcolor: borderColor,
            zeroline: false,
        },
        yaxis: {
            title: { text: activeY, font: { size: 10, color: subtextColor } },
            gridcolor: borderColor,
            zeroline: false,
        },
        violinmode: 'group',
        barmode: 'group',
        boxmode: 'group',
    };

    return (
        <Card
            variant="outline"
            borderColor={borderColor}
            borderRadius="xl"
            bg={bgColor}
            shadow="md"
            h="520px"
            transition="all 0.2s"
            _hover={{ shadow: 'lg' }}
        >
            <CardHeader bg={headerBg} py={2} px={3} borderBottom="1px" borderColor={borderColor} borderRadius="xl xl 0 0">
                <Flex justify="space-between" align="center" minW={0}>
                    <HStack spacing={4} minW={0} flex="1" mr={4}>
                        <Heading fontSize="xs" color="gray.700" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" noOfLines={1}>
                            {config.title}
                        </Heading>
                        <Badge fontSize="2xs" colorScheme="blue" variant="subtle" borderRadius="full" px={2} flexShrink={0}>
                            {config.type.replace('_', ' ')}
                        </Badge>
                    </HStack>
                    <HStack spacing={1} flexShrink={0}>
                        <Tooltip label="AI Summary">
                            <IconButton
                                aria-label="AI Summary"
                                icon={<Icon as={Dna} size={14} />}
                                size="xs"
                                variant={showInsight ? "solid" : "ghost"}
                                colorScheme={showInsight ? "green" : "gray"}
                                isLoading={isAnalyzing}
                                onClick={handleAnalyze}
                            />
                        </Tooltip>
                        <Tooltip label="Chat Modification">
                            <IconButton
                                aria-label="Chat Mode"
                                icon={<Icon as={MessageSquare} size={12} />}
                                size="xs"
                                variant="ghost"
                                onClick={() => onChatQuery?.(config.id)}
                            />
                        </Tooltip>
                        <Tooltip label="Expand">
                            <IconButton
                                aria-label="Maximize"
                                icon={<Icon as={Maximize2} size={12} />}
                                size="xs"
                                variant="ghost"
                                onClick={() => onMaximize?.(config.id)}
                            />
                        </Tooltip>
                        <Tooltip label="Remove">
                            <IconButton
                                aria-label="Delete"
                                icon={<Icon as={Trash2} size={12} />}
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => onDelete?.(config.id)}
                            />
                        </Tooltip>
                    </HStack>
                </Flex>
            </CardHeader>
            <CardBody p={3} display="flex" flexDirection="column">
                <VStack align="stretch" spacing={3} flex="1">
                    {/* Controls */}
                    <Grid templateColumns="1fr 1fr" gap={4} width="full" px={1} minW={0}>
                        {/* Dimension Column */}
                        <VStack align="stretch" spacing={1.5} minW={0}>
                            <Text
                                fontSize="9px"
                                fontWeight="black"
                                textTransform="uppercase"
                                color="blue.500"
                                letterSpacing="0.1em"
                                noOfLines={1}
                            >
                                Dimension
                            </Text>
                            <Box h="32px">
                                {activeX === 'gene_symbol' ? (
                                    <Menu closeOnSelect={false} autoSelect={false}>
                                        <MenuButton
                                            as={Button}
                                            size="sm"
                                            h="32px"
                                            rightIcon={<ChevronDown size={14} />}
                                            variant="outline"
                                            width="full"
                                            textAlign="left"
                                            fontWeight="medium"
                                            fontSize="xs"
                                            bg={bgColor}
                                            borderColor={borderColor}
                                            _hover={{ borderColor: 'blue.300', bg: 'blue.50' }}
                                            _active={{ bg: 'blue.100' }}
                                            transition="all 0.2s"
                                            display="flex"
                                            alignItems="center"
                                            lineHeight="normal"
                                        >
                                            <Text noOfLines={1} lineHeight="normal">
                                                {selectedGenes.length > 0
                                                    ? `${selectedGenes.length} Genes`
                                                    : "Select Genes"}
                                            </Text>
                                        </MenuButton>
                                        <Portal>
                                            <MenuList
                                                maxH="300px"
                                                overflowY="auto"
                                                zIndex={2000}
                                                boxShadow="xl"
                                                borderRadius="lg"
                                                borderColor={borderColor}
                                                py={2}
                                            >
                                                <MenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const isAllSelected = selectedGenes.length === allGenes.length;
                                                        setSelectedGenes(isAllSelected ? [] : [...allGenes]);
                                                    }}
                                                    fontWeight="bold"
                                                    color="blue.600"
                                                    fontSize="xs"
                                                    _hover={{ bg: 'blue.50' }}
                                                >
                                                    {selectedGenes.length === allGenes.length ? "Clear All" : "Select All"}
                                                </MenuItem>
                                                <Divider my={1} />
                                                {allGenes.map(gene => (
                                                    <MenuItem
                                                        key={gene}
                                                        _hover={{ bg: 'blue.50' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const next = selectedGenes.includes(gene)
                                                                ? selectedGenes.filter(g => g !== gene)
                                                                : [...selectedGenes, gene];
                                                            setSelectedGenes(next);
                                                        }}
                                                    >
                                                        <Checkbox
                                                            size="sm"
                                                            isChecked={selectedGenes.includes(gene)}
                                                            colorScheme="green"
                                                            pointerEvents="none"
                                                            fontSize="xs"
                                                        >
                                                            {gene}
                                                        </Checkbox>
                                                    </MenuItem>
                                                ))}
                                            </MenuList>
                                        </Portal>
                                    </Menu>
                                ) : (
                                    <Select
                                        size="sm"
                                        h="32px"
                                        value={activeX}
                                        onChange={(e) => setActiveX(e.target.value)}
                                        borderRadius="md"
                                        bg={bgColor}
                                        borderColor={borderColor}
                                        fontSize="xs"
                                        fontWeight="medium"
                                        _hover={{ borderColor: 'blue.300', bg: 'blue.50' }}
                                        transition="all 0.2s"
                                        lineHeight="normal"
                                        sx={{
                                            'option': {
                                                bg: bgColor,
                                            },
                                            'select': {
                                                lineHeight: 'normal',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }
                                        }}
                                    >
                                        {xAxisOptions.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </Box>
                        </VStack>

                        {/* Measure Column */}
                        <VStack align="stretch" spacing={1.5} minW={0}>
                            <Text
                                fontSize="9px"
                                fontWeight="black"
                                textTransform="uppercase"
                                color="blue.500"
                                letterSpacing="0.1em"
                                noOfLines={1}
                            >
                                Measure
                            </Text>
                            <Box h="32px">
                                <Select
                                    size="sm"
                                    h="32px"
                                    value={activeY}
                                    onChange={(e) => setActiveY(e.target.value)}
                                    borderRadius="md"
                                    bg={bgColor}
                                    borderColor={borderColor}
                                    fontSize="xs"
                                    fontWeight="medium"
                                    _hover={{ borderColor: 'blue.300', bg: 'blue.50' }}
                                    transition="all 0.2s"
                                    lineHeight="normal"
                                    sx={{
                                        'option': {
                                            bg: bgColor,
                                        },
                                        'select': {
                                            lineHeight: 'normal',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }
                                    }}
                                >
                                    {yAxisOptions.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </Select>
                            </Box>
                        </VStack>
                    </Grid>

                    {/* Plot Area */}
                    <Box flex="1" position="relative" minH="0">
                        {!hasRenderableData ? (
                            <Flex
                                align="center"
                                justify="center"
                                h="full"
                                border="1px dashed"
                                borderColor={borderColor}
                                borderRadius="xl"
                                bg={headerBg}
                                p={4}
                            >
                                <VStack spacing={2} textAlign="center" maxW="280px">
                                    <Badge colorScheme="orange" variant="subtle" borderRadius="full" px={3} py={1}>
                                        Chart unavailable
                                    </Badge>
                                    <Text fontSize="sm" fontWeight="bold" color={textColor}>
                                        This figure does not have enough compatible data to render.
                                    </Text>
                                    <Text fontSize="xs" color={subtextColor}>
                                        Try a different dimension or measure, or ask AI to regenerate this chart.
                                    </Text>
                                </VStack>
                            </Flex>
                        ) : (
                            <>
                                <Plot
                                    data={plotData as any}
                                    layout={layout as any}
                                    useResizeHandler={true}
                                    style={{ width: '100%', height: '100%' }}
                                    config={{ responsive: true, displayModeBar: false }}
                                />
                                {showInsight && insight && (
                                    <Box
                                        position="absolute"
                                        inset={0}
                                        zIndex={20}
                                        p={4}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        bg="rgba(0,0,0,0.05)"
                                        backdropFilter="blur(8px)"
                                        animation="fade-in 0.3s"
                                    >
                                        <VStack
                                            bg={bgColor}
                                            p={6}
                                            borderRadius="2xl"
                                            border="1px"
                                            borderColor="green.200"
                                            shadow="2xl"
                                            maxW="90%"
                                            maxH="90%"
                                            overflowY="auto"
                                            spacing={4}
                                        >
                                            <Flex justify="space-between" align="center" w="full">
                                                <HStack spacing={2}>
                                                    <Icon as={Dna} color="green.500" />
                                                    <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="widest" color="green.500">
                                                        Agent Synthesis
                                                    </Text>
                                                </HStack>
                                                <IconButton
                                                    aria-label="Close"
                                                    icon={<Box as="span">✕</Box>}
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => setShowInsight(false)}
                                                />
                                            </Flex>
                                            <Text fontSize="xs" fontStyle="italic" lineHeight="relaxed">
                                                {insight}
                                            </Text>
                                            <Divider />
                                            <Text fontSize="8px" color="gray.500" fontWeight="bold" textTransform="uppercase">
                                                Generated based on a representative sample
                                            </Text>
                                        </VStack>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>

                    {/* Footer Infos */}
                    <Flex justify="space-between" align="center" pt={2} borderTop="1px" borderColor={borderColor} minW={0}>
                        <HStack spacing={2} minW={0} flex="1">
                            <Icon as={Info} size={10} color="gray.400" flexShrink={0} />
                            <Text fontSize="2xs" color="gray.400" noOfLines={1}>
                                {dataset1Label}: {data1.length} pts{data2 && data2.length > 0 ? ` • ${dataset2Label}: ${data2.length} pts` : ''}
                            </Text>
                        </HStack>
                        <Text fontSize="2xs" color="gray.400" fontStyle="italic" noOfLines={1} flexShrink={0} ml={2}>
                            Updated Just Now
                        </Text>
                    </Flex>
                </VStack>
            </CardBody>
        </Card>
    );
};

export default AnalyticalCard;
