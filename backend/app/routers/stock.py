from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import get_current_user
from app.prediction import status_for

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("", response_model=list[schemas.ProductWithPrediction])
def get_stock(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    products = db.query(models.Product).filter(models.Product.shop_id == user.shop_id).all()

    results = []
    for p in products:
        pred = (
            db.query(models.Prediction)
            .filter(models.Prediction.product_id == p.id)
            .first()
        )
        predicted = pred.predicted_demand_7d if pred else 0.0
        daily_avg = pred.daily_avg if pred else 0.0
        trend = pred.trend if pred else "stable"

        results.append(schemas.ProductWithPrediction(
            id=p.id, name=p.name, category=p.category, unit=p.unit,
            perishable=p.perishable, current_stock=p.current_stock, price=p.price,
            predicted_demand_7d=predicted, daily_avg=daily_avg, trend=trend,
            status=status_for(p, predicted),
        ))
    return results
