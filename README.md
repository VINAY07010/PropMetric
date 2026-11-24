# PropMetric — Mumbai & Pune Real Estate Price Analytics & Overpricing Screener

An end-to-end, industry-grade **Data-Driven Real Estate Price Analytics and Overpricing Detection System** built on residential property listing data from Mumbai and Pune.

---

## 1. Executive Summary & Purpose

In major Indian metropolitan hubs like the Mumbai Metropolitan Region (MMR) and Pune, home buyers and real estate agents often encounter wide asking-price dispersions, opaque micro-market pricing, and aggressive markups. 

**PropMetric** provides an objective, data-calibrated decision-support system:
1. **Hedonic Asking Price Estimation**: Models expected asking prices from physical property characteristics (City, BHK, Area in sqft, Bathrooms, Furnishing status, and Construction stage).
2. **Cautious Overpricing Screening**: Evaluates seller asking prices against statistical validation margins (+/- 16.1% Median APE tolerance band) with non-accusatory verdicts.
3. **Verified Comparable Discovery**: Queries actual historical listings matching configuration and locality without synthetic fabrication.
4. **Interactive Market Distribution Explorer**: Visually analyzes price-per-sqft spreads, median benchmarks, and segment distributions.
5. **AI Analyst**: Translates statistical figures into plain-language buyer advisories, negotiation strategies, and locality comparisons, maintaining strict grounding against hallucination.

> **Responsible Use Notice:** PropMetric is a decision-support and screening tool calibrated on advertised asking prices. It does not replace official stamp-duty circle rates, RERA disclosures, architectural appraisals, or legal title searches.

---

## 2. Directory Architecture & Artifacts

The project strictly follows the reproducible repository layout:

```text
├── Data/
│   ├── Raw/
│   │   └── mumbai_pune_properties.csv       # Preserved original input dataset
│   ├── Interim/
│   │   ├── residential_properties.csv      # Cleaned residential flat/apartment listings
│   │   └── excluded_properties.csv         # Audit trail of excluded commercial/corrupted records
│   └── Processed/
│       ├── properties_cleaned.csv          # Standardized, validated residential records
│       └── properties_ml_ready.csv         # Preprocessed dataset for machine learning
├── Notebooks/
│   ├── 01_Data_Inspection.ipynb            # Schema profiling, missingness, anomaly detection
│   ├── 02_Data_Cleaning.ipynb              # Reproducible parsing, deduplication, exclusions
│   ├── 03_Data_Validation.ipynb            # Automated gate checks & reconciliation audits
│   ├── 04_EDA.ipynb                        # Exploratory distributions, city comparisons, rates
│   └── 05_Model_Training.ipynb             # Ridge regression, baseline comparison, tolerance band
├── Reports/
│   ├── cleaning_report.txt                 # Detailed data cleaning & exclusion audit report
│   ├── eda_report.txt                      # Quantitative market summary across Pune & Mumbai
│   └── model_evaluation.txt               # Validation metrics, held-out test scores, MAPE
├── Models/
│   ├── best_model.pkl                      # Serialized model pipeline
│   └── model_metadata.json                 # Coefficients, features, tolerance thresholds
├── App/
│   ├── app.py                              # Python-native Streamlit companion UI (connects to prediction.py)
│   ├── prediction.py                       # Estimation, screening, and comparables retrieval
│   └── ai_assistant.py                     # Intent-aware AI Analyst explanation generator
├── app_streamlit.py                        # Standalone single-file Streamlit dashboard edition
├── tests/
│   └── test_pipeline.py                    # Automated test suite (5 passing test cases)
├── src/                                    # Primary interactive React + TypeScript + Vite web application
├── server.ts                               # Express backend serving the web app and AI Analyst API
├── requirements.txt                        # Python dependencies
└── README.md                               # Project documentation and instructions
```

---

## 3. Data Cleaning & Validation Audit

From an initial ingestion of **2,043 raw listings**:
- **1,799 Residential Properties Retained (88.1%)**: Flats, builder floors, penthouses, and studio apartments across Pune and Mumbai.
- **244 Non-Residential & Corrupted Records Excluded (11.9%)**:
  - Commercial spaces: Office spaces in Keshav Nagar & Platinum 9 Wakad, shops, showrooms, industrial/agricultural plots.
  - Scraper errors: Malformed entries such as a Darshan Promesa 2 BHK listed with an impossible price of ₹2,017.75 Crore.
  - Missing configurations: Unclassified records without identifiable residential indicators.
