import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { ChatMessage, DashboardConfig, DataRow, DatasetProfile, GeminiModel, CohortAction, CohortRecord } from '../analytics/types';
import { processChatCommand, executeMCPTool } from '../../services/geminiService';

export interface PageContext {
    currentConfig?: DashboardConfig;
    headers?: string[];
    profile?: DatasetProfile;
    dataSample1?: DataRow[];
    dataSample2?: DataRow[];
    availableFilters?: Record<string, string[]>;
    activeFilters?: Record<string, any[]>;
    datasetId?: string;
}

interface ChatContextType {
    messages: ChatMessage[];
    isAnalyzing: boolean;
    isOpen: boolean;
    pageContext: PageContext;
    selectedModel: GeminiModel;
    savedCohorts: CohortRecord[];
    comparisonCohorts: CohortRecord[];
    activeCohort: CohortRecord | null;
    terrainComparisonRequest: CohortRecord[] | null;
    toggleChat: () => void;
    setIsOpen: (open: boolean) => void;
    sendMessage: (content: string) => Promise<{ updatedConfig?: DashboardConfig; feedback: string; filters?: Record<string, any[]> } | null>;
    updatePageContext: (context: PageContext) => void;
    setSelectedModel: (model: GeminiModel) => void;
    clearHistory: () => void;
    handleToolAction: (action: CohortAction) => Promise<void>;
    removeComparisonCohort: (cohortId: string) => void;
    runComparisonCart: () => Promise<void>;
    requestTerrainComparison: () => void;
    clearTerrainComparisonRequest: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const toast = useToast();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm your GeneTerrain AI assistant. I can help you analyze TCGA datasets, interpret gene expression trends, or generate custom plots. How can I help you today?",
            timestamp: new Date().toISOString(),
        }
    ]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [pageContext, setPageContext] = useState<PageContext>({});
    const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-3-flash-preview');
    const [savedCohorts, setSavedCohorts] = useState<CohortRecord[]>([]);
    const [comparisonCohorts, setComparisonCohorts] = useState<CohortRecord[]>([]);
    const [activeCohort, setActiveCohort] = useState<CohortRecord | null>(null);
    const [terrainComparisonRequest, setTerrainComparisonRequest] = useState<CohortRecord[] | null>(null);

    const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

    const appendAssistantMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        setMessages(prev => [...prev, {
            ...message,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
        }]);
    }, []);

    const updatePageContext = useCallback((context: PageContext) => {
        setPageContext(context);
    }, []);

    const clearHistory = useCallback(() => {
        setSavedCohorts([]);
        setComparisonCohorts([]);
        setActiveCohort(null);
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: "Chat cleared. I'm ready for new questions!",
                timestamp: new Date().toISOString(),
            }
        ]);
    }, []);

    const handleSaveCohort = useCallback((payload: CohortRecord) => {
        setSavedCohorts(prev => {
            const exists = prev.some((item) => item.cohort_id === payload.cohort_id);
            return exists ? prev : [payload, ...prev];
        });
        setActiveCohort(payload);
        toast({
            title: 'Cohort saved',
            description: `${payload.label} is now available for reuse in this session.`,
            status: 'success',
            duration: 2500,
            isClosable: true,
            position: 'top-right',
        });
    }, [toast]);

    const handleAddToComparison = useCallback((payload: CohortRecord) => {
        setComparisonCohorts(prev => {
            const withoutCurrent = prev.filter((item) => item.cohort_id !== payload.cohort_id);
            const next = [...withoutCurrent, payload];
            // Allow up to 3 cohorts; if a 4th is added, drop the oldest
            if (next.length > 3) {
                next.splice(0, next.length - 3);
            }
            return next;
        });
        setActiveCohort(payload);
        toast({
            title: 'Comparison cohort updated',
            description: `${payload.label} added to cart${comparisonCohorts.length >= 3 ? ' (oldest cohort replaced)' : ''}.`,
            status: 'info',
            duration: 2600,
            isClosable: true,
            position: 'top-right',
        });
    }, [comparisonCohorts.length, toast]);

    const removeComparisonCohort = useCallback((cohortId: string) => {
        setComparisonCohorts(prev => prev.filter((cohort) => cohort.cohort_id !== cohortId));
    }, []);

    const handlePlotCohort = useCallback(async (payload: CohortRecord) => {
        appendAssistantMessage({
            role: 'assistant',
            content: '🛠️ **Bio MCP:** Calling `plot_cohort_embedding`...',
        });

        const toolOutput = await executeMCPTool('plot_cohort_embedding', {
            dataset: payload.dataset,
            cohort_sample_ids: payload.sample_ids,
            label: payload.label,
            output_format: 'both',
            style: 'nature',
        }, `Plot cohort embedding for ${payload.label}`);

        if (toolOutput?.error) {
            appendAssistantMessage({
                role: 'assistant',
                content: `I couldn't plot the cohort yet. ${toolOutput.error}`,
            });
            return;
        }

        if (toolOutput?.png_base64) {
            appendAssistantMessage({
                role: 'assistant',
                content: toolOutput.text?.title || `Cohort embedding: ${payload.label}`,
                imageBase64: toolOutput.png_base64,
                htmlBase64: toolOutput.html_base64,
                htmlPath: toolOutput.html_path,
                pdfBase64: toolOutput.pdf_base64,
                svgBase64: toolOutput.svg_base64,
                description: toolOutput.description,
                scientificText: toolOutput.text,
            });
        } else if (toolOutput?.text) {
            const summary = [toolOutput.text.short_summary, toolOutput.text.key_finding]
                .filter(Boolean)
                .join('\n\n');
            appendAssistantMessage({
                role: 'assistant',
                content: `### ${toolOutput.text.title || 'Cohort Plot'}\n${summary || 'The cohort plot was generated.'}`,
            });
        }

        setActiveCohort(payload);
    }, [appendAssistantMessage]);

    const handleToolAction = useCallback(async (action: CohortAction) => {
        const payload = action.payload;
        if (action.id === 'save_cohort') {
            handleSaveCohort(payload);
            return;
        }
        if (action.id === 'add_to_comparison') {
            handleAddToComparison(payload);
            return;
        }
        if (action.id === 'plot_cohort') {
            await handlePlotCohort(payload);
        }
    }, [handleAddToComparison, handlePlotCohort, handleSaveCohort]);

    const sendMessage = async (content: string) => {
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsAnalyzing(true);

        try {
            let imageIndex = 0;
            const onToolCall = (toolName: string, args: any) => {
                if (toolName === '__image__') {
                    imageIndex += 1;
                    appendAssistantMessage({
                        role: 'assistant',
                        content: `${args.stem || 'Chart'} generated:`,
                        imageBase64: args.png_base64,
                        htmlBase64: args.htmlBase64,
                        htmlPath: args.htmlPath,
                        pdfBase64: args.pdfBase64,
                        svgBase64: args.svgBase64,
                        description: args.description,
                        scientificText: args.scientificText,
                    });
                    return;
                }
                if (toolName === '__cohort_card__') {
                    appendAssistantMessage({
                        role: 'assistant',
                        content: args.title || 'Cohort created',
                        cohortCard: {
                            title: args.title || 'Cohort created',
                            shortSummary: args.shortSummary || '',
                            actions: args.actions || [],
                            suggestions: args.suggestions || [],
                            icon: args.icon,
                            cohort: args.cohort,
                        }
                    });
                    return;
                }
                if (toolName === '__note__') {
                    const summary = [args.shortSummary, args.keyFinding]
                        .filter(Boolean)
                        .join('\n\n');
                    appendAssistantMessage({
                        role: 'assistant',
                        content: `### ${args.title || 'Analysis Update'}\n${summary || 'Intermediate analysis completed.'}`,
                    });
                    return;
                }
                appendAssistantMessage({
                    role: 'assistant',
                    content: `🛠️ **Bio MCP:** Calling \`${toolName}\`...`,
                });
            };

            const result = await processChatCommand(
                content,
                selectedModel,
                pageContext.currentConfig,
                pageContext.headers,
                pageContext.profile,
                pageContext.dataSample1,
                pageContext.dataSample2,
                pageContext.availableFilters,
                pageContext.activeFilters,
                onToolCall
            );

            if (result?.feedback) {
                appendAssistantMessage({
                    role: 'assistant',
                    content: result.feedback,
                });
            }

            return result;

        } catch (error) {
            console.error("Global Chat error:", error);
            appendAssistantMessage({
                role: 'assistant',
                content: "I'm sorry, I encountered an error while processing that request.",
            });
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    };

    const requestTerrainComparison = useCallback(() => {
        if (comparisonCohorts.length < 2) {
            toast({
                title: 'Add more cohorts',
                description: 'Add at least two cohorts to the cart before comparing terrains.',
                status: 'warning',
                duration: 2600,
                isClosable: true,
                position: 'top-right',
            });
            return;
        }
        setTerrainComparisonRequest([...comparisonCohorts]);
    }, [comparisonCohorts, toast]);

    const clearTerrainComparisonRequest = useCallback(() => {
        setTerrainComparisonRequest(null);
    }, []);

    const runComparisonCart = useCallback(async () => {
        if (comparisonCohorts.length < 2) {
            toast({
                title: 'Add more cohorts',
                description: 'The comparison cart needs at least two cohorts before analysis can run.',
                status: 'warning',
                duration: 2600,
                isClosable: true,
                position: 'top-right',
            });
            return;
        }

        const cohorts = comparisonCohorts; // 2 or 3
        const dataset = cohorts[0].dataset;

        // Helper: inline the actual ID array for each cohort
        const ids = (i: number) => JSON.stringify(cohorts[i].sample_ids || []);

        let step = 1;

        // Expression comparisons — IDs inlined directly, no placeholder references
        const expressionSteps: string[] = [];
        expressionSteps.push(
            `STEP ${step++} — compare_cohorts_gene_expression(\n  dataset="${dataset}",\n  cohort_a_ids=${ids(0)},\n  cohort_b_ids=${ids(1)},\n  cohort_a_label="${cohorts[0].label}",\n  cohort_b_label="${cohorts[1].label}"\n)`
        );
        if (cohorts.length === 3) {
            expressionSteps.push(
                `STEP ${step++} — compare_cohorts_gene_expression(\n  dataset="${dataset}",\n  cohort_a_ids=${ids(0)},\n  cohort_b_ids=${ids(2)},\n  cohort_a_label="${cohorts[0].label}",\n  cohort_b_label="${cohorts[2].label}"\n)`
            );
        }

        // One summarize_cohort per cohort — IDs inlined
        const summarySteps = cohorts.map((c, i) =>
            `STEP ${step++} — summarize_cohort(dataset="${c.dataset}", sample_ids=${ids(i)})`
        );

        // ONE combined embedding — all cohorts, IDs inlined
        const cohortArgs = cohorts.map((c, i) =>
            `    {"label": "${c.label}", "sample_ids": ${ids(i)}}`
        ).join(',\n');
        const embeddingStep =
            `STEP ${step} — plot_cohorts_combined_embedding(\n  dataset="${dataset}",\n  cohorts=[\n${cohortArgs}\n  ]\n)`;

        const cohortSummary = cohorts.map((c, i) =>
            `- Cohort ${String.fromCharCode(65 + i)}: "${c.label}" (n=${c.sample_count})`
        ).join('\n');

        const comparisonPrompt = [
            `Run a structured gene expression comparison between these ${cohorts.length} cohorts:`,
            ``,
            cohortSummary,
            ``,
            `Follow ALL steps EXACTLY in order — do not skip, reorder, or substitute any step:`,
            ``,
            ...expressionSteps,
            ``,
            ...summarySteps,
            ``,
            embeddingStep,
            ``,
            `RULES:`,
            `- Use plot_cohorts_combined_embedding for the embedding — ONE call with ALL cohorts. Never call plot_cohort_embedding separately per cohort.`,
            `- Never call plot_embedding_by_group`,
            `- Never colour by vital_status`,
            `- Sample ID arrays are provided inline above — use them exactly as given.`,
            ``,
            `After all steps complete, write a 2-3 paragraph biological interpretation: which genes differ most and in what direction, what that suggests about tumour biology, and the main caveats.`,
        ].join('\n');

        await sendMessage(comparisonPrompt);
    }, [comparisonCohorts, sendMessage, toast]);

    return (
        <ChatContext.Provider value={{
            messages,
            isAnalyzing,
            isOpen,
            pageContext,
            selectedModel,
            savedCohorts,
            comparisonCohorts,
            activeCohort,
            terrainComparisonRequest,
            toggleChat,
            setIsOpen,
            sendMessage,
            updatePageContext,
            setSelectedModel,
            clearHistory,
            handleToolAction,
            removeComparisonCohort,
            runComparisonCart,
            requestTerrainComparison,
            clearTerrainComparisonRequest
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
