from __future__ import annotations

import json
import os
import re
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

import pandas as pd
import requests
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from backend import store

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

# Probability bands used to turn the model's fraud probability into a risk level.
# HIGH starts at the model's own 0.5 classification threshold.
RISK_BANDS = {"LOW": (0.0, 0.25), "MEDIUM": (0.25, 0.5), "HIGH": (0.5, 1.01)}

# Allowed categorical values are exactly the values present in the historical dataset,
# so new applications stay compatible with the trained preprocessing pipelines.
GENDERS = ["Male", "Female", "Other"]
EMPLOYMENT = ["Salaried", "Self-Employed", "Business Owner", "Student", "Retired", "Unemployed"]
LOAN_TYPES = ["Personal Loan", "Home Loan", "Car Loan", "Business Loan", "Education Loan"]
PURPOSES = ["Education", "Home Renovation", "Vehicle Purchase", "Business Expansion", "Debt Consolidation", "Medical Emergency", "Wedding"]
PROPERTY = ["Rented", "Owned", "Jointly Owned"]
TENURES = [12, 24, 36, 60, 120, 240, 360]

REJECTION_REASONS = [
    "Low CIBIL score",
    "High debt-to-income ratio",
    "Insufficient income",
    "Incomplete information",
    "Risk concerns",
    "Other",
]
STATUS_LABELS = {"NEW": "New", "UNDER_REVIEW": "Under Review", "APPROVED": "Approved", "REJECTED": "Rejected"}

store.init_db()
store.ensure_officer_from_env()
store.ensure_admin_from_env()

