from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score, confusion_matrix,
                             f1_score, precision_score, recall_score, roc_auc_score,
                             precision_recall_curve, roc_curve)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "cleaned_dataset.csv"
MODEL_DIR = ROOT / "models"
RESULTS_PATH = MODEL_DIR / "evaluation_results.json"
SOURCE_URL = "https://sheetdb.io/api/v1/jnveyifpbrsuy"
FEATURE_COLUMNS = ["ApplicantAge", "Gender", "EmploymentStatus", "NumberDependents", "LoanType", "PurposeOfLoan", "LoanAmountRequested", "LoanTenureMonths", "InterestRateOffered", "MonthlyIncome", "ExistingEMIs", "DebtToIncomeRatio", "PropertyOwnershipStatus"]
CATEGORICAL_COLUMNS = ["Gender", "EmploymentStatus", "LoanType", "PurposeOfLoan", "PropertyOwnershipStatus"]
NUMERIC_COLUMNS = [column for column in FEATURE_COLUMNS if column not in CATEGORICAL_COLUMNS]


def load_data() -> pd.DataFrame:
    if not DATA_PATH.exists():
        response = requests.get(SOURCE_URL, timeout=30)
        response.raise_for_status()
        frame = pd.DataFrame(response.json())
        DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        frame.to_csv(DATA_PATH, index=False)
    frame = pd.read_csv(DATA_PATH)
    frame = frame.drop_duplicates().copy()
    for column in NUMERIC_COLUMNS + ["FraudFlag"]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    frame["DebtToIncomeRatio"] = frame["DebtToIncomeRatio"].fillna(frame["ExistingEMIs"] / frame["MonthlyIncome"] * 100)
    frame = frame.dropna(subset=["FraudFlag"])
    frame["FraudFlag"] = frame["FraudFlag"].astype(int)
    return frame


def make_preprocessor() -> ColumnTransformer:
    numeric = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
    categorical = Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("encode", OneHotEncoder(handle_unknown="ignore", sparse_output=False))])
    return ColumnTransformer([("numeric", numeric, NUMERIC_COLUMNS), ("categorical", categorical, CATEGORICAL_COLUMNS)])


def build_models(scale_pos_weight: float) -> dict[str, object]:
    return {
        "logistic_regression": LogisticRegression(max_iter=1500, class_weight="balanced", random_state=42),
        "decision_tree": DecisionTreeClassifier(max_depth=8, class_weight="balanced", random_state=42),
        "naive_bayes": GaussianNB(),
        "random_forest": RandomForestClassifier(n_estimators=250, class_weight="balanced", n_jobs=-1, random_state=42),
        "xgboost": XGBClassifier(n_estimators=250, max_depth=5, learning_rate=0.05, subsample=0.85, colsample_bytree=0.85, scale_pos_weight=scale_pos_weight, eval_metric="logloss", n_jobs=2, random_state=42),
    }


def feature_importance(model: Pipeline) -> list[dict[str, float]]:
    estimator = model.named_steps["model"]
    preprocessor = model.named_steps["preprocess"]
    names = list(preprocessor.get_feature_names_out())
    values = getattr(estimator, "feature_importances_", None)
    if values is None:
        values = np.abs(getattr(estimator, "coef_", [[0]])[0])
    pairs = sorted(zip(names, values), key=lambda pair: float(pair[1]), reverse=True)[:15]
    return [{"feature": name.replace("numeric__", "").replace("categorical__", ""), "importance": round(float(value), 6)} for name, value in pairs]


def evaluate(name: str, estimator: object, X_train: pd.DataFrame, X_test: pd.DataFrame, y_train: pd.Series, y_test: pd.Series) -> dict:
    pipeline = Pipeline([("preprocess", make_preprocessor()), ("smote", SMOTE(random_state=42)), ("model", estimator)])
    started = time.perf_counter()
    pipeline.fit(X_train, y_train)
    training_seconds = time.perf_counter() - started
    probabilities = pipeline.predict_proba(X_test)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, predictions, labels=[0, 1]).ravel()
    fpr, tpr, _ = roc_curve(y_test, probabilities)
    precision, recall, _ = precision_recall_curve(y_test, probabilities)
    return pipeline, {
        "name": name,
        "accuracy": round(float(accuracy_score(y_test, predictions)), 6),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 6),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 6),
        "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 6),
        "rocAuc": round(float(roc_auc_score(y_test, probabilities)), 6),
        "prAuc": round(float(average_precision_score(y_test, probabilities)), 6),
        "trainingSeconds": round(training_seconds, 4),
        "confusionMatrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "rocCurve": [{"fpr": round(float(x), 6), "tpr": round(float(y), 6)} for x, y in zip(fpr, tpr)],
        "precisionRecallCurve": [{"precision": round(float(x), 6), "recall": round(float(y), 6)} for x, y in zip(precision, recall)],
        "featureImportance": feature_importance(pipeline),
    }


def main() -> None:
    frame = load_data()
    X = frame[FEATURE_COLUMNS]
    y = frame["FraudFlag"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    scale_pos_weight = float((y_train == 0).sum() / max((y_train == 1).sum(), 1))
    results = {"dataset": {"rows": int(len(frame)), "fraudCount": int(y.sum()), "genuineCount": int((y == 0).sum()), "features": FEATURE_COLUMNS, "source": SOURCE_URL}, "models": {}}
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name, estimator in build_models(scale_pos_weight).items():
        pipeline, metrics = evaluate(name, estimator, X_train, X_test, y_train, y_test)
        joblib.dump(pipeline, MODEL_DIR / f"{name}.joblib")
        results["models"][name] = metrics
    results["selectedModel"] = max(results["models"], key=lambda key: results["models"][key]["prAuc"])
    RESULTS_PATH.write_text(json.dumps(results, indent=2))
    print(json.dumps({"selectedModel": results["selectedModel"], "models": {key: {metric: value for metric, value in result.items() if metric in {"accuracy", "precision", "recall", "f1", "rocAuc", "prAuc"}} for key, result in results["models"].items()}}, indent=2))


if __name__ == "__main__":
    main()
