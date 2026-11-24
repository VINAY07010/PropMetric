# Real Estate Price Analytics & Overpricing Detection System

## Project overview + end-to-end industry-grade master build prompt

> **How to use this file:** Attach your original raw dataset
> (`mumbai_pune_properties.csv`) to the AI coding agent along with this
> Markdown file. Ask it to execute the master prompt from beginning to
> end in the project workspace. The prompt is written to start from the
> raw dataset and build the complete project.

------------------------------------------------------------------------

# Part A --- Understand the project before building it

## 1. Project title

**Data-Driven Real Estate Price Analytics and Overpricing Detection
System**

## 2. What is this project about?

We are building a professional, easy-to-use web application that
analyses residential property listings from **Mumbai and Pune**. It uses
data science and machine learning to estimate the asking price of a
property from its characteristics, compare that estimate with a seller's
asking price, find similar listings in the dataset, and present useful
market insights.

For example, a buyer finds a 2 BHK flat in Pune listed for ₹85 lakh.
They enter the property's details into our application. The system
estimates an asking price using a model trained on the available listing
data. It can then compare the seller's asking price with the estimate,
show similar listings from the dataset, and explain the result in plain
language.

The application is a **decision-support tool**, not a property valuation
authority. Its estimate is based on the dataset's asking prices. It does
not predict a guaranteed sale price, registered transaction price, legal
valuation, or the exact market value of a property.

## 3. Problems we are trying to solve

1.  **Difficulty judging asking prices:** Buyers may not know whether a
    listed price is broadly in line with other listings with similar
    characteristics.
2.  **Difficulty comparing properties:** Buyers and agents need a
    convenient way to compare properties with similar city, locality,
    BHK and area.
3.  **Limited visibility into listing patterns:** Users may find it
    difficult to understand how asking prices vary by city, locality,
    BHK, area or furnishing.
4.  **Potentially overpriced listings:** A buyer may want an initial
    indication that a seller's asking price is substantially higher than
    the model's estimate.
5.  **Technical results are hard to interpret:** Non-technical users may
    need simple explanations of model estimates and charts.

### Our proposed solution

The application will provide: - Estimated asking-price prediction. - A
transparent comparison between the seller's asking price and the model
estimate. - A cautious **potential overpricing indicator**, using a
threshold justified by validation errors. - Similar-property comparisons
based only on actual records in the dataset. - Market analytics and
interactive visualisations. - A local AI assistant that explains
available application results in simple language.

## 4. Target audience

-   **Home buyers:** To compare a property's asking price with estimates
    and similar listings.
-   **Real estate agents:** To explore listing patterns and prepare more
    informed comparisons for clients.
-   **Property investors:** To study asking-price patterns across
    locations and property configurations.
-   **Researchers and market analysts:** To explore residential listing
    data for Mumbai and Pune.

## 5. End-to-end project workflow

1.  **Raw data inspection:** Understand the supplied CSV, its columns,
    data types, missingness, duplicates, category values, unusual values
    and data limitations.
2.  **Residential-record filtering:** Retain only relevant residential
    flat/apartment listings in Mumbai and Pune. Keep excluded rows
    separately with clear exclusion reasons.
3.  **Data cleaning and validation:** Standardise values, handle missing
    and malformed data, investigate outliers, check units and logical
    consistency, and document every material decision.
4.  **Exploratory Data Analysis (EDA):** Analyse price patterns by city,
    locality, BHK, area, furnishing and other reliable fields.
5.  **Feature engineering and ML preparation:** Build a reproducible
    preprocessing pipeline, avoid leakage, split data appropriately, and
    train multiple regression models.
6.  **Model evaluation and selection:** Compare models using MAE, RMSE
    and R², examine residuals and segment performance, and select a
    model based on evidence.
7.  **Application development:** Build a Streamlit application with a
    polished dashboard, prediction, overpricing screening, comparable
    listings and analytics.
8.  **Local AI assistant:** Optionally connect Ollama with Qwen 2.5 7B
    to explain application outputs. The core application must continue
    working if Ollama is not installed or running.
