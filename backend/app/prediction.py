"""
StockSense prediction engine.

Deliberately uses a lightweight, explainable moving-average + trend model
instead of a heavier ML approach — see the project synopsis (Section 2.2)
for the reasoning: it's fast, needs little data, and its output can be
explained in one sentence to a shop owner.
"""
from datetime import datetime, timedelta, timezone

import pandas as pd
from sqlalchemy.orm import Session

from app import models

LOOKBACK_DAYS = 14
FORECAST_DAYS = 7


def _sales_dataframe(db: Session, product_id: int) -> pd.DataFrame:
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    rows = (
        db.query(models.Sale)
        .filter(models.Sale.product_id == product_id, models.Sale.sold_at >= cutoff)
        .all()
    )
    if not rows:
        return pd.DataFrame(columns=["date", "quantity"])

    df = pd.DataFrame([{"date": r.sold_at.date(), "quantity": r.quantity} for r in rows])
    daily = df.groupby("date")["quantity"].sum().reset_index()

    # Reindex to include zero-sale days within the lookback window so the
    # average isn't skewed upward by only counting days with activity.
    full_range = pd.date_range(end=datetime.now(timezone.utc).date(), periods=LOOKBACK_DAYS)
    daily = daily.set_index("date").reindex(full_range.date, fill_value=0).reset_index()
    daily.columns = ["date", "quantity"]
    return daily


def predict_for_product(db: Session, product: models.Product) -> dict:
    """Returns predicted_demand_7d, daily_avg, and a simple trend label."""
    daily = _sales_dataframe(db, product.id)

    if daily.empty or daily["quantity"].sum() == 0:
        # No sales history yet — fall back to a conservative estimate so the
        # UI has something sensible to show instead of a hard zero.
        return {"daily_avg": 0.0, "predicted_demand_7d": 0.0, "trend": "stable"}

    daily_avg = float(daily["quantity"].tail(7).mean())
    predicted_demand_7d = round(daily_avg * FORECAST_DAYS, 1)

    # Trend: compare the most recent half of the window to the earlier half.
    half = len(daily) // 2
    recent_avg = daily["quantity"].tail(half).mean() if half else daily_avg
    earlier_avg = daily["quantity"].head(half).mean() if half else daily_avg

    if earlier_avg == 0 and recent_avg > 0:
        trend = "rising"
    elif earlier_avg > 0 and recent_avg >= earlier_avg * 1.15:
        trend = "rising"
    elif earlier_avg > 0 and recent_avg <= earlier_avg * 0.85:
        trend = "falling"
    else:
        trend = "stable"

    return {
        "daily_avg": round(daily_avg, 2),
        "predicted_demand_7d": predicted_demand_7d,
        "trend": trend,
    }


def status_for(product: models.Product, predicted_demand_7d: float) -> str:
    """Classifies a product's stock health for UI display and alerting."""
    if predicted_demand_7d <= 0:
        return "healthy"

    ratio = product.current_stock / predicted_demand_7d

    if product.perishable and ratio > 1.8:
        return "overstock"
    if ratio < 0.5:
        return "critical"
    if ratio < 1:
        return "watch"
    return "healthy"


def refresh_predictions(db: Session, shop_id: int) -> None:
    """Recomputes and upserts predictions for every product in a shop, then
    regenerates open alerts to match the latest numbers."""
    products = db.query(models.Product).filter(models.Product.shop_id == shop_id).all()

    for product in products:
        result = predict_for_product(db, product)

        pred = (
            db.query(models.Prediction)
            .filter(models.Prediction.product_id == product.id)
            .first()
        )
        if pred is None:
            pred = models.Prediction(product_id=product.id)
            db.add(pred)

        pred.daily_avg = result["daily_avg"]
        pred.predicted_demand_7d = result["predicted_demand_7d"]
        pred.trend = result["trend"]
        pred.computed_at = datetime.now(timezone.utc)

    db.commit()

    _regenerate_alerts(db, shop_id)


def _regenerate_alerts(db: Session, shop_id: int) -> None:
    products = db.query(models.Product).filter(models.Product.shop_id == shop_id).all()

    # Clear unresolved auto-generated alerts before recomputing, so alerts
    # never go stale after new sales are logged.
    db.query(models.Alert).filter(
        models.Alert.product_id.in_([p.id for p in products]),
        models.Alert.is_resolved == False,  # noqa: E712
    ).delete(synchronize_session=False)

    for product in products:
        pred = (
            db.query(models.Prediction)
            .filter(models.Prediction.product_id == product.id)
            .first()
        )
        predicted = pred.predicted_demand_7d if pred else 0
        status = status_for(product, predicted)

        if status == "critical":
            db.add(models.Alert(
                product_id=product.id, kind="reorder", severity="critical",
                message=f"{product.name} is projected to run out within ~2 days at current sales pace.",
            ))
        elif status == "watch":
            db.add(models.Alert(
                product_id=product.id, kind="reorder", severity="watch",
                message=f"{product.name} will likely fall short within the week — plan a reorder.",
            ))
        elif status == "overstock":
            db.add(models.Alert(
                product_id=product.id, kind="wastage", severity="watch",
                message=f"{product.name} stock is well above predicted demand — risk of spoilage before it sells.",
            ))

    db.commit()
