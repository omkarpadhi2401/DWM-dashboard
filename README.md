# Financial Fraud Detection & Customer Risk Analysis

Academic Data Warehouse, Data Mining, and Machine Learning mini-project for analyzing loan applications and detecting fraud labels from a real 5,000-row dataset.

## What is included

- Clean academic React dashboard with Overview, Data Analysis, Model Comparison, Fraud Prediction, and Dataset sections.
- FastAPI service for dataset summary, OLAP-style analytics, records, model metrics, and prediction.
- Reproducible Python training pipeline for Logistic Regression, Decision Tree, Naive Bayes, Random Forest, and XGBoost.
- Train/test split before SMOTE, persisted preprocessing-plus-model pipelines, confusion matrices, ROC curves, PR curves, and feature importance.
- Star-schema and OLAP documentation in `docs/data_warehouse_schema.md`.
- ML pipeline documentation in `docs/ml_pipeline.md`.

## Run the project

Terminal 1, train the real models:

```bash
python3 -m pip install -r requirements.txt
python3 -m ml.train
```

Terminal 2, configure the bank-officer account and start FastAPI:

```bash
cp .env.example .env        # then edit FRAUDGUARD_OFFICER_EMAIL / FRAUDGUARD_OFFICER_PASSWORD
uvicorn backend.main:app --reload --port 8000
```

The officer account is created on start-up from `.env` if it does not exist yet. Alternatively run
`python -m backend.manage create-officer --email you@bank.example --name "Loan Officer"` (the password is prompted).
`.env` is git-ignored — never commit real credentials.

Terminal 3, start React:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Set `VITE_API_URL` if FastAPI runs at another URL.

## Source dataset

The default source is the public SheetDB endpoint configured in `DATA_SOURCE_URL`. Training caches the response as `data/cleaned_dataset.csv`. The observed schema has 25 columns and 5,000 rows, with 103 `FraudFlag = 1` records. The dataset does not contain CIBIL scores, so the application does not synthesize that feature.

## Application workflow (Version 2)

- **Customers** sign up, apply for a loan through a five-step form (Personal, Employment, Financial, Loan, Review & Submit), and follow the status and timeline under *My Applications*. Customers never see model output; a rejected applicant sees the rejection reason.
- **Bank officers** work through *New Applications* (sidebar badge shows the live count), open the review screen, and **Approve**, **Reject** (reason required) or **Send for Review** (reason required). Every action is stored with timestamp and decision maker in an append-only decision history.
- Status flow: `NEW → UNDER_REVIEW → APPROVED / REJECTED` (a NEW application can also be approved or rejected directly).
- New applications, accounts, and decisions are stored in SQLite at `storage/fraudguard.db` (git-ignored). The historical dataset in `data/cleaned_dataset.csv` is **read-only**; its 5,000 records appear in *All Applications* with their recorded outcome and cannot be decided again.
- Fraud probability comes from the saved selected model (`evaluation_results.json → selectedModel`). Risk level: Low < 25%, Medium 25–50%, High ≥ 50%. Per-application explanations are not available; the review screen shows the model's global feature importance and says so.

## Admin / Technical panel

A third, separate role (`admin`) for the project administrator, ML engineer or evaluator. It does not replace the Bank Officer workspace and cannot approve or reject applications.

- Sign in at `http://localhost:3000/#/admin-login` (customers and bank officers use the main sign-in page; each page rejects the other roles).
- Create the account by setting `FRAUDGUARD_ADMIN_EMAIL` / `FRAUDGUARD_ADMIN_PASSWORD` in `.env`, or run `python -m backend.manage create-admin --email you@example.com`.
- Pages: Admin Dashboard, Dataset Overview, Data Explorer, Fraud Analytics, ML Model Comparison, Model Performance, Feature Analysis, Data Quality, DWM / OLAP Analysis, System / Technical Info, Settings.
- Every figure is computed by the `/technical/*` endpoints (`backend/technical.py`) from the loaded dataset, the saved models and `models/evaluation_results.json`. Missing values are shown as "Not available".
- Dataset source: the configured SheetDB endpoint. If SheetDB cannot be reached, the API falls back to the cached copy `data/cleaned_dataset.csv` and says so on the admin pages.

## API endpoints

- `GET /health`
- `GET /dataset-summary`
- `GET /analytics/overview`
- `GET /analytics/eda`
- `GET /records`
- `GET /models`
- `GET /models/{model_name}/metrics`
- `POST /predict` (officer)
- `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /applications`, `GET /applications/stats`, `GET /applications/{id}` (officer)
- `POST /applications/{id}/decision`, `POST /applications/{id}/analysis` (officer)
- `GET /me/applications`, `GET /me/applications/{id}`, `POST /me/applications` (customer)
- `GET /reference`
- `GET /technical/dataset-profile`, `/technical/distributions`, `/technical/data-quality`, `/technical/olap`, `/technical/olap/schema`, `/technical/olap/pivot`, `/technical/models`, `/technical/models/{name}`, `/technical/features`, `/technical/system` (admin only)

Analytics, records, model and prediction endpoints require a bank-officer session.

## Project structure

```text
data/                 cached cleaned dataset
models/               joblib pipelines and measured evaluation results
backend/main.py       FastAPI API, analytics, application workflow
backend/store.py      SQLite storage: users, sessions, applications, audit trail
backend/manage.py     CLI (create a bank-officer account)
ml/train.py           preprocessing, SMOTE, training, and evaluation
src/App.tsx           app shell, routing and role protection
src/pages/            officer (admin/) and customer (customer/) pages
src/ui.tsx            shared UI components (dialogs, states, pagination)
src/services/backendApi.ts  frontend API client
docs/                 warehouse and ML documentation
```

## Academic framing

The documented star schema treats each loan application as a fact and separates customer, date, loan, employment, and fraud-status dimensions. The dashboard demonstrates roll-up (age groups), drill-down (cohorts), slice (single category), and dice (combined filters). The model page reports measured recall and PR-AUC alongside accuracy because the target is imbalanced.

The project deliberately does not claim real-time surveillance, live retraining, identity verification, or production banking decisions. It is a dataset-backed academic analysis and prediction system.
