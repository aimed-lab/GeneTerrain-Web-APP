import { GoogleGenerativeAI, Tool, SchemaType } from '@google/generative-ai';
import { DashboardConfig, AnalyticsChartConfig, DataRow, DatasetProfile, GeminiModel } from "../components/analytics/types";

let aiInstance: GoogleGenerativeAI | null = null;
const MCP_SERVER_URL = "http://127.0.0.1:8000";

async function getAIClient() {
    if (aiInstance) return aiInstance;

    try {
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('Missing GEMINI API key (REACT_APP_GEMINI_API_KEY)');
            return null;
        }

        aiInstance = new GoogleGenerativeAI(apiKey);
        return aiInstance;
    } catch (err) {
        console.error("Failed to initialize Gemini AI SDK:", err);
        return null;
    }
}

const supportsThinking = (model: string) =>
    model.startsWith('gemini-3') || model.startsWith('gemini-2.5');

const fallbackModelOrder: GeminiModel[] = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-flash-lite-latest',
];

const getFallbackModels = (primary: GeminiModel): GeminiModel[] => {
    const ordered = [primary, ...fallbackModelOrder];
    return ordered.filter((model, index) => ordered.indexOf(model) === index);
};

const extractErrorText = (error: unknown) => {
    if (error instanceof Error) return error.message;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
};

const isRetryableModelError = (error: unknown) => {
    const text = extractErrorText(error).toLowerCase();
    return (
        text.includes('503') ||
        text.includes('404') ||
        text.includes('unavailable') ||
        text.includes('high demand') ||
        text.includes('try again later') ||
        text.includes('overloaded') ||
        text.includes('no longer available') ||
        text.includes('not found') ||
        text.includes('quota exceeded') ||
        text.includes('resource exhausted')
    );
};

