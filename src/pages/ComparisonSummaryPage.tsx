import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Bar,
    Scatter,
    ResponsiveContainer,
    Cell,
    Tooltip as ReTooltip,
} from "recharts";
import { DataSet, Network } from "vis-network/standalone";
import {
    Box,
    Flex,
    Text,
    Heading,
    Button,
    SimpleGrid,
    Stack,
    Icon,
    Spinner,
    useTheme,
    Badge,
    Card,
    CardBody,
    CardHeader,
    VStack,
    HStack,
    Divider,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    useToast,
} from "@chakra-ui/react";
import {
    Activity,
    BarChart2,
    Share2,
    Trash2,
    AlertCircle,
    Info,
    ArrowLeft,
    Dna,
    CheckCircle,
    Download,
    FileText,
    FileCode,
} from "lucide-react";
import { Point } from "../GaussianPlots/types";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

// ────────────────────────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────────────────────────
const ENRICHR_BASE = "https://maayanlab.cloud/Enrichr";
const ENRICHR_LIBRARY = "GO_Biological_Process_2023";

type EnrichrRow = {
    category: string;
    fold: number;
    fdr: number;
    genes: number;
    overlapGenes: string[];
};

interface ComparisonData {
    left: {
        genes: Point[];
        label: string;
        sampleCount: number;
        summary?: string;
    };
    right: {
        genes: Point[];
        label: string;
        sampleCount: number;
        summary?: string;
    };
    timestamp: number;
}

// ────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────
function colorScale(value: number, metric: "fdr" | "fold" | "genes") {
    // Adjusted colors to match theme (green/teal/lime spectrum or heat map)
    // Using a heatmap scale: Purple -> Pink -> Red
    if (metric === "fdr") {
        if (value > 14) return "#e51f25";
        if (value > 10) return "#d9265f";
        if (value > 6) return "#a846b1";
        if (value > 3) return "#8b54c7";
        return "#6f5fcf";
    } else if (metric === "fold") {
        if (value > 100) return "#e51f25";
        if (value > 70) return "#d9265f";
        if (value > 50) return "#a846b1";
        if (value > 25) return "#8b54c7";
        return "#6f5fcf";
    } else {
        if (value > 20) return "#e51f25";
        if (value > 15) return "#d9265f";
        if (value > 10) return "#a846b1";
        if (value > 5) return "#8b54c7";
        return "#6f5fcf";
    }
}

function cleanDescription(desc: string): string {
    const c = desc
        .toLowerCase()
        .replace(/^(positive |negative )?regulation of |involved in| process$|^cellular /, "")
        .replace(/pathway$/, "")
        .trim();
    return c.charAt(0).toUpperCase() + c.slice(1);
}

function wrapLabel(s: string, lineLen = 18, maxLines = 3): string {
    const words = s.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
        const test = (line ? line + " " : "") + w;
        if (test.length > lineLen) {
            lines.push(line);
            line = w;
            if (lines.length >= maxLines - 1) break;
        } else {
            line = test;
        }
    }
    if (lines.length < maxLines && line) lines.push(line);
    return lines.join("\n");
}

function intersectCount(a: string[], b: string[]) {
    if (!a?.length || !b?.length) return 0;
    const setA = new Set(a);
    let c = 0;
    for (const g of b) if (setA.has(g)) c++;
    return c;
}

async function runEnrichr(genes: string[], library = ENRICHR_LIBRARY): Promise<EnrichrRow[]> {
    if (!genes.length) return [];
    const fd = new FormData();
    fd.append("list", genes.join("\n"));
    fd.append("description", "Selection genes");

    const addRes = await fetch(`${ENRICHR_BASE}/addList`, { method: "POST", body: fd });
    const addJson = await addRes.json();
    const userListId = addJson.userListId;

    const enrRes = await fetch(
        `${ENRICHR_BASE}/enrich?userListId=${userListId}&backgroundType=${encodeURIComponent(library)}`
    );
    const enrJson = await enrRes.json();
    const table: any[] = enrJson[library] || [];

    const parsed: EnrichrRow[] = table.map((r: any[]) => {
        const term = String(r?.[1] ?? "");
        const combined = Number(r?.[4] ?? 0);
        const overlapRaw = r?.[5];
        const adjP = Number(r?.[6] ?? 1);

        const overlapArr = Array.isArray(overlapRaw)
            ? overlapRaw.filter(Boolean)
            : typeof overlapRaw === "string"
                ? overlapRaw.split(/[;,\s/]+/).filter(Boolean)
                : [];

        const fdrNegLog10 = adjP > 0 ? +(-Math.log10(adjP)).toFixed(2) : 0;
        return {
            category: term,
            fold: Math.round(combined),
            fdr: fdrNegLog10,
            genes: overlapArr.length,
            overlapGenes: overlapArr as string[],
        };
    });

    parsed.sort((a, b) => b.fold - a.fold || a.category.localeCompare(b.category));
    return parsed;
}

