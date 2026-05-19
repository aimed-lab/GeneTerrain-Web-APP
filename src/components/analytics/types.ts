
export enum AnalyticsChartType {
    BAR = 'bar',
    VIOLIN = 'violin',
    BOX = 'box',
    PIE = 'pie',
    AVG_GENE_BAR = 'avg_gene_bar',
    // Additional types from AI dashboard
    LINE = 'line',
    AREA = 'area',
    SCATTER = 'scatter',
    BUBBLE = 'bubble',
    TREEMAP = 'treemap',
    HISTOGRAM = 'histogram',
    HEATMAP = 'heatmap',
    CHOROPLETH = 'choropleth'
}

export type GeminiModel =
    | 'gemini-3-flash-preview'
    | 'gemini-2.5-flash'
    | 'gemini-1.5-flash-latest'
    | 'gemini-1.5-pro-latest'
    | 'gemini-flash-latest'
    | 'gemini-flash-lite-latest';

export interface DataRow {
    [key: string]: any;
}

export interface AnalyticsChartConfig {
    id: string;
    type: AnalyticsChartType;
    title: string;
    xAxis: string;
    yAxis: string;
    description?: string;
    color?: string;
    xAxisOptions?: string[];
    yAxisOptions?: string[];
    zAxis?: string;
    zAxisOptions?: string[];
}

export interface DashboardConfig {
    dashboardTitle: string;
    summary: string;
    charts: AnalyticsChartConfig[];
}

export interface ScientificText {
    title: string;
    short_summary: string;
    key_finding: string;
    caption: string;
    detailed_summary: {
        overview: string;
        what_is_shown: string;
        main_finding: string;
        data_basis: string;
        caveat: string;
    };
    rendering?: {
        chart_type?: string;
        style?: string;
        summary_behavior?: string;
    };
}

export interface CohortRecord {
    cohort_id: string;
    dataset: string;
    label: string;
    filters?: any[];
    sample_count: number;
    sample_ids: string[];
}

export interface CohortAction {
    id: string;
    label: string;
    kind?: string;
    payload: CohortRecord;
}

export interface CohortCard {
    cohort: CohortRecord;
    title: string;
    shortSummary: string;
    actions: CohortAction[];
    suggestions?: string[];
    icon?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    imageBase64?: string; // base64-encoded PNG from MCP plot tools
    htmlBase64?: string; // base64-encoded HTML from MCP plot tools
    pdfBase64?: string;    // base64-encoded PDF from MCP plot tools
    svgBase64?: string;    // base64-encoded SVG from MCP plot tools
    htmlPath?: string;    // local path of an HTML plot output
    description?: string;
    scientificText?: ScientificText;
    cohortCard?: CohortCard;
}

export type ViewMode = 'analysis' | 'stats' | 'data';

export interface ColumnStats {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    uniqueCount: number;
    missingValues: number;
    type: 'numeric' | 'categorical';
    topValues?: { value: string; count: number }[];
}

export interface DatasetProfile {
    rows: number;
    cols: number;
    columnStats: Record<string, ColumnStats>;
    memoryEstimate?: string;
}

export interface AppState {
    csvData: DataRow[];
    csvData2?: DataRow[];
    headers: string[];
    config: DashboardConfig | null;
    isLoading: boolean;
    error: string | null;
    fileName: string | null;
    fileName2?: string | null;
    activeFilters: Record<string, any[]>;
    profile: DatasetProfile | null;
    profile2?: DatasetProfile | null;
    theme: 'dark' | 'light';
    selectedModel: GeminiModel;
    viewMode: ViewMode;
    messages: ChatMessage[];
    isFilterSidebarOpen: boolean;
    isChatPanelOpen: boolean;
    hiddenChartIds: string[];
}