// MCP Tool Definitions — bio_mcp_server_dynamic
// Supported datasets: GBM, BRCA
const staticMcpTools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "healthcheck",
                description: "Simple health check for the MCP server configuration. Returns server name, ORDs URL, supported datasets, and output dir.",
                parameters: { type: SchemaType.OBJECT, properties: {} }
            },
            {
                name: "count_gene_rows",
                description: "Count how many expression rows exist for a gene in a dataset.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol (e.g. TP53, EGFR)" }
                    },
                    required: ["dataset", "gene"]
                }
            },
            {
                name: "clinical_sample_count",
                description: "Count the number of rows in the clinical table for a dataset.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" }
                    },
                    required: ["dataset"]
                }
            },
            {
                name: "gene_rows",
                description: "Fetch sample-level expression rows for a specific gene in a dataset.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol (e.g. TP53, EGFR)" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max rows to return (default 200, max 5000)" }
                    },
                    required: ["dataset", "gene"]
                }
            },
            {
                name: "gene_summary_by_group",
                description: "Summarize expression for one gene by a clinical grouping field (e.g. vital_status, gender, ajcc_pathologic_tumor_stage).",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol" },
                        group_by: { type: SchemaType.STRING, description: "Clinical field to group by (e.g. vital_status, gender, ajcc_pathologic_tumor_stage, race, histological_type)" }
                    },
                    required: ["dataset", "gene", "group_by"]
                }
            },
            {
                name: "embedding_points",
                description: "Fetch embedding (dimensionality reduction) coordinates for a dataset, useful for scatter/cluster visualizations.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max rows (default 1000)" }
                    },
                    required: ["dataset"]
                }
            },
            {
                name: "embedding_points_with_group",
                description: "Fetch embedding coordinates joined with a clinical grouping field so points can be colored by cohort labels such as vital_status.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        group_by: { type: SchemaType.STRING, description: "Clinical field used to color embedding points, such as vital_status or gender" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max rows (default 1000)" }
                    },
                    required: ["dataset", "group_by"]
                }
            },
            {
                name: "interpret_gene_summary",
                description: "Returns a concise text interpretation of grouped gene expression (min/max groups, mean expression comparison).",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol" },
                        group_by: { type: SchemaType.STRING, description: "Clinical field to group by" }
                    },
                    required: ["dataset", "gene", "group_by"]
                }
            },
            {
                name: "plot_gene_summary_by_group",
                description: "Creates a Plotly bar chart of mean gene expression by a clinical grouping. Returns html_path and optionally png_base64 if output_format includes png.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol" },
                        group_by: { type: SchemaType.STRING, description: "Clinical field to group by" },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both" }
                    },
                    required: ["dataset", "gene", "group_by"]
                }
            },
            {
                name: "plot_embedding",
                description: "Creates a Plotly scatter plot of embedding coordinates for a dataset. Returns html_path and optionally png_base64.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max sample points (default 2000)" },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both" }
                    },
                    required: ["dataset"]
                }
            },
            {
                name: "plot_embedding_by_group",
                description: "Creates a Plotly embedding scatter plot with points colored by a clinical grouping field such as vital_status.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        group_by: { type: SchemaType.STRING, description: "Clinical grouping field used for point colors" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max sample points (default 2000)" },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both" },
                        style: { type: SchemaType.STRING, description: "Style preset such as science, dashboard, or statistical" }
                    },
                    required: ["dataset", "group_by"]
                }
            },
            {
                name: "multi_gene_summary",
                description: "Summarize multiple genes (comma-separated list) by a clinical grouping field. This tool performs full-dataset aggregation on the server side (no row limit).",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        genes: { type: SchemaType.STRING, description: "Comma-separated list of genes (e.g. EGFR,PTEN,TP53)" },
                        group_by: { type: SchemaType.STRING, description: "Clinical field to group by" }
                    },
                    required: ["dataset", "genes", "group_by"]
                }
            },
            {
                name: "plot_multi_gene_summary",
                description: "Creates a grouped bar chart comparing multiple genes in a single view. Returns html_path and png_base64.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        genes: { type: SchemaType.STRING, description: "Comma-separated list of genes" },
                        group_by: { type: SchemaType.STRING, description: "Clinical field to group by" },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both" }
                    },
                    required: ["dataset", "genes", "group_by"]
                }
            },
            {
                name: "chart_recommendation",
                description: "Recommend the best chart type and style for a supported analysis type.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        analysis_type: { type: SchemaType.STRING, description: "Analysis type such as gene_summary_by_group, multi_gene_summary, embedding_points, gene_rows_with_group, or gene_rows_with_x" },
                        requested_style: { type: SchemaType.STRING, description: "Preferred style preset such as nature, science, statistical, or dashboard" }
                    },
                    required: ["analysis_type"]
                }
            },
            {
                name: "scientific_text_only_summary",
                description: "Generate a scientific narrative summary without plotting a figure.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        analysis_title: { type: SchemaType.STRING, description: "Short title for the analysis" },
                        main_finding: { type: SchemaType.STRING, description: "Primary insight to emphasize" },
                        x_axis: { type: SchemaType.STRING, description: "What is shown on the x-axis or grouping dimension" },
                        y_axis: { type: SchemaType.STRING, description: "What is shown on the y-axis or response dimension" },
                        data_represents: { type: SchemaType.STRING, description: "What the data represents overall" },
                        indicators: { type: SchemaType.STRING, description: "Comma-separated indicators used in the summary" },
                        caveat: { type: SchemaType.STRING, description: "Optional caveat or limitation statement" }
                    },
                    required: ["dataset", "analysis_title", "main_finding", "x_axis", "y_axis", "data_represents", "indicators"]
                }
            },
            {
                name: "suggest_analysis_questions",
                description: "Returns a list of example analysis questions the agent can use with the current toolset for a dataset.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" }
                    },
                    required: ["dataset"]
                }
            },
            {
                name: "gene_rows_with_group",
                description: "Fetch sample-level gene expression rows paired with a categorical clinical grouping field.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol (e.g. TP53, EGFR)" },
                        group_by: { type: SchemaType.STRING, description: "Categorical clinical field to attach to each gene row" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max rows to return (default 200, max 5000)" }
                    },
                    required: ["dataset", "gene", "group_by"]
                }
            },
            {
                name: "gene_rows_with_x",
                description: "Fetch sample-level gene expression rows paired with a continuous clinical x-axis field.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol (e.g. TP53, EGFR)" },
                        group_by: { type: SchemaType.STRING, description: "Continuous clinical field to use as the x-axis" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max rows to return (default 200, max 5000)" }
                    },
                    required: ["dataset", "gene", "group_by"]
                }
            },
            {
                name: "list_clinical_fields",
                description: "List clinical fields available for a dataset so the model can pick valid groupings or x-axes.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" }
                    },
                    required: ["dataset"]
                }
            },
            {
                name: "plot_gene_distribution",
                description: "Create a distribution chart for a gene across categorical groups using a box or violin plot.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol" },
                        group_by: { type: SchemaType.STRING, description: "Categorical clinical field to group by" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max rows to use (default 1000)" },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both" },
                        style: { type: SchemaType.STRING, description: "Style preset such as nature, science, dashboard, or bioinformatics" },
                        chart_type: { type: SchemaType.STRING, description: "Distribution chart type: box or violin" }
                    },
                    required: ["dataset", "gene", "group_by"]
                }
            },
            {
                name: "plot_gene_vs_continuous",
                description: "Create a scatter plot comparing gene expression against a continuous clinical field.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        gene: { type: SchemaType.STRING, description: "Gene symbol" },
                        x_axis: { type: SchemaType.STRING, description: "Continuous clinical field for the x-axis" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max rows to use (default 1000)" },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both" },
                        style: { type: SchemaType.STRING, description: "Style preset such as statistical, science, or dashboard" }
                    },
                    required: ["dataset", "gene", "x_axis"]
                }
            },
            {
                name: "preview_cohort",
                description: "Preview a clinically filtered cohort before saving or analyzing it.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        filters: {
                            type: SchemaType.ARRAY,
                            description: "Array of clinical filter objects used to define the cohort",
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    field: { type: SchemaType.STRING },
                                    values: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                                },
                                required: ["field", "values"]
                            }
                        },
                        row_limit: { type: SchemaType.NUMBER, description: "Max preview rows (default 500)" }
                    },
                    required: ["dataset", "filters"]
                }
            },
            {
                name: "define_cohort_by_numeric",
                description: "Create a cohort by filtering on a NUMERIC clinical field (e.g. survival time, age). Use this — NOT define_cohort — for: short survivors (os.time < 180), long survivors (os.time > 540), young patients (age < 45), older patients (age > 65), any threshold-based cohort. The ORDS backend does not support numeric operators, so this tool fetches the full clinical table and filters in Python.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset: GBM or BRCA" },
                        field: { type: SchemaType.STRING, description: 'Numeric clinical field. Options: "os.time" (Overall Survival days), "pfi.time" (Progression-Free Interval days), "dfi.time" (Disease-Free Interval days), "dss.time" (Disease-Specific Survival days), "age_at_initial_pathologic_diagnosis" (years)' },
                        op: { type: SchemaType.STRING, description: 'Comparison operator: "lt" (<), "gt" (>), "lte" (≤), "gte" (≥), "eq" (=)' },
                        threshold: { type: SchemaType.NUMBER, description: "Numeric cutoff. Examples: 180 for 6-month OS, 540 for 18-month OS, 45 or 65 for age groups" },
                        label: { type: SchemaType.STRING, description: 'Human-readable cohort name, e.g. "Short Survivors (OS < 6 mo)"' },
                    },
                    required: ["dataset", "field", "op", "threshold"]
                }
            },
            {
                name: "compare_cohorts_gene_expression",
                description: "Generate a grouped bar chart comparing mean gene expression between two cohorts. Use this as STEP 1 in any cohort comparison workflow. Requires sample IDs for both cohorts. Returns a bar chart PNG + HTML and a comparison_table with per-gene means and fold changes. Default genes: EGFR, PTEN, TP53, IDH1, MGMT, CDKN2A, RB1, NF1, PDGFRA, MET.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset: GBM or BRCA" },
                        cohort_a_ids: {
                            type: SchemaType.ARRAY,
                            description: "Sample IDs for cohort A",
                            items: { type: SchemaType.STRING }
                        },
                        cohort_b_ids: {
                            type: SchemaType.ARRAY,
                            description: "Sample IDs for cohort B",
                            items: { type: SchemaType.STRING }
                        },
                        cohort_a_label: { type: SchemaType.STRING, description: 'Human-readable label for cohort A, e.g. "Short Survivors"' },
                        cohort_b_label: { type: SchemaType.STRING, description: 'Human-readable label for cohort B, e.g. "Long Survivors"' },
                        genes: {
                            type: SchemaType.ARRAY,
                            description: "Optional list of genes to compare (default: 10 GBM-relevant genes)",
                            items: { type: SchemaType.STRING }
                        },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both (default: both)" },
                        style: { type: SchemaType.STRING, description: "Style preset: nature, science, bioinformatics, etc." }
                    },
                    required: ["dataset", "cohort_a_ids", "cohort_b_ids"]
                }
            },
            {
                name: "define_cohort",
                description: "Create a named cohort from CATEGORICAL clinical filters (e.g. gender=MALE, sample_type=Recurrent Tumor, vital_status=Dead). For numeric thresholds like survival time or age, use define_cohort_by_numeric instead.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        filters: {
                            type: SchemaType.ARRAY,
                            description: "Array of clinical filter objects used to define the cohort",
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    field: { type: SchemaType.STRING },
                                    values: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                                },
                                required: ["field", "values"]
                            }
                        },
                        label: { type: SchemaType.STRING, description: "Optional human-readable cohort label" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max cohort rows to collect (default 5000)" }
                    },
                    required: ["dataset", "filters"]
                }
            },
            {
                name: "plot_cohorts_combined_embedding",
                description: "Plot ALL cohorts on a SINGLE embedding scatter — each cohort gets a distinct colour; background samples are grey. ALWAYS use this instead of calling plot_cohort_embedding multiple times when comparing cohorts. Pass all cohorts in one call.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        cohorts: {
                            type: SchemaType.ARRAY,
                            description: "Array of cohort objects, each with label (string) and sample_ids (array of strings). Example: [{label:'Short Survivors', sample_ids:['TCGA-...']}, {label:'Long Survivors', sample_ids:['TCGA-...']}]",
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    label: { type: SchemaType.STRING },
                                    sample_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                                },
                                required: ["label", "sample_ids"]
                            }
                        },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both" },
                        style: { type: SchemaType.STRING, description: "Style preset such as nature, science, or bioinformatics" }
                    },
                    required: ["dataset", "cohorts"]
                }
            },
            {
                name: "plot_cohort_embedding",
                description: "Overlay a SINGLE cohort onto the dataset embedding. Use plot_cohorts_combined_embedding instead when comparing multiple cohorts — do NOT call this multiple times.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        cohort_sample_ids: {
                            type: SchemaType.ARRAY,
                            description: "List of sample IDs that belong to the cohort",
                            items: { type: SchemaType.STRING }
                        },
                        label: { type: SchemaType.STRING, description: "Displayed cohort label" },
                        row_limit: { type: SchemaType.NUMBER, description: "Max embedding points (default 2000)" },
                        output_format: { type: SchemaType.STRING, description: "Output format: html, png, or both" },
                        style: { type: SchemaType.STRING, description: "Style preset such as nature, science, or bioinformatics" }
                    },
                    required: ["dataset", "cohort_sample_ids"]
                }
            },
            {
                name: "summarize_cohort",
                description: "Summarize the clinical composition of a cohort (gender, age, OS, sample type, etc.). Pass EITHER sample_ids (for numeric cohorts from define_cohort_by_numeric) OR filters (for categorical cohorts from define_cohort). Always prefer sample_ids when you have them.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        dataset: { type: SchemaType.STRING, description: "Dataset name: GBM or BRCA" },
                        sample_ids: {
                            type: SchemaType.ARRAY,
                            description: "Preferred: list of sample IDs to summarize. Works for any cohort type including numeric (OS-based) cohorts.",
                            items: { type: SchemaType.STRING }
                        },
                        filters: {
                            type: SchemaType.ARRAY,
                            description: "Alternative: categorical ORDS filter objects. Use only when sample_ids are not available.",
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    field: { type: SchemaType.STRING },
                                    values: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                                },
                                required: ["field", "values"]
                            }
                        },
                        row_limit: { type: SchemaType.NUMBER, description: "Max rows (default 5000)" }
                    },
                    required: ["dataset"]
                }
            }
        ]
    }
];

