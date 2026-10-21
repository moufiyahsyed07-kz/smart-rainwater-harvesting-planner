
"use client";

import { useState } from "react";
import { useEffect } from "react";

export default function Home() {
  
  const [district, setDistrict] = useState("Chennai");
  const [manualLocation, setManualLocation] = useState("");
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [manualRainfall, setManualRainfall] = useState("");
  const [rainfallData, setRainfallData] = useState<Record<string, number>>({});
  const [groundwaterData, setGroundwaterData] = useState<Record<string, { pre: number; post: number }>>({});
  const [roofArea, setRoofArea] = useState("100");
  const [rainfall, setRainfall] = useState("1200");
  const [aiRainfall, setAiRainfall] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [runoff, setRunoff] = useState("0.8");
  const [roofRunoffData, setRoofRunoffData] = useState<
  { roofType: string; min: number; max: number }[]
>([]);
  const [selectedRoofType, setSelectedRoofType] = useState("Concrete");
  const [dailyDemand, setDailyDemand] = useState("500");
  const [goal, setGoal] = useState("both");
  const [buildingType, setBuildingType] = useState("college");
  const [availableSpace, setAvailableSpace] = useState("20");
  const [soilType, setSoilType] = useState("unknown");
  const [result, setResult] = useState(false);
  const [monthlyRainfallData, setMonthlyRainfallData] = useState<
  { month: string; rainfall: number }[]
>([]);

  const predictAIRainfall = async () => {
    setAiLoading(true);
    setAiError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          district: district,
          year: new Date().getFullYear(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Rainfall prediction failed");
      }

      setAiRainfall(data.predicted_rainfall_mm);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Unable to connect to AI model"
      );
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
  fetch("/data/Tamil_Nadu_Rainfall_2015_2024.csv")
    .then((response) => response.text())
    .then((csvText) => {
      const rows = csvText.trim().split("\n").slice(1);
      const totals: Record<string, number> = {};
      const counts: Record<string, number> = {};

      rows.forEach((row) => {
        const [name, year, value] = row.trim().split(",");
        const amount = Number(value);

        if (name && Number.isFinite(amount)) {
          totals[name.trim()] = (totals[name.trim()] || 0) + amount;
          counts[name.trim()] = (counts[name.trim()] || 0) + 1;
        }
      });

      const averages: Record<string, number> = {};
      Object.keys(totals).forEach((name) => {
        averages[name] = Math.round(totals[name] / counts[name]);
      });

      setRainfallData(averages);
    })
    .catch((error) => console.error("Rainfall CSV loading failed:", error));
}, []);
useEffect(() => {
  fetch("/data/Roof_Runoff_Coefficient.csv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Could not load roof runoff CSV");
      }
      return response.text();
    })
    .then((text) => {
      const rows = text.trim().split(/\r?\n/).slice(1);

      const parsedData = rows
        .map((row) => {
          const columns = row.split(",");

          return {
            roofType: columns[0]?.trim() ?? "",
            min: Number(columns[1]),
            max: Number(columns[2]),
          };
        })
        .filter(
          (item) =>
            item.roofType !== "" &&
            Number.isFinite(item.min) &&
            Number.isFinite(item.max)
        );

      setRoofRunoffData(parsedData);
    })
    .catch((error) => {
      console.error("Roof runoff dataset error:", error);
    });
}, []);
useEffect(() => {
  fetch("/data/Tamil_Nadu_Groundwater_2015_2024.csv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Groundwater CSV could not be loaded");
      }
      return response.text();
    })
    .then((csvText) => {
      const rows = csvText.trim().split(/\r?\n/).slice(1);
      const totals: Record<string, { pre: number; post: number; count: number }> = {};

      rows.forEach((row) => {
        const [name, year, preText, postText] = row.split(",");
        const pre = Number(preText);
        const post = Number(postText);

        if (
          name &&
          preText?.trim() !== "" &&
          postText?.trim() !== "" &&
          Number.isFinite(pre) &&
          Number.isFinite(post)
        ) {
          const key = name.trim();
          if (!totals[key]) totals[key] = { pre: 0, post: 0, count: 0 };
          totals[key].pre += pre;
          totals[key].post += post;
          totals[key].count += 1;
        }
      });

      const averages: Record<string, { pre: number; post: number }> = {};
      Object.keys(totals).forEach((name) => {
        averages[name] = {
          pre: Number((totals[name].pre / totals[name].count).toFixed(2)),
          post: Number((totals[name].post / totals[name].count).toFixed(2)),
        };
      });

      setGroundwaterData(averages);
    })
    .catch((error) => console.error("Groundwater CSV loading failed:", error));
}, []);

