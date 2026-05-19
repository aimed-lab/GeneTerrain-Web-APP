import { AnalyticsChartConfig, AnalyticsChartType } from "./types";

export const DEFAULT_CHARTS: AnalyticsChartConfig[] = [
    {
        id: 'avg-gene-bar-1',
        type: AnalyticsChartType.AVG_GENE_BAR,
        title: 'Average Gene Expression',
        xAxis: 'gene_symbol',
        yAxis: 'value',
        color: '#48BB78',
        description: 'Comparison of average expression levels for selected genes across both Lasso selections.'
    },
    {
        id: 'gene-violin-dist',
        type: AnalyticsChartType.VIOLIN,
        title: 'Expression Distribution (Violin)',
        xAxis: 'gene_symbol',
        yAxis: 'value',
        color: '#3182CE',
        description: 'Violin plot showing gene expression distribution across samples in both selections.'
    },
    {
        id: 'gene-box-dist',
        type: AnalyticsChartType.BOX,
        title: 'Expression Distribution (Box)',
        xAxis: 'gene_symbol',
        yAxis: 'value',
        color: '#9F7AEA',
        description: 'Box plot analysis for selected genes, comparing outliers and medians between cohorts.'
    },
    {
        id: 'demographics-pie-1',
        type: AnalyticsChartType.PIE,
        title: 'Race Distribution',
        xAxis: 'race',
        yAxis: 'count',
        color: '#ED8936',
        xAxisOptions: ['race', 'gender', 'vital_status', 'ajcc_pathologic_tumor_stage'],
        description: 'Comparison of racial demographics between the two selections.'
    },
    {
        id: 'demographics-pie-2',
        type: AnalyticsChartType.PIE,
        title: 'Vital Status',
        xAxis: 'vital_status',
        yAxis: 'count',
        color: '#E53E3E',
        xAxisOptions: ['vital_status', 'tumor_status', 'gender'],
        description: 'Side-by-side comparison of patient survival status.'
    }
];
