"""
Seeds the database with a demo shop, product catalog, and ~14 days of
realistic sales history, so the app is immediately usable after setup
instead of showing an empty dashboard.

Usage:  python seed.py
"""
import random
from datetime import datetime, timedelta, timezone

from app.database import Base, engine, SessionLocal
from app import models
from app.security import hash_password
from app.prediction import refresh_predictions

Base.metadata.create_all(bind=engine)

DEMO_EMAIL = "owner@sharmastore.in"
DEMO_PASSWORD = "password123"

PRODUCTS = [
    dict(name="Sunflower Cooking Oil (1L)", category="Groceries", unit="bottle", perishable=False, current_stock=6, price=180),
    dict(name="Toned Milk (500ml)", category="Dairy", unit="packet", perishable=True, current_stock=14, price=30),
    dict(name="Basmati Rice (5kg)", category="Groceries", unit="bag", perishable=False, current_stock=18, price=410),
    dict(name="Brown Bread", category="Bakery", unit="loaf", perishable=True, current_stock=5, price=45),
    dict(name="Paracetamol 500mg (Strip)", category="Pharmacy", unit="strip", perishable=False, current_stock=9, price=20),
    dict(name="Toor Dal (1kg)", category="Groceries", unit="bag", perishable=False, current_stock=26, price=140),
    dict(name="Notebook - 200pg", category="Stationery", unit="piece", perishable=False, current_stock=48, price=60),
    dict(name="Curd (400g Cup)", category="Dairy", unit="cup", perishable=True, current_stock=21, price=35),
    dict(name="Cola 750ml (Pack of 6)", category="Beverages", unit="pack", perishable=False, current_stock=8, price=210),
    dict(name="Detergent Powder (1kg)", category="Household", unit="packet", perishable=False, current_stock=15, price=95),
    dict(name="Face Wash 100ml", category="Personal Care", unit="bottle", perishable=False, current_stock=12, price=140),
    dict(name="Sanitary Pads (Pack)", category="Pharmacy", unit="pack", perishable=False, current_stock=7, price=65),
    dict(name="Ballpoint Pens (Box of 10)", category="Stationery", unit="box", perishable=False, current_stock=33, price=60),
    dict(name="Paneer (200g)", category="Dairy", unit="pack", perishable=True, current_stock=19, price=80),
]

# Weekly demand pattern per product, used to generate realistic-looking
# sales history (units/day roughly proportional to the gap between current
# stock and a healthy stock level, so alerts have something to trigger on).
DEMAND_HINT = {
    "Sunflower Cooking Oil (1L)": 3.0,
    "Toned Milk (500ml)": 4.5,
    "Basmati Rice (5kg)": 1.2,
    "Brown Bread": 2.3,
    "Paracetamol 500mg (Strip)": 2.7,
    "Toor Dal (1kg)": 1.5,
    "Notebook - 200pg": 1.4,
    "Curd (400g Cup)": 1.7,
    "Cola 750ml (Pack of 6)": 3.4,
    "Detergent Powder (1kg)": 1.1,
    "Face Wash 100ml": 0.8,
    "Sanitary Pads (Pack)": 2.4,
    "Ballpoint Pens (Box of 10)": 1.0,
    "Paneer (200g)": 1.4,
}


def run():
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == DEMO_EMAIL).first()
        if existing:
            print(f"Demo account already exists ({DEMO_EMAIL}). Skipping seed.")
            return

        shop = models.Shop(name="Sharma General Store", category="Kirana", location="Sonipat, Haryana")
        db.add(shop)
        db.commit()
        db.refresh(shop)

        user = models.User(
            shop_id=shop.id,
            email=DEMO_EMAIL,
            hashed_password=hash_password(DEMO_PASSWORD),
            full_name="Rohit Sharma",
            role="owner",
        )
        db.add(user)
        db.commit()

        product_objs = []
        for p in PRODUCTS:
            product = models.Product(shop_id=shop.id, **p)
            db.add(product)
            product_objs.append(product)
        db.commit()
        for p in product_objs:
            db.refresh(p)

        # Generate 14 days of sales history with mild randomness so the
        # trend/moving-average logic has something realistic to chew on.
        random.seed(42)
        now = datetime.now(timezone.utc)
        for product in product_objs:
            base_rate = DEMAND_HINT.get(product.name, 1.0)
            for day_offset in range(13, -1, -1):
                day = now - timedelta(days=day_offset)
                weekend_boost = 1.4 if day.weekday() >= 5 else 1.0
                expected = base_rate * weekend_boost
                qty = max(0, round(random.gauss(expected, expected * 0.35), 0))
                if qty <= 0:
                    continue
                sale = models.Sale(
                    shop_id=shop.id,
                    product_id=product.id,
                    quantity=qty,
                    amount=round(qty * product.price, 2),
                    sold_at=day.replace(hour=random.randint(9, 20), minute=random.randint(0, 59)),
                )
                db.add(sale)
        db.commit()

        refresh_predictions(db, shop.id)

        print("Seed complete.")
        print(f"  Shop:  {shop.name}")
        print(f"  Login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