9.  **Testing, documentation and handover:** Run automated tests and
    end-to-end checks, fix issues before delivery, document setup and
    limitations, and provide a clear completion report.

## 6. Tools and what each one does

  -----------------------------------------------------------------------
  Tool                                Role in this project
  ----------------------------------- -----------------------------------
  Python                              Main programming language for data
                                      work, ML and the application

  Pandas                              Loading, inspecting, cleaning and
                                      transforming tabular data

  NumPy                               Numerical operations

  Matplotlib                          Charts and plots

  Seaborn                             Statistical visualisations

  Jupyter Notebook                    Reproducible inspection, cleaning,
                                      EDA and model-development work

  Scikit-learn                        Preprocessing pipelines, regression
                                      models, metrics and validation

  Joblib                              Saving and loading the complete
                                      trained ML pipeline

  Streamlit                           Building the interactive web
                                      application

  Ollama                              Running a language model locally

  Qwen 2.5 7B                         Local AI assistant model, if
                                      available

  VS Code                             Development environment

  pytest                              Automated tests

  Git (optional)                      Version control
  -----------------------------------------------------------------------

Use free and open-source tools wherever possible. Do not require paid
APIs, subscriptions, hosted LLM services, paid datasets or paid
deployment services.

## 7. Machine learning approach

The target is `price_inr` (or the equivalent price field confirmed from
the supplied dataset). This is a **regression** problem because the
output is a continuous numerical price.

Candidate models: - Linear Regression as a baseline. - Decision Tree
Regressor. - Random Forest Regressor. - Gradient Boosting Regressor.

Compare them using: - **MAE:** Average absolute prediction error, in the
target's currency units. - **RMSE:** Penalises larger errors more
heavily. - **R²:** Indicates how much variation is explained by the
model.

Do not choose a model simply because it has the highest R². Consider
MAE/RMSE, overfitting, residual patterns, data size and performance
across cities or important segments. Use a fixed random seed and a
leakage-safe pipeline.

## 8. Important project limitations

-   The model estimates **asking prices from listing data**, not
    completed transaction prices.
-   The dataset may contain scraping errors, stale listings, duplicate
    properties, missing fields, inconsistent locality names or
    inaccurate seller-provided details.
-   If the dataset does not contain listing dates, property age,
    carpet-area information or reliable locality information, do not
    invent them.
-   A model cannot guarantee an accurate estimate for a locality or
    property type with little or no training data.
-   An overpricing flag is an initial screening signal, not proof that a
    property is overpriced.
-   Similar-property results must come from actual dataset records.
    Never generate fake listings.
-   AI-generated explanations must be grounded in values and results
    supplied by the application. The AI assistant must not invent market
    facts.

------------------------------------------------------------------------

# Part B --- Master prompt to build the complete project

Copy the prompt below and use it with the attached raw CSV and this
project workspace.

------------------------------------------------------------------------

## MASTER PROMPT

### Your role

Act as a complete, senior-level project delivery team. You must take
responsibility for planning, implementing, validating, testing,
documenting and integrating the complete project.

Work as all of the following roles:

1.  **Senior Data Scientist:** Owns the problem framing, data quality
    strategy, EDA, statistical reasoning and interpretation.
2.  **Senior Data Engineer:** Owns data ingestion, reproducible
    cleaning, data validation, file organisation and data lineage.
3.  **Machine Learning Engineer:** Owns feature engineering, leakage
    prevention, model training, evaluation, model selection, saving and
    inference consistency.
4.  **Python Software Engineer:** Owns modular, maintainable and robust
    Python code.
5.  **Streamlit UI/UX Developer:** Owns the user interface, usability,
    responsive layout, visual hierarchy and application experience.
6.  **AI Integration Engineer:** Owns the optional local Ollama/Qwen
    integration, safe prompting, graceful fallback and grounded
    responses.
7.  **QA/Test Engineer:** Owns automated tests, edge-case testing,
    integration testing, reproducibility and release verification.
8.  **Technical Writer / Project Reviewer:** Owns documentation,
    reports, limitations, setup instructions and final handover.