let liveMcpToolsCache: Tool[] | null = null;

const schemaTypeMap: Record<string, SchemaType> = {
    string: SchemaType.STRING,
    number: SchemaType.NUMBER,
    integer: SchemaType.NUMBER,
    boolean: SchemaType.BOOLEAN,
    object: SchemaType.OBJECT,
    array: SchemaType.ARRAY,
};

const normalizeSchemaForGemini = (schema: any): any => {
    if (!schema || typeof schema !== 'object') return schema;

    if (Array.isArray(schema)) {
        return schema.map(normalizeSchemaForGemini);
    }

    const normalized: any = { ...schema };

    delete normalized.additionalProperties;
    delete normalized.title;
    delete normalized.default;
    delete normalized.examples;
    delete normalized.example;
    delete normalized.$schema;
    delete normalized.$defs;
    delete normalized.definitions;
    delete normalized.nullable;
    delete normalized.pattern;
    delete normalized.minimum;
    delete normalized.maximum;
    delete normalized.minItems;
    delete normalized.maxItems;
    delete normalized.minLength;
    delete normalized.maxLength;

    if (typeof normalized.type === 'string' && schemaTypeMap[normalized.type]) {
        normalized.type = schemaTypeMap[normalized.type];
    }

    if (normalized.properties && typeof normalized.properties === 'object') {
        Object.keys(normalized.properties).forEach((key) => {
            normalized.properties[key] = normalizeSchemaForGemini(normalized.properties[key]);
        });
    }

    if (normalized.items) {
        normalized.items = normalizeSchemaForGemini(normalized.items);
    }

    if (Array.isArray(normalized.anyOf)) {
        normalized.anyOf = normalized.anyOf.map(normalizeSchemaForGemini);
    }

    if (Array.isArray(normalized.oneOf)) {
        normalized.oneOf = normalized.oneOf.map(normalizeSchemaForGemini);
    }

    if (Array.isArray(normalized.allOf)) {
        normalized.allOf = normalized.allOf.map(normalizeSchemaForGemini);
    }

    return normalized;
};

