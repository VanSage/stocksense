from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import get_current_user

router = APIRouter(prefix="/customers", tags=["customers"])


def _balance_for(db: Session, customer_id: int) -> float:
    """A customer's outstanding udhaar balance: sum of credit entries minus
    sum of payment entries. Computed on read so it can never drift out of
    sync with the underlying ledger."""
    rows = db.query(models.CreditTransaction).filter(
        models.CreditTransaction.customer_id == customer_id
    ).all()
    total = 0.0
    for r in rows:
        total += r.amount if r.kind == "credit" else -r.amount
    return round(total, 2)


def _get_owned_customer(db: Session, customer_id: int, user: models.User) -> models.Customer:
    customer = (
        db.query(models.Customer)
        .filter(models.Customer.id == customer_id, models.Customer.shop_id == user.shop_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return customer


@router.get("", response_model=list[schemas.CustomerOut])
def list_customers(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    customers = db.query(models.Customer).filter(models.Customer.shop_id == user.shop_id).all()
    return [
        schemas.CustomerOut(
            id=c.id, name=c.name, phone=c.phone, address=c.address,
            balance=_balance_for(db, c.id),
        )
        for c in customers
    ]


@router.post("", response_model=schemas.CustomerOut)
def create_customer(
    payload: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    customer = models.Customer(shop_id=user.shop_id, **payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return schemas.CustomerOut(id=customer.id, name=customer.name, phone=customer.phone, address=customer.address, balance=0)


@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    customer = _get_owned_customer(db, customer_id, user)
    return schemas.CustomerOut(
        id=customer.id, name=customer.name, phone=customer.phone, address=customer.address,
        balance=_balance_for(db, customer.id),
    )


@router.patch("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(
    customer_id: int,
    payload: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    customer = _get_owned_customer(db, customer_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return schemas.CustomerOut(
        id=customer.id, name=customer.name, phone=customer.phone, address=customer.address,
        balance=_balance_for(db, customer.id),
    )


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    customer = _get_owned_customer(db, customer_id, user)
    db.delete(customer)
    db.commit()
    return {"detail": "Customer deleted."}


@router.get("/{customer_id}/transactions", response_model=list[schemas.CreditTransactionOut])
def list_transactions(customer_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    _get_owned_customer(db, customer_id, user)  # ownership check
    rows = (
        db.query(models.CreditTransaction)
        .filter(models.CreditTransaction.customer_id == customer_id)
        .order_by(models.CreditTransaction.created_at.desc())
        .all()
    )
    return rows


@router.post("/{customer_id}/transactions", response_model=schemas.CreditTransactionOut)
def add_transaction(
    customer_id: int,
    payload: schemas.CreditTransactionCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    customer = _get_owned_customer(db, customer_id, user)

    if payload.kind not in ("credit", "payment"):
        raise HTTPException(status_code=400, detail="kind must be 'credit' or 'payment'.")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    txn = models.CreditTransaction(
        shop_id=user.shop_id,
        customer_id=customer.id,
        kind=payload.kind,
        amount=payload.amount,
        note=payload.note,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn
