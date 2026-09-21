from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "cleaned_dataset.csv"
RESULTS_PATH = ROOT / "models" / "evaluation_results.json"
MODEL_DIR = ROOT / "models"
SOURCE_URL = os.getenv("DATA_SOURCE_URL", "https://sheetdb.io/api/v1/jnveyifpbrsuy")

FEATURE_COLUMNS = [
    "ApplicantAge", "Gender", "EmploymentStatus", "NumberDependents", "LoanType",
    "PurposeOfLoan", "LoanAmountRequested", "LoanTenureMonths", "InterestRateOffered",
    "MonthlyIncome", "ExistingEMIs", "DebtToIncomeRatio",
    "PropertyOwnershipStatus",
]
CATEGORICAL_COLUMNS = ["Gender", "EmploymentStatus", "LoanType", "PurposeOfLoan", "PropertyOwnershipStatus"]
NUMERIC_COLUMNS = [column for column in FEATURE_COLUMNS if column not in CATEGORICAL_COLUMNS]

app = FastAPI(title="Financial Fraud Analytics API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    ApplicantAge: float = Field(ge=18, le=100)
    Gender: str
    EmploymentStatus: str
    NumberDependents: float = Field(ge=0)
    LoanType: str
    PurposeOfLoan: str
    LoanAmountRequested: float = Field(gt=0)
    LoanTenureMonths: float = Field(gt=0)
    InterestRateOffered: float = Field(ge=0)
    MonthlyIncome: float = Field(gt=0)
    ExistingEMIs: float = Field(ge=0)
    DebtToIncomeRatio: float | None = None
    PropertyOwnershipStatus: str
    model_name: str = "random_forest"


def load_dataset() -> pd.DataFrame:
    if DATA_PATH.exists():
        return pd.read_csv(DATA_PATH)
    try:
        response = requests.get(SOURCE_URL, timeout=30)
        response.raise_for_status()
        data = pd.DataFrame(response.json())
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Dataset unavailable: {exc}") from exc
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(DATA_PATH, index=False)
    return data


def require_results() -> dict[str, Any]:
    if not RESULTS_PATH.exists():
        raise HTTPException(status_code=503, detail="Models have not been trained. Run: python -m ml.train")
    return json.loads(RESULTS_PATH.read_text())


def fraud_rate(frame: pd.DataFrame) -> float:
    if frame.empty:
        return 0.0
    return round(float(frame["FraudFlag"].mean() * 100), 2)


def grouped_fraud(frame: pd.DataFrame, column: str) -> list[dict[str, Any]]:
    grouped = frame.groupby(column, dropna=False)["FraudFlag"].agg(["count", "sum"]).reset_index()
    return [
        {"label": str(row[column]), "total": int(row["count"]), "fraud": int(row["sum"]), "fraudRate": round(float(row["sum"] / row["count"] * 100), 2)}
        for _, row in grouped.sort_values("sum", ascending=False).iterrows()
    ]


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "datasetPath": str(DATA_PATH), "modelsTrained": RESULTS_PATH.exists()}


@app.get("/dataset-summary")
def dataset_summary() -> dict[str, Any]:
    frame = load_dataset()
    missing = frame.isna().sum()
    return {
        "rows": int(len(frame)),
        "columns": int(len(frame.columns)),
        "columnNames": list(frame.columns),
        "numericalColumns": list(frame.select_dtypes(include="number").columns),
        "categoricalColumns": list(frame.select_dtypes(exclude="number").columns),
        "missingValues": {str(key): int(value) for key, value in missing[missing > 0].items()},
        "fraudCount": int(frame["FraudFlag"].sum()),
        "genuineCount": int((frame["FraudFlag"] == 0).sum()),
        "source": SOURCE_URL,
    }