const getStaticDeclarationMap = () => {
    const declarations = staticMcpTools.flatMap((tool: any) => tool.functionDeclarations || []);
    return new Map(declarations.map((declaration: any) => [declaration.name, declaration]));
};

const getLiveMcpTools = async (): Promise<Tool[]> => {
    if (liveMcpToolsCache) return liveMcpToolsCache;

    try {
        const response = await fetch(`${MCP_SERVER_URL}/tool_catalog`);
        if (!response.ok) {
            throw new Error(`Failed to fetch tool catalog: ${response.statusText}`);
        }

        const catalog = await response.json();
        const staticMap = getStaticDeclarationMap();
        const declarations = (catalog.tools || []).map((tool: any) => {
            const fallback = staticMap.get(tool.name);
            return {
                name: tool.name,
                description: tool.description || fallback?.description || `Bioinformatics MCP tool: ${tool.name}`,
                parameters: normalizeSchemaForGemini(tool.inputSchema || fallback?.parameters || { type: SchemaType.OBJECT, properties: {} }),
            };
        });

        liveMcpToolsCache = [{ functionDeclarations: declarations }];
        return liveMcpToolsCache;
    } catch (error) {
        console.warn('Falling back to static MCP tool catalog:', error);
        liveMcpToolsCache = staticMcpTools;
        return staticMcpTools;
    }
};

const buildDynamicToolSummary = async () => {
    const tools = await getLiveMcpTools();
    const declarations = tools.flatMap((tool: any) => tool.functionDeclarations || []);
    return declarations
        .map((declaration: any) => `- ${declaration.name}: ${declaration.description || 'Bioinformatics MCP tool'}`)
        .join('\n');
};

const inferStylePreference = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes('nejm')) return 'nejm';
    if (normalized.includes('nature')) return 'nature';
    if (normalized.includes('scientific') || normalized.includes('publication') || normalized.includes('journal')) return 'nature';
    if (normalized.includes('presentation') || normalized.includes('slide')) return 'presentation';
    if (normalized.includes('statistical') || normalized.includes('trend')) return 'statistical';
    if (normalized.includes('dashboard')) return 'dashboard';
    if (normalized.includes('bioinformatics')) return 'bioinformatics';
    return 'nature';
};

const applyPlotDefaults = (name: string, args: any, message?: string) => {
    if (!args || typeof args !== 'object') return args;

    const nextArgs = { ...args };
    const preferredStyle = inferStylePreference(message || '');

    if (name.startsWith('plot_') && !nextArgs.output_format) {
        nextArgs.output_format = 'both';
    }

    if ((name === 'plot_gene_summary_by_group' || name === 'plot_multi_gene_summary') && !nextArgs.style) {
        nextArgs.style = preferredStyle === 'statistical' ? 'science' : preferredStyle;
    }

    if (name === 'plot_gene_distribution' && !nextArgs.style) {
        nextArgs.style = preferredStyle === 'presentation' ? 'presentation' : preferredStyle;
    }

    if (name === 'plot_gene_vs_continuous' && !nextArgs.style) {
        nextArgs.style = preferredStyle === 'nature' ? 'statistical' : preferredStyle;
    }

    if (name === 'plot_embedding_by_group' && !nextArgs.style) {
        nextArgs.style = preferredStyle;
    }

    if (name === 'plot_embedding' && !nextArgs.row_limit) {
        nextArgs.row_limit = 2000;
    }

    return nextArgs;
};