// ────────────────────────────────────────────────────────────
// Mini Components
// ────────────────────────────────────────────────────────────
const GenesMini = ({ genes }: { genes: Point[] }) => {
    const sortedItems = [...genes].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const theme = useTheme();

    const MAX_ABS = 4;
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    return (
        <Box maxH="400px" overflowY="auto" pr={2}>
            {sortedItems.map((gene, i) => {
                const v = gene.value;
                const ratio = clamp01(Math.abs(v) / MAX_ABS);
                const isPositive = v >= 0;
                const negWidthPct = isPositive ? 0 : Math.round(ratio * 100);
                const posWidthPct = isPositive ? Math.round(ratio * 100) : 0;
                // Use theme colors if possible, else standard red/blue for expression
                const color = isPositive ? "#d13a3aff" : "#3182CE";

                return (
                    <Box key={i} pb={2}>
                        <SimpleGrid templateColumns="80px 1fr" gap={2} alignItems="start">
                            <Text
                                fontSize="xs"
                                fontWeight="bold"
                                noOfLines={1}
                                title={gene.geneName}
                                color="geneTerrain.textPrimary"
                            >
                                {gene.geneName}
                            </Text>
                            <Box>
                                <Box
                                    pos="relative"
                                    h="12px"
                                    bg="gray.50"
                                    borderRadius="full"
                                    overflow="hidden"
                                    border="1px solid"
                                    borderColor="gray.200"
                                    display="grid"
                                    gridTemplateColumns="1fr 1fr"
                                >
                                    <Box
                                        aria-hidden
                                        pos="absolute"
                                        left="50%"
                                        top={0}
                                        bottom={0}
                                        w="1px"
                                        bg="gray.300"
                                        zIndex={2}
                                    />
                                    <Box pos="relative">
                                        <Box
                                            pos="absolute"
                                            right={0}
                                            top={0}
                                            bottom={0}
                                            w={`${negWidthPct}%`}
                                            bg="#3182CE"
                                            zIndex={1}
                                        />
                                    </Box>
                                    <Box pos="relative">
                                        <Box
                                            pos="absolute"
                                            left={0}
                                            top={0}
                                            bottom={0}
                                            w={`${posWidthPct}%`}
                                            bg="#d13a3aff"
                                            zIndex={1}
                                        />
                                    </Box>
                                </Box>
                                <Flex justify="flex-end" mt={1}>
                                    <Text fontSize="2xs" color={color}>
                                        {v.toFixed(2)}
                                    </Text>
                                </Flex>
                            </Box>
                        </SimpleGrid>
                    </Box>
                );
            })}
        </Box>
    );
};

function LollipopMini({ data }: { data: EnrichrRow[] }) {
    const sorted = [...data].sort((a, b) => (b.fold ?? 0) - (a.fold ?? 0));
    const rows = sorted.slice(0, 10);
    const maxX = Math.max(1, ...rows.map(r => r.fold ?? 0));
    const scaledMax = Math.ceil((maxX * 1.1) / 10) * 10;
    const domain: [number, number] = [0, scaledMax];
    const maxGenes = Math.max(1, ...rows.map(r => r.genes ?? 0));

    return (
        <Box w="100%" h="400px">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" domain={domain} tick={{ fill: "#4a5568", fontSize: 11 }} />
                    <YAxis
                        dataKey="category"
                        type="category"
                        width={140}
                        tick={{ fill: "#2d3748", fontSize: 10 }}
                        tickFormatter={(val) => cleanDescription(val).substring(0, 20) + "..."}
                    />
                    <Bar dataKey="fold" barSize={8} radius={[2, 2, 2, 2]}>
                        {rows.map((d, i) => (
                            <Cell key={`stem-${i}`} fill={colorScale(d.fdr, "fdr")} />
                        ))}
                    </Bar>
                    <Scatter
                        dataKey="fold"
                        shape={(props: any) => {
                            const { cx, cy, payload } = props;
                            const r = 4 + (payload.genes / maxGenes) * 8;
                            return <circle cx={cx} cy={cy} r={r} fill={colorScale(payload.fdr, "fdr")} />;
                        }}
                    />
                    <ReTooltip />
                </ComposedChart>
            </ResponsiveContainer>
        </Box>
    );
}

