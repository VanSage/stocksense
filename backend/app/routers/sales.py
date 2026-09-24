from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import get_current_user
from app.prediction import refresh_predictions

router = APIRouter(prefix="/sales", tags=["sales"])


def _to_sale_out(s: models.Sale) -> schemas.SaleOut:
    return schemas.SaleOut(
        id=s.id, product_id=s.product_id, quantity=s.quantity,
        amount=s.amount, sold_at=s.sold_at,
        product_name=s.product.name if s.product else None,
        customer_id=s.customer_id,
        customer_name=s.customer.name if s.customer else None,
        is_credit=s.is_credit,
    )


@router.get("", response_model=list[schemas.SaleOut])
def list_sales(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    sales = (
        db.query(models.Sale)
        .filter(models.Sale.shop_id == user.shop_id)
        .order_by(models.Sale.sold_at.desc())
        .limit(limit)
        .all()
    )
    return [_to_sale_out(s) for s in sales]


@router.post("", response_model=schemas.SaleOut)
def log_sale(
    payload: schemas.SaleCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == payload.product_id, models.Product.shop_id == user.shop_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

    customer = None
    if payload.customer_id is not None:
        customer = (
            db.query(models.Customer)
            .filter(models.Customer.id == payload.customer_id, models.Customer.shop_id == user.shop_id)
            .first()
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found.")

    if payload.is_credit and customer is None:
        raise HTTPException(status_code=400, detail="A customer must be selected to sell on credit.")

    amount = payload.amount if payload.amount is not None else round(payload.quantity * product.price, 2)

    sale = models.Sale(
        shop_id=user.shop_id,
        product_id=product.id,
        customer_id=customer.id if customer else None,
        is_credit=payload.is_credit,
        quantity=payload.quantity,
        amount=amount,
    )
    db.add(sale)

    # Stock can't go negative — clamp at zero rather than erroring, since a
    # shop owner logging sales after the fact shouldn't be blocked by a
    # stock-count mismatch.
    product.current_stock = max(0.0, product.current_stock - payload.quantity)

    db.commit()
    db.refresh(sale)

    # A credit sale immediately becomes a ledger entry: the customer now
    # owes the shop this amount. Linking sale_id lets the ledger show
    # exactly which sale a credit entry came from.
    if payload.is_credit and customer is not None:
        txn = models.CreditTransaction(
            shop_id=user.shop_id,
            customer_id=customer.id,
            sale_id=sale.id,
            kind="credit",
            amount=amount,
            note=f"Credit sale: {product.name} x{payload.quantity}",
        )
        db.add(txn)
        db.commit()

    refresh_predictions(db, user.shop_id)

    return _to_sale_out(sale)
