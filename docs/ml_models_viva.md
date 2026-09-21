# Machine Learning Models — Viva Reference

The project treats fraud detection as a binary classification problem. The cleaned loan application dataset is preprocessed, split into training and testing data, SMOTE is applied only to the training data because of class imbalance, and five classification algorithms are trained and compared.

**Pipeline Flow:**
Dataset → Preprocessing → Train/Test Split → SMOTE (Training Only) → Model Training → Evaluation → Saved Model → FastAPI Prediction

---

## SECTION 1 — COMMON PREPROCESSING

Before models can learn, raw data must be converted into a mathematical format. This is handled by a `ColumnTransformer` in `ml/train.py`.

- **Numerical Feature Handling**: Missing numerical values (like Income) are imputed using the **median**. The values are then normalized using `StandardScaler` to ensure features with large ranges (like Loan Amount) do not overpower smaller features (like Age).
- **Categorical Feature Handling**: Missing categorical values are imputed using the **most frequent** value (mode), and then transformed into binary columns using `OneHotEncoder`.
- **SMOTE (Synthetic Minority Oversampling Technique)**: Our dataset is highly imbalanced (5,000 rows, only 103 fraud cases). SMOTE generates synthetic fraud examples so the models have enough minority class data to learn from.

**Why is SMOTE applied only to training data?**
To avoid **data leakage**. If we apply SMOTE before splitting, synthetic data based on the test set would "leak" into the training set, giving the model an unfair advantage and producing falsely high evaluation metrics. By applying it *after* the split (inside the `imblearn` pipeline), the test set remains completely unseen and realistic.

---

## SECTION 2 — LOGISTIC REGRESSION

- **What it is**: A fundamental statistical model that uses the logistic (sigmoid) function to model a binary dependent variable.
- **How it works**: It calculates a weighted sum of input features and passes it through a sigmoid curve to output a probability between 0 and 1.
- **Actual parameters used**: `max_iter=1500, class_weight="balanced", random_state=42`
- **Where it appears**: `ml/train.py` (Line 61)
- **Viva answer: Why did we use Logistic Regression?** "It serves as our foundational, highly interpretable baseline. By using `class_weight='balanced'`, it actively adjusts for the imbalanced dataset, providing a solid benchmark against more complex models."

---

## SECTION 3 — DECISION TREE

- **What it is**: A tree-like model of decisions and their possible consequences.
- **How it works**: It splits the dataset into subsets based on the most significant feature (using Gini impurity) until a classification is reached at a "leaf" node.
- **Actual parameters used**: `max_depth=8, class_weight="balanced", random_state=42`
- **Advantages**: Easy to interpret and visualizes human-like decision making.
- **Limitations**: Prone to overfitting the training data if the depth is not restricted.
- **Viva answer: Why did we use Decision Tree?** "To capture non-linear relationships in the data. We restricted `max_depth` to 8 to prevent it from memorizing the training set (overfitting)."

---

## SECTION 4 — NAIVE BAYES

- **What it is**: A probabilistic classifier based on applying Bayes' theorem.
- **Why it is "naive"**: It makes the "naive" assumption that all features are mutually independent, which is rarely true in the real world (e.g., loan amount and income are usually related).
- **Actual variant used**: `GaussianNB()`
- **Actual parameters used**: Default parameters.
- **Advantages**: Extremely fast and performs surprisingly well on smaller datasets.
- **Limitations**: The independence assumption often limits its accuracy compared to ensemble models.
- **Viva answer: Why Naive Bayes?** "We used Gaussian Naive Bayes because it is highly efficient and provides a pure probability-based comparison against our tree-based models."

---

## SECTION 5 — RANDOM FOREST

- **What it is**: An ensemble learning method.
- **How it works**: It builds multiple decision trees during training. Each tree votes on the classification, and the forest outputs the majority vote. It uses "bagging" (random subsets of data and features) to ensure the trees are diverse.
- **Actual parameters used**: `n_estimators=250, class_weight="balanced", n_jobs=-1, random_state=42`
- **Advantages**: Highly accurate, handles non-linear features well, and reduces the overfitting seen in single Decision Trees.
- **Limitations**: A "black box" model that is hard to interpret compared to a single tree.
- **Viva answer: Why Random Forest?** "We used an ensemble of 250 trees to achieve high accuracy and robustness, relying on the 'wisdom of the crowd' to reduce the variance of individual decision trees."

