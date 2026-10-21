
from pathlib import Path

import joblib
import pandas as pd

# Load the trained model
MODEL_PATH = Path(__file__).parent / "rainfall_model.joblib"
DATA_PATH = (
    Path(__file__).parent.parent
    / "public"
    / "data"
    / "Tamil_Nadu_Rainfall_2015_2024.csv"
)

model = joblib.load(MODEL_PATH)
df = pd.read_csv(DATA_PATH)

# Show available districts
districts = sorted(df["District"].unique())

print("Available districts:")
print(", ".join(districts))

district = input("\nEnter district name exactly as shown: ").strip().title()
year_text = input("Enter prediction year (e.g. 2025): ").strip()

if district not in districts:
    print("District not found. Please use a name from the list above.")
else:
    try:
        year = int(year_text)

        if year < 2015:
            print("Please enter a year from 2015 onwards.")
        else:
            input_data = pd.DataFrame({
                "District": [district],
                "Year": [year],
            })

            predicted_rainfall = model.predict(input_data)[0]

            print(f"\nDistrict: {district}")
            print(f"Year: {year}")
            print(
                "Predicted annual rainfall:",
                f"{predicted_rainfall:.1f} mm"
            )
            print(
                "\nNote: This is an experimental model estimate, "
                "not an official rainfall forecast."
            )

    except ValueError:
        print("Invalid year. Please enter a whole number.")
