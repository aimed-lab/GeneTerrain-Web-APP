# 🧠 GBM Case Studies — GeneTerrain App-Flow Aligned

> These case studies follow the **exact interaction flow** of the GeneTerrain app:
> **Cohort Setup (Age Range) → Side-by-Side Terrain → Lasso Selection → Dynamic Dashboard → AI Chat**

---

## The GeneTerrain GBM Workflow At a Glance

```
Step 1                  Step 2                   Step 3
[Select Dataset]  →  [Set Age Filters]  →  [View Dual Terrains]
 GBM Dataset          Cohort 1 & 2           Side-by-Side

Step 4                  Step 5
[Lasso Regions]  →  [Dashboard + AI Chat]
 Draw on terrain        Auto-populated analytics
                        Ask the AI questions
```

---

## 🟢 Case Study A — The Age Divide (Beginner)

**Objective:** Explore whether younger and older GBM patients have fundamentally different gene expression landscapes.

**Estimated Time:** 10–15 minutes | **Difficulty:** Beginner | **Persona:** Clinician / Student

---

### Step 1 · Dataset Selection

- Navigate to the **GBM Analysis** page (Home → GBM)
- The GBM dataset loads automatically with all samples

---

### Step 2 · Cohort Setup via Age Range

| Panel | Action |
|---|---|
| **Cohort 1 (Left)** | Use the age range slider — set to **≤ 45 years** ("Young GBM") |
| **Cohort 2 (Right)** | Use the age range slider — set to **≥ 65 years** ("Elderly GBM") |

> **Why this matters:** GBM is biologically distinct in younger patients — often IDH-mutant with better prognosis — versus older patients who are predominantly IDH-wildtype with more aggressive disease.

Once filters are applied, click **"Compare Cohorts"** to load the side-by-side terrain view.

---

### Step 3 · Visual Terrain Exploration

You now see **two color-coded terrain maps** side by side.

**What to look for:**
- 🏔️ **Mountain peaks** = clusters of highly expressed genes
- 🏜️ **Valleys** = regions of low/absent expression
- 🎨 **Color gradient** = expression intensity from low (cool) → high (warm)

**Expected observation:**
- The **Young cohort terrain** may appear smoother, with fewer extreme peaks in RTK/growth factor regions
- The **Elderly cohort terrain** may show sharper, more intense peaks — indicating aggressive, highly active oncogenic programs

**Try this:** Pan and zoom into regions where the two terrains look most different.

---

### Step 4 · Lasso Selection

> Enable **Lasso Mode** using the toolbar button (lasso icon) above the terrain.

1. On the **Left terrain (Young)**, draw a lasso around the top 3 "mountain peak" clusters you can see
2. **If Lasso Sync is ON**, the same spatial region is selected on the Right terrain automatically — allowing a direct comparison
3. The **Analytics Dashboard** automatically opens below

**Tip:** You can draw separate lassos on each terrain if Sync is turned OFF for more targeted region selection.

---

### Step 5 · Read the Dynamic Dashboard

The dashboard populates automatically with your selected genes.

| Chart/Section | What to check |
|---|---|
| **Gene Bar Chart** | Look for genes where the Orange (Cohort 2/Elderly) bar is significantly taller — these are upregulated in older patients. Stars (★ ★★) = statistically significant |
| **Violin Plot** | Check the spread of expression values — wider distributions suggest greater heterogeneity in that cohort |
| **Pathway Enrichment** | Scroll to lollipop chart — which GO Biological Processes are enriched in each cohort? |
| **Gene Network** | Are the enriched pathways in Young and Elderly patients interconnected or independent? |

---

### Step 6 · Ask the AI

Open the **GeneTerrain AI Chat** (floating button, bottom right) and type:

> *"I've compared young GBM patients (≤45 years) vs elderly GBM patients (≥65 years) using a lasso selection of the highest-expression peaks. The top differentially expressed genes in the elderly cohort are [paste gene names from bar chart]. What biological pathways might explain GBM being more aggressive in elderly patients, and are any of these genes associated with IDH mutation status?"*

