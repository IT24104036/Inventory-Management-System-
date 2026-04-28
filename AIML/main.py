import os
import math
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import sklearn
from fastapi import FastAPI


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
DEFAULT_MODEL_PATH = OUTPUT_DIR / "random_forest_model.pkl"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH)))
DECISION_THRESHOLD = float(os.getenv("RISK_DECISION_THRESHOLD", "0.4"))
ALERT_WINDOW_DAYS = int(os.getenv("RISK_ALERT_WINDOW_DAYS", "7"))

FEATURE_META = pd.read_json(OUTPUT_DIR / "feature_list.json", typ="series")
FEATURES = list(FEATURE_META["features"])
FEATURE_MEDIANS = {key: float(value) for key, value in FEATURE_META["feature_medians"].items()}

ENCODING_MAPS = pd.read_json(OUTPUT_DIR / "encoding_maps.json", typ="series")
CATEGORY_MAP = dict(ENCODING_MAPS.get("category_map", {}))
REGION_MAP = dict(ENCODING_MAPS.get("region_map", {}))

def configure_loaded_model(loaded_model: Any) -> Any:
    if hasattr(loaded_model, "set_params"):
        for params in (
            {"n_jobs": 1},
            {"classifier__n_jobs": 1},
            {"random_forest__n_jobs": 1},
        ):
            try:
                loaded_model.set_params(**params)
                return loaded_model
            except Exception:
                continue

    named_steps = getattr(loaded_model, "named_steps", None)
    if isinstance(named_steps, dict):
        for step in named_steps.values():
            if hasattr(step, "set_params"):
                try:
                    step.set_params(n_jobs=1)
                except Exception:
                    pass
    return loaded_model


model = configure_loaded_model(joblib.load(MODEL_PATH))
app = FastAPI(title="Invigo FreshGuard AIML")


