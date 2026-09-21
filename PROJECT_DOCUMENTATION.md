# FraudGuard Project Documentation

## 1. Project Identity

**Product name:** FraudGuard - Financial Fraud & Risk Analysis  
**Domain:** Fintech analytics, retail lending, fraud detection, and customer risk analysis  
**Application type:** React 19 single-page dashboard built with Vite and TypeScript  
**Primary purpose:** Load loan application records, normalize and analyze them, surface fraud patterns, compare fraud-model benchmarks, score a new application, and inspect/export individual records.

The app is a browser dashboard. It does not contain a backend server, model-training pipeline, database, authentication layer, or server-side inference endpoint in this repository.

## 2. How To Run

Requirements:

- Node.js with npm
- Network access to the configured SheetDB endpoint for live data

Commands:

```bash
npm install
npm run dev
```

The development server is configured for port `3000` and binds to `0.0.0.0`:

```text
http://localhost:3000
```

Other scripts:

```bash
npm run build    # production Vite build into dist/
npm run preview  # serve the production build
npm run lint     # TypeScript check: tsc --noEmit
npm run clean    # remove dist/ and server.js
```

The project currently has no automated test suite or test script.

## 3. Technology Stack

- React 19 and React DOM
- TypeScript 7
- Vite 8
- Tailwind CSS 4 through `@tailwindcss/vite`
- `lucide-react` for icons
- `motion` is installed but the inspected dashboard components do not depend on it
- `@google/genai`, `express`, `dotenv`, `tsx`, and Node typings are installed for the broader AI Studio/template environment, but the dashboard runtime shown here does not call Gemini or Express
- Google Fonts: Inter and JetBrains Mono

## 4. Runtime Architecture

```text
src/main.tsx
  -> src/App.tsx
      -> fetchLiveLoanApplications(endpoint)
          -> SheetDB REST API
          -> normalizeRecord(row)
      -> filterApplicationsByPeriod(applications, selectedPeriod)
      -> calculateDashboardMetrics(filteredApplications)
      -> active view
          -> OverviewView
          -> AnalyticsView
          -> ModelLabView
          -> FraudCheckerView
          -> DataExplorerView
          -> SettingsView
      -> Header + Sidebar + RightRail
      -> ApplicationDetailModal / pipeline modal / methodology modal
```

`App.tsx` is the application orchestrator. It owns navigation, the loaded application array, synchronization state, period filtering, derived KPI state, settings, modal state, export behavior, and status updates.

### Startup and synchronization

1. The app starts on the `overview` tab.
2. `syncLiveDataset()` runs from `useEffect` on startup.
3. It fetches a JSON array from the SheetDB URL.
4. Each raw row is passed through `normalizeRecord()`.
5. On success, applications are stored in React state, `syncStatus` becomes `success`, and `lastSyncTime` is updated.
6. On failure, applications are cleared, `syncStatus` becomes `error`, and data-dependent views show the retry card.
7. The current selected period filters the normalized array.
8. KPI values and analytical views recompute from the filtered array.

The `models`, `checker`, and `settings` views are not blocked by live-data loading. `overview`, `analytics`, and `explorer` are data-dependent.

## 5. Repository File Map

### Root files

- `package.json`: dependencies and npm scripts.
- `package-lock.json`: locked npm dependency graph.
- `index.html`: document shell, page metadata, font imports, and root mount element.
- `metadata.json`: AI Studio-style application metadata and declared capability.
- `.env.example`: template variables for `GEMINI_API_KEY` and `APP_URL`; neither is used by the current dashboard flow.
- `vite.config.ts`: Vite and React/Tailwind build configuration.
- `tsconfig.json`: TypeScript compiler configuration.
- `dist/`: generated production output; should be treated as build output.

### Application entry and shared types

- `src/main.tsx`: mounts `<App />` under React `StrictMode` and imports global CSS.
- `src/App.tsx`: top-level state machine and page composition.
- `src/types.ts`: shared domain contracts including applications, KPIs, models, alerts, pipeline activities, settings, checker forms, and prediction results.
- `src/index.css`: Tailwind import plus scrollbar, gauge, active navigation, and grid-pattern styles.

### Shared components

