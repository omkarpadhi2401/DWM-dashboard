"""ADMIN / technical panel API.

Read-only endpoints for the technical administrator (role ``admin``): dataset profile,
data-quality checks, OLAP aggregations, model evaluation detail and system information.

Everything is calculated from the loaded dataset, the saved model artifacts and
models/evaluation_results.json. Nothing here trains a model, changes a record or
invents a value: when something cannot be computed it is returned as ``None`` and the
UI shows "Not available".
"""
from __future__ import annotations

import platform
import time
from datetime import datetime
from importlib import metadata
from typing import Any, Callable
from urllib.parse import urlparse

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from backend import store

STARTED_AT = time.time()

MONTH_ORDER = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
QUARTER_ORDER = ["Q1", "Q2", "Q3", "Q4"]
AGE_BINS = [0, 25, 35, 45, 55, 200]
AGE_LABELS = ["18-25", "26-35", "36-45", "46-55", "56+"]

# OLAP dimensions exposed to the UI: API key -> (dataset column, label, hierarchy)
DIMENSIONS: dict[str, dict[str, str]] = {
    "year": {"column": "Year", "label": "Year", "group": "Time"},
    "quarter": {"column": "Quarter", "label": "Quarter", "group": "Time"},
    "month": {"column": "Month", "label": "Month", "group": "Time"},
    "loan_type": {"column": "LoanType", "label": "Loan Type", "group": "Loan"},
    "employment": {"column": "EmploymentStatus", "label": "Employment", "group": "Employment"},
    "gender": {"column": "Gender", "label": "Gender", "group": "Customer"},
    "age_group": {"column": "AgeGroup", "label": "Age Group", "group": "Customer"},
}
MEASURES = {
    "loanCount": "Loan Count",
    "fraudCount": "Fraud Count",
    "fraudRate": "Fraud Percentage",
    "totalLoanAmount": "Total Loan Amount",
    "avgLoanAmount": "Average Loan Amount",
}

# Valid ranges used by the data-quality checks (documented in the response).
RANGE_RULES: dict[str, tuple[float | None, float | None, str]] = {
    "ApplicantAge": (18, 100, "18 to 100 years"),
    "NumberDependents": (0, 20, "0 to 20"),
    "LoanAmountRequested": (1, None, "greater than 0"),
    "LoanTenureMonths": (1, 480, "1 to 480 months"),
    "InterestRateOffered": (0.01, 40, "above 0% up to 40%"),
    "MonthlyIncome": (1, None, "greater than 0"),
    "ExistingEMIs": (0, None, "0 or more"),
    "DebtToIncomeRatio": (0, 100, "0% to 100%"),
    "CIBILScore": (300, 900, "300 to 900"),
}

MODEL_TYPES = {
    "logistic_regression": {"label": "Logistic Regression", "family": "Linear model", "importanceKind": "abs_coefficient"},
    "decision_tree": {"label": "Decision Tree", "family": "Tree-based model", "importanceKind": "tree_importance"},
    "naive_bayes": {"label": "Gaussian Naive Bayes", "family": "Probabilistic model", "importanceKind": "not_available"},
    "random_forest": {"label": "Random Forest", "family": "Tree ensemble (bagging)", "importanceKind": "tree_importance"},
    "xgboost": {"label": "XGBoost", "family": "Tree ensemble (gradient boosting)", "importanceKind": "tree_importance"},
}
METRIC_KEYS = ["accuracy", "precision", "recall", "f1", "rocAuc", "prAuc"]
PARAM_KEYS = ["max_iter", "class_weight", "max_depth", "n_estimators", "learning_rate", "subsample", "colsample_bytree", "scale_pos_weight", "var_smoothing", "random_state", "C", "criterion"]


def _status(value: float, warn_at: float, bad_at: float) -> str:
    """Healthy below warn_at, Warning from warn_at, Needs Attention from bad_at."""
    if value >= bad_at:
        return "needs_attention"
    if value >= warn_at:
        return "warning"
    return "healthy"