Do not merely provide instructions or sample snippets. **Actually create
the project files and implement the working project in the available
workspace.** Do not stop after generating a plan. Complete all phases in
one execution, subject to the actual capabilities of the environment.

### Project objective

Build a complete, reproducible, professional **Data-Driven Real Estate
Price Analytics and Overpricing Detection System** using the supplied
raw CSV of property listings from Mumbai and Pune.

The application must: - Estimate residential property asking prices from
property characteristics. - Compare a user-entered asking price with the
model estimate. - Flag potentially overpriced listings using a
defensible, validation-derived tolerance. - Retrieve comparable
properties from the real cleaned dataset. - Display useful market
analytics. - Explain results in plain language through an optional local
AI assistant. - Remain useful if Ollama or the selected local model is
unavailable.

### Critical expectations: quality, honesty and reliability

I want a complete and carefully tested project, not a quick prototype.

However, do not claim that any real-world dataset can be made literally
"100% clean" or that software can be guaranteed to have zero errors in
every possible environment. Instead, aim for the highest defensible data
quality and engineering reliability. Make every uncertainty visible,
test all important assumptions, and do not silently hide problems.

Follow these rules:

1.  **Never fabricate data.** Do not invent missing prices, localities,
    property details, URLs, dates, market trends, comparable listings,
    model scores or test results.
2.  **Never silently delete questionable records.** Record every
    exclusion and its reason. Preserve the raw input unchanged.
3.  **Never blindly replace outliers.** Investigate them, retain valid
    extreme observations where justified, and document exclusions or
    transformations.
4.  **Never claim a field is reliable just because it is numeric.**
    Check plausibility, units, range, distribution and consistency.
5.  **Never use the target or post-outcome information as a feature.**
    Prevent target leakage at every stage.
6.  **Never fit preprocessing on the full dataset before the train/test
    split.** Fit transformations only within training folds/pipeline.
7.  **Never use test data to choose features, tune models or set the
    overpricing threshold.** Keep final test evaluation isolated.
8.  **Never pretend the model is accurate where evidence is
    insufficient.** Show limitations and, where appropriate, warn about
    unsupported inputs or weak coverage.
9.  **Never label a property definitively "overpriced."** Use wording
    such as "Potentially above model estimate" or "Further review
    suggested."
10. **Never make the application depend on the AI assistant.**
    Prediction, analytics and comparisons must work without Ollama.
11. **Do not use paid services or APIs.** The full project must run
    locally with free/open-source software.
12. **Do not leave TODOs, placeholder functions, fake metrics, empty
    pages, unfinished features or pseudocode in the delivered
    application.**
13. **Do not ask me to manually fix errors after delivery.** Run the
    available checks, diagnose failures, fix them, and rerun the checks
    before declaring completion.
14. If a genuine issue cannot be resolved without information that is
    not in the dataset or environment, do not guess. Implement a safe,
    clearly documented limitation or fallback and list the exact
    unresolved dependency in the final handover.
15. Do not claim a command, test, model training run or application
    launch succeeded unless it was actually executed and its result
    checked.

------------------------------------------------------------------------

## Phase 0 --- Inspect the workspace and raw dataset

Start by inspecting the actual workspace and attached file.

-   Identify the supplied raw CSV and verify that it can be read.
-   Preserve the original raw file unchanged.
-   Inspect its shape, column names, inferred types, encoding,
    delimiter, missing values, duplicate rows, duplicate URLs/IDs,
    unique categories, numeric distributions and suspicious records.
-   Check whether the file is actually the expected Mumbai/Pune
    residential property dataset.
-   Do not assume the schema blindly. The expected fields may resemble
    `City`, `Title`, `Society`, `BHK`, `Area_sqft`, `Bathrooms`,
    `Furnishing`, `Status`, `Age`, `Price_INR`, and `Listing_URL`, but
    inspect the real file and map columns based on evidence.
-   If required columns are missing or ambiguous, do not invent
    replacements. Determine whether a defensible mapping exists;
    otherwise stop the affected modelling path and explain why.
-   Check whether the file contains multiple property types and identify
    the rules for retaining flats/apartments.
