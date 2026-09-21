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

Terminal 2, start FastAPI:

```bash
uvicorn backend.main:app --reload --port 8000
```

Terminal 3, start React:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Set `VITE_API_URL` if FastAPI runs at another URL.

## Source dataset

The default source is the public SheetDB endpoint configured in `DATA_SOURCE_URL`. Training caches the response as `data/cleaned_dataset.csv`. The observed schema has 25 columns and 5,000 rows, with 103 `FraudFlag = 1` records. The dataset does not contain CIBIL scores, so the application does not synthesize that feature.

## API endpoints

- `GET /health`
- `GET /dataset-summary`
- `GET /analytics/overview`
- `GET /analytics/eda`
- `GET /records`
- `GET /models`
- `GET /models/{model_name}/metrics`
- `POST /predict`

## Project structure

```text
data/                 cached cleaned dataset
models/               joblib pipelines and measured evaluation results
backend/main.py       FastAPI API and analytical queries
ml/train.py           preprocessing, SMOTE, training, and evaluation
src/App.tsx           focused academic dashboard
src/services/backendApi.ts  frontend API client
docs/                 warehouse and ML documentation
```

## Academic framing

The documented star schema treats each loan application as a fact and separates customer, date, loan, employment, and fraud-status dimensions. The dashboard demonstrates roll-up (age groups), drill-down (cohorts), slice (single category), and dice (combined filters). The model page reports measured recall and PR-AUC alongside accuracy because the target is imbalanced.

The project deliberately does not claim real-time surveillance, live retraining, identity verification, or production banking decisions. It is a dataset-backed academic analysis and prediction system.
