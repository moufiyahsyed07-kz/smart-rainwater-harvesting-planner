
from pathlib import Path

import joblib
import pandas as pd
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "rainfall_model.joblib"
DATA_PATH = (
    BASE_DIR.parent
    / "public"
    / "data"
    / "Tamil_Nadu_Rainfall_2015_2024.csv"
)

model = joblib.load(MODEL_PATH)
rainfall_df = pd.read_csv(DATA_PATH)
DISTRICTS = sorted(rainfall_df["District"].dropna().unique().tolist())

app = FastAPI(title="AI Rainwater Planner API")


FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")

allowed_origins = ["http://localhost:3000"]

if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)



class PredictionRequest(BaseModel):
    district: str
    year: int = Field(ge=2015, le=2100)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": True,
        "district_count": len(DISTRICTS),
    }


@app.get("/districts")
def get_districts():
    return {"districts": DISTRICTS}


@app.post("/predict")
def predict_rainfall(request: PredictionRequest):
    district_lookup = {name.casefold(): name for name in DISTRICTS}
    district = district_lookup.get(request.district.strip().casefold())

    if not district:
        raise HTTPException(
            status_code=400,
            detail="District not found. Please select a listed district.",
        )

    input_data = pd.DataFrame({
        "District": [district],
        "Year": [request.year],
    })

    predicted = float(model.predict(input_data)[0])

    return {
        "district": district,
        "year": request.year,
        "predicted_rainfall_mm": round(max(0, predicted), 1),
        "unit": "mm",
        "note": (
            "Experimental model estimate, not an official forecast. "
            "Predictions outside the training years may be unreliable."
        ),
    }