-   Detect whether the same property may appear under different titles
    or URLs. Do not assume similar titles prove duplicate properties.
-   Inspect URL formats. Do not fabricate a base domain for relative
    URLs. URLs are not model features unless there is a clearly
    justified reason; normally exclude them from ML.

Create a short data profile and record the actual source filename, row
count, column count and schema in the cleaning report.

## Phase 1 --- Data cleaning, preparation and validation

### 1.1 Residential data separation

-   Retain only relevant residential flats/apartments in Mumbai and
    Pune, according to values actually present in the dataset.
-   Include studio apartments only if they are genuinely part of the
    intended residential scope and can be represented without inventing
    BHK values.
-   Preserve all non-retained rows in `excluded_properties.csv`.
-   Include an `exclusion_reason` field explaining why each row was
    excluded.
-   Do not discard records merely because a field such as society,
    furnishing, age or bathrooms is missing.

### 1.2 Standardise columns and text

-   Rename columns consistently to `snake_case`.
-   Strip leading/trailing whitespace.
-   Normalise repeated internal whitespace where safe.
-   Standardise city names and categorical labels using explicit
    mappings.
-   Preserve meaningful distinctions in the original text.
-   Do not over-normalise society or locality names in a way that merges
    different places.
-   Keep an auditable mapping or record of transformations where useful.

### 1.3 Missing values

For every field: - Calculate missing count and percentage. - Understand
why values may be missing. - Decide whether to retain, impute, mark as
unknown or exclude the field from modelling. - Do not use arbitrary
imputation simply to achieve a dataset with zero missing values. - Keep
a distinction between an actually unknown value and a genuine category
such as "Unfurnished." - For ML, use appropriate imputers inside a
scikit-learn pipeline. - If a column has excessive missingness or
unreliable meaning, exclude it from the model with a documented reason
rather than manufacturing data.

### 1.4 Numeric and categorical integrity

Validate all numeric fields: - `bhk`: check valid positive integer-like
values; preserve missing values where unknown. Investigate unusual
values. - `area_sqft`: check positive values, units, impossible or
suspicious magnitudes and missingness. - `price_inr`: check positive
values, currency units, suspicious magnitudes and likely scraping
errors. - `bathrooms`: investigate implausible values, corrupted values
and extremely sparse coverage. Do not automatically treat every numeric
value as valid. - `age`: parse only unambiguous formats. Handle ranges
consistently only where a defensible numeric representation can be
explained. Treat malformed strings and implausible values as unknown or
exclude age from modelling if unreliable. - Categorical fields such as
`furnishing` and `status`: inspect categories and map only genuinely
equivalent variants. - `society` and locality: preserve unknowns as
unknown; do not guess a society/locality from a title unless a
transparent, testable extraction rule is supported by the data.

### 1.5 Outlier and anomaly review

-   Use descriptive statistics, quantiles, IQR and appropriate plots to
    identify suspicious values.
-   Review price-per-square-foot as a diagnostic, not as proof of an
    error.
-   Check logical combinations, such as very large area with unusually
    low BHK or extreme asking price.
-   Investigate extreme records individually where feasible.
-   Distinguish legitimate luxury properties from data-entry or scraping
    errors.
-   Do not use a blanket rule that removes all values outside 1.5×IQR.
-   Document each exclusion, correction, retention or modelling decision
    and its reason.
-   If source verification is impossible, mark the record as uncertain
    and decide conservatively. Do not invent the "correct" value.

### 1.6 Data leakage and identifier control

Exclude identifiers and non-predictive fields such as listing URLs, raw
titles, row numbers and scraped IDs from the model unless a feature is
demonstrably valid and leakage-safe.

Be especially careful with locality, society and city: - Use only
information available at prediction time. - Avoid target encoding or
aggregations calculated using validation/test target values. - Use
train-fold-only transformations for any target-derived feature. - If
locality categories are too sparse, use a defensible grouping or
unknown/rare-category strategy.

### 1.7 Produce the data outputs