def number(value: Any, fallback: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return float(fallback)
    if pd.isna(result) or result in (float("inf"), float("-inf")):
        return float(fallback)
    return float(result)


def safe_div(numerator: Any, denominator: Any, fallback: float = 0.0) -> float:
    den = number(denominator, 0.0)
    if den == 0:
        return float(fallback)
    return number(numerator, 0.0) / den


def normalize_category(raw: Any) -> str:
    value = str(raw or "").strip().replace("-", "_").replace(" ", "_")
    lower = value.lower()
    if not lower:
        return "Other"
    if "bakery" in lower or "bread" in lower:
        return "Bakery"
    if "beverage" in lower or "drink" in lower or "juice" in lower:
        return "Beverages"
    if "dairy" in lower or "milk" in lower:
        return "Dairy"
    if "deli" in lower:
        return "Deli"
    if "frozen" in lower:
        return "Frozen_Meals"
    if "meat" in lower or "chicken" in lower or "beef" in lower:
        return "Meat"
    if "pharma" in lower or "medicine" in lower or "vaccine" in lower:
        return "Pharmaceuticals"
    if "produce" in lower or "fruit" in lower or "vegetable" in lower:
        return "Produce"
    if "ready" in lower:
        return "Ready_to_Eat"
    if "seafood" in lower or "fish" in lower or "shrimp" in lower:
        return "Seafood"
    return value


def build_feature_row(payload: dict[str, Any]) -> tuple[pd.DataFrame, dict[str, float]]:
    row = dict(payload or {})
    features = dict(FEATURE_MEDIANS)

    days_until_expiry = number(
        row.get("days_until_expiry"),
        number(row.get("days_to_expiry_at_arrival"), FEATURE_MEDIANS.get("days_until_expiry", 0.0)),
    )
    shelf_life_days = number(
        row.get("shelf_life_days"),
        max(number(row.get("days_to_expiry_at_arrival"), days_until_expiry), days_until_expiry, 1.0),
    )
    initial_quantity = max(number(row.get("initial_quantity"), FEATURE_MEDIANS.get("initial_quantity", 0.0)), 0.0)
    units_sold = max(number(row.get("units_sold"), 0.0), 0.0)
    remaining_quantity = row.get("remaining_quantity")
    if remaining_quantity is None:
        remaining_quantity = max(initial_quantity - units_sold, 0.0)
    else:
        remaining_quantity = max(number(remaining_quantity, 0.0), 0.0)
    if initial_quantity <= 0:
        initial_quantity = remaining_quantity + units_sold

    daily_demand = max(
        number(
            row.get("daily_demand"),
            number(row.get("average_daily_sales"), FEATURE_MEDIANS.get("daily_demand", 0.0)),
        ),
        0.0,
    )
    sell_through_rate = row.get("sell_through_rate")
    if sell_through_rate is None:
        sell_through_rate = safe_div(units_sold, initial_quantity, FEATURE_MEDIANS.get("sell_through_rate", 0.0))
    sell_through_rate = min(max(number(sell_through_rate, 0.0), 0.0), 1.0)

    stock_pressure_ratio = row.get("stock_pressure_ratio")
    if stock_pressure_ratio is None:
        stock_pressure_ratio = safe_div(remaining_quantity, max(daily_demand, 1.0), FEATURE_MEDIANS.get("stock_pressure_ratio", 0.0))
    stock_pressure_ratio = max(number(stock_pressure_ratio, 0.0), 0.0)

    velocity_score = row.get("velocity_score")
    if velocity_score is None:
        velocity_score = safe_div(daily_demand, max(shelf_life_days, 1.0), FEATURE_MEDIANS.get("velocity_score", 0.0))

    expiry_pressure_index = row.get("expiry_pressure_index")
    if expiry_pressure_index is None:
        expiry_pressure_index = safe_div(stock_pressure_ratio, days_until_expiry + 1.0, FEATURE_MEDIANS.get("expiry_pressure_index", 0.0))

    category = normalize_category(row.get("category", "Other"))
    category_encoded = None if "category" in row else row.get("category_encoded")
    if category_encoded is None:
        category_encoded = CATEGORY_MAP.get(category, FEATURE_MEDIANS.get("category_encoded", 5.0))

    region = str(row.get("region", "")).strip()
    region_encoded = row.get("region_encoded")
    if region_encoded is None:
        region_encoded = REGION_MAP.get(region, FEATURE_MEDIANS.get("region_encoded", 2.0))

    features.update(
        {
            "days_until_expiry": max(days_until_expiry, 0.0),
            "initial_quantity": initial_quantity,
            "shelf_life_days": max(shelf_life_days, 1.0),
            "storage_temp": number(row.get("storage_temp"), FEATURE_MEDIANS.get("storage_temp", 4.0)),
            "temp_deviation": max(number(row.get("temp_deviation"), FEATURE_MEDIANS.get("temp_deviation", 1.4)), 0.0),
            "spoilage_sensitivity": min(max(number(row.get("spoilage_sensitivity"), 0.5), 0.0), 1.0),
            "units_sold": units_sold,
            "daily_demand": daily_demand,
            "sell_through_rate": sell_through_rate,
            "remaining_quantity": remaining_quantity,
            "stock_pressure_ratio": stock_pressure_ratio,
            "velocity_score": max(number(velocity_score, 0.0), 0.0),
            "sales_volatility": min(
                max(number(row.get("sales_volatility"), number(row.get("demand_variability"), 0.3)), 0.0),
                3.0,
            ),
            "expiry_pressure_index": max(number(expiry_pressure_index, 0.0), 0.0),
            "price_margin_ratio": number(row.get("price_margin_ratio"), FEATURE_MEDIANS.get("price_margin_ratio", 0.4494)),
            "category_encoded": int(number(category_encoded, FEATURE_MEDIANS.get("category_encoded", 5.0))),
            "region_encoded": int(number(region_encoded, FEATURE_MEDIANS.get("region_encoded", 2.0))),
            "is_weekend": 1 if int(number(row.get("is_weekend"), 0)) == 1 else 0,
            "is_promoted": 1 if int(number(row.get("is_promoted"), 0)) == 1 else 0,
            "handling_score": min(max(number(row.get("handling_score"), 7.0), 0.0), 10.0),
            "packaging_score": min(max(number(row.get("packaging_score"), 7.0), 0.0), 10.0),
            "supplier_score": min(max(number(row.get("supplier_score"), 9.0), 0.0), 10.0),
        }
    )
    return pd.DataFrame([{name: features[name] for name in FEATURES}]), features


def map_risk_action(probability: float, features: dict[str, float]) -> tuple[str, str, float]:
    if features["remaining_quantity"] <= 0:
        return "Low Risk", "No live stock remaining", 0.0
    if features["days_until_expiry"] <= 0 and features["remaining_quantity"] > 0:
        return "High Risk", "Expired stock: remove from shelf and record waste", 0.0
    if probability > 0.70:
        return "High Risk", "Show alert and suggest 30% discount", 30.0
    if probability >= 0.40:
        return "Warning", "Monitor closely and consider 15% discount", 15.0
    return "Low Risk", "No action needed", 0.0


def engineered_feature_summary(features: dict[str, float]) -> dict[str, float]:
    """Expose the viva-friendly engineered inputs used for the prediction."""
    keys = [
        "days_until_expiry",
        "initial_quantity",
        "units_sold",
        "daily_demand",
        "sell_through_rate",
        "remaining_quantity",
        "stock_pressure_ratio",
        "velocity_score",
        "expiry_pressure_index",
        "spoilage_sensitivity",
        "packaging_score",
        "supplier_score",
    ]
    return {key: round(number(features.get(key), 0.0), 4) for key in keys}


def sales_pace_metrics(features: dict[str, float]) -> dict[str, Any]:
    days_left = max(number(features.get("days_until_expiry"), 0.0), 0.0)
    remaining_quantity = max(number(features.get("remaining_quantity"), 0.0), 0.0)
    daily_demand = max(number(features.get("daily_demand"), 0.0), 0.0)

    if remaining_quantity <= 0:
        return {
            "estimated_days_to_sell": 0.0,
            "sales_capacity_before_expiry": 0.0,
            "sales_pace_coverage_ratio": 1.0,
            "sales_pace_risk_probability": 0.0,
            "sales_pace_sell_through_probability": 1.0,
            "sales_pace_message": "No live stock remaining.",
        }

    if daily_demand <= 0:
        return {
            "estimated_days_to_sell": None,
            "sales_capacity_before_expiry": 0.0,
            "sales_pace_coverage_ratio": 0.0,
            "sales_pace_risk_probability": 1.0,
            "sales_pace_sell_through_probability": 0.0,
            "sales_pace_message": "No recent daily sales pace is available, so stock is unlikely to clear without action.",
        }

    estimated_days_to_sell = remaining_quantity / daily_demand
    sales_capacity = daily_demand * days_left
    coverage_ratio = max(0.0, min(1.0, sales_capacity / remaining_quantity))

    # The training data's expiry-risk probability follows this same idea:
    # positive gap means stock needs more days to sell than it has before expiry.
    gap = estimated_days_to_sell - days_left
    sales_risk = 1.0 / (1.0 + math.exp(-gap / 10.0))
    sales_risk = max(0.0, min(1.0, sales_risk))
    sales_sell_through = 1.0 - sales_risk

    if estimated_days_to_sell <= days_left:
        message = f"At the current sales pace, this stock needs about {estimated_days_to_sell:.1f} days to sell and has {days_left:.0f} days left."
    else:
        message = f"At the current sales pace, this stock needs about {estimated_days_to_sell:.1f} days to sell but only has {days_left:.0f} days left."

    return {
        "estimated_days_to_sell": estimated_days_to_sell,
        "sales_capacity_before_expiry": sales_capacity,
        "sales_pace_coverage_ratio": coverage_ratio,
        "sales_pace_risk_probability": sales_risk,
        "sales_pace_sell_through_probability": sales_sell_through,
        "sales_pace_message": message,
    }


def predict_one(payload: dict[str, Any]) -> dict[str, Any]:
    feature_df, features = build_feature_row(payload)

    if features["remaining_quantity"] <= 0:
        model_probability = 0.0
    else:
        model_probability = float(model.predict_proba(feature_df)[0][1])
        if features["days_until_expiry"] <= 0:
            model_probability = max(model_probability, 0.95)

    pace = sales_pace_metrics(features)
    probability = model_probability
    if features["remaining_quantity"] > 0:
        probability = (model_probability * 0.35) + (pace["sales_pace_risk_probability"] * 0.65)
        probability = max(0.0, min(1.0, probability))

    risk_label, suggested_action, suggested_discount_pct = map_risk_action(probability, features)
    sell_through_probability = max(0.0, min(1.0, 1.0 - probability))
    return {
        "expiry_risk_probability": round(probability, 4),
        "model_expiry_risk_probability": round(model_probability, 4),
        "sell_through_before_expiry_probability": round(sell_through_probability, 4),
        "suggested_discount_pct": suggested_discount_pct,
        "engineered_features": engineered_feature_summary(features),
        "estimated_days_to_sell": round(pace["estimated_days_to_sell"], 4) if pace["estimated_days_to_sell"] is not None else None,
        "sales_capacity_before_expiry": round(pace["sales_capacity_before_expiry"], 4),
        "sales_pace_coverage_ratio": round(pace["sales_pace_coverage_ratio"], 4),
        "sales_pace_risk_probability": round(pace["sales_pace_risk_probability"], 4),
        "sales_pace_sell_through_probability": round(pace["sales_pace_sell_through_probability"], 4),
        "sales_pace_message": pace["sales_pace_message"],
        "predicted_label": 1 if probability >= DECISION_THRESHOLD else 0,
        "risk_label": risk_label,
        "suggested_action": suggested_action,
        "decision_threshold": DECISION_THRESHOLD,
        "prediction_source": "AIML_RANDOM_FOREST",
    }


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "Invigo FreshGuard AIML"}


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_path": str(MODEL_PATH),
        "feature_count": len(FEATURES),
        "decision_threshold": DECISION_THRESHOLD,
        "alert_window_days": ALERT_WINDOW_DAYS,
        "sklearn_version": sklearn.__version__,
    }


@app.post("/predict")
def predict(payload: dict[str, Any]) -> dict[str, Any]:
    return predict_one(payload)


@app.post("/predict-batch")
def predict_batch(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results = []
    for item in items:
        batch_id = item.get("batch_id")
        features = item.get("features", item)
        try:
            row = predict_one(features)
            row["batch_id"] = batch_id
            results.append(row)
        except Exception as exc:
            results.append({"batch_id": batch_id, "error": str(exc)})
    return results