**Expected AI insights:**
- IDH-wildtype prevalence in elderly patients and its link to TERT promoter mutations
- Upregulation of EGFR, PTEN loss, and CDKN2A deletion patterns
- Immune microenvironment differences (myeloid infiltration in elderly GBM)

---

### 🎯 Learning Outcome

You have identified the **molecular age signature** of GBM — demonstrating that age is not just a demographic variable but reflects fundamentally different tumor biology, visible directly in the terrain landscape.

---

---

## 🟡 Case Study B — The Genomic Terrain of Tumor Invasion (Intermediate)

**Objective:** Identify the gene expression programs governing local invasion vs. proliferation by comparing mid-age cohorts and using targeted lasso regions.

**Estimated Time:** 20–25 minutes | **Difficulty:** Intermediate | **Persona:** Researcher / Neuro-oncologist

---

### Step 1 · Dataset Selection

- Navigate to **GBM Analysis → Compare Cohorts**
- Select the **GBM dataset**

---

### Step 2 · Cohort Setup — Age-Controlled Comparison

| Panel | Action |
|---|---|
| **Cohort 1 (Left)** | Age range: **35–55 years** |
| **Cohort 2 (Right)** | Age range: **56–75 years** |

> **Research goal:** By using overlapping but distinct age windows, we capture biologically meaningful differences while staying in a clinically relevant midrange population. Any terrain differences reflect molecular subtypes, not extreme age biology.

---

### Step 3 · Visual Terrain Comparison

Side-by-side comparison: Look for **two qualitatively different terrain types**:

- **Diffuse low hills** across the terrain → may indicate a mixed transcriptional state (mesenchymal/invasive program)
- **Isolated sharp peaks** in specific regions → may indicate a highly proliferative, RTK-driven state

**Exercise:** Identify at least **2 spatial regions** where the two terrains diverge visually. Note them down — you will lasso each separately.

---

### Step 4 · Two-Region Lasso Strategy

This case study uses **Sync OFF** to perform a targeted two-region investigation:

**Region 1 — Lasso "Peak Cluster A"** (a prominent mountain in either terrain):
1. Turn Lasso Sync **OFF**
2. On **Left terrain**, lasso a dominant peak region
3. On **Right terrain**, lasso the corresponding spatial location (even if it's a valley there)
4. Check the dashboard — record the **top 5 genes** in each cohort

**Region 2 — Lasso "Flat/Valley Region B"** (a contrasting quiet zone):
1. Clear the previous lasso
2. Lasso a low-expression region on both terrains
3. Note any genes that appear in the Right cohort valley but are peaks in the Left terrain

---

### Step 5 · Dashboard Deep-Dive — Three Key Analyses

#### 5a. Gene Bar Chart with Statistical Significance
- Sort top genes by expression discrepancy between cohorts
- Note genes with ★★ (p < 0.01) — these are your high-confidence candidates
- Focus on two categories: **Cohort 1 > Cohort 2** and **Cohort 2 > Cohort 1**

#### 5b. Violin Plot — Distribution Width
- A **narrow violin** = most patients in that cohort express the gene similarly (homogeneous)
- A **wide/bimodal violin** = subgroups exist within that cohort (heterogeneous) → suggests mixed biology
- If you see bimodal distributions in the Right cohort, there may be subpopulations requiring separate analysis

#### 5c. Pathway Enrichment (Lollipop Chart)
- Compare the enriched GO terms between Left and Right cohort selections
- Key terms to look for:
  - `cell migration`, `extracellular matrix organization` → invasive program
  - `DNA replication`, `cell cycle` → proliferative program
  - `angiogenesis`, `VEGF signaling` → vascular co-option

---

### Step 6 · Cross-Reference the Gene Network

In the **Network Panel** of the dashboard:
- Look for **hub nodes** — genes connected to many pathways
- If EGFR, MET, or NF1 appear as hubs → RTK-driven proliferation
- If CD44, VIM, or FN1 appear → mesenchymal/invasive state

---

### Step 7 · AI Chat — Mechanistic Deep Dive

> *"In my lasso comparison of two GBM cohorts, Region A (a high-expression peak zone) contained genes: [paste list]. The pathway enrichment shows enrichment in [paste GO terms]. Could you explain whether this gene set suggests an invasion-dominant vs. proliferation-dominant tumor program, and what therapeutic vulnerabilities each program has?"*

**Expected AI insights:**
- Mesenchymal GBM vs. Classical GBM subtype signatures
- Invasion drivers: MMPs, integrins, Wnt/β-catenin
- Proliferation drivers: CDK4/6, EGFR/PDGFRA
- Therapeutic implications: anti-angiogenic (bevacizumab) vs. EGFR inhibitor trials

---

### 🎯 Learning Outcome

You have used **spatial lasso investigation** across two terrain regions to decode distinct tumor programs — demonstrating how GeneTerrain's topography directly encodes biological heterogeneity rather than just expression levels.

---

---

## 🔴 Case Study C — Decoding the Immunological Cold vs. Hot GBM (Advanced)

**Objective:** Use the full GeneTerrain workflow to investigate immune microenvironment differences between patient sub-cohorts, correlating terrain morphology with immune gene signatures and generating a hypothesis for immunotherapy response.

**Estimated Time:** 35–45 minutes | **Difficulty:** Advanced | **Persona:** Translational Researcher / Immunologist

---

### Step 1 · Dataset & Background

- Load the **GBM dataset**
- Background: GBM is considered "immunologically cold," but ~20–30% show elevated immune infiltration — a potential immunotherapy window.

---

### Step 2 · Cohort Design — Capturing an Immune Axis

| Panel | Action |
|---|---|
| **Cohort 1 (Left)** | Age: **≤ 50 years** ("Immune-competent, younger") |
| **Cohort 2 (Right)** | Age: **≥ 60 years** ("Immune-senescent, older") |

> **Advanced rationale:** Age correlates with immune senescence — younger GBM patients often have stronger adaptive T cell responses, while elderly patients tend toward myeloid-dominant, immunosuppressive microenvironments. This age split naturally captures the immune axis.

---

### Step 3 · Terrain Scouting for Immune Signatures

Navigate the terrain with a trained eye for immune-relevant regions:

**Known immune gene neighborhoods to locate** (these cluster in the terrain's spatial layout):
- **T cell zone**: CD8A, CD8B, PRF1, GZMB, IFNG — look for a terrain "ridge" in this area
- **Myeloid/macrophage zone**: CD68, CD163, MRC1, ITGAM — typically a separate topographic cluster
- **Checkpoint zone**: PDCD1 (PD-1), CD274 (PD-L1), CTLA4 — often partially overlapping with T cell zone

**Exercise:**
1. Use the **zoom tool** to explore at 2x–4x magnification
2. Hover over gene labels to identify landmarks
3. Locate where immune genes sit relative to oncogene peaks (EGFR, PDGFRA)
4. **Observation:** Do the two cohorts show different peak heights in these immune zones?

---

### Step 4 · Multi-Lasso Strategy — Immune Zone Dissection

**Lasso 1 — T cell / adaptive zone:**
- With Sync **ON**, lasso the region containing CD8A or GZMB (peaks in either cohort)
- Dashboard: Compare T cell effector gene expression between cohorts — is it higher in the younger cohort?

**Lasso 2 — Myeloid/macrophage zone:**
- **Clear** the previous lasso, Sync **OFF**
- Lasso the myeloid cluster region on each terrain separately
- Dashboard: Compare CD163 (M2/immunosuppressive) vs. CD80 (M1/pro-inflammatory) balance between cohorts

**Lasso 3 — Oncogenic peak (control):**
- Lasso the EGFR/RTK peak region as a non-immune biological baseline
- Dashboard: Use this as your control — confirms the terrain's oncogenic axis is similar, isolating immune differences

---

### Step 5 · Advanced Dashboard Interpretation

#### 5a. Statistical Layer — Welch's t-Test Stars
- For each lasso set, note genes with ★★ (p < 0.01)
- Build a mental matrix:
  - **High in Young + T cell gene expression** → Adaptive immune response candidate
  - **High in Elderly + CD163 high** → M2-macrophage dominated, immunosuppressive microenvironment

#### 5b. Violin Plot — Searching for Bimodal Distributions
- Look for bimodal violin shapes in **CD274 (PD-L1)**: if bimodal, one peak = tumor-intrinsic (constitutive), one = immune-driven (IFN-γ-induced)
- A bimodal distribution here is a direct biological hypothesis: **two mechanisms of PD-L1 upregulation exist within this cohort**

#### 5c. Pathway Enrichment — Immune-Specific GO Terms
- Look for: `adaptive immune response`, `T cell activation`, `antigen processing`, `type II interferon signaling`
- Absence in one cohort vs. presence in the other = immune desert vs. inflamed tumor

#### 5d. Gene Network — Immune Hub Mapping
- In the Network panel, identify if any immune gene acts as a **hub node** connecting multiple enriched pathways
- E.g., STAT1 as a hub connecting IFN-γ signaling, antigen presentation, and PD-L1 regulation = a central immunological control node

---

### Step 6 · Build Your Hypothesis Before the AI

Before opening the AI chat, write down your own hypothesis:

```
My hypothesis:
"Cohort [1/2] shows terrain evidence of [immune hot/cold]
 based on [specific gene peaks] in the [immune zone] lasso.
 The [CD8A / CD163] ratio suggests [adaptive / myeloid] dominance.
 This predicts [better / worse] response to checkpoint inhibition
 because [mechanism]."
```

---

### Step 7 · AI Chat — Three Chained Prompts

**Prompt 1 — Immune landscape synthesis:**
> *"I compared two GBM cohorts in GeneTerrain. In my lasso of the immune gene zone, Cohort 1 (young ≤50) had elevated: [gene list A], while Cohort 2 (elderly ≥60) had elevated: [gene list B]. The pathway enrichment showed [GO terms]. What does this suggest about the immune microenvironment — specifically, are these consistent with inflamed (hot), immune-excluded, or immune-desert GBM subtypes?"*

**Prompt 2 — Therapeutic hypothesis:**
> *"Based on the myeloid gene signature I found (CD163, ITGAM, MRC1 elevated in the elderly cohort, with no T cell markers), what combination immunotherapy strategy would be most rational to convert this immune-cold GBM to an immune-responsive state? Cite relevant clinical trial precedents."*

**Prompt 3 — Biomarker identification:**
> *"From my lasso selection, the top ★★ (p<0.01) genes differentially expressed between cohorts include [list]. Which of these would make the best blood-based or tissue biomarker for predicting immunotherapy response in GBM, and why?"*

---

### Step 8 · Export & Report

Use the **Export PDF** button to generate a scientific report containing:
- Terrain screenshots (both cohorts, all three lasso regions)
- Gene bar chart with ★ significance indicators
- Violin plot distributions (highlight bimodal PD-L1 if found)
- Pathway enrichment lollipop chart
- AI chat transcript (copy from chat history)

> This report is **tumor-board ready** and publication-quality for use as a manuscript figure.

---

### 🎯 Learning Outcome

You have performed a **complete translational genomics investigation** — from raw terrain visualization to mechanistic immune hypothesis to therapeutic prediction — entirely within GeneTerrain, using all three core interaction pillars: **spatial terrain reading, multi-lasso analytics, and AI synthesis.**

---

## 🗺️ Summary Comparison

| | Case Study A 🟢 | Case Study B 🟡 | Case Study C 🔴 |
|---|---|---|---|
| **Level** | Beginner | Intermediate | Advanced |
| **Cohort Split** | ≤45 vs ≥65 years | 35–55 vs 56–75 | ≤50 vs ≥60 (immune axis) |
| **Terrain Focus** | Global landscape reading | Two specific spatial regions | Three targeted immune zones |
| **Lasso Mode** | Synced (single lasso) | Unsynced (2 regions) | Multi-lasso (3 zones, mixed sync) |
| **Dashboard Focus** | Bar chart + significance stars | Violin bimodality + pathways | All panels including network |
| **AI Prompts** | 1 prompt | 1 focused prompt | 3 chained prompts |
| **Output** | Molecular age signature | Invasion vs. proliferation programs | Immune microenvironment map |
| **Time** | 10–15 min | 20–25 min | 35–45 min |

---

> **Next steps:** These case studies can be embedded into the `/docs/case-studies` page as interactive step-by-step guided walkthroughs with screenshots.