Create and verify: - `Data/Interim/residential_properties.csv` -
`Data/Interim/excluded_properties.csv` -
`Data/Processed/properties_cleaned.csv` -
`Data/Processed/properties_ml_ready.csv` (only if it has a clearly
defined purpose; document its schema and relationship to the cleaned
dataset)

The cleaned dataset may legitimately contain missing values where the
source does not provide reliable information. The ML pipeline must
handle supported missing values safely. Do not distort the source data
merely to make every cell non-null.

### 1.8 Data validation gates

Build automated validation checks for: - Expected columns and schema. -
Valid city scope. - Positive price and area for records used in price
modelling. - Valid numeric types and allowed category values. -
Missingness thresholds and documented exceptions. - Duplicate rows and
URL duplicates. - Invalid or suspicious values. - Consistency between
retained, excluded and original row counts. - No accidental row
multiplication or silent row loss. - Reproducible outputs when the
cleaning pipeline is rerun.

The project must fail loudly with a useful message if a critical
assumption is violated. Generate a detailed
`Reports/cleaning_report.txt` containing: - Original and final row
counts. - Retained and excluded counts with reasons. - Missingness
before and after cleaning. - Duplicates found and actions taken. -
Numeric validation and anomaly findings. - Transformations and
decisions. - Fields excluded from modelling and why. - Remaining
data-quality limitations.

## Phase 2 --- EDA and machine learning

### 2.1 Exploratory Data Analysis

Create a well-structured EDA notebook with: - Dataset dimensions and
data types. - Missing-value analysis. - City-wise listing counts. -
Price distributions overall and by city. - Area and BHK distributions. -
Price versus area. - Price per square foot, with caveats. - BHK-wise
asking-price comparisons. - Furnishing/status comparisons where sample
sizes support them. - Locality-level summaries only where sample sizes
are adequate. - Correlation analysis for appropriate numeric features. -
Outlier and residual-related diagnostic plots where useful.

Every chart must have: - Clear title. - Labelled axes and units. -
Readable tick labels. - Appropriate formatting for INR. - No misleading
scale or unsupported conclusion.

Do not publish a locality ranking based on one or two records without
clearly warning about sample size. Do not call listing-price patterns
"price appreciation" or "market growth" without time-series data.

Save important plots to a suitable reports/figures location. If the
specified folder structure does not include `Reports/figures/`, create
it only if needed and explain it in the README.

Generate `Reports/eda_report.txt` with key findings, sample sizes,
caveats and chart references. All numerical claims must be computed from
the actual cleaned dataset.

### 2.2 Define the modelling target and features

-   Predict the asking-price target confirmed from the raw data,
    expected to be `price_inr`.
-   Do not describe this as transaction-price prediction.
-   Use defensible property attributes available at prediction time.
-   Consider city, locality (if reliable), BHK, area, furnishing, status
    and parsed age only if they pass data-quality checks.
-   Exclude fields that are unreliable, too sparse, identifiers, URLs,
    direct price derivatives or leakage risks.
-   Do not include `price_per_sqft` as a feature if it is calculated
    using the target price.
-   Document the final feature list and exclusions.

### 2.3 Split strategy and preprocessing

-   Define a reproducible train/test split with a fixed seed.
-   Consider a stratified or city-aware split if statistically
    appropriate and feasible.
-   Keep the final test set isolated until model selection is complete.
-   Use cross-validation on training data for model comparison/tuning.
-   Use scikit-learn `Pipeline` and `ColumnTransformer`.
-   Numeric features: appropriate imputation and scaling where needed.
-   Categorical features: imputation and one-hot encoding with
    unknown-category handling.
-   Fit all preprocessing only on training folds.
-   Avoid leakage from duplicate or near-duplicate listings across train
    and test where identifiable.
-   Explain any split limitations caused by the dataset size or
    structure.

### 2.4 Train and compare models

Train at least: - DummyRegressor baseline. - LinearRegression. -
DecisionTreeRegressor. - RandomForestRegressor. -
GradientBoostingRegressor.

Use reasonable, computationally practical hyperparameter search. Avoid
enormous searches that are disproportionate to the dataset. Use fixed
random seeds wherever supported.

