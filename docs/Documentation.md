## GeneTerrain Documentation Hub

Last Updated: 2025-08-18

Short Description: Centralized, analysis-focused documentation for the GeneTerrain application. Use the sidebar structure below to navigate by topic. Each page section includes a brief overview, what you can do, and jump links to subsections.

Repository: [aimed-lab/GeneTerrain-Web-APP](https://github.com/aimed-lab/GeneTerrain-Web-APP)

### Sidebar (Navigation Map)

- Installing and Implementing

  - [Getting Started](#getting-started)
  - [Configuration](#configuration)
  - [Deployment](#deployment)

- Using GeneTerrain (End-User Guide)

  - [Home Page](#home-page)
  - [Custom GeneTerrain](#custom-geneterrain)
  - [GBM Analysis](#gbm-analysis)
  - [Authentication](#authentication)
  - [Feedback](#feedback)

- Data & Services

  - [Datasets & Samples](#datasets--samples)
  - [Embeddings Scatter](#embeddings-scatter)
  - [Gene Expression Fetcher](#gene-expression-fetcher)
  - [Saving & History](#saving--history)

- Visualization System

  - [Terrain Engine (WebGL)](#terrain-engine-webgl)
  - [Layers & Controls](#layers--controls)
  - [Selection & Summary](#selection--summary)

- API & Integrations

  - [Dataset Registry](#dataset-registry)
  - [Oracle APEX Endpoints](#oracle-apex-endpoints)
  - [OpenAI Summaries](#openai-summaries)
  - [Firebase Auth](#firebase-auth)

- Reference
  - [Types](#types)
  - [File Formats (Custom Uploads)](#file-formats-custom-uploads)
  - [Environment Variables](#environment-variables)

Tip: Add a search bar in your docs site to index all headings (H2/H3).

---

## Getting Started

Last Updated: 2025-08-18

Short Description: Install dependencies and run GeneTerrain locally.

What’s covered:

- Node/npm setup, install, run
- Project structure at a glance

Subsections:

- [Install](#install)
- [Run](#run)
- [Project Structure](#project-structure)

#### Install

- Node 16+ recommended
- In `gene-terrain/`:
  - `npm install`

#### Run

- `npm start` → http://localhost:3000

#### Project Structure

- App shell: `src/App.tsx`
- Theme: `src/theme.ts`
- Pages: `src/pages/*`
- Components: `src/components/*`
- Visualization engine: `src/GaussianPlots/*`, `src/shaders/gaussian.ts`
- Services: `src/services/*`
- Context/state: `src/context/*`

---

## Configuration

Last Updated: 2025-08-18

Short Description: Configure environment keys and feature flags.

What’s covered:

- API base URLs and feature flags
- Required environment variables

Subsections:

- [App Config](#app-config)
- [Env Vars](#environment-variables)

#### App Config

- File: `src/config/appConfig.ts`
- Controls base URL, endpoints, timeouts, and feature flags.

#### Environment Variables

- See [Environment Variables](#environment-variables).

---

## Deployment

Last Updated: 2025-08-18

Short Description: Build and deploy GeneTerrain.

What’s covered:

- Production build
- Static hosting options

Subsections:

- [Build](#build)
- [Host](#host)

#### Build

- `npm run build` (outputs optimized static assets)

#### Host

- Any static host (Vercel/Netlify/S3/Nginx). Ensure env vars are provided at build time.

---

## Home Page

Last Updated: 2025-08-18

Short Description: Primary workspace for selecting datasets, assembling cohorts, and generating GeneTerrains with multiple visualization layers.

What’s covered:

- Dataset selection and loading
- Samples Table (filter, search, expand details)
- Embeddings Scatter (neighborhood/cluster selection)
- Terrain visualization layers and controls
- Lasso multi-region selection and summaries
- Save/Load/Compare visualization states

Subsections:

- [Datasets Panel](#datasets-panel)
- [Samples Table](#samples-table)
- [Embeddings Scatter](#embeddings-scatter)
- [Visualization Layers](#visualization-layers)
- [Lasso & Summary](#lasso--summary)
- [Save/Load/Compare](#saveloadcompare)

#### Datasets Panel

- Pick from registry-backed datasets (e.g., PanCan, GBM, Kidney).
- Loads sample metadata and embeddings (when available).

#### Samples Table

- File: `components/samples/SamplesTable.tsx`
- Filter/search, paginate, expand organized details (Patient, Tumor, Molecular, Treatment, Study).
- Select all filtered, select by condition, or per-row selection.
- Use column filters: numeric ranges (e.g., age), categorical values (e.g., subtype), or text contains.

#### Embeddings Scatter

- File: `components/samples/ScatterPlot.tsx`
- Visualize samples by 2D embeddings; color by any clinical field.
- Cluster continuous fields (interval/quantile) to show groups.
- Click to enable “neighborhood” radius selection; lasso to draw arbitrary selection.

#### Visualization Layers

- File: `GaussianPlots/GaussianMap.tsx`, shaders in `shaders/gaussian.ts`
- Layers:
  - Terrain (Gaussian heatfield)
  - Contour (adjust isoline density & thickness)
  - Peaks-only (truncate negatives)
  - Valleys-only (truncate positives)
- Zoom/pan; adaptive labels prioritize strongest genes at low zoom.

#### Lasso & Summary

- Multi-region lasso; selection summary panel with gene counts and export-ready lists.
- Filter by pathways in real time; click genes for details.

#### Save/Load/Compare

- Save current state (viewport + selected genes); list history; load states.
- Compare up to 5 saved states to contrast cohorts or parameterizations.

---

## Custom GeneTerrain

Last Updated: 2025-08-18

Short Description: Upload your own layout and expression files to generate a GeneTerrain.

What’s covered:

- Supported file formats and validation
- Condition selection and settings
- Generate, view, and export

Subsections:

- [File Formats](#file-formats-custom-uploads)
- [Validation](#validation)
- [Visualization Settings](#visualization-settings)

#### Validation

- Layout must include Gene + numeric X,Y columns (case-insensitive headers accepted).
- Expression must include Gene + ≥1 condition columns (numeric values expected).
- Robust CSV/TSV detection and BOM/delimiter handling (PapaParse + custom fallback).

#### Visualization Settings

- Choose condition column; set Gaussian sigma and point size; pick color scheme; render terrain.

---

## GBM Analysis

Last Updated: 2025-08-18

Short Description: Focused exploration page for Glioblastoma Multiforme datasets.

What’s covered:

- Load GBM samples via module
- Explore field availability, unique values, and filter down
- Use Samples Table + Visualize loop

Subsections:

- [GBM Module](#gbm-module)

#### GBM Module

- Files: `modules/GBMDataModule/*`, page: `pages/GBMAnalysis.tsx`
- Normalizes fields across heterogeneous GBM data sources.

---

## Authentication

Last Updated: 2025-08-18

Short Description: Secure access to protected routes and save/history features.

What’s covered:

- Email/password and social login (Google/Facebook)
- Protected routes; user context

Subsections:

- [Login/Registration](#loginregistration)
- [Protected Routes](#protected-routes)

#### Login/Registration

- Files: `pages/auth/LoginPage.tsx`, `pages/auth/RegisterPage.tsx`
- Managed by Firebase; redirects unauthenticated users appropriately.

#### Protected Routes

- File: `src/App.tsx` (`ProtectedRoute`)
- Ensures only authenticated users access main analysis pages.

---

## Feedback

Last Updated: 2025-08-18

Short Description: In-app feedback modal to report issues or request features.

What’s covered:

- Modal UI with optional file attachment
- Submission to backend with Firebase token

Subsections:

- [Feedback Modal](#feedback-modal)

#### Feedback Modal

- Files: `components/common/FeedbackModal.tsx`, `services/feedbackService.ts`
- Endpoint: Oracle APEX; includes user_id (when logged in), category, message, and optional screenshot metadata.

---

## Datasets & Samples

Last Updated: 2025-08-18

Short Description: How datasets and samples are fetched, filtered, and selected.

What’s covered:

- Dataset registry fetch with mock fallback
- Sample filtering & selection flow

Subsections:

- [Dataset Service](#dataset-service)
- [Samples Context](#samples-context)

#### Dataset Service

- File: `services/datasetService.ts`
- Tries registry first; falls back to mock datasets when unreachable.

#### Samples Context

- File: `context/SamplesContext.tsx`
- Manages selected dataset, sample selection sets, filters, embeddings, and visualization toggles.

---

## Embeddings Scatter

Last Updated: 2025-08-18

Short Description: 2D embeddings to select cohorts visually.

What’s covered:

- Color by clinical field; cluster continuous variables
- Neighborhood radius on click; lasso multi-select

Subsections:

- [Scatter Component](#scatter-component)

#### Scatter Component

- File: `components/samples/ScatterPlot.tsx`
- Integrates with `SamplesContext` and embeddings fetched per dataset.

---

## Gene Expression Fetcher

Last Updated: 2025-08-18

Short Description: Averages gene expression across selected samples using registry URLs.

What’s covered:

- Layout URL and gene expression URL from dataset registry
- Averaging logic and normalization

Subsections:

- [Fetcher](#fetcher)

#### Fetcher

- File: `modules/GeneExpressionDataFetcher/fetchGeneExpressionData.ts`
- Loads layout, fetches gene expression per sample, computes per-gene averages, and normalizes coordinates.

---

## Saving & History

Last Updated: 2025-08-18

Short Description: Persist and revisit visualization states; compare multiple states.

What’s covered:

- Save with name; list, load, delete history
- Compare up to 5 states (batch fetch of averaged expression)

Subsections:

- [History UI](#history-ui)

#### History UI

- File: `GaussianPlots/VisualizationHistory.tsx`
- Endpoints: save, fetch, delete (Oracle APEX) with Firebase token.

---

## Terrain Engine (WebGL)

Last Updated: 2025-08-18

Short Description: GPU-accelerated shader pipeline for terrain, contours, peaks, and valleys.

What’s covered:

- Vertex + fragment shaders
- Texture packing of points/values for fast rendering

Subsections:

- [Shaders](#shaders)

#### Shaders

- Files: `shaders/gaussian.ts`, usage in `GaussianMap.tsx`
- Uniforms for sigma, resolution, scale/offset, lineThickness, isolineSpacing, and theme colors.

---

## Layers & Controls

Last Updated: 2025-08-18

Short Description: Switch visualization modes and tune parameters.

What’s covered:

- Layer switcher (Terrain, Contour, Peaks, Valleys)
- Contour controls (line thickness, isoline density)
- Zoom/pan behavior and adaptive labels

Subsections:

- [Layer Switcher](#layer-switcher)
- [Contour Controls](#contour-controls)

#### Layer Switcher

- UI in `GaussianMap.tsx`; previews in `src/assets/layers/*`.

#### Contour Controls

- Adjust line thickness and isoline spacing; immediate redraw.

---

## Selection & Summary

Last Updated: 2025-08-18

Short Description: Select regions and turn them into actionable gene lists.

What’s covered:

- Multi-region lasso; exclude/restore genes
- Selection summary panel and pathway filtering

Subsections:

- [Lasso](#lasso)
- [Summary Panel](#summary-panel)

#### Lasso

- Draw regions; selections persist across zoom/pan; click to clear or reopen summary.

#### Summary Panel

- Shows selected gene counts and basic stats; intended for export.

---

## Dataset Registry

Last Updated: 2025-08-18

Short Description: Central registry for dataset metadata and URLs.

What’s covered:

- Fetch datasets, dataset info (layout/gene URLs), and embeddings URLs.

Subsections:

- [Endpoints](#endpoints)

#### Endpoints

- Registry base (example): `https://aimed.uab.edu/apex/gtkb/datasets/pancan/all`
- Embeddings (example pattern): `.../embeddings/{datasetId}` or registry-provided URL.

---

## Oracle APEX Endpoints

Last Updated: 2025-08-18

Short Description: Backend services for saving states and feedback.

What’s covered:

- Save/Fetch/Delete visualization states
- Feedback submission

Subsections:

- [Visualization History](#visualization-history-endpoints)
- [Feedback API](#feedback-api)

#### Visualization History Endpoints

- Save: `.../save/saveGT/`
- Fetch: `.../save/getGT/{userId}`
- Delete: `.../save/deleteGT/{id}`

#### Feedback API

- `.../feedabck/saveFeedbck/` (sends payload; parses JSON when present)

---

## OpenAI Summaries

Last Updated: 2025-08-18

Short Description: Generate 3–4 line clinical summaries for selected samples.

What’s covered:

- Prompt strategy and token limits
- Environment key required

Subsections:

- [Summary Component](#summary-component)

#### Summary Component

- File: `modules/SampleSummaryModule/SampleSummaryComponent.tsx`
- Model: `gpt-3.5-turbo` via `REACT_APP_OPENAI_API_KEY`.

---

## Firebase Auth

Last Updated: 2025-08-18

Short Description: Authentication for protected routes and secured APIs.

What’s covered:

- Email/password and social providers
- Token usage with APEX endpoints

Subsections:

- [Auth Context](#auth-context)

#### Auth Context

- File: `components/context/AuthContext.tsx`
- Exposes `isAuthenticated`, `user`, `login`, and `logout`.

---

## Types

Last Updated: 2025-08-18

Short Description: Shared TypeScript types for datasets, samples, and points.

What’s covered:

- `Point`, `Sample`, `Dataset`, `CancerGroup`

Subsections:

- [Type Definitions](#type-definitions)

#### Type Definitions

- File: `types/index.ts`

---

## File Formats (Custom Uploads)

Last Updated: 2025-08-18

Short Description: Required structure for Layout and Expression files.

What’s covered:

- Layout: `Gene,X,Y`
- Expression: `Gene,<Condition1>,<Condition2>,...`

Subsections:

- [Examples](#examples)

#### Examples

Layout:

```csv
Gene,X,Y
IGKC,842.4008541,779.5752251
IGHA1,948.0169146,586.5196132
```

Expression:

```csv
Gene,B_Cell,T_Cell,Macrophage
IGKC,2.41,-0.08,0.52
IGHA1,1.93,0.14,-0.63
```

---

## Environment Variables

Last Updated: 2025-08-18

Short Description: Keys needed for external services.

What’s covered:

- OpenAI API key
- Firebase config

Subsections:

- [List](#list)

#### List

- `REACT_APP_OPENAI_API_KEY` (for AI sample summaries)
- Firebase keys (per your Firebase project)

---

## Appendix: Practical Workflows

Last Updated: 2025-08-18

Short Description: Common analysis tasks and how to perform them.

What’s covered:

- Cohort-level terrain (e.g., GBM classical)
- Age-stratified comparison
- Pathway-focused ROI
- Custom dataset upload

Subsections:

- [GBM Classical](#gbm-classical)
- [Age Stratification](#age-stratification)
- [Pathway ROI](#pathway-roi)
- [Custom Study](#custom-study)

#### GBM Classical

1. Select GBM dataset → filter subtype = classical → select all.
2. Visualize → switch layers (Terrain/Contour/Peaks/Valleys) → lasso → summarize.
3. Save state; later compare against another subtype.

#### Age Stratification

1. Column-filter age (e.g., 40–60) → select → visualize → save.
2. Change filter to another bin (e.g., <40) → visualize → save → compare 2 states.

#### Pathway ROI

1. In GeneTerrain, type pathways (e.g., "DNA Repair, Cell Cycle").
2. Lasso enriched region; export selected genes for downstream analysis.

#### Custom Study

1. Upload layout and expression files in Custom GeneTerrain → validate.
2. Choose condition; adjust sigma; generate terrain; lasso and export.