---

## SECTION 6 — XGBOOST

- **What it is**: eXtreme Gradient Boosting.
- **How it works**: Unlike Random Forest which builds trees independently, XGBoost builds trees *sequentially*. Every new tree tries to correct the errors (residuals) made by the previous trees.
- **Actual parameters used**: `n_estimators=250, max_depth=5, learning_rate=0.05, subsample=0.85, colsample_bytree=0.85, scale_pos_weight=47.54, eval_metric="logloss", n_jobs=2, random_state=42`
- **Why it is useful**: It is currently the state-of-the-art algorithm for tabular data like our loan applications.
- **Viva answer: Why XGBoost?** "We included XGBoost because gradient boosting iteratively minimizes prediction errors, making it mathematically one of the most powerful algorithms for structured, tabular data."

---

## SECTION 7 — MODEL COMPARISON

| Model | Basic Idea | Type | Main Strength | Main Limitation |
|---|---|---|---|---|
| Logistic Regression | Sigmoid curve | Linear | Interpretable | Struggles with non-linear data |
| Decision Tree | Splitting nodes | Non-linear | Easy to understand | Overfits easily |
| Naive Bayes | Bayes Theorem | Probabilistic | Fast & simple | Assumes features are independent |
| Random Forest | Many voting trees | Ensemble (Bagging) | Robust, low variance | Hard to interpret |
| XGBoost | Sequential error correction | Ensemble (Boosting) | Highest accuracy | Computationally expensive |

**Actual Evaluation Results (from our holdout test set):**
- **Logistic Regression**: Accuracy 60.6%, Recall 38.0%
- **Decision Tree**: Accuracy 85.1%, Recall 4.7%
- **Naive Bayes**: Accuracy 66.4%, Recall 33.3%
- **Random Forest**: Accuracy 97.9%, Recall 0%
- **XGBoost**: Accuracy 94.7%, Recall 0%

*Note: Ensemble models (RF, XGB) achieved high accuracy because they leaned heavily toward predicting the majority class (Genuine), resulting in 0% recall for fraud on the test set. Logistic Regression and Naive Bayes successfully caught a percentage of the fraud (higher Recall), albeit at the cost of overall accuracy.*

**Why does Recall matter in fraud detection?**
In fraud, a False Negative (missing a fraudster) is extremely expensive. We care more about catching as much fraud as possible (Recall) than we do about overall Accuracy (which is easily inflated by simply predicting "Genuine" 100% of the time).

**Why is PR-AUC useful?**
Precision-Recall Area Under Curve (PR-AUC) focuses entirely on the minority class (Fraud). In an imbalanced dataset, standard ROC-AUC can look artificially good due to the massive number of True Negatives. PR-AUC provides the most honest assessment of how well the model handles the rare fraud class.

---

## SECTION 8 — CONFUSION MATRIX

- **True Positive (TP)**: We predicted Fraud, and it actually WAS Fraud.
- **True Negative (TN)**: We predicted Genuine, and it actually WAS Genuine.
- **False Positive (FP)**: We predicted Fraud, but it was Genuine (A false alarm).
- **False Negative (FN)**: We predicted Genuine, but it was FRAUD.

**Why this matters**: In our project, a False Negative means granting a loan to a fraudster. A False Positive means slightly annoying a genuine customer with an extra security check. We want to minimize False Negatives.

---

## SECTION 9 — MODEL DEPLOYMENT

**Python Training → .joblib model → FastAPI → React**
1. `ml/train.py` trains the models and saves the full Pipeline (Preprocessing + Estimator) as `.joblib` files in the `/models/` directory.
2. The FastAPI backend (`backend/main.py`) exposes a `POST /predict` endpoint.
3. When a user submits the form in the React UI, the JSON payload is sent to FastAPI.
4. FastAPI loads the requested `.joblib` file, passes the JSON data through the saved preprocessing pipeline, and calls `predict_proba()`.
5. The resulting Probability and Classification (Fraud/Genuine) are returned to React and displayed to the user.

---

## SECTION 10 — IMPORTANT VIVA QUESTIONS