useEffect(() => {
  fetch("/data/Monthly_Rainfall.csv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load monthly rainfall data");
      }
      return response.text();
    })
    .then((csvText) => {
      const rows = csvText.trim().split(/\r?\n/).slice(1);

      const totals: Record<
        string,
        Record<string, { total: number; count: number }>
      > = {};

      rows.forEach((row) => {
        const [name, year, month, value] = row.split(",");
        const rainfallValue = Number(value);

        if (
          !name ||
          !year ||
          !month ||
          value === undefined ||
          !Number.isFinite(rainfallValue)
        ) {
          return;
        }

        if (!totals[name]) totals[name] = {};
        if (!totals[name][month]) {
          totals[name][month] = { total: 0, count: 0 };
        }

        totals[name][month].total += rainfallValue;
        totals[name][month].count += 1;
      });

      const selected = totals[district] || {};

      const months = [
        "January", "February", "March", "April",
        "May", "June", "July", "August",
        "September", "October", "November", "December",
      ];

      setMonthlyRainfallData(
        months.map((month) => {
          const data = selected[month];

          return {
            month,
            rainfall:
              data && data.count > 0
                ? Math.round((data.total / data.count) * 10) / 10
                : 0,
          };
        })
      );
    })
    .catch((error) => {
      console.error("Monthly rainfall CSV loading failed:", error);
      setMonthlyRainfallData([]);
    });
}, [district]);

  const activeRainfall = useManualLocation
  ? Number(manualRainfall)
  : Number(rainfallData[district] ?? rainfall);

const harvestLitres =
  Math.max(0, Number.isFinite(activeRainfall) ? activeRainfall : 0) *
  Math.max(0, Number(roofArea) || 0) *
  Math.max(0, Number(runoff) || 0);

  const daily = Math.max(0, Number(dailyDemand) || 0);
  const daysSupply = daily > 0 ? harvestLitres / daily : 0;
  
const space = Math.max(0, Number(availableSpace) || 0);

const storageDays = 3;

const storageRecommendation =
  daily > 0
    ? Math.min(harvestLitres, daily * storageDays)
    : 0;

const recommendedTankLitres =
  daily > 0
    ? Math.ceil((daily * storageDays) / 1000) * 1000
    : 0;

const storageStatus =
  daily <= 0
    ? "Enter a valid daily water demand."
    : harvestLitres <= 0
    ? "Insufficient estimated rainwater for storage."
    : harvestLitres < daily * storageDays
    ? "Rainwater may cover less than 3 days of demand."
    : "Estimated harvest may cover at least 3 days of demand.";


const rechargeSuitability =
  soilType === "sandy"
    ? "Potentially favourable"
    : soilType === "loamy"
    ? "Potentially suitable"
    : soilType === "clayey"
    ? "Needs careful assessment"
    : soilType === "rocky"
    ? "Site-specific assessment needed"
    : "Insufficient soil information";

const rechargeNote =
  soilType === "sandy"
    ? "Sandy soil may allow faster infiltration, but groundwater quality and site conditions must be checked."
    : soilType === "loamy"
    ? "Loamy soil may support infiltration; confirm local soil conditions and seasonal groundwater levels."
    : soilType === "clayey"
    ? "Clayey soil may restrict infiltration. A qualified professional should assess the site."
    : soilType === "rocky"
    ? "Rock fractures and local geology affect infiltration. A site assessment is required."
    : "Soil information is unknown. Recharge suitability cannot yet be assessed.";

