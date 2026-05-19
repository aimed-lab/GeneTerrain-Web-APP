import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Input,
    IconButton,
    Flex,
    useColorModeValue,
    Badge,
    Button,
    Heading,
    Tooltip,
    Spinner,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Portal,
    Collapse,
    SimpleGrid,
} from '@chakra-ui/react';
import { Send, Dna, HelpCircle, X, Trash2, Database, BarChart2, Maximize2, Download, FileText, Image as ImageIcon, ChevronDown, ChevronUp, Info, Layers3, Bookmark, GitCompareArrows, Orbit, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, ScientificText, CohortAction, CohortRecord } from './types';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const TOOL_MESSAGE_PREFIX = "🛠️ **Bio MCP:**";

const isToolMessage = (content: string) => content.startsWith(TOOL_MESSAGE_PREFIX);

const formatToolMessage = (content: string) => {
    const cleaned = content.replace(TOOL_MESSAGE_PREFIX, "").trim();
    const match = cleaned.match(/Calling\s+`?([^`]+)`?/i);
    return match ? `Tool: ${match[1]}` : cleaned;
};

const InlineIcon: React.FC<{ children: React.ReactNode; size?: string; color?: string }> = ({
    children,
    size = "14px",
    color = "inherit",
}) => (
    <Flex
        align="center"
        justify="center"
        w={size}
        h={size}
        minW={size}
        color={color}
        lineHeight="1"
        flexShrink={0}
    >
        {children}
    </Flex>
);

/**
 * ProfessionalText
 * Renders text with **bold** markers as actual styled bold text, 
 * removing the raw markdown characters.
 */
/**
 * ProfessionalText
 * Renders text with **bold** markers and ### headers as actual styled text, 
 * removing the raw markdown characters.
 */
const ProfessionalText: React.FC<{ text: string; fontSize?: string; color?: string; fontWeight?: string }> = ({ text, fontSize = "10.5px", color = "inherit", fontWeight = "normal" }) => {
    if (!text) return null;
    
    // Split by lines to handle headers
    const lines = text.split('\n');
    
    return (
        <VStack align="stretch" spacing={2} width="100%">
            {lines.map((line, lineIdx) => {
                let currentLine = line;
                let isHeader = false;
                let headerLevel = 0;
                
                if (currentLine.startsWith('### ')) {
                    isHeader = true;
                    headerLevel = 3;
                    currentLine = currentLine.replace('### ', '');
                } else if (currentLine.startsWith('## ')) {
                    isHeader = true;
                    headerLevel = 2;
                    currentLine = currentLine.replace('## ', '');
                }

                // Split by ** or __ markers for bolding
                const parts = currentLine.split(/(\*\*.*?\*\*|__.*?__)/g);
                
                return (
                    <Text 
                        key={lineIdx} 
                        fontSize={isHeader ? (headerLevel === 2 ? "11.5px" : "11px") : fontSize} 
                        fontWeight={isHeader ? "semibold" : fontWeight} 
                        color={isHeader ? "gray.700" : color}
                        textTransform={isHeader ? "none" : "none"}
                        letterSpacing={isHeader ? "normal" : "normal"}
                        lineHeight="1.6"
                    >
                        {parts.map((part, i) => {
                            const isBold = (part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'));
                            if (isBold) {
                                return (
                                    <Text as="span" key={i} fontWeight="semibold" color="gray.800">
                                        {part.slice(2, -2)}
                                    </Text>
                                );
                            }
                            return part;
                        })}
                    </Text>
                );
            })}
        </VStack>
    );
};

const ExpandableScientificSummary: React.FC<{ scientificText: ScientificText }> = ({ scientificText }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const borderColor = useColorModeValue('blue.100', 'blue.700');
    const bgColor = useColorModeValue('white', 'gray.800');
    const headerBg = useColorModeValue('blue.50', 'blue.900');

    return (
        <Box 
            w="100%" 
            borderTop="1px solid" 
            borderColor={borderColor} 
            bg={bgColor}
            overflow="hidden"
        >
            {/* Header / Trigger Area */}
            <Flex 
                px={3} py={2} 
                align="center"
                justify="space-between"
                cursor="pointer" 
                onClick={() => setIsExpanded(!isExpanded)}
                _hover={{ bg: headerBg }}
                transition="all 0.2s"
                bg={isExpanded ? headerBg : 'transparent'}
            >
                <HStack spacing={1.5}>
                    <Info size={12} color="#3182CE" />
                    <Text fontSize="10px" fontWeight="black" color="blue.700" textTransform="uppercase" letterSpacing="widest">
                        View Summary
                    </Text>
                    {!isExpanded && (
                        <Text fontSize="10px" color="gray.400" fontWeight="medium" noOfLines={1} ml={2}>
                            — {scientificText.short_summary.split('.')[0]}...
                        </Text>
                    )}
                </HStack>
                <IconBox 
                    icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 
                    active={isExpanded} 
                />
            </Flex>            {/* Detailed Expansion Area */}
            <Collapse in={isExpanded} animateOpacity>
                <Box px={4} pb={4} pt={2} borderTop="1px dashed" borderColor={borderColor} bg={useColorModeValue('whiteAlpha.500', 'whiteAlpha.50')}>
                    <VStack align="stretch" spacing={4}>
                        {scientificText.key_finding && (
                            <Box 
                                p={4} 
                                bg={headerBg} 
                                borderRadius="xl" 
                                borderLeft="4px solid" 
                                borderColor="blue.500"
                                shadow="sm"
                            >
                                <HStack spacing={2} mb={2}>
                                    <Dna size={12} color="#3182CE" />
                                    <Text fontSize="10px" fontWeight="black" color="blue.700" textTransform="uppercase" letterSpacing="widest">Detailed Insight</Text>
                                </HStack>
                                <ProfessionalText 
                                    text={scientificText.key_finding} 
                                    fontSize="11px" 
                                    color="gray.800" 
                                    fontWeight="medium" 
                                />
                            </Box>
                        )}
                        
                        <Box px={1}>
                            <Text fontSize="9px" fontWeight="bold" color="blue.500" mb={1} textTransform="uppercase" letterSpacing="tighter">Highlight</Text>
                            <ProfessionalText 
                                text={scientificText.short_summary} 
                                fontSize="10.5px" 
                                color="gray.700" 
                                fontWeight="medium"
                            />
                        </Box>
                    </VStack>
                    
                    <Flex justify="center" mt={3} opacity={0.6}>
                        <Button 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => setIsExpanded(false)} 
                            leftIcon={<ChevronUp size={12} />}
                            fontSize="9px"
                        >
                            Collapse Findings
                        </Button>
                    </Flex>
                </Box>
            </Collapse>
        </Box>
    );
};

const IconBox = ({ icon, active }: { icon: React.ReactNode; active?: boolean }) => (
    <Box 
        p={1} 
        borderRadius="md" 
        bg={active ? "blue.500" : "transparent"} 
        color={active ? "white" : "gray.400"}
        transition="all 0.2s"
    >
        {icon}
    </Box>
);

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (content: string) => void;
    onToolAction?: (action: CohortAction) => Promise<void> | void;
    isAnalyzing: boolean;
    fileName: string | null;
    patientCount?: number;
    onClose?: () => void;
    onClearHistory?: () => void;
    savedCohortIds?: string[];
    comparisonCohortIds?: string[];
    activeCohortId?: string | null;
    comparisonCohorts?: CohortRecord[];
    onRemoveComparisonCohort?: (cohortId: string) => void;
    onRunComparisonCart?: () => Promise<void> | void;
    onRequestTerrainComparison?: () => void;
    datasetId?: string;
}

const DATASET_SUGGESTIONS: Record<string, { label: string; prompt: string }[]> = {
    GBM: [
        { label: "IDH-mutant vs IDH-WT", prompt: "Define two GBM cohorts: IDH-mutant vs IDH-wildtype and compare EGFR, PTEN, and TP53 expression between them." },
        { label: "MGMT by survival", prompt: "Compare MGMT-methylated vs MGMT-unmethylated GBM patients. Show survival status breakdown and key oncogene expression differences." },
        { label: "Classical vs Mesenchymal", prompt: "Create cohorts for Classical and Mesenchymal GBM subtypes and show their gene expression profiles for CDH1, VIM, and EGFR." },
        { label: "Female vs Male GBM", prompt: "Compare GBM expression patterns between female and male patients, focusing on sex-linked genes and immune markers." },
        { label: "Tumor suppressor hubs", prompt: "Analyze TP53, PTEN, and RB1 expression across GBM vital status groups and show distributions." },
        { label: "PI3K pathway activity", prompt: "Show AKT1, PIK3CA, and MTOR expression in GBM patients grouped by vital status." },
    ],
    BRCA: [
        { label: "ER+ vs ER- cohorts", prompt: "Define ER-positive vs ER-negative BRCA cohorts and compare ESR1, GATA3, and MKI67 expression." },
        { label: "HER2 amplification", prompt: "Compare ERBB2-high vs ERBB2-low BRCA patients and show survival and stage distributions." },
        { label: "Triple-negative BRCA", prompt: "Identify triple-negative breast cancer samples and compare BRCA1, BRCA2, and TP53 with luminal subtypes." },
        { label: "Alive vs Dead survival", prompt: "Compare gene expression of BRCA patients by vital status. Include VEGFA, MYC, and CDK4." },
        { label: "Stage I vs Stage IV", prompt: "Create cohorts for early-stage (I-II) vs late-stage (III-IV) BRCA and show pathway activity differences." },
        { label: "BRCA1/2 mutation effect", prompt: "Analyze BRCA1 and BRCA2 expression differences by tumor stage and histological grade." },
    ],
    DEFAULT: [
        { label: "Datasets available", prompt: "What datasets do you have?" },
        { label: "Sample counts", prompt: "How many clinical samples are available in GBM and BRCA?" },
        { label: "Start GBM analysis", prompt: "I want to explore GBM data. What are the most meaningful cohorts to start with?" },
    ],
};

const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    onSendMessage,
    onToolAction,
    isAnalyzing,
    fileName,
    patientCount,
    onClose,
    onClearHistory,
    savedCohortIds = [],
    comparisonCohortIds = [],
    activeCohortId,
    comparisonCohorts = [],
    onRemoveComparisonCohort,
    onRunComparisonCart,
    onRequestTerrainComparison,
    datasetId,
}) => {
    const [input, setInput] = useState('');
    const [expandedMsg, setExpandedMsg] = useState<ChatMessage | null>(null);
    const [expandedView, setExpandedView] = useState<'interactive' | 'image'>('interactive');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Modern glass-inspired colors
    const bgColor = useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(26, 32, 44, 0.85)');
    const borderColor = useColorModeValue('blue.100', 'gray.700');
    const inputBg = useColorModeValue('gray.50', 'gray.700');
    const toolBg = useColorModeValue('blue.50', 'whiteAlpha.100');
    const toolBorderColor = useColorModeValue('blue.100', 'whiteAlpha.200');
    const userMsgBg = 'blue.500';
    const botMsgBg = useColorModeValue('white', 'gray.700');
    const modalBodyBg = useColorModeValue('white', 'gray.800');
    const cohortCardBg = useColorModeValue('white', 'gray.800');
    const cohortCardBorder = useColorModeValue('teal.100', 'teal.700');
    const cohortCardHeaderBg = useColorModeValue('teal.50', 'teal.900');
    const cohortTitleColor = useColorModeValue('gray.800', 'whiteAlpha.900');
    const cohortSummaryColor = useColorModeValue('gray.600', 'gray.300');
    const comparisonCartTitleColor = useColorModeValue('teal.800', 'teal.100');
    const comparisonCartItemBg = useColorModeValue('white', 'whiteAlpha.80');
    const comparisonCartItemBorder = useColorModeValue('teal.100', 'whiteAlpha.200');

    const renderCohortCard = (msg: ChatMessage) => {
        if (!msg.cohortCard) return null;

        const { cohort, title, shortSummary, actions, suggestions = [] } = msg.cohortCard;
        const isSaved = savedCohortIds.includes(cohort.cohort_id);
        const isInComparison = comparisonCohortIds.includes(cohort.cohort_id);
        const isActive = activeCohortId === cohort.cohort_id;

        return (
            <Box
                w="100%"
                maxW="520px"
                borderRadius="2xl"
                border="1px solid"
                borderColor={cohortCardBorder}
                bg={cohortCardBg}
                shadow="sm"
                overflow="hidden"
            >
                <Box px={4} py={3} bg={cohortCardHeaderBg}>
                    <HStack justify="space-between" align="start" spacing={3}>
                        <HStack spacing={2.5} align="start">
                            <Box p={1.5} bg="teal.500" color="white" borderRadius="lg" flexShrink={0}>
                                <Layers3 size={14} />
                            </Box>
                            <VStack align="start" spacing={0.5}>
                                <Text fontSize="12px" fontWeight="semibold" color={cohortTitleColor}>
                                    {title}
                                </Text>
                                <HStack spacing={2} flexWrap="wrap">
                                    <Badge colorScheme="teal" variant="subtle" borderRadius="full" px={2}>
                                        {cohort.dataset}
                                    </Badge>
                                    <Badge colorScheme="gray" variant="subtle" borderRadius="full" px={2}>
                                        {cohort.sample_count} samples
                                    </Badge>
                                    {isActive && (
                                        <Badge colorScheme="blue" variant="solid" borderRadius="full" px={2}>
                                            Active
                                        </Badge>
                                    )}
                                </HStack>
                            </VStack>
                        </HStack>
                    </HStack>
                </Box>

                <VStack align="stretch" spacing={3} px={4} py={3}>
                    <ProfessionalText text={shortSummary} fontSize="10.5px" color={cohortSummaryColor} />

                    {cohort.filters && cohort.filters.length > 0 && (
                        <HStack spacing={2} flexWrap="wrap">
                            {cohort.filters.slice(0, 4).map((filter: any, index: number) => (
                                <Badge key={`${cohort.cohort_id}-${index}`} colorScheme="purple" variant="subtle" borderRadius="full" px={2} py={0.5} fontSize="9px">
                                    {filter.field}: {Array.isArray(filter.values) ? filter.values.join(', ') : String(filter.values)}
                                </Badge>
                            ))}
                        </HStack>
                    )}

                    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={2}>
                        {actions.map((action) => {
                            const isSaveAction = action.id === 'save_cohort';
                            const isCompareAction = action.id === 'add_to_comparison';
                            const isPlotAction = action.id === 'plot_cohort';
                            const leftIcon = isSaveAction
                                ? <Bookmark size={12} />
                                : isCompareAction
                                    ? <GitCompareArrows size={12} />
                                    : <Orbit size={12} />;

                            const isDisabled = (isSaveAction && isSaved) || (isCompareAction && isInComparison);

                            return (
                                <Button
                                    key={`${cohort.cohort_id}-${action.id}`}
                                    size="sm"
                                    variant={isPlotAction ? 'solid' : 'outline'}
                                    colorScheme={isPlotAction ? 'teal' : 'gray'}
                                    leftIcon={leftIcon}
                                    borderRadius="xl"
                                    fontSize="10px"
                                    onClick={() => onToolAction?.(action)}
                                    isDisabled={isDisabled}
                                >
                                    {isSaveAction && isSaved ? 'Saved' : isCompareAction && isInComparison ? 'In cart' : action.label}
                                </Button>
                            );
                        })}
                    </SimpleGrid>

                    {suggestions.length > 0 && (
                        <HStack spacing={2} flexWrap="wrap" pt={1}>
                            {suggestions.slice(0, 3).map((suggestion) => (
                                <Button
                                    key={`${cohort.cohort_id}-${suggestion}`}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="teal"
                                    borderRadius="full"
                                    fontSize="9px"
                                    onClick={() => onSendMessage(suggestion)}
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </HStack>
                    )}
                </VStack>
            </Box>
        );
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!expandedMsg) return;
        setExpandedView(expandedMsg.htmlBase64 ? 'interactive' : 'image');
    }, [expandedMsg]);

    const handleSend = () => {
        if (input.trim()) {
            onSendMessage(input.trim());
            setInput('');
        }
    };
    
    const handleDownload = (base64Data: string, filename: string, mimeType: string) => {
        const link = document.createElement('a');
        link.href = `data:${mimeType};base64,${base64Data}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <Flex 
            direction="column" 
            h="100%" 
            w="100%" 
            bg={bgColor} 
            backdropFilter="blur(16px)"
            boxShadow="xl"
            border="1px"
            borderColor={borderColor}
            borderRadius="inherit" 
            overflow="hidden"
            fontFamily="inherit"
        >
            <Flex 
                px={4} py={3} 
                align="center" 
                justify="space-between" 
                borderBottom="1px" 
                borderColor={borderColor}
                bg={useColorModeValue('whiteAlpha.600', 'blackAlpha.300')}
            >
                <Flex align="center" justify="space-between" w="full" minW={0}>
                    <HStack spacing={3} minW={0} align="center">
                        <Box p={1.5} bg="blue.500" borderRadius="lg" color="white" flexShrink={0}>
                            <Dna size={16} />
                        </Box>
                        <VStack align="start" spacing={0.5} minW={0}>
                            <Heading size="xs" letterSpacing="tight" noOfLines={1}>GeneTerrain AI</Heading>
                            <HStack spacing={2} color="gray.500" minW={0} align="center" flexWrap="nowrap" h="20px">
                                <Badge colorScheme="green" variant="subtle" borderRadius="full" px={2} py={0.5} fontSize="9px">
                                    Active
                                </Badge>
                                <Text fontSize="11px" fontWeight="medium" lineHeight="20px" whiteSpace="nowrap">
                                    Bioinformatics Expert
                                </Text>
                            </HStack>
                        </VStack>
                    </HStack>
                    <HStack spacing={1} flexShrink={0}>
                        <Tooltip label="Cohort comparison cart" fontSize="xs">
                            <Button
                                size="sm"
                                variant={isCartOpen ? 'solid' : 'ghost'}
                                colorScheme="teal"
                                borderRadius="full"
                                leftIcon={<ShoppingCart size={14} />}
                                onClick={() => setIsCartOpen((prev) => !prev)}
                                fontSize="10px"
                                px={3}
                            >
                                Cart
                                {comparisonCohorts.length > 0 ? ` (${comparisonCohorts.length})` : ''}
                            </Button>
                        </Tooltip>
                        {onClearHistory && (
                            <Tooltip label="Clear History" fontSize="xs">
                                <IconButton
                                    aria-label="Clear history"
                                    icon={<Trash2 size={16} />}
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClearHistory}
                                    color="gray.400"
                                    _hover={{ color: 'red.400', bg: 'red.50' }}
                                />
                            </Tooltip>
                        )}
                        {onClose && (
                            <IconButton
                                aria-label="Close chat"
                                icon={<X size={18} />}
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                color="gray.400"
                            />
                        )}
                    </HStack>
                </Flex>
            </Flex>

            {fileName && (
                <Box px={4} py={2} bg="blue.50" borderBottom="1px" borderColor="blue.100">
                    <HStack spacing={2} overflow="hidden" w="full" minW={0} align="center">
                        <InlineIcon size="12px" color="#3182CE">
                            <Database size={10} />
                        </InlineIcon>
                        <Text fontSize="10px" fontWeight="semibold" color="blue.700" isTruncated lineHeight="12px">
                            Context: {fileName}
                        </Text>
                        {patientCount !== undefined && (
                            <Badge fontSize="8px" colorScheme="blue" variant="subtle" borderRadius="full" px={2}>
                                {patientCount} samples
                            </Badge>
                        )}
                    </HStack>
                </Box>
            )}

            <Collapse in={isCartOpen} animateOpacity>
                <Box px={4} py={3} bg={useColorModeValue('teal.50', 'gray.800')} borderBottom="1px" borderColor={useColorModeValue('teal.100', 'gray.700')}>
                    <VStack align="stretch" spacing={3}>
                        <Flex justify="space-between" align="center">
                            <HStack spacing={2}>
                                <InlineIcon size="12px" color="#0F766E">
                                    <ShoppingCart size={11} />
                                </InlineIcon>
                                <Text fontSize="11px" fontWeight="semibold" color={comparisonCartTitleColor}>
                                    Comparison Cart
                                </Text>
                                <Text fontSize="10px" color="gray.400">
                                    {comparisonCohorts.length}/3
                                </Text>
                            </HStack>
                            <HStack spacing={2}>
                                <Button
                                    size="xs"
                                    colorScheme="teal"
                                    borderRadius="full"
                                    onClick={() => onRunComparisonCart?.()}
                                    isDisabled={comparisonCohorts.length < 2}
                                >
                                    Run comparison
                                </Button>
                                <Tooltip label={`Open side-by-side GeneTerrain terrain maps for ${comparisonCohorts.length} cohort${comparisonCohorts.length !== 1 ? 's' : ''}`} fontSize="xs" hasArrow>
                                    <Button
                                        size="xs"
                                        colorScheme="green"
                                        variant="outline"
                                        borderRadius="full"
                                        onClick={() => onRequestTerrainComparison?.()}
                                        isDisabled={comparisonCohorts.length < 2}
                                        leftIcon={<Orbit size={11} />}
                                    >
                                        Compare Terrains
                                    </Button>
                                </Tooltip>
                            </HStack>
                        </Flex>

                        {comparisonCohorts.length === 0 ? (
                            <Text fontSize="10px" color="gray.500">
                                Add 2–3 cohorts from cohort cards to compare terrains or run a gene expression analysis.
                            </Text>
                        ) : (
                            <VStack align="stretch" spacing={2}>
                                {comparisonCohorts.map((cohort, index) => (
                                    <Flex
                                        key={cohort.cohort_id}
                                        align="center"
                                        justify="space-between"
                                        gap={3}
                                        px={3}
                                        py={2.5}
                                        bg={comparisonCartItemBg}
                                        border="1px solid"
                                        borderColor={comparisonCartItemBorder}
                                        borderRadius="xl"
                                    >
                                        <VStack align="start" spacing={0.5} minW={0}>
                                            <HStack spacing={2}>
                                                <Badge colorScheme="teal" borderRadius="full" px={2}>
                                                    Cohort {index + 1}
                                                </Badge>
                                                <Badge colorScheme="gray" variant="subtle" borderRadius="full" px={2}>
                                                    {cohort.dataset}
                                                </Badge>
                                            </HStack>
                                            <Text fontSize="11px" fontWeight="semibold" color="gray.700" noOfLines={1}>
                                                {cohort.label}
                                            </Text>
                                            <Text fontSize="10px" color="gray.500">
                                                {cohort.sample_count} samples
                                            </Text>
                                        </VStack>
                                        <IconButton
                                            aria-label={`Remove ${cohort.label} from comparison cart`}
                                            icon={<X size={13} />}
                                            size="xs"
                                            variant="ghost"
                                            color="gray.400"
                                            onClick={() => onRemoveComparisonCohort?.(cohort.cohort_id)}
                                        />
                                    </Flex>
                                ))}
                            </VStack>
                        )}
                    </VStack>
                </Box>
            </Collapse>

            <Box 
                flex={1} 
                overflowY="auto" 
                ref={scrollContainerRef}
                p={4}
                css={{
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: '#cbd5e0', borderRadius: '10px' },
                }}
            >
                <VStack spacing={3} align="stretch">
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <MotionFlex 
                                key={msg.id} 
                                justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                            >
                                <VStack align={msg.role === 'user' ? 'flex-end' : 'flex-start'} spacing={1} maxW={msg.imageBase64 ? "100%" : "82%"}>
                                    {msg.cohortCard ? (
                                        renderCohortCard(msg)
                                    ) : msg.imageBase64 ? (
                                        <MotionBox
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            borderRadius="xl"
                                            overflow="hidden"
                                            border="1px solid"
                                            borderColor="blue.100"
                                            shadow="md"
                                            bg="white"
                                            maxW="100%"
                                            position="relative"
                                            role="group"
                                        >
                                            <Flex px={3} py={2} bg="blue.50" align="center" justify="space-between" gap={2}>
                                                <HStack spacing={2} minW={0} align="center">
                                                    <InlineIcon size="14px" color="#3182CE">
                                                        <BarChart2 size={12} />
                                                    </InlineIcon>
                                                    <Text fontSize="11px" fontWeight="semibold" color="blue.700" noOfLines={1} lineHeight="14px">
                                                        {msg.scientificText?.title || msg.content}
                                                    </Text>
                                                </HStack>
                                                <HStack spacing={1} flexShrink={0}>
                                                    {msg.htmlBase64 && (
                                                        <Badge colorScheme="green" fontSize="9px" variant="subtle" borderRadius="full">
                                                            Interactive
                                                        </Badge>
                                                    )}
                                                    <Tooltip label="Expand View" fontSize="xs">
                                                        <IconButton
                                                            aria-label="Expand"
                                                            icon={<Maximize2 size={12} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="blue"
                                                            onClick={() => setExpandedMsg(msg)}
                                                        />
                                                    </Tooltip>
                                                </HStack>
                                            </Flex>
                                            <Box position="relative">
                                                <img
                                                    src={`data:image/png;base64,${msg.imageBase64}`}
                                                    alt="Generated chart"
                                                    style={{ maxWidth: '100%', display: 'block', cursor: 'pointer' }}
                                                    onClick={() => setExpandedMsg(msg)}
                                                />
                                                <Flex 
                                                    position="absolute" 
                                                    inset={0} 
                                                    bg="blackAlpha.400" 
                                                    opacity={0} 
                                                    _groupHover={{ opacity: 1 }} 
                                                    transition="all 0.2s"
                                                    align="center"
                                                    justify="center"
                                                    pointerEvents="none"
                                                >
                                                    <Button 
                                                        size="xs" 
                                                        leftIcon={<Maximize2 size={12} />} 
                                                        colorScheme="blue" 
                                                        onClick={() => setExpandedMsg(msg)}
                                                        fontSize="10px"
                                                        borderRadius="lg"
                                                        shadow="md"
                                                        pointerEvents="auto"
                                                    >
                                                        Expand
                                                    </Button>
                                                </Flex>
                                            </Box>
                                            {msg.scientificText ? (
                                                <ExpandableScientificSummary scientificText={msg.scientificText} />
                                            ) : msg.description && (
                                                <Box px={3} py={2} bg="blue.50" borderTop="1px solid" borderColor="blue.100">
                                                    <HStack spacing={1.5} mb={1} align="center">
                                                        <InlineIcon size="12px" color="#3182CE">
                                                            <Dna size={10} />
                                                        </InlineIcon>
                                                        <Text fontSize="9px" fontWeight="bold" color="blue.700" textTransform="uppercase" lineHeight="12px">Clinical Insight</Text>
                                                    </HStack>
                                                    <Text fontSize="11px" color="gray.700" lineHeight="1.5">
                                                        {msg.description}
                                                    </Text>
                                                </Box>
                                            )}
                                        </MotionBox>
                                    ) : isToolMessage(msg.content) ? (
                                        <HStack
                                            spacing={2}
                                            px={3}
                                            py={1.5}
                                            borderRadius="full"
                                            bg={toolBg}
                                            border="1px solid"
                                            borderColor={toolBorderColor}
                                            maxW="fit-content"
                                            minH="34px"
                                            align="center"
                                        >
                                            <Flex align="center" justify="center" w="10px" h="10px" minW="10px" flexShrink={0}>
                                                <Box w="8px" h="8px" borderRadius="full" bg="blue.400" />
                                            </Flex>
                                            <Text fontSize="10px" color="gray.600" lineHeight="10px" noOfLines={1}>
                                                {formatToolMessage(msg.content)}
                                            </Text>
                                        </HStack>
                                    ) : (
                                        <Box
                                            px={4}
                                            py={3}
                                            bg={msg.role === 'user' ? userMsgBg : botMsgBg}
                                            color={msg.role === 'user' ? 'white' : 'inherit'}
                                            borderRadius="20px"
                                            borderBottomRightRadius={msg.role === 'user' ? '6px' : '20px'}
                                            borderBottomLeftRadius={msg.role === 'assistant' ? '6px' : '20px'}
                                            shadow="sm"
                                            border="1px"
                                            borderColor={msg.role === 'user' ? 'transparent' : borderColor}
                                        >
                                            <ProfessionalText 
                                                text={msg.content} 
                                                fontSize={msg.role === 'user' ? "11px" : "10.5px"} 
                                                color={msg.role === 'user' ? 'white' : 'gray.700'}
                                            />
                                        </Box>
                                    )}
                                    {!isToolMessage(msg.content) && (
                                        <Text fontSize="9px" color="gray.400" px={2} fontWeight="medium">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    )}
                                </VStack>
                            </MotionFlex>
                        ))}
                    </AnimatePresence>
                    
                    {isAnalyzing && (
                        <HStack align="center" spacing={2} px={1} color="gray.500">
                            <Box 
                                w={1.5} h={1.5} borderRadius="full" bg="blue.400" 
                                as={motion.div}
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1 } as any}
                            />
                            <Box 
                                w={1.5} h={1.5} borderRadius="full" bg="blue.400"
                                as={motion.div}
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.2 } as any}
                            />
                            <Box 
                                w={1.5} h={1.5} borderRadius="full" bg="blue.400" 
                                as={motion.div}
                                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1, delay: 0.4 } as any}
                            />
                            <Text fontSize="10px" fontWeight="medium">Analyzing</Text>
                        </HStack>
                    )}
                    <div ref={messagesEndRef} />
                </VStack>
            </Box>

            {!isAnalyzing && messages.length < 3 && (
                <VStack px={4} pb={2} spacing={1.5} align="start" w="full">
                    {datasetId && DATASET_SUGGESTIONS[datasetId.toUpperCase()] && (
                        <Text fontSize="9px" color="gray.400" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.05em">
                            Suggested for {datasetId.toUpperCase()}
                        </Text>
                    )}
                    <HStack spacing={2} overflowX="auto" overflowY="hidden" w="full" css={{ '&::-webkit-scrollbar': { display: 'none' } }} pb={0.5}>
                        {(
                            DATASET_SUGGESTIONS[datasetId?.toUpperCase() ?? ''] ??
                            DATASET_SUGGESTIONS['DEFAULT']
                        ).map(({ label, prompt }) => (
                            <Button
                                key={label}
                                size="xs"
                                variant="outline"
                                colorScheme={datasetId?.toUpperCase() === 'GBM' ? 'purple' : datasetId?.toUpperCase() === 'BRCA' ? 'pink' : 'blue'}
                                onClick={() => onSendMessage(prompt)}
                                fontSize="10px"
                                px={3}
                                h={7}
                                borderRadius="full"
                                flexShrink={0}
                                whiteSpace="nowrap"
                            >
                                {label}
                            </Button>
                        ))}
                    </HStack>
                </VStack>
            )}

            <Box p={4} bg={useColorModeValue('white', 'gray.800')} borderTop="1px" borderColor={borderColor}>
                <VStack spacing={2} w="full">
                    <HStack spacing={2} w="full">
                        <Input
                            placeholder="Ask about cohorts, genes, trends, or embeddings"
                            size="sm"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            bg={inputBg}
                            borderRadius="xl"
                            border="1px"
                            borderColor={borderColor}
                            _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px rgba(66, 153, 225, 0.6)' }}
                            fontSize="12px"
                            h={10}
                        />
                        <IconButton
                            aria-label="Send"
                            icon={isAnalyzing ? <Spinner size="xs" /> : <Send size={18} />}
                            onClick={handleSend}
                            isLoading={isAnalyzing}
                            colorScheme="blue"
                            borderRadius="xl"
                            size="md"
                            h={10}
                            w={10}
                            bgGradient="linear(to-br, blue.400, blue.600)"
                            _hover={{ bgGradient: "linear(to-br, blue.500, blue.700)" }}
                        />
                    </HStack>
                    <HStack
                        spacing={4}
                        justify="center"
                        align="center"
                        w="full"
                        color="gray.500"
                        flexWrap="wrap"
                    >
                        <HStack spacing={1.5} align="center" h="14px">
                            <InlineIcon size="12px" color="currentColor">
                                <HelpCircle size={10} />
                            </InlineIcon>
                            <Text fontSize="10px" lineHeight="14px">Powered by Gemini</Text>
                        </HStack>
                        <HStack spacing={1.5} align="center" h="14px">
                            <InlineIcon size="12px">
                                <Box w="8px" h="8px" borderRadius="full" bg="green.400" />
                            </InlineIcon>
                            <Text fontSize="10px" lineHeight="14px">Bioinformatics Agent connected</Text>
                        </HStack>
                    </HStack>
                </VStack>
            </Box>

            {/* --- Expanded Image Modal --- */}
            <Modal isOpen={!!expandedMsg} onClose={() => setExpandedMsg(null)} size="5xl" isCentered motionPreset="slideInBottom">
                <ModalOverlay backdropFilter="blur(10px) saturate(180%)" bg="blackAlpha.600" />
                <ModalContent borderRadius="2xl" overflow="hidden" boxShadow="2xl">
                    <ModalHeader bg={useColorModeValue('white', 'gray.800')} py={4} borderBottom="1px" borderColor={borderColor}>
                        <Flex justify="space-between" align="center">
                            <HStack>
                                <Box p={2} bg="blue.50" borderRadius="lg">
                                    <BarChart2 size={18} color="#3182CE" />
                                </Box>
                                <VStack align="start" spacing={0}>
                                    <Text fontSize="12px" fontWeight="semibold" color="gray.700">Detailed Chart Visualization</Text>
                                    <ProfessionalText text={expandedMsg?.content || ""} fontSize="10px" color="gray.500" />
                                </VStack>
                            </HStack>
                            <HStack spacing={3} mr={8}>
                                {expandedMsg?.htmlBase64 && (
                                    <HStack spacing={1} bg="gray.100" p={1} borderRadius="lg">
                                        <Button
                                            size="sm"
                                            variant={expandedView === 'interactive' ? 'solid' : 'ghost'}
                                            colorScheme="green"
                                            onClick={() => setExpandedView('interactive')}
                                        >
                                            Interactive
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={expandedView === 'image' ? 'solid' : 'ghost'}
                                            colorScheme="blue"
                                            onClick={() => setExpandedView('image')}
                                        >
                                            Image
                                        </Button>
                                    </HStack>
                                )}
                                <Menu>
                                    <MenuButton 
                                        as={Button} 
                                        size="md" 
                                        colorScheme="blue" 
                                        leftIcon={<Download size={16} />} 
                                        rightIcon={<ChevronDown size={14} />}
                                        borderRadius="xl"
                                        shadow="lg"
                                        bgGradient="linear(to-br, blue.400, blue.600)"
                                        _hover={{ bgGradient: "linear(to-br, blue.500, blue.700)", transform: 'translateY(-1px)', shadow: 'xl' }}
                                        _active={{ transform: 'translateY(0)' }}
                                    >
                                        Download
                                    </MenuButton>
                                    <Portal>
                                        <MenuList borderRadius="xl" shadow="2xl" p={2} borderColor={borderColor} zIndex={4000}>
                                            <MenuItem 
                                                icon={<ImageIcon size={16} />} 
                                                onClick={() => expandedMsg?.imageBase64 && handleDownload(expandedMsg.imageBase64, 'chart.png', 'image/png')}
                                                borderRadius="lg"
                                                fontSize="sm"
                                                fontWeight="medium"
                                                _hover={{ bg: 'blue.50', color: 'blue.600' }}
                                            >
                                                Image (PNG)
                                            </MenuItem>
                                            {expandedMsg?.pdfBase64 && (
                                                <MenuItem 
                                                    icon={<FileText size={16} />} 
                                                    onClick={() => handleDownload(expandedMsg.pdfBase64!, 'chart.pdf', 'application/pdf')}
                                                    borderRadius="lg"
                                                    fontSize="sm"
                                                    fontWeight="medium"
                                                    _hover={{ bg: 'red.50', color: 'red.600' }}
                                                >
                                                    Document (PDF)
                                                </MenuItem>
                                            )}
                                            {expandedMsg?.svgBase64 && (
                                                <MenuItem 
                                                    icon={<BarChart2 size={16} />} 
                                                    onClick={() => handleDownload(expandedMsg.svgBase64!, 'chart.svg', 'image/svg+xml')}
                                                    borderRadius="lg"
                                                    fontSize="sm"
                                                    fontWeight="medium"
                                                    _hover={{ bg: 'green.50', color: 'green.600' }}
                                                >
                                                    Vector (SVG)
                                                </MenuItem>
                                            )}
                                        </MenuList>
                                    </Portal>
                                </Menu>
                            </HStack>
                        </Flex>
                        <ModalCloseButton mt={1.5} mr={1} borderRadius="full" />
                    </ModalHeader>
                    <ModalBody p={0} bg={useColorModeValue('gray.50', 'gray.900')}>
                        <Flex direction="column" align="center" minH="500px">
                            {expandedMsg?.htmlBase64 && expandedView === 'interactive' ? (
                                <Box p={6} w="100%" textAlign="center">
                                    <Box
                                        as="iframe"
                                        src={`data:text/html;base64,${expandedMsg.htmlBase64}`}
                                        title="Interactive chart"
                                        w="100%"
                                        h="65vh"
                                        border="0"
                                        borderRadius="12px"
                                        bg="white"
                                        boxShadow="0 20px 50px rgba(0,0,0,0.15)"
                                    />
                                </Box>
                            ) : expandedMsg?.imageBase64 && (
                                <Box p={6} w="100%" textAlign="center">
                                    <img 
                                        src={`data:image/png;base64,${expandedMsg.imageBase64}`} 
                                        alt="Expanded chart" 
                                        style={{ 
                                            borderRadius: '12px', 
                                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                                            maxHeight: '65vh',
                                            margin: '0 auto'
                                        }} 
                                    />
                                </Box>
                            )}
                            {expandedMsg?.scientificText ? (
                                <Box w="100%" px={12} pb={12}>
                                    <VStack align="stretch" p={0} bg="white" borderRadius="2xl" border="1px" borderColor="blue.100" shadow="xl" spacing={0} overflow="hidden">
                                        <Box p={8} bg="blue.50" borderBottom="1px" borderColor="blue.100">
                                            <HStack spacing={2} mb={4}>
                                                <Box p={1.5} bg="blue.500" borderRadius="md" color="white">
                                                    <Dna size={14} />
                                                </Box>
                                                <Heading size="xs" color="blue.700" letterSpacing="wide" textTransform="uppercase">Clinical Diagnostic Summary</Heading>
                                            </HStack>
                                            
                                            {/* High Impact Key Finding */}
                                            {expandedMsg.scientificText.key_finding && (
                                                <Box mb={6} p={6} bg="white" borderRadius="xl" border="2px solid" borderColor="blue.200" shadow="md">
                                                    <Text fontSize="10px" fontWeight="black" color="blue.600" mb={3} textTransform="uppercase" letterSpacing="widest">Key Clinical Finding</Text>
                                                    <ProfessionalText 
                                                        text={expandedMsg.scientificText.key_finding} 
                                                        fontSize="11.5px" 
                                                        color="gray.800" 
                                                        fontWeight="medium" 
                                                    />
                                                </Box>
                                            )}

                                            <Box px={2}>
                                                <Text fontSize="10px" fontWeight="bold" color="gray.500" mb={2} textTransform="uppercase" letterSpacing="widest">Core Insight</Text>
                                                <ProfessionalText text={expandedMsg.scientificText.short_summary} fontSize="10.5px" color="gray.700" />
                                            </Box>
                                        </Box>
                                        
                                        <Box p={8} bg={modalBodyBg}>
                                            <VStack align="stretch" spacing={6}>
                                                <Box>
                                                    <Text fontSize="10px" fontWeight="bold" color="blue.500" mb={2} textTransform="uppercase" letterSpacing="widest">Full Biological Context</Text>
                                                    <ProfessionalText text={expandedMsg.scientificText.detailed_summary?.main_finding ?? ''} fontSize="10.5px" color="gray.700" />
                                                </Box>
                                            </VStack>
                                        </Box>
                                    </VStack>
                                </Box>
                            ) : expandedMsg?.description && (
                                <Box w="100%" px={12} pb={12}>
                                    <VStack align="start" p={6} bg="white" borderRadius="2xl" border="1px" borderColor="blue.100" shadow="xl" spacing={3}>
                                        <HStack spacing={2}>
                                            <Box p={1.5} bg="blue.500" borderRadius="md" color="white">
                                                <Dna size={14} />
                                            </Box>
                                            <Heading size="xs" color="blue.700" letterSpacing="widest" textTransform="uppercase">Clinical Interpretation</Heading>
                                        </HStack>
                                        <Text fontSize="10.5px" color="gray.700" lineHeight="1.7" fontWeight="medium">
                                            {expandedMsg.description}
                                        </Text>
                                        <Box h="2px" w="40px" bg="blue.400" borderRadius="full" />
                                    </VStack>
                                </Box>
                            )}
                        </Flex>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Flex>
    );
};

export default ChatPanel;