@app.get("/analytics/overview")
def analytics_overview() -> dict[str, Any]:
    frame = load_dataset()
    fraud = frame[frame["FraudFlag"] == 1]
    return {
        "totalApplications": int(len(frame)),
        "fraudulentApplications": int(len(fraud)),
        "genuineApplications": int((frame["FraudFlag"] == 0).sum()),
        "fraudRate": fraud_rate(frame),
        "averageLoanAmount": round(float(frame["LoanAmountRequested"].mean()), 2),
        "averageCibilScore": None,
        "byLoanType": grouped_fraud(frame, "LoanType"),
        "byEmployment": grouped_fraud(frame, "EmploymentStatus"),
        "byGender": grouped_fraud(frame, "Gender"),
        "byAgeGroup": grouped_fraud(frame.assign(AgeGroup=pd.cut(frame["ApplicantAge"], [0, 25, 35, 45, 55, 200], labels=["18-25", "26-35", "36-45", "46-55", "56+"])), "AgeGroup"),
        "byMonth": grouped_fraud(frame, "Month"),
    }


@app.get("/analytics/eda")
def analytics_eda() -> dict[str, Any]:
    frame = load_dataset()
    correlations = frame.select_dtypes(include="number").corr(numeric_only=True)["FraudFlag"].drop("FraudFlag").sort_values(key=abs, ascending=False)
    distributions: dict[str, list[dict[str, Any]]] = {}
    for column in ["DebtToIncomeRatio", "LoanAmountRequested", "MonthlyIncome", "ExistingEMIs"]:
        values = frame[[column, "FraudFlag"]].copy()
        values["bin"] = pd.qcut(values[column], q=min(8, values[column].nunique()), duplicates="drop")
        grouped = values.groupby("bin", observed=True)["FraudFlag"].agg(["count", "mean"]).reset_index()
        distributions[column] = [{"range": str(row["bin"]), "count": int(row["count"]), "fraudRate": round(float(row["mean"] * 100), 2)} for _, row in grouped.iterrows()]
    return {
        "correlations": [{"feature": str(index), "value": round(float(value), 4)} for index, value in correlations.items()],
        "distributions": distributions,
        "byLoanType": grouped_fraud(frame, "LoanType"),
        "byEmployment": grouped_fraud(frame, "EmploymentStatus"),
    }


@app.get("/models")
def models() -> dict[str, Any]:
    results = require_results()
    return {"models": results["models"], "selectedModel": results.get("selectedModel")}


@app.get("/models/{model_name}/metrics")
def model_metrics(model_name: str) -> dict[str, Any]:
    results = require_results()
    try:
        return results["models"][model_name]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_name}") from exc


@app.get("/records")
def records(
    search: str = Query(default=""),
    fraud: str = Query(default="all"),
    loan_type: str = Query(default="all"),
    employment: str = Query(default="all"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> dict[str, Any]:
    frame = load_dataset()
    if search:
        query = search.lower()
        mask = frame.apply(lambda row: query in " ".join(str(row.get(key, "")) for key in ["ApplicationID", "CustomerID", "ApplicantName"]).lower(), axis=1)
        frame = frame[mask]
    if fraud.lower() in {"0", "1"}:
        frame = frame[frame["FraudFlag"] == int(fraud)]
    if loan_type != "all":
        frame = frame[frame["LoanType"] == loan_type]
    if employment != "all":
        frame = frame[frame["EmploymentStatus"] == employment]
    start = (page - 1) * page_size
    return {"total": int(len(frame)), "page": page, "pageSize": page_size, "records": frame.iloc[start:start + page_size].fillna("").to_dict(orient="records")}


@app.post("/predict")
def predict(payload: PredictionRequest) -> dict[str, Any]:
    results = require_results()
    model_name = payload.model_name
    model_path = MODEL_DIR / f"{model_name}.joblib"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"Model artifact not found: {model_name}")
    import joblib
    model = joblib.load(model_path)
    values = payload.model_dump(exclude={"model_name"})
    if values["DebtToIncomeRatio"] is None:
        values["DebtToIncomeRatio"] = values["ExistingEMIs"] / values["MonthlyIncome"] * 100
    probability = float(model.predict_proba(pd.DataFrame([values]))[0][1])
    prediction = int(probability >= 0.5)
    feature_importance = results["models"].get(model_name, {}).get("featureImportance", [])[:5]
    return {"model": model_name, "fraudProbability": round(probability, 6), "prediction": prediction, "classification": "Fraud" if prediction else "Genuine", "featureImportance": feature_importance}