Evaluate using: - MAE. - RMSE. - R². - Cross-validation scores on
training data. - Final held-out test metrics. - Residual plots and error
distribution. - Segment-level errors by city and, where sample sizes
support it, BHK or locality.

Check whether a model is worse than the dummy baseline. Investigate
negative R², unusually large errors, overfitting and weak segment
performance. Do not hide poor results. If model performance is not
suitable for a user-facing estimate, show a clear warning and explain
the limitation rather than pretending it is reliable.

### 2.5 Model selection and saved artefacts

-   Select the model based on evidence and the project's intended use.
-   Save the complete fitted preprocessing-plus-model pipeline, not just
    the estimator.
-   Save model metadata such as feature names, target name, training
    date, package versions, validation metrics, split seed and model
    choice.
-   Ensure inference uses exactly the same preprocessing and feature
    schema as training.
-   Use Joblib for model persistence.
-   Add a safe model-loading check with useful errors if the file is
    missing, corrupt or incompatible.

Create: - `Models/best_model.pkl` - `Reports/model_evaluation.txt`

The model evaluation report must include actual metrics, baseline
comparison, model comparison, final feature list, split strategy,
validation method, limitations and model-selection reasoning.

## Phase 3 --- Streamlit application

### 3.1 UI/UX direction

Build a **simple, polished, professional real-estate analytics
product**. It must not look like a generic AI-generated dashboard or a
flashy template.

Design principles: - Clean visual hierarchy and restrained colour
palette. - Light, neutral background with one consistent accent
colour. - Professional typography and consistent spacing. - Clear page
titles, concise descriptions and readable labels. - Consistent buttons,
inputs, tables, charts and navigation. - Use charts only when they
communicate useful information. - Avoid excessive gradients,
glassmorphism, glowing effects, giant rounded cards, decorative emojis,
unnecessary animations and random icons. - Avoid overcrowding the
dashboard with too many metrics. - Do not use fake property photos, fake
testimonials, fake reviews, fabricated market statistics or decorative
content that implies real listings. - Make the app usable on common
laptop screens and reasonably responsive on smaller screens. - Use
Streamlit's native layout thoughtfully; add custom CSS only where it
improves usability and does not break accessibility. - Use INR
formatting consistently, including lakh/crore labels where
appropriate. - Add clear empty states, validation messages, loading
states and error messages. - Keep the UI accessible: sufficient
contrast, descriptive labels, readable font sizes and no colour-only
status communication.

### 3.2 Application pages/features

Implement the following pages or clearly separated sections:

**A. Overview dashboard** - Dataset coverage: cities, listing count,
date limitations if no dates exist. - Key descriptive metrics computed
from the cleaned data. - City-wise and BHK-wise insights. - Clear data
coverage and limitations note.

**B. Price prediction** - User inputs for supported features only. -
Input validation: positive area, sensible BHK, supported city, valid
categories and required fields. - Display estimated asking price with
INR formatting. - Explain that the estimate is model-based and not a
guaranteed valuation. - If input is outside training coverage or
unsupported, warn the user rather than confidently extrapolating.

**C. Overpricing screening** - Ask for the seller's asking price. -
Compare it with the model estimate. - Calculate the absolute and
percentage difference correctly. - Derive a reasonable tolerance from
validation error analysis, not an arbitrary percentage. - Make the
threshold method visible in the UI or an explanation panel. - Use
cautious labels such as: - "Within the model's expected range" - "Above
model estimate --- review suggested" - "Insufficient evidence for a
reliable comparison" - Do not imply fraud, seller dishonesty or
definitive overpricing.

**D. Comparable properties** - Retrieve only real records from the
cleaned dataset. - Match on city and relevant property attributes. - Use
locality/BHK/area similarity where reliable. - Display the actual
listing attributes and asking price. - If URLs are valid and safe, show
a source link; otherwise do not invent one. - Clearly show when there
are too few comparable records. - Never fabricate a listing to fill a
result count.

**E. Market analytics** - City-wise comparisons. - BHK-wise asking-price
patterns. - Area and price distributions. - Locality-level summaries
with minimum sample-size rules. - Filters for supported city, BHK,
furnishing and status. - Charts must update based on filters and must
not imply time trends if there is no date field.

