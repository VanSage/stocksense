# StockSense — Backend

FastAPI + SQLAlchemy backend for the StockSense demand-prediction platform.
Runs on SQLite out of the box (zero setup) and can be pointed at MySQL by
changing one environment variable.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configure (optional)

```bash
cp .env.example .env
```

By default `DATABASE_URL` is unset, so the app uses a local SQLite file
(`stocksense.db`) — nothing else to install. To use MySQL instead:

1. Uncomment `pymysql` in `requirements.txt` and reinstall.
2. In `.env`, set:
   ```
   DATABASE_URL=mysql+pymysql://USER:PASSWORD@localhost:3306/stocksense
   ```
3. Create the `stocksense` database in MySQL first (`CREATE DATABASE stocksense;`).

## Seed demo data

Populates a demo shop with 14 products and two weeks of realistic sales
history, so the dashboard isn't empty on first run:

```bash
python seed.py
```

Demo login: **owner@sharmastore.in** / **password123**

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API root: http://localhost:8000
- Interactive API docs (Swagger): http://localhost:8000/docs

## Run the test suite

Exercises every endpoint end-to-end (auth, products, sales, stock,
predictions, alerts, analytics, multi-shop data isolation):

```bash
rm -f stocksense.db      # start from a clean database
python tests/test_api.py
```

All checks print `OK:` and the script exits non-zero on the first failure.

## Project structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app, CORS, scheduler, router registration
│   ├── config.py         # environment-driven settings
│   ├── database.py       # SQLAlchemy engine/session
│   ├── models.py         # ORM tables: Shop, User, Product, Sale, Prediction, Alert
│   ├── schemas.py        # Pydantic request/response models
│   ├── security.py       # password hashing + JWT auth
│   ├── prediction.py     # moving-average + trend prediction engine
│   └── routers/
│       ├── auth.py       # signup / login / me
│       ├── products.py   # product CRUD
│       ├── sales.py      # log a sale (auto-updates stock + predictions)
│       ├── stock.py      # live stock list enriched with predictions
│       ├── alerts.py     # list / resolve alerts
│       └── analytics.py  # dashboard summary, trends, top movers
├── seed.py
├── tests/test_api.py
└── requirements.txt
```

## API overview

| Method | Endpoint                     | Description                              |
|--------|-------------------------------|-------------------------------------------|
| POST   | `/auth/signup`                | Create a shop + owner account            |
| POST   | `/auth/login`                 | Get a JWT access token                   |
| GET    | `/auth/me`                    | Current user + shop info                 |
| GET    | `/products`                   | List products for the logged-in shop     |
| POST   | `/products`                   | Create a product                         |
| PATCH  | `/products/{id}`              | Update a product                         |
| DELETE | `/products/{id}`              | Delete a product                         |
| GET    | `/sales`                      | Recent sales                             |
| POST   | `/sales`                      | Log a sale (decrements stock, refreshes predictions) |
| GET    | `/stock`                      | Products enriched with predicted demand + health status |
| GET    | `/alerts`                     | Active reorder/wastage alerts            |
| POST   | `/alerts/{id}/resolve`        | Mark an alert as handled                 |
| GET    | `/analytics/summary`          | Dashboard stat-card numbers              |
| GET    | `/analytics/sales-trend`      | Daily sales totals over N days           |
| GET    | `/analytics/category-breakdown` | Stock grouped by category              |
| GET    | `/analytics/top-movers`       | Highest predicted-demand products        |

All endpoints except `/`, `/health`, `/auth/signup`, and `/auth/login`
require an `Authorization: Bearer <token>` header, and every query is
scoped to the logged-in user's shop — one shop can never see or modify
another shop's data.

A background job (APScheduler) refreshes predictions and alerts for every
shop once every 24 hours, in addition to the immediate refresh that runs
right after each sale is logged.
