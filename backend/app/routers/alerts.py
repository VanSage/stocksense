from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[schemas.AlertOut])
def list_alerts(
    include_resolved: bool = False,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Alert)
        .join(models.Product, models.Alert.product_id == models.Product.id)
        .filter(models.Product.shop_id == user.shop_id)
    )
    if not include_resolved:
        query = query.filter(models.Alert.is_resolved == False)  # noqa: E712

    alerts = query.order_by(models.Alert.created_at.desc()).all()
    out = []
    for a in alerts:
        out.append(schemas.AlertOut(
            id=a.id, product_id=a.product_id,
            product_name=a.product.name if a.product else None,
            category=a.product.category if a.product else None,
            kind=a.kind, severity=a.severity, message=a.message,
            is_resolved=a.is_resolved, created_at=a.created_at,
        ))
    return out


@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    alert = (
        db.query(models.Alert)
        .join(models.Product, models.Alert.product_id == models.Product.id)
        .filter(models.Alert.id == alert_id, models.Product.shop_id == user.shop_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.is_resolved = True
    db.commit()
    return {"detail": "Alert marked as handled."}