**F. AI assistant** - Integrate Ollama locally with Qwen 2.5 7B if
available. - Provide setup instructions for installing Ollama and
pulling the model. - The assistant must receive only the relevant
application-generated context needed to explain the user's question. -
Ground responses in actual model outputs, dataset summaries and
comparable listings. - Instruct the assistant not to invent data,
prices, property listings, sources or market claims. - If the local
model is unavailable, show a friendly message and keep all other app
features operational. - Do not send user data to a cloud model or
external API. - Handle timeout, connection refusal, model-not-found and
malformed-response errors gracefully. - Avoid describing the AI
assistant as an independent source of property truth.

### 3.3 Application architecture

Keep code modular. At minimum: - `App/app.py`: Streamlit entry point,
page navigation and UI orchestration. - `App/prediction.py`: model
loading, input validation, prediction, overpricing calculations and
comparable-property retrieval helpers. - `App/ai_assistant.py`: Ollama
connection, prompt construction and safe response handling.

You may add helper modules if needed, but preserve the required files
and explain any additions. Avoid putting all application logic into one
giant file.

Use paths resolved relative to the project root or the app file
location. Do not rely on the current working directory being a
particular folder. Make the app launch reliably from the project root
using the documented command.

## Phase 4 --- Notebooks, folder structure and deliverables

Preserve this exact main folder structure and spelling:

``` text
MINI PROJECT/
│
├── Data/
│   ├── Raw/
│   │   └── mumbai_pune_properties.csv
│   │
│   ├── Interim/
│   │   ├── residential_properties.csv
│   │   └── excluded_properties.csv
│   │
│   └── Processed/
│       ├── properties_cleaned.csv
│       └── properties_ml_ready.csv
│
├── Notebooks/
│   ├── 01_Data_Inspection.ipynb
│   ├── 02_Data_Cleaning.ipynb
│   ├── 03_Data_Validation.ipynb
│   ├── 04_EDA.ipynb
│   └── 05_Model_Training.ipynb
│
├── Reports/
│   ├── cleaning_report.txt
│   ├── eda_report.txt
│   └── model_evaluation.txt
│
├── Models/
│   └── best_model.pkl
│
├── App/
│   ├── app.py
│   ├── prediction.py
│   └── ai_assistant.py
│
├── requirements.txt
│
└── README.md
```

Rules: - Keep the raw CSV in `Data/Raw/` and never overwrite it. - Use
the exact folder names and capitalisation shown. - Create additional
files or folders only when genuinely needed; document them. - All
notebooks must run in order from a clean environment. - Notebooks must
contain clear Markdown explanations, code cells, outputs where
practical, and a logical progression. - Do not create notebooks that
merely duplicate one another. - Ensure all file paths work on Windows as
well as other common operating systems. - Use `pathlib` for robust
paths. - Do not assume the user has already created any processed files
or completed any cleaning.

### Notebook responsibilities

1.  `01_Data_Inspection.ipynb`: Load raw data, inspect schema, profile
    quality and identify initial issues.
2.  `02_Data_Cleaning.ipynb`: Apply reproducible cleaning and produce
    interim/cleaned outputs and the cleaning report.
3.  `03_Data_Validation.ipynb`: Run final data-quality checks and
    confirm output consistency.
4.  `04_EDA.ipynb`: Perform EDA and produce the EDA report and charts.
5.  `05_Model_Training.ipynb`: Build pipelines, train/evaluate models,
    save the selected pipeline and model report.

Where practical, put reusable logic in Python modules rather than
copying large blocks across notebooks. The notebooks should call the
same tested functions used by the reproducible pipeline where
appropriate.

## Phase 5 --- Requirements and documentation

Create a `requirements.txt` with compatible, tested package
dependencies. Avoid unnecessary packages and avoid pinning versions that
are not actually tested. Include the packages needed for notebooks, data
science, Streamlit and tests. Ollama itself is installed separately and
should be documented rather than treated as a normal pip dependency.