const rechargeSpaceStatus =
  space <= 0
    ? "Enter available space greater than zero for a preliminary space check."
    : space < 10
    ? "Limited available space; a compact design may need professional evaluation."
    : "Space is available for further site evaluation.";

    



const storageOptionLitres = storageRecommendation;

const rechargeOptionLitres =
  harvestLitres > 0 && space > 0
    ? harvestLitres
    : 0;

const combinedStorageLitres = storageOptionLitres;

const combinedRechargeLitres =
  space > 0 && harvestLitres > combinedStorageLitres
    ? harvestLitres - combinedStorageLitres
    : 0;

const comparisonOptions = [
  {
    name: "Storage",
    amount: storageOptionLitres,
    description: "Suggested initial storage volume based on 3 days of demand, capped by estimated annual harvest.",
    benefit: storageStatus,
  },
  {
    name: "Recharge",
    amount: rechargeOptionLitres,
    description: "Potential annual rainwater volume to assess for recharge. This is not a guaranteed groundwater recharge amount.",
    benefit: rechargeSuitability,
  },
  {
    name: "Combined",
    amount: combinedStorageLitres + combinedRechargeLitres,
    description: "A preliminary allocation: initial storage plus remaining volume for recharge assessment.",
    benefit: space > 0
      ? "Storage and potential recharge are shown as separate allocations."
      : "Enter available space to assess a combined option.",
  },
];




