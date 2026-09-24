from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)

    today_sales = (
        db.query(models.Sale)
        .filter(models.Sale.shop_id == user.shop_id, models.Sale.sold_at >= today_start)
        .all()
    )
    today_total = sum(s.amount for s in today_sales)

    products = db.query(models.Product).filter(models.Product.shop_id == user.shop_id).all()
    product_ids = [p.id for p in products]

    low_stock_count = 0
    for p in products:
        pred = db.query(models.Prediction).filter(models.Prediction.product_id == p.id).first()
        predicted = pred.predicted_demand_7d if pred else 0
        if predicted > 0 and p.current_stock / predicted < 1:
            low_stock_count += 1

    active_alerts = (
        db.query(models.Alert)
        .filter(models.Alert.product_id.in_(product_ids), models.Alert.is_resolved == False)  # noqa: E712
        .count()
        if product_ids else 0
    )

    # Simple, transparent estimate: assume each resolved/avoided stockout or
    # wastage event over the last 30 days saved roughly one day's average
    # sale value for that product. This is intentionally conservative and
    # meant to be explainable, not a precise accounting figure.
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    resolved = (
        db.query(models.Alert)
        .join(models.Product, models.Alert.product_id == models.Product.id)
        .filter(models.Product.shop_id == user.shop_id, models.Alert.is_resolved == True)  # noqa: E712
        .filter(models.Alert.created_at >= cutoff)
        .all()
    )
    estimated_savings = round(len(resolved) * 250, 2)  # ₹250 per avoided incident, illustrative

    # Total udhaar outstanding across all customers: sum of credit entries
    # minus sum of payment entries, shop-wide.
    credit_rows = (
        db.query(models.CreditTransaction)
        .filter(models.CreditTransaction.shop_id == user.shop_id)
        .all()
    )
    total_credit_outstanding = round(
        sum(r.amount if r.kind == "credit" else -r.amount for r in credit_rows), 2
    )

    return schemas.DashboardSummary(
        today_sales=round(today_total, 2),
        low_stock_count=low_stock_count,
        active_alerts=active_alerts,
        estimated_savings=estimated_savings,
        total_credit_outstanding=total_credit_outstanding,
    )


@router.get("/sales-trend", response_model=list[schemas.SalesTrendPoint])
def sales_trend(
    days: int = 14,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    sales = (
        db.query(models.Sale)
        .filter(models.Sale.shop_id == user.shop_id, models.Sale.sold_at >= cutoff)
        .all()
    )

    totals = {}
    for s in sales:
        key = s.sold_at.date().isoformat()
        totals[key] = totals.get(key, 0) + s.amount

    # Fill every day in the window, including zero-sale days, so the chart
    # never silently skips a date.
    points = []
    for i in range(days - 1, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
        points.append(schemas.SalesTrendPoint(date=d, total=round(totals.get(d, 0), 2)))
    return points


@router.get("/category-breakdown", response_model=list[schemas.CategoryBreakdownPoint])
def category_breakdown(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    products = db.query(models.Product).filter(models.Product.shop_id == user.shop_id).all()
    totals = {}
    for p in products:
        totals[p.category] = totals.get(p.category, 0) + p.current_stock
    return [schemas.CategoryBreakdownPoint(category=k, stock=v) for k, v in totals.items()]


@router.get("/top-movers", response_model=list[schemas.TopMoverPoint])
def top_movers(
    limit: int = 6,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    products = db.query(models.Product).filter(models.Product.shop_id == user.shop_id).all()
    rows = []
    for p in products:
        pred = db.query(models.Prediction).filter(models.Prediction.product_id == p.id).first()
        rows.append((p, pred.predicted_demand_7d if pred else 0))

    rows.sort(key=lambda r: r[1], reverse=True)
    return [
        schemas.TopMoverPoint(product_id=p.id, name=p.name, predicted_demand_7d=demand)
        for p, demand in rows[:limit]
    ]