function NetworkMiniPaths({ rows }: { rows: EnrichrRow[] }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!wrapRef.current || !rows.length) return;
        const items = rows.slice(0, 10);
        const nodes = new DataSet(
            items.map((r, i) => ({
                id: i + 1,
                label: wrapLabel(cleanDescription(r.category)),
                shape: "dot",
                size: 15 + (r.genes / Math.max(1, ...items.map(d => d.genes))) * 20,
                color: colorScale(r.fdr, "fdr"),
                font: { size: 10, face: "Inter" },
            }))
        );
        const edgesArr: any[] = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const c = intersectCount(items[i].overlapGenes, items[j].overlapGenes);
                if (c > 0)
                    edgesArr.push({ from: i + 1, to: j + 1, width: 1 + Math.log2(1 + c), color: "#ddd" });
            }
        }
        const network = new Network(
            wrapRef.current,
            { nodes, edges: new DataSet(edgesArr) },
            {
                physics: { solver: "forceAtlas2Based" },
                interaction: { zoomView: true, dragView: true },
            }
        );
        return () => network.destroy();
    }, [rows]);
    return <Box ref={wrapRef} w="100%" h="400px" />;
}

// ────────────────────────────────────────────────────────────
// Layout Components
// ────────────────────────────────────────────────────────────
const Sidebar = ({ activeCards, toggleCard }: { activeCards: string[]; toggleCard: (id: string) => void }) => {
    return (
        <Box
            w="240px"
            bg="white"
            borderRight="1px"
            borderColor="geneTerrain.border"
            h="100vh"
            pos="sticky"
            top={0}
            zIndex={100}
        >
            <Box p={4} borderBottom="1px" borderColor="geneTerrain.border">
                <Heading size="md" color="geneTerrain.primary">
                    Comparison
                </Heading>
            </Box>
            <Box p={3}>
                <Text
                    fontSize="xs"
                    fontWeight="bold"
                    textTransform="uppercase"
                    color="gray.500"
                    mb={2}
                    px={2}
                >
                    Sections
                </Text>
                <VStack align="stretch" spacing={1}>
                    {[
                        { id: "genes", label: "Gene Activity", icon: Activity },
                        { id: "pathways", label: "Pathways", icon: BarChart2 },
                        { id: "network", label: "Network", icon: Share2 },
                    ].map((card) => {
                        const isActive = activeCards.includes(card.id);
                        return (
                            <Button
                                key={card.id}
                                variant="ghost"
                                justifyContent="space-between"
                                isActive={isActive}
                                onClick={() => toggleCard(card.id)}
                                color={isActive ? "geneTerrain.primary" : "gray.600"}
                                bg={isActive ? "gray.50" : "transparent"}
                                _hover={{ bg: "gray.50" }}
                                size="sm"
                                h="auto"
                                py={3}
                            >
                                <HStack>
                                    <Icon as={card.icon} boxSize={4} />
                                    <Text>{card.label}</Text>
                                </HStack>
                                {isActive && <Box w="6px" h="6px" borderRadius="full" bg="geneTerrain.accent1" />}
                            </Button>
                        );
                    })}
                </VStack>
            </Box>
        </Box>
    );
};