const planningRecommendation =
  goal === "storage"
    ? "Prioritise rainwater storage. Size the tank using seasonal rainfall and demand."
    : goal === "recharge"
    ? "Assess groundwater recharge feasibility before selecting a recharge structure."
    : "Compare a storage tank with a professionally assessed recharge option.";


  return (
    

<main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 text-slate-900">
  <header className="relative overflow-hidden bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-800 px-6 py-12 text-white shadow-lg md:py-16">
    <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />

    <div className="pointer-events-none absolute -bottom-24 right-1/3 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

    <div className="relative mx-auto max-w-6xl">
      <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-100">
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        Water • Sustainability • Planning
      </p>

      <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-5xl">
        Smart Rainwater
        <span className="block text-teal-200">
          Harvesting Planner
        </span>
      </h1>

      <p className="mt-5 max-w-2xl text-base leading-7 text-teal-50 md:text-lg">
        Plan rainwater collection for your building using rainfall,
        roof area and daily water demand.
      </p>

      <div className="mt-7 flex flex-wrap gap-3 text-sm">
        <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2">
          📍 Tamil Nadu
        </span>

        <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2">
          🌧️ Rainfall Analysis
        </span>

        <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2">
          💧 Harvest Planning
        </span>
      </div>
    </div>
  </header>




<div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 px-4 py-8 md:px-6 md:py-10 xl:grid-cols-[0.95fr_1.05fr]">

        
<section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:p-8">

          <h2 className="text-xl font-bold">Building details</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your building information to estimate harvest potential.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            
<label className="text-sm font-medium">
  Building type
  <select
    value={buildingType}
    onChange={(e) => {
      setBuildingType(e.target.value);
      setResult(false);
    }}
    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
  >
    <option value="house">House</option>
    <option value="college">College / School</option>
    <option value="commercial">Commercial building</option>
    <option value="industrial">Industrial building</option>
  </select>
</label>

            <label className="text-sm font-medium">
  Location type
  <select
    value={useManualLocation ? "manual" : "district"}
    onChange={(e) => {
      setUseManualLocation(e.target.value === "manual");
      setResult(false);
    }}
    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
  >
    <option value="district">Tamil Nadu district</option>
    <option value="manual">Other location (manual)</option>
  </select>
</label>
{useManualLocation && (
  <div className="space-y-4">
    <label className="block text-sm font-medium">
      Location name
      <input
        type="text"
        value={manualLocation}
        onChange={(e) => {
          setManualLocation(e.target.value);
          setResult(false);
        }}
        placeholder="Enter town or village"
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
      />
    </label>

    <label className="block text-sm font-medium">
      Annual rainfall (mm)
      <input
        type="number"
        min="0"
        value={manualRainfall}
        onChange={(e) => {
          setManualRainfall(e.target.value);
          setResult(false);
        }}
        placeholder="Enter known rainfall"
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
      />
      <span className="mt-1 block text-xs text-slate-500">
        Enter rainfall from a reliable source. The app will not guess this value.
      </span>
    </label>
  </div>
)}
{!useManualLocation && (
            <label className="text-sm font-medium">
              Tamil Nadu district
              <select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setResult(false);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
              >
                {[
                  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore",
                  "Cuddalore", "Dharmapuri", "Dindigul", "Erode",
                  "Kallakurichi", "Kancheepuram", "Kanniyakumari", "Karur",
                  "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam",
                  "Namakkal", "Perambalur", "Pudukkottai", "Ramanathapuram",
                  "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur",
                  "The Nilgiris", "Theni", "Thiruvarur", "Thoothukudi",
                  "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur",
                  "Tiruvallur", "Tiruvannamalai", "Vellore", "Viluppuram",
                  "Virudhunagar"
                ].map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            )}

            <label className="text-sm font-medium">
              Roof area (m²)
              <input
                type="number"
                min="0"
                value={roofArea}
                onChange={(e) => {
                  setRoofArea(e.target.value);
                  setResult(false);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
              />
            </label>
            {!useManualLocation && (

            <label className="text-sm font-medium">
              Annual rainfall (mm)
              <input
                type="number"
                min="0"
                value={rainfallData[district] !== undefined ? String(rainfallData[district]) : rainfall}
                onChange={(e) => {
                  setRainfall(e.target.value);
                  setResult(false);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
              />
              <span className="mt-1 block text-xs font-normal text-amber-700">
                Average annual rainfall from the 2015–2024 CSV dataset, when available.
              </span>
            </label>
            )}

            <label className="text-sm font-medium">
  Roof type
  <select
    value={selectedRoofType}
onChange={(e) => {
  const roofType = e.target.value;
  setSelectedRoofType(roofType);

  const selectedRoof = roofRunoffData.find(
    (item) => item.roofType === roofType
  );

  if (selectedRoof) {
    const average = (selectedRoof.min + selectedRoof.max) / 2;
    setRunoff(average.toFixed(2));
    setResult(false);
  }
}}
    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
  >
    <option value="">Select roof type</option>
    {roofRunoffData.map((item) => (
      <option key={item.roofType} value={item.roofType}>
        {item.roofType} ({item.min}–{item.max})
      </option>
    ))}
  </select>
</label>

            <label className="text-sm font-medium sm:col-span-2">
              Daily water demand (litres)
              <input
                type="number"
                min="0"
                value={dailyDemand}
                onChange={(e) => {
                  setDailyDemand(e.target.value);
                  setResult(false);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
              />
            </label>

            <label className="text-sm font-medium sm:col-span-2">
              Planning goal
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
              >
                <option value="storage">Rainwater storage</option>
                <option value="recharge">Groundwater recharge</option>
                <option value="both">Storage + recharge</option>
              </select>
            </label>
            
<label className="text-sm font-medium sm:col-span-2">
  Available space (m²)
  <input
    type="number"
    min="0"
    value={availableSpace}
    onChange={(e) => {
      setAvailableSpace(e.target.value);
      setResult(false);
    }}
    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
    placeholder="Enter available space"
  />
</label>

<label className="text-sm font-medium sm:col-span-2">
  Soil type (site information)
  <select
    value={soilType}
    onChange={(e) => {
      setSoilType(e.target.value);
      setResult(false);
    }}
    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-teal-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
  >
    <option value="unknown">Not sure / Unknown</option>
    <option value="sandy">Sandy soil</option>
    <option value="loamy">Loamy soil</option>
    <option value="clayey">Clayey soil</option>
    <option value="rocky">Rocky soil</option>
  </select>
  <span className="mt-1 block text-xs font-normal text-slate-500">
    Soil type alone cannot confirm recharge suitability. A site assessment is required.
  </span>
</label>

          </div>

          
<button
  type="button"
  onClick={async () => {
    setResult(true);
    await predictAIRainfall();
  }}
  disabled={aiLoading}
  className="mt-6 w-full rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
>
  {aiLoading ? "Calculating & Predicting..." : "Calculate & Predict"}
</button>

          

        {aiRainfall !== null && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold text-blue-900">
              AI Predicted Annual Rainfall
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-800">
              {aiRainfall} mm
            </p>
            <p className="mt-2 text-sm text-blue-700">
              Experimental model estimate, not an official forecast.
            </p>
          </div>
        )}

        {aiError && (
          <p className="mt-3 text-sm text-red-600">{aiError}</p>
        )}
        </section>
        



        <section className="min-w-0 space-y-5">
          <div className="rounded-2xl bg-teal-900 p-6 text-white shadow-sm">
            <p className="text-sm text-teal-200">Estimated annual harvest</p>
            <p className="mt-2 text-3xl font-bold">
              {result
                ? `${Math.round(harvestLitres).toLocaleString()} L`
                : "—"}
            </p>
            <p className="mt-2 text-sm text-teal-100">
              Rainfall × roof area × runoff coefficient
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Planning summary</h2>
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
  <h3 className="text-base font-semibold text-slate-800">
    Rainfall & Water Demand
  </h3>
  <p className="mt-1 text-sm text-slate-500">
    Estimated annual harvest compared with 30-day water demand.
  </p>

  <div className="mt-4 space-y-4">
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>Annual harvest</span>
        <span>{Math.round(harvestLitres).toLocaleString()} L</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-600"
          style={{
            width: `${
              harvestLitres > 0
                ? Math.max(
                    2,
                    (harvestLitres /
                      Math.max(harvestLitres, daily * 30, 1)) *
                      100
                  )
                : 0
            }%`,
          }}
        />
      </div>
    </div>

    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>30-day water demand</span>
        <span>
          {Math.round(daily * 30).toLocaleString()} L
        </span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-sky-500"
          style={{
            width: `${
              daily > 0
                ? Math.max(
                    2,
                    ((daily * 30) /
                      Math.max(harvestLitres, daily * 30, 1)) *
                      100
                  )
                : 0
            }%`,
          }}
        />
      </div>
    </div>
  </div>
</div>
  
            
{result && (
  <div className="mt-4 space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
    <h3 className="font-bold text-teal-900">
      Smart planning recommendations
    </h3>

    <div>
      <p className="text-sm text-slate-600">
        Initial 3-day storage estimate
      </p>
      <p className="text-lg font-bold text-teal-900">
        {Math.round(storageRecommendation).toLocaleString()} L
      </p>
      <p className="text-xs text-slate-600">
        Preliminary estimate only. Check seasonal rainfall, tank capacity and actual demand.
      </p>
    </div>

    <div>
      <p className="text-sm font-semibold text-slate-700">
        Recommended planning approach
      </p>
     
<div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
  <h3 className="text-lg font-bold text-slate-800">
    Storage vs Recharge vs Combined
  </h3>
  <p className="mt-1 text-sm text-slate-600">
    Compare three rainwater harvesting options for your selected location.
  </p>

  


<div className="mt-6 grid grid-cols-1 gap-4">

  {comparisonOptions.map((option) => (
    <div
      key={option.name}
      
className={`group min-w-0 w-full rounded-2xl border p-5 shadow-sm transition-shadow duration-200 hover:shadow-md ${

        option.name === "Storage"
          ? "border-blue-200 bg-gradient-to-br from-white to-blue-50"
          : option.name === "Recharge"
          ? "border-emerald-200 bg-gradient-to-br from-white to-emerald-50"
          : "border-violet-200 bg-gradient-to-br from-white to-violet-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-lg font-bold text-slate-800">
          {option.name}
        </h4>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            option.name === "Storage"
              ? "bg-blue-100 text-blue-700"
              : option.name === "Recharge"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-violet-100 text-violet-700"
          }`}
        >
          {option.name === "Storage"
            ? "STORE"
            : option.name === "Recharge"
            ? "RECHARGE"
            : "COMBINED"}
        </span>
      </div>

      <p className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
        {Math.round(option.amount).toLocaleString("en-IN")}
        <span className="ml-2 text-base font-semibold text-slate-500">
          litres
        </span>
      </p>

      <div className="my-5 h-px bg-slate-200/80" />

      <p className="text-sm leading-6 text-slate-600">
        {option.description}
      </p>

      <div className="mt-5 rounded-xl bg-white/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Key benefit
        </p>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-800">
          {option.benefit}
        </p>
      </div>
    </div>
  ))}
</div>



    

  <p className="mt-4 text-xs text-slate-500">
    Note: These are preliminary planning options. Recharge suitability
    requires site assessment, safe water quality, and proper design.
  </p>
</div>
 
      <p className="text-sm text-slate-700">{planningRecommendation}</p>
    </div>

    <div>
      <p className="text-sm font-semibold text-slate-700">
        Soil and recharge note
      </p>
      <p className="text-sm text-slate-700">{rechargeNote}</p>
    </div>

    <div>
      <p className="text-sm font-semibold text-slate-700">
        Available space
      </p>
      <p className="text-sm text-slate-700">
        {space.toLocaleString()} m² entered. Actual structure dimensions need separate assessment.
      </p>
    </div>
  </div>
)}

            <div className="mt-4 rounded-xl bg-sky-50 p-4">
  <h3 className="font-semibold text-sky-900">
    Groundwater data — {useManualLocation ? (manualLocation || "Manual location") : district}
  </h3>
  {!useManualLocation && groundwaterData[district] ? (
    <div className="mt-2 space-y-1 text-sm text-sky-900">
      <p>
        Average pre-monsoon depth:{" "}
        {groundwaterData[district].pre} m
      </p>
      <p>
        Average post-monsoon depth:{" "}
        {groundwaterData[district].post} m
      </p>
      <p className="mt-2 text-xs text-sky-800">
        2015–2024 CSV average. Depth is measured below ground level;
        a larger value means the water table is deeper.
      </p>
    </div>
  ) : (
    <p className="mt-2 text-sm text-sky-800">
      Groundwater data is not available for this district.
    </p>
  )}
</div>
            {!result ? (
              <p className="mt-3 text-sm text-slate-500">
                Enter your details and calculate to see the estimate.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">
  {useManualLocation ? "Selected location" : "Selected district"}
</p>
<p className="font-semibold">
  {useManualLocation ? (manualLocation || "Enter location name") : district}
</p>
                  
                </div>
                <div>
                  <p className="text-sm text-slate-500">Days of demand equivalent</p>
                  <p className="font-semibold">
                    {daily > 0 ? `${Math.floor(daysSupply)} days` : "Enter daily demand"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Planning goal</p>
                  <p className="font-semibold">
                    {goal === "both" ? "Storage + recharge" : goal === "storage" ? "Storage" : "Groundwater recharge"}
                  </p>
                </div>
                
{goal === "recharge" && (
  <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
    Groundwater recharge warning: Groundwater depth alone cannot
    confirm that a recharge pit is safe or suitable. Soil permeability,
    local geology, groundwater quality and seasonal conditions must be
    assessed. Consult a qualified groundwater professional before
    choosing a recharge design.
  </p>
)}

{goal === "both" && (
  <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
    Storage + recharge warning: Confirm site suitability before
    groundwater recharge. Groundwater depth alone is not enough to
    determine a safe recharge design. Consult a qualified professional.
  </p>
)}

<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
  Preliminary estimate only. Actual harvest depends on rainfall
  distribution, roof condition, first-flush losses and overflow.
  Confirm storage and recharge design with a qualified professional.
</p>

              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200 px-6 py-5 text-center text-sm text-slate-500">
        Smart Rainwater Harvesting Planner • Preliminary planning estimates
      </footer>
    </main>
  );
}
