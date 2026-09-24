from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict


# ---------- Auth ----------

class ShopCreate(BaseModel):
    shop_name: str
    category: str = "Kirana"
    location: str = ""
    full_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ShopOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: str
    location: str


class ShopUpdate(BaseModel):
    shop_name: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    full_name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: str
    shop: ShopOut


# ---------- Products ----------

class ProductCreate(BaseModel):
    name: str
    category: str = "Groceries"
    unit: str = "unit"
    perishable: bool = False
    current_stock: float = 0
    price: float = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    perishable: Optional[bool] = None
    current_stock: Optional[float] = None
    price: Optional[float] = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: str
    unit: str
    perishable: bool
    current_stock: float
    price: float


class ProductWithPrediction(ProductOut):
    predicted_demand_7d: float = 0
    daily_avg: float = 0
    trend: str = "stable"
    status: str = "healthy"  # healthy | watch | critical | overstock


# ---------- Sales ----------

class SaleCreate(BaseModel):
    product_id: int
    quantity: float
    amount: Optional[float] = None  # if omitted, computed from product.price * quantity
    customer_id: Optional[int] = None
    is_credit: bool = False


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    quantity: float
    amount: float
    sold_at: datetime
    product_name: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    is_credit: bool = False


# ---------- Customers & Credit (Udhaar) ----------

class CustomerCreate(BaseModel):
    name: str
    phone: str = ""
    address: str = ""


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    address: str
    balance: float = 0  # positive = customer owes the shop this much


class CreditTransactionCreate(BaseModel):
    kind: str  # "credit" | "payment"
    amount: float
    note: str = ""


class CreditTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    sale_id: Optional[int] = None
    kind: str
    amount: float
    note: str
    created_at: datetime


# ---------- Alerts ----------

class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_name: Optional[str] = None
    category: Optional[str] = None
    kind: str
    severity: str
    message: str
    is_resolved: bool
    created_at: datetime


# ---------- Analytics ----------

class SalesTrendPoint(BaseModel):
    date: str
    total: float


class CategoryBreakdownPoint(BaseModel):
    category: str
    stock: float


class TopMoverPoint(BaseModel):
    product_id: int
    name: str
    predicted_demand_7d: float


class DashboardSummary(BaseModel):
    today_sales: float
    low_stock_count: int
    active_alerts: int
    estimated_savings: float
    total_credit_outstanding: float = 0