const StatCard = ({
    label,
    value,
    subtext,
}: {
    label: string;
    value: string | number;
    subtext?: string;
}) => (
    <Card variant="outline" borderColor="geneTerrain.border" shadow="sm">
        <CardBody p={4}>
            <Flex justify="space-between" align="start" mb={2}>
                <Heading size="lg" color="geneTerrain.textPrimary">
                    {value}
                </Heading>
                <Box
                    w="40px"
                    h="60px"
                    bg="geneTerrain.primary"
                    opacity={0.1}
                    borderRadius="md"
                    pos="absolute"
                    right={4}
                    top={4}
                />
            </Flex>
            <Text fontSize="sm" color="gray.500" noOfLines={1}>
                {label}
            </Text>
            {subtext && (
                <Text fontSize="xs" fontWeight="bold" color="geneTerrain.primary" mt={1}>
                    {subtext}
                </Text>
            )}
        </CardBody>
    </Card>
);

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────
export default function ComparisonSummaryPage() {
    const [data, setData] = useState<ComparisonData | null>(null);
    const [leftEnrichRows, setLeftEnrichRows] = useState<EnrichrRow[]>([]);
    const [rightEnrichRows, setRightEnrichRows] = useState<EnrichrRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCards, setActiveCards] = useState(["genes", "pathways", "network"]);
    const [aiSummary, setAiSummary] = useState<string>("");
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const toast = useToast();

    useEffect(() => {
        const raw = localStorage.getItem("COMPARISON_SUMMARY_DATA");
        if (raw) {
            const parsed = JSON.parse(raw) as ComparisonData;
            setData(parsed);

            // Run enrichr for both sides
            const leftGenes = parsed.left.genes.map((g) => g.geneName);
            const rightGenes = parsed.right.genes.map((g) => g.geneName);

            Promise.all([runEnrichr(leftGenes), runEnrichr(rightGenes)])
                .then(([left, right]) => {
                    setLeftEnrichRows(left);
                    setRightEnrichRows(right);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const toggleCard = (id: string) => {
        setActiveCards((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
    };

    const prepareExportContent = () => {
        if (!contentRef.current) return null;

        // Clone the content
        const clone = contentRef.current.cloneNode(true) as HTMLDivElement;

        // Find all canvases in the ORIGINAL content
        const originalCanvases = contentRef.current.querySelectorAll("canvas");
        const clonedCanvases = clone.querySelectorAll("canvas");

        // Replace each cloned canvas with an image from the original
        originalCanvases.forEach((canvas, index) => {
            try {
                const dataUrl = canvas.toDataURL("image/png");
                const img = document.createElement("img");
                img.src = dataUrl;

                // Copy styles and classes to the image to maintain layout
                img.className = canvas.className;
                img.style.cssText = canvas.style.cssText;
                img.style.width = "100%";
                img.style.height = "auto";
                img.style.display = "block";

                const parent = clonedCanvases[index].parentNode;
                if (parent) {
                    parent.replaceChild(img, clonedCanvases[index]);
                }
            } catch (e) {
                console.warn("Failed to capture canvas:", e);
            }
        });

        return clone;
    };

    const handleExportPDF = async () => {
        if (!contentRef.current) return;
        setIsExporting(true);

        // Create a temporary container to render the processed clone
        const tempContainer = document.createElement("div");
        tempContainer.style.position = "absolute";
        tempContainer.style.left = "-9999px";
        tempContainer.style.top = "0";
        tempContainer.style.width = `${contentRef.current.offsetWidth}px`;
        tempContainer.style.background = "#ffffff";
        tempContainer.style.padding = "20px";

        const processedContent = prepareExportContent();
        if (!processedContent) {
            setIsExporting(false);
            return;
        }

        document.body.appendChild(tempContainer);
        tempContainer.appendChild(processedContent);

        try {
            // Give a tiny moment for images to settle if needed
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(tempContainer, {
                backgroundColor: "#ffffff",
                quality: 1.0,
                pixelRatio: 2 // High resolution
            });

            const pdf = new jsPDF("p", "mm", "a4");
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Handle multi-page if content is long
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Comparison_Summary_${Date.now()}.pdf`);

            toast({
                title: "Export Successful",
                description: "Your summary has been exported as PDF.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error("PDF export failed:", error);
            toast({
                title: "Export Failed",
                description: "Could not generate PDF.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            document.body.removeChild(tempContainer);
            setIsExporting(false);
        }
    };

    const handleExportHTML = async () => {
        if (!contentRef.current) return;
        setIsExporting(true);
        try {
            const processedContent = prepareExportContent();
            if (!processedContent) throw new Error("Processing failed");

            const contentHtml = processedContent.innerHTML;
            const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
                .map(node => node.outerHTML)
                .join("\n");

            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Comparison Summary - GeneTerrain</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
                    ${styles}
                    <style>
                        body { margin: 0; padding: 20px; background: #f8f9fa; font-family: 'Inter', sans-serif; }
                        .export-container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    <div class="export-container">
                        ${contentHtml}
                    </div>
                </body>
                </html>
            `;

            const blob = new Blob([fullHtml], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Comparison_Summary_${Date.now()}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Export Successful",
                description: "Your summary has been exported as HTML.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error("HTML export failed:", error);
            toast({
                title: "Export Failed",
                description: "Could not generate HTML.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsExporting(false);
        }
    };

    // Generate AI summary
    const generateAISummary = async () => {
        if (!data) return;

        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
        if (!apiKey) {
            setAiSummary("OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your environment.");
            return;
        }

        setIsSummaryLoading(true);

        const topLeftPathways = leftEnrichRows
            .slice(0, 5)
            .map((r) => r.category)
            .join(", ");
        const topRightPathways = rightEnrichRows
            .slice(0, 5)
            .map((r) => r.category)
            .join(", ");

        const prompt = `
You are a bioinformatics expert analyzing a comparison between two gene expression datasets.

**Left Selection (${data.left.label}):**
- Total genes: ${data.left.genes.length}
- Average expression: ${leftAvg.toFixed(2)}
- Sample count: ${data.left.sampleCount}
- Top pathways: ${topLeftPathways || "None found"}
- Top genes: ${data.left.genes
                .slice(0, 5)
                .map((g) => `${g.geneName} (${g.value.toFixed(2)})`)
                .join(", ")}

**Right Selection (${data.right.label}):**
- Total genes: ${data.right.genes.length}
- Average expression: ${rightAvg.toFixed(2)}
- Sample count: ${data.right.sampleCount}
- Top pathways: ${topRightPathways || "None found"}
- Top genes: ${data.right.genes
                .slice(0, 5)
                .map((g) => `${g.geneName} (${g.value.toFixed(2)})`)
                .join(", ")}

**Overlap:**
- Common genes: ${overlapGenes.length}
- Unique to left: ${uniqueLeft.length}
- Unique to right: ${uniqueRight.length}

Provide a comprehensive interpretation covering:

1. **Gene Expression Patterns**: What do the gene values mean? Are they upregulated (positive) or downregulated (negative)? What's the biological significance?

2. **Pathway Analysis**: What biological processes are enriched? What do these pathways tell us?

3. **Network Interactions**: How might the genes interact? What functional relationships exist?

4. **Comparison Insights**: What are the key differences and similarities? What might this reveal?

5. **Biological Context**: What could these findings suggest about the biological state being studied?

Format your response in clear sections with headers. Be specific and scientifically accurate. Keep it concise (3-4 paragraphs max).
        `;

        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a bioinformatics expert providing clear, scientific interpretations of gene expression data.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.7,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                const content = result.choices[0]?.message?.content;
                if (content) setAiSummary(content.trim());
            } else {
                setAiSummary("Failed to generate AI summary. Please try again.");
            }
        } catch (error) {
            console.error("Error generating AI summary:", error);
            setAiSummary("Error generating AI summary. Please check your API key and try again.");
        } finally {
            setIsSummaryLoading(false);
        }
    };

    // Calculate comparisons stats
    const overlapGenes = useMemo(() => {
        if (!data) return [];
        return data.left.genes.filter((lg) =>
            data.right.genes.some((rg) => rg.geneId === lg.geneId)
        );
    }, [data]);

    const uniqueLeft = useMemo(() => {
        if (!data) return [];
        return data.left.genes.filter((lg) =>
            !data.right.genes.some((rg) => rg.geneId === lg.geneId)
        );
    }, [data]);

    const uniqueRight = useMemo(() => {
        if (!data) return [];
        return data.right.genes.filter((rg) =>
            !data.left.genes.some((lg) => lg.geneId === rg.geneId)
        );
    }, [data]);

    const leftAvg = useMemo(() => {
        if (!data || data.left.genes.length === 0) return 0;
        return data.left.genes.reduce((sum, g) => sum + g.value, 0) / data.left.genes.length;
    }, [data]);

    const rightAvg = useMemo(() => {
        if (!data || data.right.genes.length === 0) return 0;
        return data.right.genes.reduce((sum, g) => sum + g.value, 0) / data.right.genes.length;
    }, [data]);

    if (isLoading)
        return (
            <Flex justify="center" align="center" h="100vh" bg="gray.50">
                <Spinner size="xl" color="geneTerrain.primary" />
            </Flex>
        );

    if (!data)
        return (
            <Box p={10} textAlign="center">
                <Card maxW="lg" mx="auto" p={8}>
                    <VStack spacing={4}>
                        <Icon as={AlertCircle} boxSize={12} color="geneTerrain.accent2" />
                        <Heading size="md">No comparison data found</Heading>
                        <Text color="gray.500">
                            Please create lasso selections in the comparison view.
                        </Text>
                        <Button
                            leftIcon={<ArrowLeft />}
                            onClick={() => window.history.back()}
                            colorScheme="gray"
                        >
                            Go Back
                        </Button>
                    </VStack>
                </Card>
            </Box>
        );

    return (
        <Flex minH="100vh" bg="gray.50" fontFamily="'Inter', sans-serif">
            <Sidebar activeCards={activeCards} toggleCard={toggleCard} />

            <Box flex="1" p={8} overflowY="auto">
                {/* Header */}
                <Flex justify="space-between" align="center" mb={6}>
                    <Box>
                        {/* <Button variant="link" size="sm" mb={2} onClick={() => window.history.back()}>
                            <ArrowLeft size={16} style={{ marginRight: 8 }} />
                            Back to Comparison
                        </Button> */}
                        <Heading size="lg" color="geneTerrain.primary" mb={1}>
                            Comparison Summary
                        </Heading>
                        <Text color="gray.500">
                            {data.left.label} vs {data.right.label}
                        </Text>
                    </Box>
                    <Menu>
                        <MenuButton
                            as={Button}
                            rightIcon={<Download size={16} />}
                            colorScheme="blue"
                            variant="outline"
                            size="sm"
                            isLoading={isExporting}
                            loadingText="Exporting..."
                        >
                            Export
                        </MenuButton>
                        <MenuList>
                            <MenuItem icon={<FileText size={16} />} onClick={handleExportPDF}>
                                Save as PDF
                            </MenuItem>
                            <MenuItem icon={<FileCode size={16} />} onClick={handleExportHTML}>
                                Save as HTML
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </Flex>

                <Box ref={contentRef}>

                    {/* Stats Row */}
                    <SimpleGrid columns={[1, 2, 4]} gap={4} mb={8}>
                        <StatCard
                            label="Left Genes"
                            value={data.left.genes.length}
                            subtext={`Avg: ${leftAvg.toFixed(2)}`}
                        />
                        <StatCard
                            label="Right Genes"
                            value={data.right.genes.length}
                            subtext={`Avg: ${rightAvg.toFixed(2)}`}
                        />
                        <StatCard label="Overlap" value={overlapGenes.length} subtext="Common genes" />
                        {/* Extra empty box to align to grid if needed, or just 3 cols */}
                    </SimpleGrid>

                    {/* AI Summary Display */}
                    {(data.left.summary || data.right.summary) && (
                        <Box mb={8}>
                            <Card
                                bg="geneTerrain.primary"
                                color="white"
                                variant="filled"
                                overflow="hidden"
                                pos="relative"
                            >
                                <Box
                                    pos="absolute"
                                    top="-10%"
                                    right="-5%"
                                    boxSize="200px"
                                    bg="whiteAlpha.100"
                                    borderRadius="full"
                                />
                                <CardBody>
                                    <Flex align="center" mb={4}>
                                        <Icon as={Dna} boxSize={6} color="geneTerrain.accent2" mr={2} />
                                        <Heading size="md" color="white">
                                            AI Comparison Analysis
                                        </Heading>
                                    </Flex>
                                    <SimpleGrid columns={[1, 2]} gap={6}>
                                        <Box pr={{ md: 6 }} borderRight={{ md: "1px solid white" }} borderColor="whiteAlpha.300">
                                            <Heading size="sm" mb={2} color="geneTerrain.accent1">
                                                {data.left.label}
                                            </Heading>
                                            <Text fontSize="sm" opacity={0.9} lineHeight="tall">
                                                {data.left.summary || "No summary available."}
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Heading size="sm" mb={2} color="geneTerrain.accent1">
                                                {data.right.label}
                                            </Heading>
                                            <Text fontSize="sm" opacity={0.9} lineHeight="tall">
                                                {data.right.summary || "No summary available."}
                                            </Text>
                                        </Box>
                                    </SimpleGrid>
                                </CardBody>
                            </Card>
                        </Box>
                    )}

                    {/* Comparison Grid */}
                    <VStack spacing={6} align="stretch" w="100%">
                        {activeCards.map((cardId) => (
                            <Card key={cardId} variant="outline" borderColor="geneTerrain.border" shadow="sm">
                                <CardHeader bg="white" borderBottom="1px" borderColor="gray.100" py={3}>
                                    <Flex justify="space-between" align="center">
                                        <Heading size="sm" color="geneTerrain.primary">
                                            {cardId === "genes" && "Gene Activity Comparison"}
                                            {cardId === "pathways" && "Pathway Enrichment Comparison"}
                                            {cardId === "network" && "Interaction Network Comparison"}
                                        </Heading>
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            colorScheme="red"
                                            onClick={() => toggleCard(cardId)}
                                        >
                                            <Icon as={Trash2} boxSize={4} />
                                        </Button>
                                    </Flex>
                                </CardHeader>
                                <CardBody p={4}>
                                    <SimpleGrid columns={[1, 2]} gap={6}>
                                        {/* Left Column */}
                                        <Box>
                                            <Text fontWeight="bold" color="geneTerrain.primary" mb={3}>
                                                {data.left.label} ({data.left.genes.length} genes)
                                            </Text>
                                            {cardId === "genes" && <GenesMini genes={data.left.genes} />}
                                            {cardId === "pathways" && <LollipopMini data={leftEnrichRows} />}
                                            {cardId === "network" && <NetworkMiniPaths rows={leftEnrichRows} />}
                                        </Box>

                                        {/* Right Column */}
                                        <Box pl={{ md: 6 }} borderLeft={{ md: "1px" }} borderColor="gray.100">
                                            <Text fontWeight="bold" color="geneTerrain.primary" mb={3}>
                                                {data.right.label} ({data.right.genes.length} genes)
                                            </Text>
                                            {cardId === "genes" && <GenesMini genes={data.right.genes} />}
                                            {cardId === "pathways" && <LollipopMini data={rightEnrichRows} />}
                                            {cardId === "network" && <NetworkMiniPaths rows={rightEnrichRows} />}
                                        </Box>
                                    </SimpleGrid>
                                </CardBody>
                            </Card>
                        ))}
                    </VStack>

                    {/* AI Summary Section */}
                    <Box mt={6}>
                        <Card variant="outline" borderColor="geneTerrain.border" shadow="sm">
                            <CardHeader bg="white" borderBottom="1px" borderColor="gray.100" py={3}>
                                <Flex justify="space-between" align="center">
                                    <Heading size="sm" color="gray.700">
                                        AI-Generated Interpretation
                                    </Heading>
                                    <Button
                                        size="sm"
                                        bg="geneTerrain.accent1"
                                        color="white"
                                        _hover={{ bg: "geneTerrain.primary" }}
                                        onClick={generateAISummary}
                                        isLoading={isSummaryLoading}
                                        loadingText="Analyzing..."
                                    >
                                        Generate Summary
                                    </Button>
                                </Flex>
                            </CardHeader>
                            <CardBody p={4}>
                                {!aiSummary && !isSummaryLoading && (
                                    <Box textAlign="center" py={8} color="gray.500">
                                        <Text>Click "Generate Summary" to get an AI-powered interpretation.</Text>
                                        <Text fontSize="sm" mt={1}>
                                            Analyzes expression patterns, pathways, and biological context.
                                        </Text>
                                    </Box>
                                )}
                                {isSummaryLoading && (
                                    <Box textAlign="center" py={8}>
                                        <Spinner color="geneTerrain.primary" mb={3} />
                                        <Text color="gray.500">Analyzing your data...</Text>
                                    </Box>
                                )}
                                {aiSummary && !isSummaryLoading && (
                                    <Box
                                        className="prose"
                                        whiteSpace="pre-wrap"
                                        lineHeight="1.7"
                                        fontSize="sm"
                                        color="gray.700"
                                    >
                                        {aiSummary}
                                    </Box>
                                )}
                            </CardBody>
                        </Card>
                    </Box>
                </Box>
            </Box>
        </Flex>
    );
}