app = FastAPI(title="Financial Fraud Analytics API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================================ dataset + models

_dataset_lock = threading.Lock()
_dataset_cache: pd.DataFrame | None = None
_model_cache: dict[str, Any] = {}
_historical_cache: list[dict[str, Any]] | None = None


# Which source the dataset in memory actually came from (shown on the technical panel).
_dataset_source: dict[str, Any] = {"kind": None, "loadedAt": None, "warning": None}


def _normalise_dataset(df: pd.DataFrame) -> pd.DataFrame:
    # Normalize numeric columns
    numeric_cols = [
        "ApplicantAge", "NumberDependents", "LoanAmountRequested", "LoanTenureMonths",
        "InterestRateOffered", "MonthlyIncome", "ExistingEMIs", "DebtToIncomeRatio",
        "Year", "FraudFlag", "CIBILScore"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Handle specific types
    if "FraudFlag" in df.columns:
        df["FraudFlag"] = df["FraudFlag"].fillna(0).astype(int)
    return df


def load_dataset() -> pd.DataFrame:
    """Load the historical dataset from the configured SheetDB source.

    If SheetDB cannot be reached, the cached copy of the same real dataset
    (data/cleaned_dataset.csv) is used instead and the fallback is reported by
    /technical/system and /health - it is never replaced with mock data."""
    global _dataset_cache
    with _dataset_lock:
        if _dataset_cache is not None:
            return _dataset_cache
        try:
            response = requests.get(SOURCE_URL, timeout=30)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, list) or not data:
                raise ValueError("SheetDB returned no rows")
            df = _normalise_dataset(pd.DataFrame(data))
            _dataset_source.update(kind="sheetdb", loadedAt=store.now_iso(), warning=None)
        except Exception as exc:
            if not DATA_PATH.exists():
                raise HTTPException(status_code=503, detail=f"Dataset unavailable: {exc}") from exc
            df = _normalise_dataset(pd.read_csv(DATA_PATH))
            _dataset_source.update(
                kind="local_csv", loadedAt=store.now_iso(),
                warning=f"SheetDB could not be reached ({type(exc).__name__}); using the cached copy data/cleaned_dataset.csv.",
            )
        _dataset_cache = df
        return df


def dataset_source() -> dict[str, Any]:
    return dict(_dataset_source)


def require_results() -> dict[str, Any]:
    if not RESULTS_PATH.exists():
        raise HTTPException(status_code=503, detail="Models have not been trained. Run: python -m ml.train")
    return json.loads(RESULTS_PATH.read_text())


def available_models() -> list[str]:
    return sorted(path.stem for path in MODEL_DIR.glob("*.joblib"))


def default_model() -> str:
    models = available_models()
    if not models:
        raise HTTPException(status_code=503, detail="No trained model artifacts found in models/. Run: python -m ml.train")
    try:
        selected = require_results().get("selectedModel")
    except HTTPException:
        selected = None
    return selected if selected in models else models[0]


def get_model(model_name: str) -> Any:
    if model_name not in _model_cache:
        model_path = MODEL_DIR / f"{model_name}.joblib"
        if not model_path.exists():
            raise HTTPException(status_code=404, detail=f"Model artifact not found: {model_name}. Available: {', '.join(available_models()) or 'none'}")
        import joblib
        _model_cache[model_name] = joblib.load(model_path)
    return _model_cache[model_name]


def risk_level(probability: float) -> str:
    for level, (low, high) in RISK_BANDS.items():
        if low <= probability < high:
            return level
    return "HIGH"


def score_frame(frame: pd.DataFrame, model_name: str) -> list[float]:
    model = get_model(model_name)
    return [float(value) for value in model.predict_proba(frame[FEATURE_COLUMNS])[:, 1]]


def global_factors(model_name: str, limit: int = 5) -> list[dict[str, Any]]:
    try:
        return require_results()["models"].get(model_name, {}).get("featureImportance", [])[:limit]
    except HTTPException:
        return []


def fraud_rate(frame: pd.DataFrame) -> float:
    if frame.empty:
        return 0.0
    return round(float(frame["FraudFlag"].mean() * 100), 2)


def grouped_fraud(frame: pd.DataFrame, column: str, sort_by_fraud: bool = True) -> list[dict[str, Any]]:
    grouped = frame.groupby(column, dropna=False, observed=True)["FraudFlag"].agg(["count", "sum"]).reset_index()
    if sort_by_fraud:
        grouped = grouped.sort_values("sum", ascending=False)
    return [
        {"label": str(row[column]), "total": int(row["count"]), "fraud": int(row["sum"]), "fraudRate": round(float(row["sum"] / row["count"] * 100), 2)}
        for _, row in grouped.iterrows()
    ]


def dataset_max(column: str) -> int:
    values = load_dataset()[column].astype(str).str.extract(r"(\d+)")[0].dropna().astype(int)
    return int(values.max()) if not values.empty else 0


# ================================================================ authentication

class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address")
        return value

    @field_validator("name")
    @classmethod
    def valid_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Enter your full name")
        return value

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
            raise ValueError("Password must contain at least one letter and one number")
        return value


class LoginRequest(BaseModel):
    email: str
    password: str
    # Which sign-in page is used: "standard" (customers, bank officers) or "admin" (technical administrator).
    portal: Literal["standard", "admin"] | None = None


def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    user = store.user_for_token(authorization.split(" ", 1)[1].strip())
    if not user:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    return user


def require_officer(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user["role"] != "officer":
        raise HTTPException(status_code=403, detail="This area is available to bank officers only.")
    return user


def require_admin(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="This area is available to the technical administrator only.")
    return user


def require_analyst(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Read-only analytics are shared by bank officers and the technical administrator."""
    if user["role"] not in {"officer", "admin"}:
        raise HTTPException(status_code=403, detail="This area is available to bank officers and the technical administrator only.")
    return user


def require_customer(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="This area is available to customers only.")
    return user


@app.post("/auth/signup", status_code=201)
def signup(payload: SignupRequest) -> dict[str, Any]:
    if store.get_user_by_email(payload.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Sign in instead.")
    user = store.create_customer(payload.email, payload.name, payload.password, dataset_max("CustomerID"))
    return {"token": store.create_session(user["id"]), "user": user}


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    row = store.get_user_by_email(payload.email)
    if not row or not store.verify_password(payload.password, row["password_salt"], row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    # Admin authentication is kept separate from customer / bank-officer sign-in.
    if payload.portal == "admin" and row["role"] != "admin":
        raise HTTPException(status_code=403, detail="This sign-in is for the technical administrator only. Customers and bank officers use the main sign-in page.")
    if payload.portal == "standard" and row["role"] == "admin":
        raise HTTPException(status_code=403, detail="Administrator accounts sign in from the Admin sign-in page.")
    return {"token": store.create_session(row["id"]), "user": store.public_user(row)}


@app.post("/auth/logout")
def logout(authorization: str | None = Header(default=None)) -> dict[str, str]:
    if authorization and authorization.lower().startswith("bearer "):
        store.delete_session(authorization.split(" ", 1)[1].strip())
    return {"status": "signed_out"}


@app.get("/auth/me")
def me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return {"user": user}


# ================================================================ public

@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "datasetAvailable": DATA_PATH.exists(),
        "modelsTrained": RESULTS_PATH.exists(),
        "availableModels": available_models(),
        "officerConfigured": store.officer_count() > 0,
        "adminConfigured": store.role_counts()["admin"] > 0,
    }


@app.get("/reference")
def reference() -> dict[str, Any]:
    return {
        "genders": GENDERS, "employment": EMPLOYMENT, "loanTypes": LOAN_TYPES, "purposes": PURPOSES,
        "propertyOwnership": PROPERTY, "tenures": TENURES, "rejectionReasons": REJECTION_REASONS,
        "riskBands": {key: [low, min(high, 1.0)] for key, (low, high) in RISK_BANDS.items()},
    }


# ================================================================ existing analytics (officer only)

@app.get("/dataset-summary")
def dataset_summary(_: dict = Depends(require_analyst)) -> dict[str, Any]:
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
def analytics_overview(_: dict = Depends(require_analyst)) -> dict[str, Any]:
    frame = load_dataset()
    fraud = frame[frame["FraudFlag"] == 1]
    quarter_order = frame.assign(Period=frame["Year"].astype(str) + " " + frame["Quarter"].astype(str))
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
        "byAgeGroup": grouped_fraud(frame.assign(AgeGroup=pd.cut(frame["ApplicantAge"], [0, 25, 35, 45, 55, 200], labels=["18-25", "26-35", "36-45", "46-55", "56+"])), "AgeGroup", sort_by_fraud=False),
        "byMonth": grouped_fraud(frame, "Month"),
        "byQuarter": grouped_fraud(quarter_order.sort_values(["Year", "Quarter"]), "Period", sort_by_fraud=False),
        "byFraudType": [
            {"label": str(label), "count": int(count)}
            for label, count in fraud["FraudType"].value_counts().items()
        ],
    }


@app.get("/analytics/eda")
def analytics_eda(_: dict = Depends(require_analyst)) -> dict[str, Any]:
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
def models(_: dict = Depends(require_analyst)) -> dict[str, Any]:
    results = require_results()
    return {"models": results["models"], "selectedModel": results.get("selectedModel"), "availableModels": available_models()}


@app.get("/models/{model_name}/metrics")
def model_metrics(model_name: str, _: dict = Depends(require_analyst)) -> dict[str, Any]:
    results = require_results()
    try:
        return results["models"][model_name]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown model: {model_name}") from exc


RECORD_SORT_COLUMNS = {"ApplicationID", "CustomerID", "ApplicationDate", "ApplicantAge", "LoanAmountRequested", "MonthlyIncome", "DebtToIncomeRatio", "FraudFlag", "LoanType", "EmploymentStatus", "LoanStatus"}


@app.get("/records")
def records(
    search: str = Query(default=""),
    fraud: str = Query(default="all"),
    loan_type: str = Query(default="all"),
    employment: str = Query(default="all"),
    gender: str = Query(default="all"),
    loan_status: str = Query(default="all"),
    sort: str = Query(default="ApplicationID"),
    order: Literal["asc", "desc"] = Query(default="asc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    _: dict = Depends(require_analyst),
) -> dict[str, Any]:
    frame = load_dataset()
    if search.strip():
        query = search.strip().lower()
        mask = frame["ApplicationID"].astype(str).str.lower().str.contains(query, regex=False) | frame["CustomerID"].astype(str).str.lower().str.contains(query, regex=False)
        frame = frame[mask]
    if fraud.lower() in {"0", "1"}:
        frame = frame[frame["FraudFlag"] == int(fraud)]
    if loan_type != "all":
        frame = frame[frame["LoanType"] == loan_type]
    if employment != "all":
        frame = frame[frame["EmploymentStatus"] == employment]
    if gender != "all":
        frame = frame[frame["Gender"] == gender]
    if loan_status != "all":
        frame = frame[frame["LoanStatus"] == loan_status]
    if sort in RECORD_SORT_COLUMNS:
        if sort == "ApplicationID" or sort == "CustomerID":
            key = frame[sort].astype(str).str.extract(r"(\d+)")[0].astype(float)
            frame = frame.assign(_key=key).sort_values("_key", ascending=order == "asc").drop(columns="_key")
        elif sort == "ApplicationDate":
            frame = frame.assign(_key=frame["DateKey"]).sort_values("_key", ascending=order == "asc").drop(columns="_key")
        else:
            frame = frame.sort_values(sort, ascending=order == "asc", kind="stable")
    start = (page - 1) * page_size
    return {"total": int(len(frame)), "page": page, "pageSize": page_size, "records": frame.iloc[start:start + page_size].fillna("").to_dict(orient="records")}


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
    model_name: str | None = None


def run_prediction(values: dict[str, Any], model_name: str | None = None) -> dict[str, Any]:
    model_name = model_name or default_model()
    features = {key: values[key] for key in FEATURE_COLUMNS if key != "DebtToIncomeRatio"}
    dti = values.get("DebtToIncomeRatio")
    features["DebtToIncomeRatio"] = round(values["ExistingEMIs"] / values["MonthlyIncome"] * 100, 2) if dti is None else dti
    probability = float(get_model(model_name).predict_proba(pd.DataFrame([features])[FEATURE_COLUMNS])[0][1])
    prediction = int(probability >= 0.5)
    return {
        "model": model_name,
        "fraudProbability": round(probability, 6),
        "prediction": prediction,
        "classification": "Fraud" if prediction else "Genuine",
        "riskLevel": risk_level(probability),
        "featureImportance": global_factors(model_name),
    }


@app.post("/predict")
def predict(payload: PredictionRequest, _: dict = Depends(require_officer)) -> dict[str, Any]:
    return run_prediction(payload.model_dump(exclude={"model_name"}), payload.model_name)


# ================================================================ unified application views

def _parse_dataset_date(value: str) -> str | None:
    try:
        return datetime.strptime(str(value), "%d-%m-%Y").date().isoformat()
    except ValueError:
        return None


def historical_status(loan_status: str) -> str:
    # Historical outcomes are mapped to the workflow vocabulary; the original text is kept alongside.
    if loan_status in {"Approved", "Fraudulent - Undetected"}:
        return "APPROVED"
    return "REJECTED"


def historical_applications() -> list[dict[str, Any]]:
    global _historical_cache
    if _historical_cache is not None:
        return _historical_cache
    frame = load_dataset()
    model_name: str | None = None
    probabilities: list[float | None] = [None] * len(frame)
    try:
        model_name = default_model()
        probabilities = score_frame(frame, model_name)
    except HTTPException:
        model_name = None
    rows = []
    for index, record in enumerate(frame.to_dict(orient="records")):
        probability = probabilities[index]
        rows.append({
            "applicationId": record["ApplicationID"],
            "customerId": record["CustomerID"],
            "applicantName": None,
            "applicantEmail": None,
            "source": "dataset",
            "applicationDate": _parse_dataset_date(record["ApplicationDate"]),
            "submittedAt": None,
            "age": int(record["ApplicantAge"]),
            "gender": record["Gender"],
            "dependents": int(record["NumberDependents"]),
            "address": record["ResidentialAddress"],
            "employment": record["EmploymentStatus"],
            "monthlyIncome": float(record["MonthlyIncome"]),
            "existingEmis": float(record["ExistingEMIs"]),
            "dti": float(record["DebtToIncomeRatio"]),
            "propertyOwnership": record["PropertyOwnershipStatus"],
            "cibilScore": None,
            "loanType": record["LoanType"],
            "purpose": record["PurposeOfLoan"],
            "loanAmount": float(record["LoanAmountRequested"]),
            "tenureMonths": int(record["LoanTenureMonths"]),
            "interestRate": float(record["InterestRateOffered"]),
            "status": historical_status(record["LoanStatus"]),
            "historicalOutcome": record["LoanStatus"],
            "recordedFraudFlag": int(record["FraudFlag"]),
            "recordedFraudType": record["FraudType"],
            "analysisStatus": "completed" if probability is not None else "unavailable",
            "fraudProbability": round(probability, 6) if probability is not None else None,
            "fraudPrediction": int(probability >= 0.5) if probability is not None else None,
            "riskLevel": risk_level(probability) if probability is not None else None,
            "modelName": model_name,
            "fraudFlagged": bool(record["FraudFlag"] == 1),
            "decision": None,
            "updatedAt": None,
        })
    _historical_cache = rows
    return rows


def portal_view(row: Any) -> dict[str, Any]:
    decision = None
    if row["decided_at"]:
        decision = {"status": row["status"], "by": row["decided_by"], "at": row["decided_at"], "reason": row["decision_reason"], "note": row["decision_note"]}
    return {
        "applicationId": row["application_id"],
        "customerId": row["customer_id"],
        "applicantName": row["applicant_name"],
        "applicantEmail": row["applicant_email"],
        "source": "portal",
        "applicationDate": row["submitted_at"][:10],
        "submittedAt": row["submitted_at"],
        "age": row["applicant_age"],
        "gender": row["gender"],
        "dependents": row["number_dependents"],
        "address": row["residential_address"],
        "employment": row["employment_status"],
        "monthlyIncome": row["monthly_income"],
        "existingEmis": row["existing_emis"],
        "dti": row["debt_to_income_ratio"],
        "propertyOwnership": row["property_ownership"],
        "cibilScore": row["cibil_score"],
        "loanType": row["loan_type"],
        "purpose": row["purpose_of_loan"],
        "loanAmount": row["loan_amount"],
        "tenureMonths": row["loan_tenure_months"],
        "interestRate": row["interest_rate"],
        "status": row["status"],
        "historicalOutcome": None,
        "recordedFraudFlag": None,
        "recordedFraudType": None,
        "analysisStatus": row["analysis_status"],
        "analysisError": row["analysis_error"],
        "fraudProbability": row["fraud_probability"],
        "fraudPrediction": row["fraud_prediction"],
        "riskLevel": row["risk_level"],
        "modelName": row["model_name"],
        "fraudFlagged": bool(row["fraud_prediction"] == 1),
        "decision": decision,
        "updatedAt": row["updated_at"],
    }


def all_applications() -> list[dict[str, Any]]:
    return [portal_view(row) for row in store.list_applications()] + historical_applications()


def id_number(value: str) -> int:
    match = re.search(r"(\d+)", value or "")
    return int(match.group(1)) if match else 0


SORT_KEYS = {
    "applicationId": lambda item: id_number(item["applicationId"]),
    "applicationDate": lambda item: (item["submittedAt"] or item["applicationDate"] or ""),
    "loanAmount": lambda item: item["loanAmount"],
    "dti": lambda item: item["dti"],
    "fraudProbability": lambda item: item["fraudProbability"] if item["fraudProbability"] is not None else -1,
    "cibilScore": lambda item: item["cibilScore"] if item["cibilScore"] is not None else -1,
    "status": lambda item: item["status"],
    "loanType": lambda item: item["loanType"],
    "applicant": lambda item: (item["applicantName"] or item["customerId"]).lower(),
}


@app.get("/applications")
def list_all_applications(
    status: str = Query(default="all"),
    search: str = Query(default=""),
    loan_type: str = Query(default="all"),
    employment: str = Query(default="all"),
    gender: str = Query(default="all"),
    risk: str = Query(default="all"),
    fraud: str = Query(default="all"),
    source: str = Query(default="all"),
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    sort: str = Query(default="applicationDate"),
    order: Literal["asc", "desc"] = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    _: dict = Depends(require_officer),
) -> dict[str, Any]:
    items = all_applications()
    statuses = {value.strip().upper() for value in status.split(",") if value.strip() and value.strip().lower() != "all"}
    if statuses:
        items = [item for item in items if item["status"] in statuses]
    if search.strip():
        query = search.strip().lower()
        items = [item for item in items if query in item["applicationId"].lower() or query in item["customerId"].lower() or query in (item["applicantName"] or "").lower()]
    if loan_type != "all":
        items = [item for item in items if item["loanType"] == loan_type]
    if employment != "all":
        items = [item for item in items if item["employment"] == employment]
    if gender != "all":
        items = [item for item in items if item["gender"] == gender]
    if risk != "all":
        items = [item for item in items if item["riskLevel"] == risk.upper()]
    if fraud == "flagged":
        items = [item for item in items if item["fraudFlagged"]]
    elif fraud == "not_flagged":
        items = [item for item in items if not item["fraudFlagged"]]
    if source in {"dataset", "portal"}:
        items = [item for item in items if item["source"] == source]
    if date_from:
        items = [item for item in items if (item["applicationDate"] or "") >= date_from]
    if date_to:
        items = [item for item in items if (item["applicationDate"] or "") and item["applicationDate"] <= date_to]
    key = SORT_KEYS.get(sort, SORT_KEYS["applicationDate"])
    items = sorted(items, key=key, reverse=order == "desc")
    start = (page - 1) * page_size
    return {"total": len(items), "page": page, "pageSize": page_size, "items": items[start:start + page_size]}


@app.get("/applications/stats")
def application_stats(_: dict = Depends(require_officer)) -> dict[str, Any]:
    items = all_applications()
    total = len(items)
    counts = {status: sum(1 for item in items if item["status"] == status) for status in STATUS_LABELS}
    flagged = sum(1 for item in items if item["fraudFlagged"])
    return {
        "total": total,
        "new": counts["NEW"],
        "underReview": counts["UNDER_REVIEW"],
        "approved": counts["APPROVED"],
        "rejected": counts["REJECTED"],
        "fraudFlagged": flagged,
        "fraudRate": round(flagged / total * 100, 2) if total else 0.0,
        "averageLoanAmount": round(sum(item["loanAmount"] for item in items) / total, 2) if total else 0.0,
        "portalApplications": sum(1 for item in items if item["source"] == "portal"),
        "historicalApplications": sum(1 for item in items if item["source"] == "dataset"),
    }


EVENT_LABELS = {
    "SUBMITTED": "Application submitted",
    "FRAUD_ANALYSIS_COMPLETED": "Fraud analysis completed",
    "FRAUD_ANALYSIS_UNAVAILABLE": "Fraud analysis unavailable",
    "SENT_FOR_REVIEW": "Sent for further review",
    "APPROVED": "Approved",
    "REJECTED": "Rejected",
}


def event_view(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"], "type": row["event_type"], "label": EVENT_LABELS.get(row["event_type"], row["event_type"]),
        "fromStatus": row["from_status"], "toStatus": row["to_status"], "reason": row["reason"], "note": row["note"],
        "actorName": row["actor_name"], "actorEmail": row["actor_email"], "actorRole": row["actor_role"], "at": row["created_at"],
    }


def find_application(application_id: str) -> dict[str, Any]:
    row = store.get_application(application_id)
    if row:
        return portal_view(row)
    for item in historical_applications():
        if item["applicationId"] == application_id:
            return item
    raise HTTPException(status_code=404, detail=f"Application {application_id} was not found.")


@app.get("/applications/{application_id}")
def application_detail(application_id: str, _: dict = Depends(require_officer)) -> dict[str, Any]:
    item = find_application(application_id)
    if item["source"] == "portal":
        events = [event_view(row) for row in store.list_events(application_id)]
    else:
        events = [{"id": 0, "type": "SUBMITTED", "label": "Application submitted", "at": item["applicationDate"], "dateOnly": True, "actorName": None, "reason": None, "note": None},
                  {"id": 1, "type": "HISTORICAL_OUTCOME", "label": f"Recorded outcome: {item['historicalOutcome']}", "at": None, "actorName": None, "reason": None,
                   "note": "Imported from the historical dataset. The decision time and decision maker were not recorded."}]
    history = [event for event in events if event["type"] in {"SENT_FOR_REVIEW", "APPROVED", "REJECTED"}]
    explanation = {
        "globalFactors": global_factors(item["modelName"]) if item["modelName"] else [],
        "applicationSpecific": None,
        "message": "Risk explanation is currently unavailable.",
    }
    return {"application": item, "timeline": events, "decisionHistory": history, "explanation": explanation,
            "allowedActions": allowed_actions(item)}


def allowed_actions(item: dict[str, Any]) -> list[str]:
    if item["source"] != "portal":
        return []
    return {"NEW": ["approve", "reject", "review"], "UNDER_REVIEW": ["approve", "reject"]}.get(item["status"], [])


class DecisionRequest(BaseModel):
    action: Literal["approve", "reject", "review"]
    reason: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=1000)
    expectedStatus: str | None = None


@app.post("/applications/{application_id}/decision")
def decide(application_id: str, payload: DecisionRequest, officer: dict = Depends(require_officer)) -> dict[str, Any]:
    item = find_application(application_id)
    if item["source"] != "portal":
        raise HTTPException(status_code=409, detail="Historical dataset records are read-only. Decisions can only be made on applications submitted through the portal.")
    reason = (payload.reason or "").strip() or None
    note = (payload.note or "").strip() or None
    if payload.action == "reject":
        if not reason:
            raise HTTPException(status_code=422, detail="A rejection reason is required.")
        if reason not in REJECTION_REASONS:
            raise HTTPException(status_code=422, detail=f"Unknown rejection reason. Choose one of: {', '.join(REJECTION_REASONS)}.")
        if reason == "Other" and not note:
            raise HTTPException(status_code=422, detail="Please describe the reason when selecting 'Other'.")
    if payload.action == "review" and not reason:
        raise HTTPException(status_code=422, detail="A review reason is required.")
    try:
        store.apply_decision(application_id, payload.action, reason, note, payload.expectedStatus, officer)
    except store.TransitionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return application_detail(application_id, officer)


@app.post("/applications/{application_id}/analysis")
def rerun_analysis(application_id: str, officer: dict = Depends(require_officer)) -> dict[str, Any]:
    row = store.get_application(application_id)
    if not row:
        raise HTTPException(status_code=404, detail="Only portal applications can be re-analysed.")
    analyse_and_store(row)
    return application_detail(application_id, officer)


# ================================================================ customer portal

class ApplicationRequest(BaseModel):
    applicantAge: int = Field(ge=21, le=65)
    gender: str
    dependents: int = Field(ge=0, le=10)
    address: str = Field(min_length=10, max_length=300)
    employment: str
    monthlyIncome: float = Field(gt=0, le=10_000_000)
    existingEmis: float = Field(ge=0, le=10_000_000)
    propertyOwnership: str
    cibilScore: int | None = Field(default=None, ge=300, le=900)
    loanType: str
    purpose: str
    loanAmount: float = Field(ge=10_000, le=50_000_000)
    tenureMonths: int
    interestRate: float = Field(ge=1, le=30)
    idempotencyKey: str | None = Field(default=None, max_length=80)

    @field_validator("gender")
    @classmethod
    def check_gender(cls, value: str) -> str:
        if value not in GENDERS:
            raise ValueError(f"Choose one of: {', '.join(GENDERS)}")
        return value

    @field_validator("employment")
    @classmethod
    def check_employment(cls, value: str) -> str:
        if value not in EMPLOYMENT:
            raise ValueError(f"Choose one of: {', '.join(EMPLOYMENT)}")
        return value

    @field_validator("propertyOwnership")
    @classmethod
    def check_property(cls, value: str) -> str:
        if value not in PROPERTY:
            raise ValueError(f"Choose one of: {', '.join(PROPERTY)}")
        return value

    @field_validator("loanType")
    @classmethod
    def check_loan_type(cls, value: str) -> str:
        if value not in LOAN_TYPES:
            raise ValueError(f"Choose one of: {', '.join(LOAN_TYPES)}")
        return value

    @field_validator("purpose")
    @classmethod
    def check_purpose(cls, value: str) -> str:
        if value not in PURPOSES:
            raise ValueError(f"Choose one of: {', '.join(PURPOSES)}")
        return value

    @field_validator("tenureMonths")
    @classmethod
    def check_tenure(cls, value: int) -> int:
        if value not in TENURES:
            raise ValueError(f"Choose one of: {', '.join(map(str, TENURES))} months")
        return value


def analyse_and_store(row: Any) -> None:
    values = {
        "ApplicantAge": row["applicant_age"], "Gender": row["gender"], "EmploymentStatus": row["employment_status"],
        "NumberDependents": row["number_dependents"], "LoanType": row["loan_type"], "PurposeOfLoan": row["purpose_of_loan"],
        "LoanAmountRequested": row["loan_amount"], "LoanTenureMonths": row["loan_tenure_months"], "InterestRateOffered": row["interest_rate"],
        "MonthlyIncome": row["monthly_income"], "ExistingEMIs": row["existing_emis"], "DebtToIncomeRatio": row["debt_to_income_ratio"],
        "PropertyOwnershipStatus": row["property_ownership"],
    }
    try:
        store.save_analysis(row["application_id"], run_prediction(values), None)
    except HTTPException as exc:
        store.save_analysis(row["application_id"], None, str(exc.detail))
    except Exception as exc:  # model failure must not lose the customer's application
        store.save_analysis(row["application_id"], None, f"Model error: {exc}")


CUSTOMER_EVENT_LABELS = {
    "SUBMITTED": "Application submitted",
    "FRAUD_ANALYSIS_COMPLETED": "Initial checks completed",
    "SENT_FOR_REVIEW": "Under review",
    "APPROVED": "Approved",
    "REJECTED": "Rejected",
}


def customer_view(row: Any, include_timeline: bool = False) -> dict[str, Any]:
    view = {
        "applicationId": row["application_id"],
        "applicationDate": row["submitted_at"],
        "loanType": row["loan_type"],
        "purpose": row["purpose_of_loan"],
        "loanAmount": row["loan_amount"],
        "tenureMonths": row["loan_tenure_months"],
        "status": row["status"],
        "updatedAt": row["updated_at"],
        "rejectionReason": row["decision_reason"] if row["status"] == "REJECTED" else None,
        "bankMessage": row["decision_note"] if row["status"] in {"REJECTED", "APPROVED"} else None,
        "decidedAt": row["decided_at"],
    }
    if include_timeline:
        timeline = []
        for event in store.list_events(row["application_id"], customer_only=True):
            entry = {"type": event["event_type"], "label": CUSTOMER_EVENT_LABELS.get(event["event_type"], event["event_type"]), "at": event["created_at"], "detail": None}
            if event["event_type"] == "REJECTED":
                entry["detail"] = event["reason"]
            if event["event_type"] == "SENT_FOR_REVIEW":
                entry["detail"] = "Your application is being reviewed in more detail by our team."
            timeline.append(entry)
        view["timeline"] = timeline
        view["details"] = {
            "applicantName": row["applicant_name"], "age": row["applicant_age"], "gender": row["gender"], "dependents": row["number_dependents"],
            "address": row["residential_address"], "employment": row["employment_status"], "monthlyIncome": row["monthly_income"],
            "existingEmis": row["existing_emis"], "propertyOwnership": row["property_ownership"], "cibilScore": row["cibil_score"],
            "interestRate": row["interest_rate"],
        }
    return view


@app.get("/me/applications")
def my_applications(customer: dict = Depends(require_customer)) -> dict[str, Any]:
    return {"items": [customer_view(row) for row in store.list_applications(customer["id"])]}


@app.get("/me/applications/{application_id}")
def my_application(application_id: str, customer: dict = Depends(require_customer)) -> dict[str, Any]:
    row = store.get_application(application_id)
    if not row or row["user_id"] != customer["id"]:
        raise HTTPException(status_code=404, detail=f"Application {application_id} was not found in your account.")
    return customer_view(row, include_timeline=True)


@app.post("/me/applications", status_code=201)
def submit_application(payload: ApplicationRequest, customer: dict = Depends(require_customer)) -> dict[str, Any]:
    dti = round(payload.existingEmis / payload.monthlyIncome * 100, 2)
    values = {
        "customer_id": customer["customerId"], "user_id": customer["id"], "applicant_name": customer["name"], "applicant_email": customer["email"],
        "applicant_age": payload.applicantAge, "gender": payload.gender, "number_dependents": payload.dependents,
        "residential_address": " ".join(payload.address.split()), "employment_status": payload.employment,
        "monthly_income": payload.monthlyIncome, "existing_emis": payload.existingEmis, "debt_to_income_ratio": dti,
        "property_ownership": payload.propertyOwnership, "cibil_score": payload.cibilScore, "loan_type": payload.loanType,
        "purpose_of_loan": payload.purpose, "loan_amount": payload.loanAmount, "loan_tenure_months": payload.tenureMonths,
        "interest_rate": payload.interestRate, "idempotency_key": payload.idempotencyKey,
    }
    application_id, created = store.insert_application(values, dataset_max("ApplicationID"), customer)
    if created:
        analyse_and_store(store.get_application(application_id))
    row = store.get_application(application_id)
    return {**customer_view(row, include_timeline=True), "created": created}


# ================================================================ ADMIN / technical panel

from backend import technical  # noqa: E402  (registered last so it can reuse the helpers above)

app.include_router(technical.build_router(
    require_admin=require_admin, load_dataset=load_dataset, dataset_source=dataset_source,
    require_results=require_results, available_models=available_models, get_model=get_model,
    default_model=default_model, feature_columns=FEATURE_COLUMNS, categorical_columns=CATEGORICAL_COLUMNS,
    numeric_columns=NUMERIC_COLUMNS, source_url=SOURCE_URL, risk_bands=RISK_BANDS, app=app,
))
