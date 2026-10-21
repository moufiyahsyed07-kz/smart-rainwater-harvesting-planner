
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# Load dataset
DATA_PATH = (
    Path(__file__).parent.parent
    / "public"
    / "data"
    / "Tamil_Nadu_Rainfall_2015_2024.csv"
)

df = pd.read_csv(DATA_PATH)

# Input features and prediction target
X = df[["District", "Year"]]
y = df["Rainfall_mm"]

# Keep the latest years for testing
train_mask = df["Year"] <= 2022
test_mask = df["Year"] >= 2023

X_train, y_train = X[train_mask], y[train_mask]
X_test, y_test = X[test_mask], y[test_mask]

# Encode district names and train the model
preprocessor = ColumnTransformer(
    transformers=[
        ("district", OneHotEncoder(handle_unknown="ignore"), ["District"]),
        ("year", "passthrough", ["Year"]),
    ]
)

model = Pipeline([
    ("preprocessor", preprocessor),
    ("regressor", RandomForestRegressor(
        n_estimators=100,
        random_state=42
    )),
])

model.fit(X_train, y_train)

# Evaluate on later years
predictions = model.predict(X_test)

print("Model training completed!")
print("Training records:", len(X_train))
print("Testing records:", len(X_test))
print("Test MAE (mm):", round(mean_absolute_error(y_test, predictions), 2))
print("Test R2 score:", round(r2_score(y_test, predictions), 3))

# Save trained model
MODEL_PATH = Path(__file__).parent / "rainfall_model.joblib"
joblib.dump(model, MODEL_PATH)

print("Model saved to:", MODEL_PATH)
