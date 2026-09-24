from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(80), default="Kirana")
    location = Column(String(150), default="")
    created_at = Column(DateTime, default=utcnow)

    users = relationship("User", back_populates="shop", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="shop", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), default="")
    role = Column(String(30), default="owner")  # owner | staff
    created_at = Column(DateTime, default=utcnow)

    shop = relationship("Shop", back_populates="users")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    name = Column(String(150), nullable=False)
    category = Column(String(80), default="Groceries")
    unit = Column(String(30), default="unit")
    perishable = Column(Boolean, default=False)
    current_stock = Column(Float, default=0)
    price = Column(Float, default=0)  # per-unit selling price, used to estimate sale amounts
    created_at = Column(DateTime, default=utcnow)

    shop = relationship("Shop", back_populates="products")
    sales = relationship("Sale", back_populates="product", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="product", cascade="all, delete-orphan")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    is_credit = Column(Boolean, default=False)
    quantity = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    sold_at = Column(DateTime, default=utcnow)

    product = relationship("Product", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    name = Column(String(150), nullable=False)
    phone = Column(String(30), default="")
    address = Column(String(255), default="")
    created_at = Column(DateTime, default=utcnow)

    sales = relationship("Sale", back_populates="customer")
    credit_transactions = relationship("CreditTransaction", back_populates="customer", cascade="all, delete-orphan")


class CreditTransaction(Base):
    """
    A single udhaar (informal credit) ledger entry for a customer.

    kind="credit"  -> increases what the customer owes (e.g. a credit sale,
                       or a manual adjustment such as a corrected balance).
    kind="payment" -> decreases what the customer owes (money received
                       against their outstanding balance).

    A customer's current balance is simply the sum of all "credit" entries
    minus the sum of all "payment" entries — computed on read, not stored,
    so it can never drift out of sync with the underlying transactions.
    """
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=True)  # set when auto-created from a credit sale
    kind = Column(String(10), nullable=False)  # "credit" | "payment"
    amount = Column(Float, nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)

    customer = relationship("Customer", back_populates="credit_transactions")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, unique=True)
    predicted_demand_7d = Column(Float, default=0)
    daily_avg = Column(Float, default=0)
    trend = Column(String(20), default="stable")  # rising | falling | stable
    computed_at = Column(DateTime, default=utcnow)

    product = relationship("Product")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    kind = Column(String(20), nullable=False)      # reorder | wastage
    severity = Column(String(20), nullable=False)  # critical | watch
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    product = relationship("Product", back_populates="alerts")