- `src/components/Sidebar.tsx`: desktop navigation, mobile navigation content, dataset status, pipeline modal trigger, and methodology modal trigger.
- `src/components/Header.tsx`: breadcrumb, connection status, refresh, overview period selector, CSV export, mobile menu, and right-rail toggle.
- `src/components/RightRail.tsx`: static fraud-alert feed, dynamic pipeline activity timeline, system status, and architecture modal trigger.
- `src/components/ApplicationDetailModal.tsx`: full application dossier, risk/status summary, JSON download, and approve/reject actions.
- `src/components/SyncStatusDisplay.tsx`: loading skeleton and live API error/retry state.

### Views

- `src/views/OverviewView.tsx`: live KPI dashboard, distribution donut, monthly trend, and cohort breakdowns.
- `src/views/AnalyticsView.tsx`: cohort analytics and printable executive report.
- `src/views/ModelLabView.tsx`: five stored benchmark model records, comparison matrix, confusion matrix, ROC visualization, and feature importance details.
- `src/views/FraudCheckerView.tsx`: manual application form, deterministic risk heuristic, preset scenarios, and save-to-queue behavior.
- `src/views/DataExplorerView.tsx`: searchable, filterable, sortable, paginated application table and dossier access.
- `src/views/SettingsView.tsx`: data source, probability cutoff, alert, and auto-rejection settings UI.

### Services

- `src/services/api.ts`: SheetDB URL, raw-row normalization, live fetch, KPI calculation, analytical aggregations, date-period filtering, and chart data helpers.
- `src/services/dataService.ts`: defaults, 12 static demo records, synthetic-page generator, model benchmark data, static alerts, pipeline activity text, checker heuristic, CSV generation, and a legacy alternate fetch mapper.

## 6. Domain Data Model

The main record type is `LoanApplication`. The expected SheetDB columns are:

| Field | Meaning |
|---|---|
| `ApplicationID` | Loan application identifier |
| `CustomerID` | Customer identifier |
| `ApplicantName` | Applicant display name |
| `ApplicantAge` | Applicant age |
| `Gender` | Male, Female, or Other |
| `EmploymentStatus` | Salaried, Self-Employed, Small Business Owner, Freelance / Gig, Retired, or Unemployed |
| `NumberDependents` | Number of dependents |
| `LoanType` | Personal, Home, Vehicle, Business, or Education |
| `PurposeOfLoan` | Free-text loan purpose |
| `ApplicationDate` | Display date from the source |
| `DateKey` | Numeric/string date key such as `20241212` |
| `Day`, `Month`, `Quarter`, `Year` | Time dimensions used in trends and filtering |
| `FraudFlag` | Binary label: `0` genuine, `1` fraud |
| `FraudType` | None, Synthetic Identity, Income Inflation, Collusion, Default Risk, or Rapid Velocity |
| `LoanStatus` | Approved, Under Review, or Rejected |
| `PropertyOwnershipStatus` | Owned, Rented, or Mortgaged |
| `ResidentialAddress` | Address text |
| `LoanAmountRequested` | Requested amount in rupees |
| `LoanTenureMonths` | Requested tenure |
| `InterestRateOffered` | Interest rate percentage |
| `MonthlyIncome` | Stated monthly income in rupees |
| `ExistingEMIs` | Existing monthly EMI amount in rupees |
| `DebtToIncomeRatio` | DTI value used by the dashboard; normalized records generally expose percentage-style values |
| `CIBILScore` | Credit score, normally bounded from 300 to 900 |
| `RiskProbability` | Fraud probability represented as a decimal between 0 and 1 in loaded records |

### Normalization rules

`normalizeRecord()` is intentionally defensive because Google Sheets values often arrive as strings.

- Numeric fields are coerced with `Number()` and receive defaults when missing.
- Missing IDs are generated as `APP001`, `CUST001`, etc.
- Missing names, dates, loan types, locations, and categorical values receive display defaults.
- `FraudFlag` is `1` only when the source value converts exactly to numeric `1`; otherwise it is `0`.
- DTI is converted to a percentage-style number when the raw value is a decimal at or below `1`; values above `1` are kept as supplied to two decimals. If absent, it is derived as `ExistingEMIs / MonthlyIncome * 100`.
- Missing CIBIL is estimated from fraud status or interest/DTI heuristics.
- Normalized fraud records get a default risk probability of `0.92`; genuine records receive a capped heuristic risk up to `0.38`.
- Missing status is inferred as Approved, Under Review for high DTI, or Rejected for fraud.
- Missing fraud type becomes Synthetic Identity for fraud rows and None otherwise.

## 7. Live Data Integration

Default endpoint:

```text
https://sheetdb.io/api/v1/jnveyifpbrsuy
```

`fetchLiveLoanApplications()` performs a browser `fetch`, requires a successful HTTP response, requires the JSON payload to be an array, and normalizes every row. It logs the raw response, count, and first row to the browser console for debugging.

There is no API key or authentication header in the live fetch. The endpoint must be publicly readable and must permit browser CORS requests.

### Important source-mode behavior

The UI presents Demo Dataset and Live Google Sheet choices, but the current `App.tsx` startup and refresh path always calls `fetchLiveLoanApplications()`. The `useLiveApi` and `dataSourceMode` settings are stored and displayed, but the Demo Dataset option does not currently switch the application state to `DEMO_APPLICATIONS` or `generateSyntheticPage()`.

`dataService.ts` also contains `fetchSheetData()`, a second older fetch/normalization implementation. It is not used by the current `App.tsx` path.

## 8. KPI Calculations

`calculateDashboardMetrics()` derives all values from the currently filtered records. No dataset-size KPI is hardcoded.

- **Total applications:** number of records.
- **Genuine applications:** records where `FraudFlag === 0`.
- **Fraudulent applications:** records where `FraudFlag === 1`.
- **Fraud rate:** fraudulent / total * 100, rounded to two decimals.
- **Average loan amount:** total requested amount / total records / 100,000, displayed in lakhs.
- **Average loan amount in rupees:** total requested amount / total records.
- **Average genuine/fraud amount:** respective class total / class count / 100,000.
- **Estimated fraud prevented:** sum of flagged loan amounts / 10,000,000, displayed in crores.
- **Average CIBIL:** arithmetic mean, rounded to an integer.
- **Average monthly income:** arithmetic mean, rounded to a rupee.
- **Average DTI:** arithmetic mean, rounded to one decimal.

An empty dataset returns a zero-filled KPI object.

## 9. Dashboard Views and Workflows

### Overview

File: `src/views/OverviewView.tsx`

Shows:

- Total, fraudulent, genuine, and fraud-rate KPIs.
- Average CIBIL, income, DTI, and loan amount KPIs.
- Genuine versus fraud donut chart.
- Monthly genuine/fraud intake trend with All Months, Last 6 Mos, and Last 4 Mos display modes.
- Peak and lowest fraud periods.
- Estimated fraud exposure.
- Fraud by employment, loan category, and age group.
- Navigation to the checker and explorer.
- Clickable application rows/cards that open the dossier modal.

The view calculates breakdowns from the application prop using helpers in `api.ts`.

### Fraud Analytics and Reports

File: `src/views/AnalyticsView.tsx`

The analytics tab has two internal modes:

1. **Fraud Analytics & Cohorts**
   - Fraud rate, exposure, average fraud ticket, and genuine baseline.
   - Fraud concentration by loan type and employment status.
   - CIBIL buckets: below 580, 580-669, 670-739, and 740-850.
   - DTI buckets: below 25%, 25-40%, 40-50%, and above 50%.
   - Loan amount buckets.
   - Gender cohort distribution and fraud rate.
   - Data quality counts for completeness, valid CIBIL range, and nonzero income.

2. **Executive Fraud Report**
   - Text summary of the current portfolio.
   - Dataset quality summary.
   - Model performance summary from `MODELS_DATA`.
   - Browser print action and CSV export.

All cohort counts are computed in the view from the current application array.

### Model Lab

File: `src/views/ModelLabView.tsx`

Provides a comparison and inspection surface for five benchmark records:

- Logistic Regression (`lr`)
- Decision Tree (`dt`)
- Naive Bayes (`nb`)
- Random Forest (`rf`), selected by default
- XGBoost (`xgb`)

Users can select a model from the table or quick-switch cards and inspect:

- Accuracy, precision, recall, F1, ROC-AUC, and PR-AUC.
- Inference latency.
- Description of the algorithm.
- Confusion matrix values TN, FP, FN, and TP.
- Feature importance weights.
- ROC curve points.
- Navigation to the checker.

The page labels its values as **Demo Benchmark Data** and describes a 20% holdout set of 1,000 samples with SMOTE preprocessing. These are static objects in `dataService.ts`; no model file, training code, or inference API is present.