1. **Why did you choose fraud detection as a classification problem?** Because the target variable (`FraudFlag`) is discrete/categorical (0 or 1), not a continuous number.
2. **Why do we need preprocessing?** Machine learning models require numbers. Preprocessing handles missing data, scales numbers, and converts text (like "Male") into binary columns.
3. **Why do we use train/test split?** To evaluate the model on data it has never seen before, proving it can generalize to new applications.
4. **Why is stratification useful here?** It ensures that the rare 2% fraud cases are distributed equally between the training and test sets.
5. **Why did you use SMOTE?** Because the dataset is highly imbalanced. SMOTE generates synthetic fraud examples so the model has enough data to learn the fraud patterns.
6. **Why is SMOTE applied only to training data?** To prevent data leakage. The test set must remain 100% real, untouched data.
7. **What is data leakage?** When information from outside the training dataset (like the test set) is accidentally used to create the model.
8. **Why Logistic Regression?** As a fast, interpretable, linear baseline model.
9. **Why Decision Tree?** To capture non-linear patterns using simple IF-THEN rules.
10. **Why Naive Bayes?** As a probabilistic baseline that assumes feature independence.
11. **Why Random Forest?** An ensemble method to reduce the overfitting of a single decision tree.
12. **Why XGBoost?** A boosting method that iteratively minimizes errors, offering state-of-the-art tabular performance.
13. **Difference between Random Forest and XGBoost?** Random Forest builds trees independently (parallel bagging). XGBoost builds trees sequentially to correct previous errors (boosting).
14. **What is overfitting?** When a model memorizes the training data perfectly but fails to predict new, unseen data.
15. **What is underfitting?** When a model is too simple to capture the underlying patterns in the data.
16. **What is precision?** Out of all the applications we *flagged* as fraud, how many were actually fraud?
17. **What is recall?** Out of all the *actual* fraud cases, how many did we successfully catch?
18. **Why is recall important for fraud detection?** Because missing a fraud case (False Negative) is usually much more expensive than a false alarm (False Positive).
19. **What is F1 score?** The harmonic mean of Precision and Recall.
20. **What is ROC-AUC?** A metric showing how well the model distinguishes between classes across all probability thresholds.
21. **What is PR-AUC?** Precision-Recall Area Under Curve—the most honest metric for highly imbalanced datasets.
22. **What is a confusion matrix?** A 2x2 table showing True Positives, True Negatives, False Positives, and False Negatives.
23. **What is False Positive?** Predicting Fraud when the customer is actually Genuine.
24. **What is False Negative?** Predicting Genuine when the customer is actually a Fraudster.
25. **How does the frontend get the prediction?** By sending a JSON POST request to the FastAPI `/predict` endpoint.
26. **Why FastAPI?** Because it is a highly performant Python web framework that natively integrates with our scikit-learn/pandas ecosystem.
27. **Where are the trained models stored?** In the `models/` directory as serialized `.joblib` files.
28. **Are the metrics real or hardcoded?** They are 100% real, calculated dynamically against the holdout test set and saved in `evaluation_results.json`.
29. **How did you avoid data leakage?** By placing the SMOTE oversampling step *inside* an `imblearn` Pipeline, ensuring it only modifies the training folds during execution.
30. **What happens when a new loan application is submitted?** FastAPI passes it to the loaded `.joblib` pipeline. The pipeline automatically applies the exact same imputation, scaling, and encoding used during training, then calculates the fraud probability.

---

## SECTION 11 — QUICK REVISION TABLE

| Model | Type | Basic Idea | Important Parameter(s) | Main Advantage |
|---|---|---|---|---|
| **Logistic Regression** | Linear | Sigmoid curve probability | `max_iter=1500, class_weight='balanced'` | Highly interpretable baseline |
| **Decision Tree** | Non-linear | Splitting data by features | `max_depth=8, class_weight='balanced'` | Captures non-linear rules |
| **Naive Bayes** | Probabilistic | Bayes Theorem | Default (GaussianNB) | Extremely fast |
| **Random Forest** | Bagging Ensemble | Majority vote of many trees | `n_estimators=250, n_jobs=-1` | Robust, avoids overfitting |
| **XGBoost** | Boosting Ensemble | Sequential error correction | `n_estimators=250, max_depth=5, learning_rate=0.05` | Highest accuracy potential |
