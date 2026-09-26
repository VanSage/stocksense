from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.database import Base, engine, SessionLocal
from app.config import CORS_ORIGINS
from app import models
from app.prediction import refresh_predictions
from app.routers import auth, products, sales, stock, alerts, analytics, customers

Base.metadata.create_all(bind=engine)

scheduler = BackgroundScheduler()

def refresh_all_shops():
"""Recomputes predictions/alerts for every shop.
Runs on a schedule so alerts stay fresh even on days with no new sales logged.
"""
db = SessionLocal()
try:
shop_ids = [row[0] for row in db.query(models.Shop.id).all()]
for shop_id in shop_ids:
refresh_predictions(db, shop_id)
finally:
db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
scheduler.add_job(
refresh_all_shops,
"interval",
hours=24,
id="daily_prediction_refresh"
)
scheduler.start()

```
yield

scheduler.shutdown(wait=False)
```

app = FastAPI(
title="StockSense API",
description="Demand prediction and smart restocking API for small retailers.",
version="1.0.0",
lifespan=lifespan,
)

app.add_middleware(
CORSMiddleware,
allow_origins=CORS_ORIGINS,
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
)

# ============================================================

# NORMAL ROUTES - used by localhost/development

# ============================================================

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(stock.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(customers.router)

# ============================================================

# API ROUTES - used by the deployed Vercel frontend

# ============================================================

app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(sales.router, prefix="/api")
app.include_router(stock.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(customers.router, prefix="/api")

@app.get("/")
def root():
return {
"status": "ok",
"service": "StockSense API",
"docs": "/docs"
}

@app.get("/health")
def health():
return {"status": "healthy"}