// Helper to execute MCP tools
export async function executeMCPTool(name: string, args: any, message?: string) {
    const normalizedArgs = applyPlotDefaults(name, args, message);
    console.log(`Executing MCP Tool: ${name}`, normalizedArgs);
    try {
        const response = await fetch(`${MCP_SERVER_URL}/call/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalizedArgs)
        });
        if (!response.ok) {
            throw new Error(`MCP tool ${name} failed: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error executing MCP tool ${name}:`, error);
        return { error: String(error) };
    }
}

export const generateDashboardConfig = async (
    headers: string[],
    sampleData: DataRow[],
    profile: DatasetProfile,
    model: GeminiModel,
    userInstructions?: string
): Promise<DashboardConfig | null> => {
    const statsSummary = Object.entries(profile.columnStats).map(([h, s]) => {
        const stats = s as any;
        return `${h}: type=${stats.type}, unique=${stats.uniqueCount}${stats.mean ? `, mean=${stats.mean.toFixed(1)}` : ''}`;
    }).join("\n");

    const compactSample = sampleData.map(row => {
        const r: any = {};
        headers.slice(0, 15).forEach(h => r[h] = row[h]);
        return r;
    });

    const prompt = `
    Act as an Oncology & Genomics Data Scientist. Perform deep Exploratory Data Analysis (EDA) for a MEDICAL COMPARISON dashboard.
    You are analyzing datasets with clinical info and gene expressions.
    Dataset Headers: ${headers.join(", ")}
    Dataset Profile:\n${statsSummary}
    Sample Data (Truncated Rows): ${JSON.stringify(compactSample)}

    ${userInstructions ? `USER REQUIREMENTS: "${userInstructions}". Prioritize these.` : `No specific instructions.`}

    DATA SPECIAL HANDLING:
    1. Patient Demographics: Charts about age, gender, race, or cancer stage MUST specify filtering for gene_symbol === "_CLINICAL_ONLY_" in descriptions to avoid over-counting.
    2. Gene Expression: Charts comparing values should use 'gene_symbol' as the X-axis and 'value' as the Y-axis. Mention "Average" in titles.

    Suggest 6 to 9 diverse visualizations. 
    Use: PIE, BAR, VIOLIN, BOX, SCATTER, HEATMAP, TREEMAP.
    Output MUST be a complete, valid JSON object following the schema.
    `;

    const generationConfig: any = {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
            type: "object",
            properties: {
                dashboardTitle: { type: "string" },
                summary: { type: "string" },
                charts: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            type: { type: "string", description: "One of: bar, violin, box, pie, scatter, heatmap, treemap" },
                            title: { type: "string" },
                            xAxis: { type: "string" },
                            yAxis: { type: "string" },
                            color: { type: "string" },
                            description: { type: "string" }
                        },
                        required: ["id", "type", "title", "xAxis", "yAxis", "color"]
                    }
                }
            },
            required: ["dashboardTitle", "summary", "charts"]
        }
    };

    if (supportsThinking(model)) {
        generationConfig.thinkingConfig = { thinkingBudget: 16000 };
    }

    const ai = await getAIClient();
    if (!ai) return null;

    try {
        const genModel = ai.getGenerativeModel({ model });
        const result = await genModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });

        const responseText = result.response.text();
        return JSON.parse(responseText) as DashboardConfig;
    } catch (e) {
        console.error("AI Generation failed:", e);
        return null;
    }
};

const cleanJsonResponse = (text: string) => {
    return text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
};

const maybeDecodeBase64Json = (text: string) => {
    const candidate = text.trim();
    if (!candidate || candidate.length < 16 || candidate.length % 4 !== 0) return null;
    if (!/^[A-Za-z0-9+/=\s]+$/.test(candidate)) return null;

    try {
        const decoded = atob(candidate.replace(/\s+/g, ''));
        const trimmed = decoded.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            JSON.parse(trimmed);
            return trimmed;
        }
    } catch {
        return null;
    }

    return null;
};

const parseToolCallingResponse = (
    text: string
): { updatedConfig?: DashboardConfig; feedback: string; filters?: Record<string, any[]> } => {
    const cleaned = cleanJsonResponse(text);
    const decoded = maybeDecodeBase64Json(cleaned);
    const normalized = decoded || cleaned;

    try {
        return JSON.parse(normalized);
    } catch {
        const start = normalized.indexOf("{");
        const end = normalized.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
            try {
                return JSON.parse(normalized.slice(start, end + 1));
            } catch {
                // fall through
            }
        }
    }

    return {
        feedback: normalized || "Analysis complete. All charts and summaries are shown above."
    };
};

export const processChatCommand = async (
    message: string,
    model: GeminiModel,
    currentConfig?: DashboardConfig,
    headers?: string[],
    profile?: DatasetProfile,
    dataSample1?: DataRow[],
    dataSample2?: DataRow[],
    availableFilters?: Record<string, string[]>,
    activeFilters?: Record<string, any[]>,
    onToolCall?: (toolName: string, args: any) => void
): Promise<{ updatedConfig?: DashboardConfig; feedback: string; filters?: Record<string, any[]> }> => {
    
    // Construct dynamic stats and context information
    const statsSummary = profile?.columnStats ? Object.entries(profile.columnStats).map(([h, s]) => {
        const stats = s as any;
        return `${h}: type=${stats.type}, unique=${stats.uniqueCount}${stats.mean ? `, mean=${stats.mean.toFixed(1)}` : ''}${stats.topValues ? `, top=[${stats.topValues.map((v: any) => `${v.value}(${v.count})`).join(',')}]` : ''}`;
    }).join("\n") : "No specific dataset profiled currently.";

    const getSnippet = (sample?: DataRow[]) => 
        sample && headers ? JSON.stringify(sample.slice(0, 20).map(row => {
            const r: any = {};
            headers.slice(0, 20).forEach(h => { if (row[h] !== undefined) r[h] = row[h]; });
            return r;
        })) : "(empty selection or different page)";

    const preferredStyle = inferStylePreference(message);
    const toolSummary = await buildDynamicToolSummary();
    const filterSummary = availableFilters && Object.keys(availableFilters).length > 0
        ? Object.entries(availableFilters)
            .map(([key, values]) => `${key}: [${values.slice(0, 12).join(', ')}${values.length > 12 ? ', ...' : ''}]`)
            .join('\n')
        : 'No cohort filters are currently available.';
    const activeFilterSummary = activeFilters && Object.keys(activeFilters).length > 0
        ? JSON.stringify(activeFilters)
        : 'No active cohort filters.';

    const prompt = `
    PERSONA: You are a Senior Bioinformatics and Oncology Data Scientist. You are an expert in TCGA datasets (like GBM and BRCA), multi-omics integration, and clinical data interpretation. Your tone is professional, scientific, but conversational.
    
    ENVIRONMENT: You are embedded in "GeneTerrain," a high-end web application for genomic visualization and analysis. 
    
    CONTEXT MODE: ${headers && profile ? "COHORT ANALYSIS MODE (You are helping analyze specific data selections)" : "GLOBAL ASSISTANT MODE (You are answering general questions about datasets or helping user find where to start)"}
    
    DASHBOARD RULES (Only apply if in COHORT ANALYSIS MODE):
    1. COMPARISON FOCUS: All charts you suggest MUST support comparing Set 1 vs Set 2.
    2. VALID COLUMNS: Only use columns from this list: [${headers?.join(", ") || "No headers in current context"}]. 
    3. CHART TYPES: bar, violin, box, pie, avg_gene_bar, scatter, treemap, heatmap.
    4. DATA MAPPING: Gene expression (xAxis="gene_symbol", yAxis="value"), Demographics (xAxis=clinical_col, yAxis="count").
    5. UNIQUE IDs: Generate unique IDs for new charts (e.g., 'violin-tp53-brca'). 
    
    CURRENT DASHBOARD STATE:
    Title: ${currentConfig?.dashboardTitle || "N/A"}
    Existing Charts: ${currentConfig ? JSON.stringify(currentConfig.charts.map(c => ({ id: c.id, type: c.type, title: c.title }))) : "No dashboard currently active."}

    DATASET CONTEXT (Current Selection):
    ${statsSummary}

    COHORT FILTER CONTEXT:
    Active filters: ${activeFilterSummary}
    Available filter keys and values:
    ${filterSummary}

    SAMPLE DATA SNIPPETS:
    - Set 1: ${getSnippet(dataSample1)}
    - Set 2: ${getSnippet(dataSample2)}

    EXTERNAL TOOLS (Bioinformatics Agent MCP — bio_mcp_server_dynamic):
    You have access to a live bioinformatics MCP server. Supported datasets: GBM, BRCA.
    Available tools discovered dynamically from the MCP server:
    ${toolSummary}
    Valid group_by values: vital_status, gender, race, ajcc_pathologic_tumor_stage, histological_type, histological_grade, tumor_status, sample_type, and more.

    GBM CLINICAL VOCABULARY — CRITICAL FIELD MAPPINGS (GBM dataset):
    The GBM dataset has 166 TCGA samples. Map user language to the correct field and tool:

    SURVIVAL / PROGNOSIS (ALWAYS use define_cohort_by_numeric — NOT vital_status):
    | User says                              | field      | op   | threshold | label                        |
    |----------------------------------------|------------|------|-----------|------------------------------|
    | "short survivors", "poor prognosis"    | "os.time"  | "lt" | 180       | "Short Survivors (OS < 6 mo)"|
    | "long survivors", "good prognosis"     | "os.time"  | "gt" | 540       | "Long Survivors (OS > 18 mo)"|
    | "intermediate survivors"               | "os.time"  | "gt" | 180       | then also "lt" 540           |
    | "died quickly", "rapid progression"    | "os.time"  | "lt" | 90        | "Rapid Progressors (OS < 3 mo)"|

    vital_status ("Dead"/"Alive") is a BINARY endpoint — it does NOT distinguish short from long survivors.
    NEVER use vital_status when the user asks about short/long/poor/good survival time.

    AGE GROUPS (use define_cohort_by_numeric):
    | "young patients", "younger"  | "age_at_initial_pathologic_diagnosis" | "lt" | 45 |
    | "older patients", "elderly"  | "age_at_initial_pathologic_diagnosis" | "gt" | 65 |

    TUMOR TYPE (use define_cohort with ORDS exact-match filters):
    | "primary tumor", "newly diagnosed"  | sample_type = "Primary Tumor"    (n=153) |
    | "recurrent tumor", "recurrence"     | sample_type = "Recurrent Tumor"  (n=13)  |
    | "de novo GBM"                       | histological_type = "Untreated primary (de novo) GBM" |

    PROGRESSION (use define_cohort with ORDS exact-match filters):
    | "progressed", "disease progression" | new_tumor_event_type = "Progression of Disease" (n=72) |
    | "recurred"                          | new_tumor_event_type = "Recurrence" (n=19) |
    | "stable", "no progression"          | new_tumor_event_type = null / no event (n=74) |

    GENDER: define_cohort with gender = "MALE" (n=107) or "FEMALE" (n=59)

    TOOL RULES:
    1. Answer the user's scientific question directly in prose. Images support the answer; they do not replace it.
    2. If the question asks whether defined cohorts cluster differently in an embedding, use plot_cohorts_combined_embedding (pass all cohorts in one call — each gets a distinct colour, background in grey). Never call plot_cohort_embedding once per cohort.
    3. SURVIVAL MAPPING: "short survivors", "long survivors", "poor prognosis", "good prognosis" → use define_cohort_by_numeric with field="os.time". NEVER map these to vital_status. vital_status is only for "alive vs dead" binary comparisons.
    4. When discussing clustering, say whether the groups appear well-separated, partially separated, or substantially overlapping, and mention that visual clustering alone is not a formal statistical test.
    5. When calling any plot tool, pass output_format: "both".
    6. Prefer 1-2 plots for simple questions, and up to 3-4 plots for complex or multi-step analyses when each figure adds distinct value. Do not generate redundant figures.
    7. If the user asks for analysis rather than just plotting, pair each figure with tool-based evidence and an interpretation in prose.
    8. If the user asks an invalid or ambiguous grouping field, use list_clinical_fields(dataset) first and either recover to the closest valid field or explain the mismatch clearly.
    9. If the question compares cohorts, genes, or datasets, explicitly state which tool outputs support the comparison.
    10. Use scientific_text_only_summary when a figure is unnecessary or when the answer mainly needs interpretation.
    11. If the user asks to select, restrict, isolate, or focus on a cohort for immediate analysis, return a "filters" object using only the available filter keys and exact available values whenever possible.
    12. Within one filter key, multiple values mean OR logic. Across different filter keys, filters are combined with AND logic.
    13. If the user asks to clear or reset cohort selection, return empty arrays for the relevant filter keys, or an empty object when all filters should be cleared.
    14. Use exact ORDS filter keys like "vital_status", "gender", "race", "tumor_status", "sample_type" for categorical fields. Use define_cohort_by_numeric for numeric fields (os.time, age, pfi.time, etc.).
    15. Do not assume the tool list is fixed. Use the dynamically discovered bioinformatics tools when they are relevant to the user's scientific question.
    16. If the user asks to create, define, save, name, store, or reuse a cohort:
        - For NUMERIC thresholds (survival time, age, etc.) → use define_cohort_by_numeric
        - For CATEGORICAL filters (gender, tumor type, etc.) → use define_cohort
        Always render an interactive cohort card.
    17. For cohort creation requests, do not answer with prose alone. Always call the appropriate define_cohort tool.

    WORKFLOW RULES:
    1. First classify the request as one of: sanity_check, single_gene_grouped, distribution, continuous_trend, multi_gene, embedding, cohort_survival, cohort_categorical, interpretation_only, style_request, or complex_multistep.
    2. Then choose the minimal tool sequence needed. Avoid random tool calls.
    3. For sanity checks, prefer healthcheck, clinical_sample_count, count_gene_rows, gene_rows.
    4. For grouped single-gene questions, prefer gene_summary_by_group or interpret_gene_summary, then add plot_gene_summary_by_group only if a figure helps.
    5. For distribution questions, prefer gene_rows_with_group or plot_gene_distribution and discuss spread, skew, overlap, and outliers.
    6. For continuous-variable questions, prefer gene_rows_with_x or plot_gene_vs_continuous and discuss directionality, strength, and uncertainty of the trend.
    7. For multi-gene comparison, prefer multi_gene_summary and plot_multi_gene_summary, then identify which gene shows the largest difference.
    8. For embedding questions with a single cohort vs background, use plot_cohort_embedding. When comparing TWO OR MORE defined cohorts on one embedding, ALWAYS use plot_cohorts_combined_embedding (single call, all cohorts in one scatter with distinct colours). NEVER call plot_cohort_embedding once per cohort — that produces redundant separate figures.
    9. For complex multi-step questions, connect the steps logically: establish the cohort structure, inspect the gene pattern, then synthesize a biological conclusion.
    10. When the user asks which chart is best, use chart_recommendation and explain why the chosen encoding matches the data type.
    11. Unless the user explicitly asks for recommendations only, do not stop at suggesting next analyses. Perform the analysis sequence yourself.
    12. For open-ended or multi-part questions, carry out the full workflow end-to-end: gather evidence, generate the figures that matter, interpret each major step, then finish with a final report.
    13. If cohort selection is part of the request, first set the filters in the response, then analyze the selected cohort using the filtered context.
    14. If the request is specifically to define or save a cohort, the first tool should usually be define_cohort or define_cohort_by_numeric (not just filter application).

    ANSWER QUALITY RULES:
    1. Base claims on the returned evidence. Do not infer biology beyond what the tool outputs support.
    2. For questions about prognosis, mortality, or treatment response, distinguish association from causation.
    3. Mention uncertainty or caveats when sample size, overlap, or missing metadata limits interpretation.
    4. If the evidence is mixed, say so clearly instead of forcing a strong conclusion.
    5. Show the user the reasoning path through concise intermediate updates tied to the tool outputs.
    6. By default, write a direct analysis answer in normal prose with supporting figures and concise interpretation.
    7. Only use a formal report structure when the user explicitly asks for a report, summary document, final report, or when the task is clearly a multi-part deliverable that benefits from report formatting.

    PREFERRED FIGURE STYLE:
    Use "${preferredStyle}" unless the user requests a different style during tool selection.
    
    USER MESSAGE: "${message}"

    RESPONSE JSON REQUIREMENTS:
    - "updatedConfig": Include only charts that should actually be added or changed in the UI. Do not fabricate charts if the answer can stand on prose plus returned tool figures.
    - "feedback": By default, return a clear analysis answer in 2-5 concise paragraphs that explains the evidence, the interpretation, and the main caveat. Use markdown sections only when the user explicitly asks for a report or when a formal structure is genuinely needed.
    - "filters": (optional) updated cohort filter state using exact filter keys and arrays of exact values. Example: {"vital_status":["Alive"],"gender":["female"]}.
    `;

    const generationConfig: any = {
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
            type: "object",
            properties: {
                updatedConfig: {
                    type: "object",
                    nullable: true,
                    properties: {
                        dashboardTitle: { type: "string" },
                        summary: { type: "string" },
                        charts: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    type: { type: "string", enum: ["bar", "violin", "box", "pie", "avg_gene_bar", "scatter", "treemap", "heatmap"] },
                                    title: { type: "string" },
                                    xAxis: { type: "string" },
                                    yAxis: { type: "string" },
                                    color: { type: "string" },
                                    description: { type: "string" },
                                    xAxisOptions: { type: "array", items: { type: "string" } },
                                    yAxisOptions: { type: "array", items: { type: "string" } }
                                },
                                required: ["id", "type", "title", "xAxis", "yAxis"]
                            }
                        }
                    },
                    required: ["charts"]
                },
                feedback: { type: "string" },
                filters: { type: "object" }
            },
            required: ["feedback"]
        }
    };

    const ai = await getAIClient();
    if (!ai) return { feedback: "AI services are unavailable. Please check that REACT_APP_GEMINI_API_KEY is set in your .env file." };

    const modelAttempts = getFallbackModels(model);
    let lastError: unknown = null;

    for (let attemptIndex = 0; attemptIndex < modelAttempts.length; attemptIndex++) {
        const activeModel = modelAttempts[attemptIndex];
        const isFallbackAttempt = attemptIndex > 0;

        try {
            if (isFallbackAttempt && onToolCall) {
                onToolCall('__note__', {
                    title: `Retrying with ${activeModel}`,
                    shortSummary: `The previous model was temporarily unavailable, so the analysis is continuing with ${activeModel}.`,
                    keyFinding: ''
                });
            }

            const toolConfig = await getLiveMcpTools();
            const genModel = ai.getGenerativeModel({ model: activeModel, tools: toolConfig });
            let chat = genModel.startChat();
            
            let result = await chat.sendMessage(prompt);
            let response = result.response;
            
            let callCount = 0;
            const MAX_CALLS = 10;
            // Accumulate short summaries from each tool call for the synthesis nudge
            const toolSummaries: string[] = [];
            while (response.candidates?.[0]?.content?.parts?.some(p => p.functionCall) && callCount < MAX_CALLS) {
                callCount++;
                const parts = response.candidates[0].content.parts;
                const functionCalls = parts.filter(p => p.functionCall);

                const toolResults = await Promise.all(functionCalls.map(async (part) => {
                    const call = part.functionCall!;
                    if (onToolCall) onToolCall(call.name, call.args);
                    const toolOutput = await executeMCPTool(call.name, call.args, message);
                    // Collect a one-line summary for the synthesis nudge
                    const shortSumm = toolOutput?.text?.short_summary || toolOutput?.text?.key_finding || '';
                    if (shortSumm) toolSummaries.push(`[${call.name}] ${shortSumm}`);
                    if (toolOutput?.rendering?.type === 'cohort_card' && onToolCall) {
                        onToolCall('__cohort_card__', {
                            title: toolOutput.text?.title || `Cohort created: ${toolOutput.label || 'Clinical cohort'}`,
                            shortSummary: toolOutput.text?.short_summary || toolOutput.text?.detailed_summary?.main_finding || '',
                            actions: toolOutput.actions || [],
                            icon: toolOutput.rendering?.icon,
                            cohort: {
                                cohort_id: toolOutput.cohort_id,
                                dataset: toolOutput.dataset,
                                label: toolOutput.label,
                                filters: toolOutput.filters || [],
                                sample_count: toolOutput.sample_count || 0,
                                sample_ids: toolOutput.sample_ids || []
                            },
                            suggestions: [
                                `Plot the embedding for the cohort "${toolOutput.label}".`,
                                `Compare the cohort "${toolOutput.label}" with another cohort in ${toolOutput.dataset}.`,
                                `Analyze EGFR expression in the cohort "${toolOutput.label}".`
                            ]
                        });
                    }
                    if (toolOutput?.png_base64) {
                        if (onToolCall) onToolCall('__image__', { 
                            png_base64: toolOutput.png_base64, 
                            htmlBase64: toolOutput.html_base64,
                            htmlPath: toolOutput.html_path,
                            pdfBase64: toolOutput.pdf_base64,
                            svgBase64: toolOutput.svg_base64,
                            stem: toolOutput.stem,
                            description: toolOutput.description,
                            scientificText: toolOutput.text
                        });
                    }
                    if (!toolOutput?.png_base64 && toolOutput?.text && toolOutput?.rendering?.type !== 'cohort_card' && onToolCall) {
                        onToolCall('__note__', {
                            toolName: call.name,
                            title: toolOutput.text.title || call.name,
                            shortSummary: toolOutput.text.short_summary || toolOutput.text.main_finding || '',
                            keyFinding: toolOutput.text.key_finding || ''
                        });
                    }
                    // Build a compact context-safe copy to send back to Gemini.
                    // Strip ALL binary / path fields — they bloat the context window and
                    // can push the model past its effective limit, causing silent non-responses.
                    const modelOutput = { ...toolOutput };
                    const STRIP_KEYS = [
                        'png_base64', 'html_base64', 'pdf_base64', 'svg_base64',
                        'png_path', 'html_path', 'pdf_path', 'svg_path', 'output_dir', 'stem'
                    ];
                    STRIP_KEYS.forEach(k => delete (modelOutput as any)[k]);
                    // Strip clinical preview rows (not needed for synthesis)
                    if ((modelOutput as any).preview) delete (modelOutput as any).preview;
                    // Strip actions array — contains large nested sample_ids payloads
                    if ((modelOutput as any).actions) delete (modelOutput as any).actions;
                    // Truncate large sample_id arrays — model already has them from prompt
                    const rawIds = (modelOutput as any).sample_ids;
                    if (Array.isArray(rawIds) && rawIds.length > 5) {
                        (modelOutput as any).sample_ids = `[${rawIds.length} sample IDs — already provided in prompt]`;
                    }
                    // Strip nested sample_ids in cohort_stats or similar arrays
                    if (Array.isArray((modelOutput as any).cohort_stats)) {
                        (modelOutput as any).cohort_stats = (modelOutput as any).cohort_stats.map(
                            (s: any) => { const c = { ...s }; delete c.sample_ids; return c; }
                        );
                    }
                    // Truncate comparison_table if it has many rows
                    const ct = (modelOutput as any).comparison_table;
                    if (Array.isArray(ct) && ct.length > 20) {
                        (modelOutput as any).comparison_table = ct.slice(0, 20);
                    }
                    return {
                        functionResponse: {
                            name: call.name,
                            response: { content: modelOutput }
                        }
                    };
                }));
                
                result = await chat.sendMessage(toolResults);
                response = result.response;
            }

            let responseText = '';
            try {
                responseText = response.text();
            } catch {
                // response.text() can throw if the model produced only function calls
                // with no trailing text block — treat as empty and fall through to synthesis
            }
            if (!responseText && callCount > 0) {
                // All tools ran successfully but the model produced no synthesis text.
                // Provide the key results as context so the model doesn't have to re-scan history.
                const resultContext = toolSummaries.length > 0
                    ? `\n\nKey results from tools:\n${toolSummaries.join('\n')}`
                    : '';
                try {
                    const synthResult = await chat.sendMessage(
                        `All tools completed.${resultContext}\n\nNow write the biological interpretation: 2-3 paragraphs covering (1) which genes differ most between the cohorts and in which direction, (2) what those differences suggest about tumour biology, and (3) the main caveats of this analysis. Write the interpretation directly — no preamble or meta-commentary.`
                    );
                    responseText = synthResult.response.text();
                } catch {
                    responseText = '';
                }
            }
            return parseToolCallingResponse(responseText);
        } catch (error) {
            lastError = error;
            console.error(`Chat processing failed for model ${activeModel}:`, error);
            if (!isRetryableModelError(error) || attemptIndex === modelAttempts.length - 1) {
                break;
            }
        }
    }

    return {
        feedback: `I hit a temporary model-availability problem while processing your request.${lastError ? ` Last error: ${extractErrorText(lastError)}` : ''}`
    };
};

export const analyzeChartInsights = async (
    config: AnalyticsChartConfig,
    dataSample: DataRow[],
    model: GeminiModel
): Promise<string> => {
    const prompt = `
    As a Data Analyst, provide a concise (2-3 sentences) insight based on this chart configuration and data sample.
    Chart: ${config.title} (${config.type})
    Description: ${config.description}
    X-Axis: ${config.xAxis}, Y-Axis: ${config.yAxis}
    Data Sample: ${JSON.stringify(dataSample.slice(0, 20))}
    
    Identify key trends, outliers, or significant observations. Be professional and data-driven.
    Output only the insight text.
    `;

    const ai = await getAIClient();
    if (!ai) return "AI insights are currently unavailable.";

    try {
        const genModel = ai.getGenerativeModel({ model });
        const result = await genModel.generateContent(prompt);
        return result.response.text() || "No insights available for this dataset.";
    } catch (e) {
        console.error("Insight failed:", e);
        return "Statistical analysis failed for this section.";
    }
};
