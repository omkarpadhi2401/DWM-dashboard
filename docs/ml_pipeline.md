# Machine Learning Pipeline

```text
SheetDB source
  -> cleaned_dataset.csv
  -> duplicate removal and numeric coercion
  -> pre-decision feature selection
  -> stratified 80/20 split
  -> ColumnTransformer (median numeric imputation, scaling, one-hot encoding)
  -> SMOTE on training data only
  -> five classifiers
  -> untouched test metrics and curves
  -> joblib pipelines + evaluation_results.json
  -> FastAPI /predict
  -> React Fraud Prediction page
```

## Target and features

Target: `FraudFlag` (`0` genuine, `1` fraud). The actual dataset has 5,000 rows and 103 fraud rows. The training feature set contains only columns available before a prediction: age, gender, employment, dependents, loan type, purpose, loan amount, tenure, interest rate, income, existing EMIs, DTI, and property ownership.

`FraudType` and `LoanStatus` are excluded because they are post-label or outcome fields and would leak the answer into a prediction model. The source dataset does not contain `CIBILScore`, so the application does not invent or request it.

## Models

`ml/train.py` trains Logistic Regression, Decision Tree, Gaussian Naive Bayes, Random Forest, and XGBoost. Each model is evaluated on the same untouched stratified test set. Metrics include accuracy, precision, recall, F1, ROC-AUC, PR-AUC, confusion matrix, ROC points, precision-recall points, and global feature importance.

SMOTE is inside the imbalanced-learn pipeline and therefore runs after the train/test split and only during `fit` on training data. Test rows remain untouched.

## Reproducibility

```bash
python3 -m pip install -r requirements.txt
python3 -m ml.train
uvicorn backend.main:app --reload --port 8000
```

Artifacts are written to `models/`:

- one `.joblib` pipeline per model
- `evaluation_results.json` containing test metrics and chart points

The selected model is the one with the highest measured PR-AUC, but the UI shows every model's trade-offs and does not claim that one metric makes a universally best model.

## Academic Scope Clarifications

The project specifically focuses on supervised binary classification and OLAP techniques. Certain syllabus topics were intentionally omitted because they are not mathematically or practically appropriate for this specific dataset and problem:

1. **Regression:** Regression is omitted because the primary objective is binary fraud classification (`FraudFlag`), which is a discrete categorical target. The dataset does not have a meaningful continuous target variable that requires prediction in the context of fraud analysis.
2. **Clustering:** K-Means and unsupervised methods were omitted to keep the project focused entirely on supervised learning and predictive accuracy against known labels, rather than creating arbitrary customer segmentations.
3. **Association Rule Mining:** Apriori and association rules are best suited for transactional "market basket" data. This loan application dataset represents individual cross-sectional entities, meaning association rules would only yield trivial descriptive statistics (e.g., "most salaried applicants take personal loans") rather than actionable insights.