Create a complete `README.md` covering: - Project overview and problem
statement. - Target audience and key features. - Dataset source and any
licence/usage caveat that can be established. - Folder structure. -
Python/environment setup on Windows. - Installation commands. - How to
run notebooks in order. - How to train/retrain the model. - How to
launch Streamlit from the project root. - How to install/run Ollama and
obtain Qwen 2.5 7B, if supported. - How the app behaves without
Ollama. - Model evaluation results from actual runs. - Data dictionary
and cleaning decisions. - Limitations and responsible-use statement. -
Troubleshooting for common setup and runtime issues.

Do not claim that the dataset has an open licence unless the licence is
actually verified. If the licence cannot be established from the
supplied file/source, clearly state that users must confirm permission
for redistribution or public deployment.

## Phase 6 --- Automated tests and release verification

Create automated tests, preferably with pytest, for the most important
logic.

Test at least: 1. Raw file loading and schema validation. 2. Residential
filtering and exclusion reasons. 3. Cleaning reproducibility. 4.
Missing-value handling. 5. Numeric and categorical validation. 6.
Row-count reconciliation. 7. ML preprocessing on missing and unseen
categories. 8. Model save/load. 9. Prediction output is numeric, finite
and positive for supported inputs. 10. Invalid user inputs are rejected
with clear messages. 11. Overpricing difference and percentage
calculations. 12. Threshold logic and insufficient-confidence cases. 13.
Comparable-property retrieval returns only actual dataset rows. 14. AI
assistant unavailable/model missing/timeout fallback. 15. Streamlit
application imports and starts without immediate exceptions, to the
extent testable in the environment.

Also perform: - Python syntax/compile checks. - Notebook JSON validity
checks. - Notebook execution in order where the environment permits. - A
clean end-to-end pipeline run from the raw CSV. - Model artefact
existence and reload test. - Streamlit smoke test if Streamlit can be
launched in the environment. - A final check that no paths use incorrect
letter casing. - A check that no placeholder/TODO code remains in core
features.

When a test fails: 1. Inspect the actual traceback or failed assertion.
2. Identify the root cause. 3. Fix the code or configuration. 4. Rerun
the failed test. 5. Rerun the relevant regression tests. 6. Do not mark
the project complete while a known critical test failure remains.

Do not hide failures or weaken tests merely to get a green result. If a
test cannot run because a package, system service, model download or
external environment capability is unavailable, report it accurately and
provide a safe fallback.

## Phase 7 --- Final handover

At the end, provide a concise but complete handover containing:

1.  What was built.
2.  Final folder/file structure.
3.  Actual raw, retained and excluded row counts.
4.  Important cleaning decisions and unresolved data limitations.
5.  Final model selected and actual MAE, RMSE and R².
6.  Test results: passed, failed, skipped and why.
7.  Exact commands to install dependencies and run the app on Windows.
8.  Ollama/Qwen setup instructions and fallback behaviour.
9.  Known limitations and any action that genuinely requires the user's
    decision.
10. Confirmation of which deliverables were actually created and
    verified.

Clearly distinguish: - **Completed and tested** - **Completed but not
testable in this environment** - **Not completed / blocked**

Never say "100% error-free" or "100% clean" unless such a claim can
genuinely be proven, which is generally not possible. Instead, report
measurable validation coverage and test results honestly.

------------------------------------------------------------------------

## Final execution instruction

Now execute the entire project in the available workspace using the
attached raw CSV.

-   Start by inspecting the actual dataset and workspace.
-   Build the complete pipeline and all required deliverables.
-   Preserve the exact main folder structure.
-   Do not assume previous work exists.
-   Do not stop after planning or explaining.
-   Do not ask me to manually write code or repair errors after
    delivery.
-   Run tests, fix discovered issues and verify the final outputs.
-   Make conservative, evidence-based decisions whenever the raw data is
    ambiguous.
-   If an assumption cannot be validated, document it and implement a
    safe fallback rather than inventing information.
-   Finish with the final handover report and exact run instructions.

**The priority is a trustworthy, reproducible, maintainable and
professionally presented project---not merely making every row look
complete or making the model produce a prediction at any cost.**