### Fraud Checker

File: `src/views/FraudCheckerView.tsx`

The checker accepts:

- Applicant name and age
- Gender and employment status
- Dependents
- Loan type and purpose
- Requested amount, tenure, and interest rate
- Monthly income and existing EMIs
- CIBIL score
- Property ownership
- Loan status

The form requires applicant name and requested loan amount. It calculates displayed DTI as `existingEMIs / monthlyIncome`, then runs `predictLoanRisk()` after a short 300 ms UI delay.

Preset scenarios:

- Safe Prime
- Borderline
- High Risk

The result contains:

- Genuine, Fraud, or Review prediction
- Fraud probability from 4% to 98%
- LOW, MEDIUM, or HIGH RISK label
- Recommendation text
- DTI ratio
- Three contributing factors

The checker is a deterministic heuristic, not a call to the models displayed in Model Lab.

When saved to queue, a new in-memory `LoanApplication` is created with generated IDs. Fraud predictions become `FraudFlag: 1` and Rejected; other predictions become `FraudFlag: 0` and Approved. The record is prepended to the current application state and is not persisted remotely.

### Data Explorer

File: `src/views/DataExplorerView.tsx`

Provides a local table workflow over the loaded application array:

- Search by ApplicationID, CustomerID, or applicant name.
- Filter by fraud status, loan type, employment, loan status, gender, and date period.
- Sort by any supported `LoanApplication` field, ascending or descending.
- Select 10, 25, 50, or 100 rows per page.
- Paginate through results.
- Clear all filters.
- Open a full application dossier.
- Export the current top-level filtered dataset through the shared CSV handler.

The date filter uses a fixed reference date of `2024-04-15` for 30-day and 90-day calculations. Source dates are passed to JavaScript `Date`; formats such as `12-12-2024` can be browser-dependent, so this logic should be treated carefully when extending the app.

### Settings

File: `src/views/SettingsView.tsx`

Settings include:

- Demo versus live source selection.
- SheetDB endpoint URL.
- Test connection action.
- Fraud probability cutoff from 10% to 90%, default 50%.
- Immediate warning toggle for risk above 75%.
- Automatic rejection toggle for risk above 90%.

Saving updates React state and immediately calls `syncLiveDataset()` with the new endpoint. The current app does not persist settings to local storage or a backend, and the threshold/toggles are not applied to the checker or status update logic yet.

## 10. Model Benchmark Catalog

Values below are hardcoded in `MODELS_DATA`.

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC | PR-AUC | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Logistic Regression | 89.2% | 79.5% | 72.3% | 75.7% | 0.884 | 0.742 | 4 ms |
| Decision Tree | 90.6% | 81.2% | 80.4% | 80.8% | 0.892 | 0.781 | 6 ms |
| Naive Bayes | 86.4% | 71.0% | 76.5% | 73.6% | 0.841 | 0.698 | 5 ms |
| Random Forest | 94.8% | 92.4% | 85.6% | 88.8% | 0.962 | 0.894 | 14 ms |
| XGBoost | 95.1% | 93.6% | 84.1% | 88.6% | 0.965 | 0.901 | 18 ms |

Model feature-weight metadata emphasizes combinations of CIBIL, DTI, requested amount/income leverage, employment stability, age, EMI count, loan purpose, and application velocity. The weights are for display and explanation only.

## 11. Static and Synthetic Data

`DEMO_APPLICATIONS` contains 12 named Indian loan records spanning genuine and flagged examples, including Synthetic Identity, Income Inflation, and Rapid Velocity fraud types.

`generateSyntheticPage(page, pageSize, search)` can generate deterministic records up to a nominal total of 5,000. It uses repeating names, categories, income, loan amount, CIBIL, EMI, and fraud patterns. It is currently not connected to the main `App.tsx` data-loading path.

`FRAUD_ALERTS` contains four static right-rail alerts:

- Rapid loan application spike
- Identity inconsistency
- Batch model retrain complete
- Cluster default risk warning

`getPipelineActivities()` generates five static-style activity entries, with the loaded record count and last sync time inserted into the first entry.

## 12. Cross-Cutting Actions

### CSV export

`generateCSVContent()` exports these columns:

```text
ApplicationID, CustomerID, ApplicantName, ApplicantAge, Gender,
EmploymentStatus, NumberDependents, LoanType, PurposeOfLoan,
ApplicationDate, LoanAmountRequested, LoanTenureMonths,
InterestRateOffered, MonthlyIncome, ExistingEMIs, DebtToIncomeRatio,
CIBILScore, LoanStatus, FraudFlag, FraudType, RiskProbability
```

`App.tsx` exports the current period-filtered application array as:

```text
financial_fraud_analysis_<record-count>_records.csv
```

The detail modal separately downloads one selected record as formatted JSON named `<ApplicationID>_dossier.json`.

### Application status updates

The dossier modal can set a record to Approved or Rejected. This only updates the in-memory `applications` state and does not write back to SheetDB.

### Responsive behavior

- Desktop uses a persistent left sidebar and optional right rail.
- Smaller screens use a drawer-style mobile sidebar.
- The right rail can be collapsed.
- Main content uses responsive Tailwind grids and scroll containers.

## 13. Styling and Visual System

The dashboard uses a dark fintech visual system:

- Base background: near-black `#0a0c0e`.
- Panels: `#14181d` and `#181d24`.
- Primary accent: lime `#bbf246`.
- Fraud/high-risk accent: coral/red `#f43f5e`.
- Warning accent: orange `#fb923c`.
- Informational loading accent: blue `#38bdf8`.
- Font family: Inter for UI text and JetBrains Mono for metrics/IDs.
- Tailwind utility classes provide nearly all component styling.
- `index.css` provides scrollbar styling, animated gauge transition, active navigation treatment, and an optional grid pattern.

## 14. Known Limitations and Maintenance Notes

1. The live API is browser-called directly and has no authentication or server-side proxy.
2. The Demo Dataset switch is currently presentation-only; live fetching remains the active path.
3. `MODELS_DATA` is static benchmark metadata, not executable model artifacts.
4. `predictLoanRisk()` is a hand-authored scoring heuristic and does not use `MODELS_DATA`.
5. Settings for threshold, alerts, and auto-rejection are not wired into decisions.
6. Added checker records, status changes, and settings are session-memory only.
7. There are two data-fetch implementations; `fetchSheetData()` is legacy/unused and can drift from `normalizeRecord()`.
8. DTI representation is inconsistent across code paths: normalized API records generally use percentage values, while checker calculations use decimal ratios and some generated demo rows store decimals. Analytics bucket comparisons therefore need verification before being used for regulated decisions.
9. Some UI labels and static sidebar badges are fixed display values, such as the analytics `9.72%` badge and the default connected status.
10. The Explorer's date filtering uses a fixed historical reference date and JavaScript date parsing of source strings.
11. The project has no automated tests, so API normalization, period filters, KPI formulas, checker thresholds, and export escaping are currently unprotected by regression tests.
12. CSV quoting is basic: selected text fields are wrapped in quotes, but embedded quotes/newlines are not escaped using a full CSV serializer.

## 15. Suggested Extension Points

For an agent or developer extending the project:

- Add a data-source adapter interface and make live/demo mode select the adapter.
- Centralize DTI as either a decimal or percentage representation and update every view consistently.
- Replace direct browser API access with a backend proxy if the source becomes private or requires credentials.
- Add tests for `normalizeRecord`, `calculateDashboardMetrics`, `filterApplicationsByPeriod`, `predictLoanRisk`, and CSV generation.
- Add persistence for settings, status updates, and checker queue records.
- Replace static model metadata with versioned model artifacts or a prediction service before presenting Model Lab as production inference.
- Add explicit API schema validation and a user-visible stale-data indicator.

## 16. Quick Orientation For An AI Agent

When changing this project:

1. Start in `src/App.tsx` to understand global state and routing.
2. Use `src/types.ts` as the source of truth for contracts.
3. Use `src/services/api.ts` for live-record normalization, KPIs, and period filters.
4. Use `src/services/dataService.ts` for static benchmark/demo behavior and checker logic.
5. Treat `OverviewView`, `AnalyticsView`, and `DataExplorerView` as projections of the current application array.
6. Treat `ModelLabView` as static benchmark presentation.
7. Treat `FraudCheckerView` as a local heuristic workflow that creates temporary records.
8. Run `npm run lint` after TypeScript changes and `npm run build` before shipping a production build.
9. Preserve the existing dark Tailwind visual language and responsive layout unless a deliberate redesign is requested.