def _clean(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return None if (np.isnan(value) or np.isinf(value)) else round(float(value), 4)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    return value


def _numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _missing_mask(series: pd.Series) -> pd.Series:
    mask = series.isna()
    if series.dtype == object or str(series.dtype) in {"str", "string"}:
        mask = mask | (series.astype(str).str.strip() == "")
    return mask


def _is_numeric_column(series: pd.Series) -> bool:
    if pd.api.types.is_numeric_dtype(series):
        return True
    present = series[~_missing_mask(series)]
    if present.empty:
        return False
    return bool(_numeric(present).notna().all())


def _parse_dates(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series.astype(str), format="%d-%m-%Y", errors="coerce")


def build_router(*, require_admin: Callable, load_dataset: Callable[[], pd.DataFrame], dataset_source: Callable[[], dict],
                 require_results: Callable[[], dict], available_models: Callable[[], list[str]], get_model: Callable[[str], Any],
                 default_model: Callable[[], str], feature_columns: list[str], categorical_columns: list[str],
                 numeric_columns: list[str], source_url: str, risk_bands: dict, app: Any) -> APIRouter:
    router = APIRouter(prefix="/technical", tags=["technical"], dependencies=[Depends(require_admin)])

    # ------------------------------------------------------------ helpers
    def frame_with_dimensions() -> pd.DataFrame:
        frame = load_dataset().copy()
        frame["FraudFlag"] = _numeric(frame["FraudFlag"]).fillna(0).astype(int)
        frame["LoanAmountRequested"] = _numeric(frame["LoanAmountRequested"])
        frame["Year"] = _numeric(frame["Year"]).astype("Int64")
        frame["AgeGroup"] = pd.cut(_numeric(frame["ApplicantAge"]), AGE_BINS, labels=AGE_LABELS).astype(object)
        return frame

    def masked_source() -> str:
        parsed = urlparse(source_url)
        return f"{parsed.scheme}://{parsed.netloc}/…" if parsed.netloc else "configured data source"

    def source_info() -> dict[str, Any]:
        load_dataset()
        info = dataset_source()
        return {
            "configured": "SheetDB (REST API over a Google Sheet)",
            "configuredUrl": masked_source(),
            "inUse": {"sheetdb": "SheetDB (live)", "local_csv": "Local cached copy: data/cleaned_dataset.csv"}.get(info.get("kind"), "Unknown"),
            "kind": info.get("kind"),
            "loadedAt": info.get("loadedAt"),
            "warning": info.get("warning"),
        }

    def aggregate(frame: pd.DataFrame, column: str) -> list[dict[str, Any]]:
        if frame.empty:
            return []
        grouped = frame.groupby(column, dropna=False, observed=True).agg(
            loanCount=("FraudFlag", "size"), fraudCount=("FraudFlag", "sum"),
            totalLoanAmount=("LoanAmountRequested", "sum"), avgLoanAmount=("LoanAmountRequested", "mean"),
        ).reset_index()
        rows = [{
            "key": str(row[column]) if not pd.isna(row[column]) else "(missing)",
            "loanCount": int(row["loanCount"]),
            "fraudCount": int(row["fraudCount"]),
            "fraudRate": round(float(row["fraudCount"] / row["loanCount"] * 100), 2) if row["loanCount"] else 0.0,
            "totalLoanAmount": round(float(row["totalLoanAmount"]), 2),
            "avgLoanAmount": round(float(row["avgLoanAmount"]), 2) if not pd.isna(row["avgLoanAmount"]) else None,
        } for _, row in grouped.iterrows()]
        order: list[str] | None = {"Month": MONTH_ORDER, "Quarter": QUARTER_ORDER, "AgeGroup": AGE_LABELS}.get(column)
        if order:
            rows.sort(key=lambda item: order.index(item["key"]) if item["key"] in order else len(order))
        elif column == "Year":
            rows.sort(key=lambda item: item["key"])
        else:
            rows.sort(key=lambda item: item["loanCount"], reverse=True)
        return rows

    def totals(frame: pd.DataFrame) -> dict[str, Any]:
        count = int(len(frame))
        fraud = int(frame["FraudFlag"].sum()) if count else 0
        return {
            "loanCount": count, "fraudCount": fraud, "fraudRate": round(fraud / count * 100, 2) if count else 0.0,
            "totalLoanAmount": round(float(frame["LoanAmountRequested"].sum()), 2) if count else 0.0,
            "avgLoanAmount": round(float(frame["LoanAmountRequested"].mean()), 2) if count else None,
        }

    def apply_filters(frame: pd.DataFrame, filters: dict[str, str | None]) -> tuple[pd.DataFrame, dict[str, str]]:
        applied: dict[str, str] = {}
        for key, value in filters.items():
            if value is None or value == "" or value == "all":
                continue
            column = DIMENSIONS[key]["column"]
            frame = frame[frame[column].astype(str) == str(value)]
            applied[key] = str(value)
        return frame, applied

    def histogram(frame: pd.DataFrame, column: str, bins: int = 10) -> dict[str, Any] | None:
        if column not in frame.columns:
            return None
        values = _numeric(frame[column])
        valid = values.notna()
        if not valid.any():
            return None
        low, high = float(values[valid].min()), float(values[valid].max())
        if low == high:
            high = low + 1
        edges = np.linspace(low, high, bins + 1)
        index = np.clip(np.digitize(values[valid], edges[1:-1]), 0, bins - 1)
        fraud = frame.loc[valid, "FraudFlag"].to_numpy()
        result = []
        for position in range(bins):
            in_bin = index == position
            count = int(in_bin.sum())
            fraud_count = int(fraud[in_bin].sum())
            result.append({
                "from": round(float(edges[position]), 2), "to": round(float(edges[position + 1]), 2),
                "count": count, "fraudCount": fraud_count,
                "fraudRate": round(fraud_count / count * 100, 2) if count else 0.0,
            })
        return {"column": column, "min": round(low, 2), "max": round(float(values[valid].max()), 2), "bins": result, "missing": int((~valid).sum())}

    def model_artifact(name: str) -> Any | None:
        if name not in available_models():
            return None
        try:
            return get_model(name)
        except Exception:
            return None

    def best_by_metric(models: dict[str, Any]) -> dict[str, Any]:
        best: dict[str, Any] = {}
        for metric in METRIC_KEYS:
            values = {name: data.get(metric) for name, data in models.items() if isinstance(data.get(metric), (int, float))}
            if not values:
                best[metric] = None
                continue
            top = max(values.values())
            best[metric] = {"value": top, "models": sorted(name for name, value in values.items() if value == top)}
        return best

    def model_limitations(name: str, data: dict[str, Any], has_artifact: bool) -> list[str]:
        matrix = data.get("confusionMatrix") or {}
        tp, fp, fn, tn = (matrix.get(key, 0) for key in ("tp", "fp", "fn", "tn"))
        notes: list[str] = []
        positives = tp + fn
        if positives and tp == 0:
            notes.append(f"Detected 0 of the {positives} fraud cases in the test set at the 0.5 threshold (recall 0%), so its accuracy comes entirely from predicting the majority class.")
        elif positives:
            notes.append(f"Detected {tp} of the {positives} fraud cases in the test set; {fn} were missed (false negatives).")
        if fp:
            notes.append(f"Raised {fp} false alarms on genuine applications ({fp} false positives against {tp} true positives).")
        roc = data.get("rocAuc")
        if isinstance(roc, (int, float)) and roc < 0.6:
            notes.append(f"ROC-AUC of {roc:.3f} is close to 0.5, i.e. its ranking of applications is close to random on this test set.")
        if positives and positives < 30:
            notes.append(f"The test set contains only {positives} fraud cases, so every metric has high variance; a single case changes recall by {100 / positives:.1f} percentage points.")
        if not has_artifact:
            notes.append("No saved model file (.joblib) is present for this model, so it cannot be used for live prediction; only its recorded evaluation results are shown.")
        if MODEL_TYPES.get(name, {}).get("importanceKind") == "not_available":
            notes.append("Gaussian Naive Bayes does not provide feature importance, and it assumes features are conditionally independent.")
        if MODEL_TYPES.get(name, {}).get("importanceKind") == "abs_coefficient":
            notes.append("Feature influence is the absolute size of the coefficient on standardised / one-hot encoded inputs; it shows global association, not causation.")
        return notes

    def model_view(name: str, data: dict[str, Any], results: dict[str, Any], detail: bool) -> dict[str, Any]:
        info = MODEL_TYPES.get(name, {"label": name.replace("_", " ").title(), "family": None, "importanceKind": "not_available"})
        matrix = data.get("confusionMatrix") or {}
        tp, fp, fn, tn = (matrix.get(key) for key in ("tp", "fp", "fn", "tn"))
        test_size = sum(value for value in (tp, fp, fn, tn) if isinstance(value, int)) or None
        dataset_rows = results.get("dataset", {}).get("rows")
        artifact = model_artifact(name)
        view: dict[str, Any] = {
            "name": name, "label": info["label"], "family": info["family"],
            "selected": results.get("selectedModel") == name,
            "artifactAvailable": artifact is not None,
            "metrics": {metric: data.get(metric) for metric in METRIC_KEYS},
            "confusionMatrix": matrix or None,
            "derived": {
                "specificity": round(tn / (tn + fp), 6) if test_size and (tn + fp) else None,
                "falsePositiveRate": round(fp / (tn + fp), 6) if test_size and (tn + fp) else None,
                "predictedFraud": (tp + fp) if test_size else None,
                "actualFraud": (tp + fn) if test_size else None,
            },
            "training": {
                "trainingSeconds": data.get("trainingSeconds"),
                "testRows": test_size,
                "trainRows": (dataset_rows - test_size) if dataset_rows and test_size else None,
                "split": "Stratified 80 / 20 train-test split (random_state = 42)",
                "resampling": "SMOTE applied to the training fold only, inside the pipeline",
                "threshold": 0.5,
            },
            "importanceKind": info["importanceKind"],
        }
        if not detail:
            return view
        estimator = None
        encoded_features = None
        if artifact is not None:
            try:
                estimator = artifact.named_steps["model"]
                encoded_features = [str(item).replace("numeric__", "").replace("categorical__", "") for item in artifact.named_steps["preprocess"].get_feature_names_out()]
            except Exception:
                estimator = None
        params = None
        if estimator is not None:
            raw = estimator.get_params()
            def plain(value: Any) -> Any:
                if isinstance(value, (bool, np.bool_)):
                    return bool(value)
                if isinstance(value, (int, np.integer)):
                    return int(value)
                if isinstance(value, (float, np.floating)):
                    return float(f"{float(value):.6g}")  # keep small values such as 1e-09 readable
                return str(value)

            params = {key: plain(raw[key]) for key in PARAM_KEYS if key in raw and raw[key] is not None}
        coefficients = None
        if estimator is not None and info["importanceKind"] == "abs_coefficient" and hasattr(estimator, "coef_") and encoded_features:
            pairs = sorted(zip(encoded_features, estimator.coef_[0]), key=lambda pair: abs(float(pair[1])), reverse=True)
            coefficients = [{"feature": feature, "coefficient": round(float(value), 6)} for feature, value in pairs[:15]]
        importance = data.get("featureImportance") if info["importanceKind"] != "not_available" else None
        view.update({
            "estimatorClass": type(estimator).__name__ if estimator is not None else None,
            "parameters": params,
            "inputFeatures": len(feature_columns),
            "encodedFeatures": len(encoded_features) if encoded_features else None,
            "featureImportance": importance,
            "coefficients": coefficients,
            "rocCurve": data.get("rocCurve"),
            "precisionRecallCurve": data.get("precisionRecallCurve"),
            "limitations": model_limitations(name, data, artifact is not None),
            "usedForLiveScoring": bool(artifact is not None and _safe(default_model) == name),
        })
        return view

    def _safe(fn: Callable[[], Any]) -> Any:
        try:
            return fn()
        except Exception:
            return None

    # ------------------------------------------------------------ dataset profile
    @router.get("/dataset-profile")
    def dataset_profile() -> dict[str, Any]:
        frame = load_dataset()
        rows, columns = int(len(frame)), int(len(frame.columns))
        column_info = []
        numeric_names, categorical_names = [], []
        total_missing = 0
        for name in frame.columns:
            series = frame[name]
            missing = int(_missing_mask(series).sum())
            total_missing += missing
            is_numeric = _is_numeric_column(series)
            is_date = name == "ApplicationDate"
            (numeric_names if is_numeric else categorical_names).append(name)
            present = series[~_missing_mask(series)]
            column_info.append({
                "name": name,
                "type": "date" if is_date else ("integer" if is_numeric and bool((_numeric(present) % 1 == 0).all()) else "decimal" if is_numeric else "text"),
                "storageType": str(series.dtype),
                "missing": missing,
                "unique": int(series.nunique(dropna=True)),
                "example": None if present.empty else str(present.iloc[0])[:60],
                "role": "target" if name == "FraudFlag" else "model feature" if name in feature_columns else "identifier" if name in {"ApplicationID", "CustomerID"} else "time dimension" if name in {"ApplicationDate", "DateKey", "Day", "Month", "Quarter", "Year"} else "descriptive",
            })
        stats = []
        for name in numeric_names:
            if name in {"FraudFlag", "DateKey"}:
                continue
            values = _numeric(frame[name]).dropna()
            if values.empty:
                continue
            stats.append({
                "column": name, "count": int(values.count()), "mean": _clean(values.mean()), "std": _clean(values.std()),
                "min": _clean(values.min()), "q1": _clean(values.quantile(0.25)), "median": _clean(values.median()),
                "q3": _clean(values.quantile(0.75)), "max": _clean(values.max()),
            })
        categories = []
        for name in categorical_names:
            if name in {"ApplicationID", "CustomerID", "ApplicationDate", "ResidentialAddress"}:
                continue
            counts = frame[name].astype(str).value_counts()
            categories.append({"column": name, "unique": int(len(counts)), "values": [{"value": str(key), "count": int(value), "share": round(float(value / rows * 100), 2)} for key, value in counts.head(12).items()]})
        dates = _parse_dates(frame["ApplicationDate"]) if "ApplicationDate" in frame.columns else pd.Series(dtype="datetime64[ns]")
        fraud = int(_numeric(frame["FraudFlag"]).fillna(0).sum())
        cells = rows * columns
        return {
            "rows": rows, "columns": columns, "cells": cells,
            "source": source_info(),
            "missingCells": total_missing,
            "completeness": round((1 - total_missing / cells) * 100, 4) if cells else None,
            "duplicateRows": int(frame.duplicated().sum()),
            "duplicateApplicationIds": int(frame["ApplicationID"].duplicated().sum()) if "ApplicationID" in frame.columns else None,
            "uniqueCustomers": int(frame["CustomerID"].nunique()) if "CustomerID" in frame.columns else None,
            "numericalColumns": numeric_names, "categoricalColumns": categorical_names,
            "columnInfo": column_info,
            "fraud": {"fraud": fraud, "genuine": rows - fraud, "fraudRate": round(fraud / rows * 100, 2) if rows else 0.0},
            "dateRange": {"from": None if dates.dropna().empty else dates.min().date().isoformat(), "to": None if dates.dropna().empty else dates.max().date().isoformat(), "unparsed": int(dates.isna().sum())},
            "numericSummary": stats,
            "categoricalSummary": categories,
            "modelFeatures": {"all": feature_columns, "numeric": numeric_columns, "categorical": categorical_columns},
            "hasCibil": "CIBILScore" in frame.columns,
        }

    @router.get("/distributions")
    def distributions() -> dict[str, Any]:
        frame = frame_with_dimensions()
        return {
            "loanAmount": histogram(frame, "LoanAmountRequested"),
            "debtToIncome": histogram(frame, "DebtToIncomeRatio"),
            "monthlyIncome": histogram(frame, "MonthlyIncome"),
            "age": histogram(frame, "ApplicantAge", bins=9),
            "cibil": histogram(frame, "CIBILScore"),
            "cibilNote": None if "CIBILScore" in frame.columns else "CIBILScore is not a column of the historical dataset, so its distribution cannot be computed.",
        }

    # ------------------------------------------------------------ data quality
    @router.get("/data-quality")
    def data_quality() -> dict[str, Any]:
        frame = load_dataset()
        rows = int(len(frame))
        checks: list[dict[str, Any]] = []

        def add(key: str, title: str, status: str, value: str, rule: str, details: list[dict[str, Any]] | None = None, note: str | None = None) -> None:
            checks.append({"key": key, "title": title, "status": status, "value": value, "rule": rule, "details": details or [], "note": note})

        # 1. missing values
        missing = {name: int(_missing_mask(frame[name]).sum()) for name in frame.columns}
        total_missing = sum(missing.values())
        cells = rows * len(frame.columns)
        share = total_missing / cells * 100 if cells else 0
        add("missing", "Missing values", _status(share, 0.0001, 1), f"{total_missing:,} of {cells:,} cells ({share:.2f}%)",
            "Healthy: none · Warning: under 1% of cells · Needs Attention: 1% or more",
            [{"label": name, "count": count} for name, count in missing.items() if count])

        # 2. duplicates
        duplicate_rows = int(frame.duplicated().sum())
        duplicate_ids = int(frame["ApplicationID"].duplicated().sum()) if "ApplicationID" in frame.columns else 0
        add("duplicates", "Duplicate records", "needs_attention" if duplicate_ids else "warning" if duplicate_rows else "healthy",
            f"{duplicate_rows:,} duplicate rows · {duplicate_ids:,} repeated Application IDs",
            "Healthy: none · Warning: identical rows · Needs Attention: repeated Application IDs")

        # 3. invalid categorical values
        expected = {
            "Gender": {"Male", "Female", "Other"},
            "EmploymentStatus": {"Salaried", "Self-Employed", "Business Owner", "Student", "Retired", "Unemployed"},
            "LoanType": {"Personal Loan", "Home Loan", "Car Loan", "Business Loan", "Education Loan"},
            "PropertyOwnershipStatus": {"Rented", "Owned", "Jointly Owned"},
            "Quarter": set(QUARTER_ORDER), "Month": set(MONTH_ORDER),
        }
        invalid_details = []
        for name, allowed in expected.items():
            if name not in frame.columns:
                continue
            bad = frame[~frame[name].astype(str).isin(allowed) & ~_missing_mask(frame[name])]
            if len(bad):
                invalid_details.append({"label": name, "count": int(len(bad)), "examples": sorted(set(bad[name].astype(str)))[:5]})
        flags = _numeric(frame["FraudFlag"])
        bad_flags = int((~flags.isin([0, 1])).sum())
        if bad_flags:
            invalid_details.append({"label": "FraudFlag (not 0 or 1)", "count": bad_flags})
        invalid_total = sum(item["count"] for item in invalid_details)
        add("invalid", "Invalid values", "needs_attention" if invalid_total else "healthy", f"{invalid_total:,} values outside the allowed categories",
            "Healthy: every categorical value belongs to its allowed set and FraudFlag is 0 or 1 · Needs Attention: otherwise", invalid_details)

        # 4. out-of-range numeric values
        range_details = []
        for name, (low, high, text) in RANGE_RULES.items():
            if name not in frame.columns:
                continue
            values = _numeric(frame[name])
            mask = pd.Series(False, index=frame.index)
            if low is not None:
                mask |= values < low
            if high is not None:
                mask |= values > high
            count = int(mask.sum())
            if count:
                range_details.append({"label": f"{name} (valid: {text})", "count": count, "examples": [str(_clean(v)) for v in values[mask].head(3)]})
        range_total = sum(item["count"] for item in range_details)
        range_share = range_total / rows * 100 if rows else 0
        add("range", "Out-of-range values", _status(range_share, 0.0001, 1), f"{range_total:,} value{'' if range_total == 1 else 's'} outside the valid range ({range_share:.2f}% of rows)",
            "Healthy: none · Warning: under 1% of rows · Needs Attention: 1% or more", range_details)

        # 5. data types
        type_details = []
        for name in [column for column in RANGE_RULES if column in frame.columns] + ["Year", "Day", "DateKey"]:
            if name not in frame.columns:
                continue
            present = frame[name][~_missing_mask(frame[name])]
            bad = int(_numeric(present).isna().sum())
            if bad:
                type_details.append({"label": f"{name}: non-numeric values", "count": bad})
        if "ApplicationDate" in frame.columns:
            unparsed = int(_parse_dates(frame["ApplicationDate"]).isna().sum())
            if unparsed:
                type_details.append({"label": "ApplicationDate: not in DD-MM-YYYY format", "count": unparsed})
        type_total = sum(item["count"] for item in type_details)
        add("types", "Data type issues", "needs_attention" if type_total else "healthy", f"{type_total:,} values with the wrong type or format",
            "Healthy: numeric columns hold numbers and ApplicationDate parses as DD-MM-YYYY · Needs Attention: otherwise", type_details)

        # 6. consistency between related columns
        consistency = []
        if {"ExistingEMIs", "MonthlyIncome", "DebtToIncomeRatio"} <= set(frame.columns):
            derived = _numeric(frame["ExistingEMIs"]) / _numeric(frame["MonthlyIncome"]) * 100
            mismatch = int(((derived - _numeric(frame["DebtToIncomeRatio"])).abs() > 0.5).sum())
            if mismatch:
                consistency.append({"label": "DebtToIncomeRatio differs from ExistingEMIs ÷ MonthlyIncome × 100 by more than 0.5", "count": mismatch})
        if {"FraudFlag", "FraudType"} <= set(frame.columns):
            no_fraud = frame["FraudType"].astype(str).str.strip().str.lower().isin({"no fraud", "none", ""})
            mismatch = int(((flags == 1) & no_fraud).sum() + ((flags == 0) & ~no_fraud).sum())
            if mismatch:
                consistency.append({"label": "FraudFlag and FraudType disagree", "count": mismatch})
        if {"ApplicationDate", "Year", "Quarter", "Month"} <= set(frame.columns):
            dates = _parse_dates(frame["ApplicationDate"])
            valid = dates.notna()
            mismatch = int((valid & ((dates.dt.year != _numeric(frame["Year"])) | (dates.dt.month_name() != frame["Month"].astype(str)) | (("Q" + dates.dt.quarter.astype("Int64").astype(str)) != frame["Quarter"].astype(str)))).sum())
            if mismatch:
                consistency.append({"label": "Year / Quarter / Month do not match ApplicationDate", "count": mismatch})
        consistency_total = sum(item["count"] for item in consistency)
        consistency_share = consistency_total / rows * 100 if rows else 0
        add("consistency", "Cross-column consistency", _status(consistency_share, 0.0001, 1), f"{consistency_total:,} inconsistent values ({consistency_share:.2f}% of rows)",
            "Healthy: none · Warning: under 1% of rows · Needs Attention: 1% or more", consistency)

        # 7. class imbalance
        fraud = int((flags == 1).sum())
        minority = min(fraud, rows - fraud) / rows * 100 if rows else 0
        ratio = (rows - fraud) / fraud if fraud else None
        add("imbalance", "Class imbalance", "healthy" if minority >= 20 else "warning" if minority >= 5 else "needs_attention",
            f"Minority class (fraud) is {minority:.2f}% of records" + (f" · about 1 fraud for every {ratio:.0f} genuine" if ratio else ""),
            "Healthy: minority class 20% or more · Warning: 5% to 20% · Needs Attention: under 5%",
            [{"label": "Fraud (FraudFlag = 1)", "count": fraud}, {"label": "Genuine (FraudFlag = 0)", "count": rows - fraud}],
            "The training pipeline compensates with SMOTE on the training fold and class weights; accuracy alone is misleading on this target.")

        # 8. outliers (informational)
        outliers = []
        for name in ["LoanAmountRequested", "MonthlyIncome", "ExistingEMIs", "DebtToIncomeRatio", "InterestRateOffered", "ApplicantAge"]:
            if name not in frame.columns:
                continue
            values = _numeric(frame[name]).dropna()
            q1, q3 = values.quantile(0.25), values.quantile(0.75)
            spread = q3 - q1
            count = int(((values < q1 - 1.5 * spread) | (values > q3 + 1.5 * spread)).sum())
            if count:
                outliers.append({"label": name, "count": count})
        outlier_rows = max((item["count"] for item in outliers), default=0)
        outlier_share = outlier_rows / rows * 100 if rows else 0
        add("outliers", "Statistical outliers (1.5 × IQR rule)", _status(outlier_share, 1, 5), f"Largest column share: {outlier_share:.2f}% of rows",
            "Healthy: under 1% in every column · Warning: 1% to 5% · Needs Attention: 5% or more", outliers,
            "Outliers are legitimate extreme values unless they also fail a range check; they are reported, not removed.")

        summary = {status: sum(1 for check in checks if check["status"] == status) for status in ("healthy", "warning", "needs_attention")}
        return {"rows": rows, "columns": int(len(frame.columns)), "checks": checks, "summary": summary, "source": source_info()}

    # ------------------------------------------------------------ OLAP
    @router.get("/olap/schema")
    def olap_schema() -> dict[str, Any]:
        frame = frame_with_dimensions()
        dims = []
        for key, info in DIMENSIONS.items():
            members = aggregate(frame, info["column"])
            dims.append({"key": key, "label": info["label"], "group": info["group"], "column": info["column"], "members": [item["key"] for item in members]})
        return {
            "dimensions": dims,
            "measures": [{"key": key, "label": label} for key, label in MEASURES.items()],
            "hierarchy": ["year", "quarter", "month", "loan_type"],
            "factTable": "FACT_LOAN_APPLICATION (one row per loan application)",
            "grain": int(len(frame)),
            "total": totals(frame),
        }

    @router.get("/olap")
    def olap(
        group_by: str = Query(default="year"),
        year: str | None = None, quarter: str | None = None, month: str | None = None, loan_type: str | None = None,
        employment: str | None = None, gender: str | None = None, age_group: str | None = None,
    ) -> dict[str, Any]:
        if group_by not in DIMENSIONS:
            raise HTTPException(status_code=422, detail=f"Unknown dimension '{group_by}'. Choose one of: {', '.join(DIMENSIONS)}.")
        frame, applied = apply_filters(frame_with_dimensions(), {"year": year, "quarter": quarter, "month": month, "loan_type": loan_type, "employment": employment, "gender": gender, "age_group": age_group})
        return {"groupBy": group_by, "label": DIMENSIONS[group_by]["label"], "filters": applied, "rows": aggregate(frame, DIMENSIONS[group_by]["column"]), "total": totals(frame)}

    @router.get("/olap/pivot")
    def olap_pivot(
        rows: str = Query(default="loan_type"), cols: str = Query(default="year"), measure: str = Query(default="fraudRate"),
        year: str | None = None, quarter: str | None = None, month: str | None = None, loan_type: str | None = None,
        employment: str | None = None, gender: str | None = None, age_group: str | None = None,
    ) -> dict[str, Any]:
        if rows not in DIMENSIONS or cols not in DIMENSIONS or rows == cols:
            raise HTTPException(status_code=422, detail="Choose two different dimensions for rows and columns.")
        if measure not in MEASURES:
            raise HTTPException(status_code=422, detail=f"Unknown measure '{measure}'.")
        frame, applied = apply_filters(frame_with_dimensions(), {"year": year, "quarter": quarter, "month": month, "loan_type": loan_type, "employment": employment, "gender": gender, "age_group": age_group})
        row_column, col_column = DIMENSIONS[rows]["column"], DIMENSIONS[cols]["column"]
        row_members = [item["key"] for item in aggregate(frame, row_column)]
        col_members = [item["key"] for item in aggregate(frame, col_column)]
        cells: dict[str, dict[str, Any]] = {}
        for row_key in row_members:
            subset = frame[frame[row_column].astype(str) == row_key]
            by_col = {item["key"]: item for item in aggregate(subset, col_column)}
            cells[row_key] = {col_key: (by_col[col_key][measure] if col_key in by_col else None) for col_key in col_members}
        return {
            "rows": rows, "cols": cols, "measure": measure, "measureLabel": MEASURES[measure], "filters": applied,
            "rowMembers": row_members, "colMembers": col_members, "cells": cells,
            "rowTotals": {item["key"]: item[measure] for item in aggregate(frame, row_column)},
            "colTotals": {item["key"]: item[measure] for item in aggregate(frame, col_column)},
            "grandTotal": totals(frame)[measure],
        }

    # ------------------------------------------------------------ models
    @router.get("/models")
    def technical_models() -> dict[str, Any]:
        results = require_results()
        models = results.get("models", {})
        return {
            "models": [model_view(name, data, results, detail=False) for name, data in models.items()],
            "bestByMetric": best_by_metric(models),
            "selectedModel": results.get("selectedModel"),
            "selectionRule": "The training script marks the model with the highest PR-AUC as selected.",
            "liveScoringModel": _safe(default_model),
            "evaluationDataset": results.get("dataset", {}) | {"source": masked_source()},
            "metricNotes": {
                "accuracy": "Share of all test applications classified correctly.",
                "precision": "Of the applications predicted as fraud, the share that really were fraud.",
                "recall": "Of the real fraud cases, the share the model detected.",
                "f1": "Harmonic mean of precision and recall.",
                "rocAuc": "Probability that a random fraud case is ranked above a random genuine case (0.5 = random).",
                "prAuc": "Area under the precision-recall curve; its baseline equals the fraud rate.",
            },
        }

    @router.get("/models/{model_name}")
    def technical_model(model_name: str) -> dict[str, Any]:
        results = require_results()
        models = results.get("models", {})
        if model_name not in models:
            raise HTTPException(status_code=404, detail=f"Unknown model: {model_name}")
        return model_view(model_name, models[model_name], results, detail=True)

    # ------------------------------------------------------------ feature analysis
    @router.get("/features")
    def features() -> dict[str, Any]:
        frame = frame_with_dimensions()
        results = _safe(require_results) or {"models": {}}
        numeric_frame = frame[[column for column in numeric_columns if column in frame.columns]].apply(_numeric)
        correlations = []
        for name in numeric_frame.columns:
            value = numeric_frame[name].corr(frame["FraudFlag"])
            correlations.append({"feature": name, "correlation": _clean(value)})
        correlations.sort(key=lambda item: abs(item["correlation"] or 0), reverse=True)
        fraud_rows, genuine_rows = frame[frame["FraudFlag"] == 1], frame[frame["FraudFlag"] == 0]
        numeric_compare = [{
            "feature": name,
            "fraudMean": _clean(_numeric(fraud_rows[name]).mean()), "genuineMean": _clean(_numeric(genuine_rows[name]).mean()),
            "fraudMedian": _clean(_numeric(fraud_rows[name]).median()), "genuineMedian": _clean(_numeric(genuine_rows[name]).median()),
        } for name in numeric_frame.columns]
        categorical = []
        for name in categorical_columns:
            if name in frame.columns:
                categorical.append({"feature": name, "values": aggregate(frame, name)})
        importance = {}
        for name, data in results.get("models", {}).items():
            kind = MODEL_TYPES.get(name, {}).get("importanceKind", "not_available")
            importance[name] = {"label": MODEL_TYPES.get(name, {}).get("label", name), "kind": kind, "values": data.get("featureImportance") if kind != "not_available" else None}
        return {
            "features": [{"name": name, "kind": "categorical" if name in categorical_columns else "numeric"} for name in feature_columns],
            "target": "FraudFlag", "correlations": correlations, "numericComparison": numeric_compare,
            "categoricalBreakdown": categorical, "importance": importance,
            "note": "Global feature importance describes the model as a whole. It does not explain why one specific application received its score.",
        }

    # ------------------------------------------------------------ system
    @router.get("/system")
    def system() -> dict[str, Any]:
        def version(package: str) -> str | None:
            try:
                return metadata.version(package)
            except metadata.PackageNotFoundError:
                return None

        dataset_rows = None
        dataset_error = None
        try:
            dataset_rows = int(len(load_dataset()))
        except HTTPException as exc:
            dataset_error = str(exc.detail)
        results = _safe(require_results) or {}
        routes = sorted({(method, route.path) for route in app.routes for method in getattr(route, "methods", set()) or set() if method in {"GET", "POST"} and not route.path.startswith(("/docs", "/openapi", "/redoc"))})
        applications = store.application_status_counts()
        events = applications.pop("_events", 0)
        return {
            "status": {
                "backend": "online", "api": "online",
                "dataset": "loaded" if dataset_rows is not None else "unavailable", "datasetError": dataset_error,
                "models": "available" if results else "not trained",
                "database": "online",
            },
            "uptimeSeconds": int(time.time() - STARTED_AT),
            "serverTime": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            "dataset": {"records": dataset_rows, "source": source_info() if dataset_rows is not None else None},
            "models": {
                "evaluated": list(results.get("models", {}).keys()),
                "artifacts": available_models(),
                "selected": results.get("selectedModel"),
                "liveScoring": _safe(default_model),
                "riskBands": {key: [low, min(high, 1.0)] for key, (low, high) in risk_bands.items()},
            },
            "operationalStore": {"engine": "SQLite (storage/fraudguard.db)", "users": store.role_counts(), "portalApplications": applications, "auditEvents": events},
            "api": {"endpoints": len(routes), "routes": [{"method": method, "path": path, "access": _access(path)} for method, path in routes]},
            "versions": {
                "python": platform.python_version(), "fastapi": version("fastapi"), "pandas": version("pandas"), "scikit-learn": version("scikit-learn"),
                "xgboost": version("xgboost"), "imbalanced-learn": version("imbalanced-learn"), "numpy": version("numpy"),
            },
            "architecture": [
                {"layer": "Frontend", "technology": "React 19 + TypeScript + Vite, Tailwind CSS", "detail": "Single-page app with three role-based areas: Customer, Bank Officer and Admin / Technical."},
                {"layer": "Backend", "technology": "FastAPI (Python)", "detail": "REST API with token sessions and role-based access control."},
                {"layer": "Data source", "technology": "SheetDB REST API, cached as data/cleaned_dataset.csv", "detail": "Historical labelled loan applications (read-only)."},
                {"layer": "Operational store", "technology": "SQLite", "detail": "Users, sessions, portal applications and the decision audit trail."},
                {"layer": "ML pipeline", "technology": "scikit-learn, imbalanced-learn (SMOTE), XGBoost", "detail": "Preprocessing + SMOTE + classifier pipelines saved as .joblib."},
                {"layer": "Analytics", "technology": "pandas aggregations", "detail": "Fraud analytics, OLAP roll-up / drill-down / slice / dice and data-quality checks computed on request."},
            ],
            "workflow": ["Customer submits application", "Features validated and DTI derived", "Selected model scores fraud probability", "Risk level assigned (Low / Medium / High)", "Bank officer reviews", "Approve / Reject / Send for Review", "Decision stored in audit trail", "Customer sees status"],
        }

    def _access(path: str) -> str:
        if path.startswith("/technical"):
            return "Admin"
        if path.startswith("/me"):
            return "Customer"
        if path.startswith("/auth") or path in {"/health", "/reference"}:
            return "Public" if path != "/auth/me" else "Signed-in"
        if path.startswith("/applications") or path == "/predict":
            return "Bank Officer"
        return "Bank Officer, Admin"

    return router

