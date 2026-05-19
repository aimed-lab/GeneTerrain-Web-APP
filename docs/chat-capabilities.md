# GeneTerrain Chat Capabilities

## Overview

The GeneTerrain chat panel is a Gemini-based bioinformatics assistant connected to a local MCP server. It can:

- answer dataset and gene-expression questions
- retrieve raw and summarized bioinformatics data
- generate publication-style charts and embeddings
- perform multi-step analysis workflows
- apply cohort filters through chat
- return scientific interpretation with supporting visuals

Primary integration points:

- Frontend orchestration: [src/services/geminiService.ts](/Users/geetanjali/Desktop/GeneTerrain-Web-APP/src/services/geminiService.ts)
- Chat state: [src/components/context/ChatContext.tsx](/Users/geetanjali/Desktop/GeneTerrain-Web-APP/src/components/context/ChatContext.tsx)
- Chat UI: [src/components/analytics/ChatPanel.tsx](/Users/geetanjali/Desktop/GeneTerrain-Web-APP/src/components/analytics/ChatPanel.tsx)
- MCP server: `/Users/geetanjali/Documents/AI-MED/bio_mcp_server_dynamic.py`

## External Tools

The chat uses the Bioinformatics MCP server as its external tool layer. The frontend now discovers tools dynamically from the live `/tool_catalog` endpoint.

Current tool set:

1. `healthcheck`
2. `count_gene_rows`
3. `clinical_sample_count`
4. `gene_rows`
5. `gene_summary_by_group`
6. `embedding_points`
7. `multi_gene_summary`
8. `embedding_points_with_group`
9. `interpret_gene_summary`
10. `plot_gene_summary_by_group`
11. `plot_multi_gene_summary`
12. `plot_embedding`
13. `plot_embedding_by_group`
14. `chart_recommendation`
15. `scientific_text_only_summary`
16. `suggest_analysis_questions`
17. `gene_rows_with_group`
18. `gene_rows_with_x`
19. `list_clinical_fields`
20. `plot_gene_distribution`
21. `plot_gene_vs_continuous`

## Tool Categories

### Retrieval

- `gene_rows`
- `gene_rows_with_group`
- `gene_rows_with_x`
- `embedding_points`
- `embedding_points_with_group`
- `list_clinical_fields`

Use these for:

- raw expression retrieval
- sample-level analysis
- checking valid clinical fields
- embedding coordinate inspection

### Counting and Sanity

- `healthcheck`
- `count_gene_rows`
- `clinical_sample_count`

Use these for:

- server availability
- dataset size checks
- gene row count checks

### Summary and Interpretation

- `gene_summary_by_group`
- `multi_gene_summary`
- `interpret_gene_summary`
- `scientific_text_only_summary`
- `suggest_analysis_questions`

Use these for:

- grouped mean comparisons
- cross-gene comparisons
- text-only scientific interpretation
- follow-up analysis generation

### Plotting

- `plot_gene_summary_by_group`
- `plot_multi_gene_summary`
- `plot_embedding`
- `plot_embedding_by_group`
- `plot_gene_distribution`
- `plot_gene_vs_continuous`

Use these for:

- grouped bar or line figures
- multi-gene panels and heatmaps
- embedding/clustering figures
- box and violin plots
- continuous association scatter plots

### Visualization Recommendation

- `chart_recommendation`

Use this for:

- chart selection
- style selection
- explaining why a chart type fits a given analysis

## Chat Capacity

### 1. Supported Question Types

The chat currently supports these major request types:

1. Sanity and dataset checks
2. Raw data retrieval
3. Single-gene grouped analysis
4. Distribution analysis
5. Continuous-variable analysis
6. Multi-gene comparison
7. Embedding and clustering analysis
8. Scientific interpretation-only questions
9. Cohort selection and cohort reset
10. Style and presentation requests
11. Multi-step analytical workflows
12. Formal report requests

Examples:

- `What datasets do you have?`
- `How many samples are in GBM?`
- `Show EGFR rows for BRCA`
- `Analyze TP53 by gender`
- `Show MGMT distribution by vital_status`
- `Plot TP53 against age`
- `Compare EGFR, PTEN, and TP53`
- `Do alive and dead patients cluster differently?`
- `Focus on alive female patients`
- `Clear cohort filters`
- `Generate a Nature-style figure`
- `Give me a final report`

### 2. Answer Modes

The chat can currently return these answer forms:

1. Direct analysis prose
2. Analysis prose plus supporting figures
3. Intermediate analysis notes during execution
4. Interactive chart/image cards
5. Cohort filter updates plus analysis
6. Formal report-style answer when explicitly requested

### 3. Figure Capacity

Current intended behavior:

- simple questions: `1-2` figures
- complex or multi-step workflows: up to `3-4` figures
- avoid redundant figures

### 4. Cohort Control

The chat can update the dashboard’s live cohort filters using exact filter keys and values from the current data context.

Examples:

- `Focus on alive patients`
- `Restrict to stage III and IV`
- `Show only female GBM patients`
- `Clear cohort filters`

Behavior:

- multiple values in one field use OR logic
- different fields combine with AND logic

### 5. Dynamic Tool Discovery

The chat no longer depends only on a frozen frontend tool list. It now:

- fetches a live MCP tool catalog
- builds Gemini tool declarations from the live catalog
- can use newly added bioinformatics tools without another hardcoded sync step

This depends on the MCP server’s `/tool_catalog` route.

### 6. Model Fallback

The chat includes automatic fallback across supported Gemini models when temporary model-availability errors occur.

Current fallback direction favors newer available models rather than retired ones.

## Visualization Capacity

The plotting layer currently supports:

- grouped summary bar/line figures
- multi-gene grouped bar panels
- heatmaps
- embeddings
- cohort-colored embeddings
- box plots
- violin plots
- continuous scatter plots with fitted line

Supported style presets:

- `nature`
- `science`
- `nejm`
- `bioinformatics`
- `statistical`
- `presentation`
- `dark`
- `dashboard`
- `eda`

Current visual goal:

- scientific, publication-leaning figures rather than basic defaults
- stronger palettes
- cleaner axis treatment
- better marker and trace styling
- improved distribution and heatmap presentation

## Limitations

Current practical limits:

- chat can only use tools the MCP server exposes
- scientific plots are stronger than before, but not yet full custom journal-figure composition
- advanced figure assembly like multi-panel labeled composites still needs dedicated implementation
- analysis quality still depends on dataset field availability and model/tool routing quality

## Next Expansion Paths

High-value future additions:

1. survival-style figures
2. pathway diagrams
3. multi-panel composite scientific figures
4. labeled panel assemblies (`A`, `B`, `C`)
5. richer domain-specific statistical tools
6. stronger report export paths