- **Full Row Reconciliation**: Retained (1,799) + Excluded (244) = Raw (2,043). Zero silent loss.

---

## 4. Key Market Findings (EDA Summary)

| Market Metric | Pune Residential | Mumbai Residential | Variance / Spread |
|---|---|---|---|
| **Cleaned Listings** | 884 | 912 | Balanced distribution |
| **Median Asking Price** | ₹1.20 Crore (₹120 Lakh) | ₹2.65 Crore (₹265 Lakh) | Mumbai is ~2.2x higher |
| **Median Rate / sqft** | ₹12,143 / sqft | ₹32,380 / sqft | Mumbai is ~2.7x higher |
| **Typical 2 BHK Area** | ~850 – 1,050 sqft | ~650 – 850 sqft | Pune flats offer ~25% more carpet area |
| **Ready vs Under Construction** | ~58% Ready / 42% UC | ~62% Ready / 38% UC | Consistent inventory balance |

---

## 5. Machine Learning & Overpricing Tolerance

- **Algorithm**: 9-feature Hedonic Log-Linear Ridge Regressor with Empirical Bayes locality shrinkage and outer-MMR priors, benchmarked against dummy baseline.
- **Features**: `ln(Area_sqft)`, `ln(Smoothed Locality Rate)`, `City`, `BHK`, `Bathrooms`, `Furnishing`, `Status`. (Target price derivatives like `price_per_sqft` are computed strictly inside the training fold for locality priors to ensure zero leakage).
- **Held-Out Validation Scores (80/20 Split, Seed 42)**: **Test R² = 0.8098** (**Log R² = 0.8890**), **MAE = ₹72.95 Lakh**, **Median APE = 16.10%** (**Mean APE = 22.50%**).
- **Overpricing Screening Thresholds**:
  - **Within Expected Range**: Deviation within `±16.1%`.
  - **Review Suggested**: Deviation between `+16.1%` and `+32.2%`.
  - **Significantly Above Estimate**: Deviation greater than `+32.2%`.

---

## 6. Architecture & Why Streamlit Is Included

PropMetric is structured with **two complementary interfaces** backed by the same calibrated pricing dataset and `±16.1%` tolerance rules:

1. **Primary Web Application (`src/` + `server.ts`):**
   - Built with React, TypeScript, Tailwind CSS, Vite, and Express.
   - Delivers the complete interactive product experience: full editorial UI, Light/Dark themes, analytical distributions, property inspection modals, side-by-side comparison mode, and multi-turn AI Analyst workflows.
2. **Why Streamlit Is Included (`App/app.py` & `app_streamlit.py`):**
   - **Direct Python & Scikit-Learn Integration:** Streamlit connects natively in pure Python to `App/prediction.py` and the serialized Ridge regression artifacts (`Models/best_model.pkl` and `Models/model_metadata.json`) without needing a Node.js build step.
   - **Rapid ML Validation & Reproducibility:** Enables data scientists and technical reviewers to interactively test model predictions, overpricing thresholds, and comparable queries directly alongside the `Notebooks/01–05` workflow and `tests/test_pipeline.py`.
   - **Lightweight Local Sandbox:** Ideal for offline Python-only environments where quick parameter inspection is preferred over launching a full frontend/backend stack.

---

## 7. How to Run the Project

### Running the Interactive Web App (Primary UI — Port 3000):
```bash
npm install
npm run dev
```

### Running the Python & Streamlit Companion Environment:
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run automated verification tests
python3 -m unittest tests/test_pipeline.py

# 3. Launch the Python-connected Streamlit dashboard
streamlit run App/app.py
```

---

## 8. PropMetric AI Analyst

PropMetric includes an intent-aware **AI Analyst** grounded strictly in the 1,799 verified Mumbai & Pune listings, 209 micro-market locality benchmarks, and the `±16.1%` Median APE hedonic tolerance band:
1. Answers property-specific questions across negotiation strategy, overpricing diagnosis, comparable benchmarks, RERA/legal due diligence, and locality comparisons.
2. Evaluates single active listings as well as side-by-side pinned property comparisons.
3. Formats every response cleanly in plain-language Indian currency benchmarks (Crores / Lakhs) with deterministic fallback support if external connectivity is unavailable.
