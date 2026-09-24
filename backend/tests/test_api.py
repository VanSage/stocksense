"""
End-to-end API test using FastAPI's TestClient (runs the app in-process,
no separate server needed). Exercises every endpoint the frontend depends
on and fails loudly on the first problem.

Run from the backend/ directory with:
    python -m tests.test_api
or:
    pytest tests/test_api.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def check(condition, message):
    if not condition:
        print(f"FAIL: {message}")
        sys.exit(1)
    print(f"OK:   {message}")


def run():
    # ---------- Root / health ----------
    r = client.get("/")
    check(r.status_code == 200, "GET / returns 200")

    r = client.get("/health")
    check(r.status_code == 200 and r.json()["status"] == "healthy", "GET /health returns healthy")

    # ---------- Signup ----------
    r = client.post("/auth/signup", json={
        "shop_name": "Test Kirana Store",
        "category": "Kirana",
        "location": "Test City",
        "full_name": "Test Owner",
        "email": "test@example.com",
        "password": "testpass123",
    })
    check(r.status_code == 200, f"POST /auth/signup -> {r.status_code} {r.text}")
    token = r.json()["access_token"]
    check(bool(token), "Signup returns an access token")
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/auth/signup", json={
        "shop_name": "Dup", "full_name": "Dup", "email": "test@example.com", "password": "x"
    })
    check(r.status_code == 400, "Duplicate signup correctly rejected with 400")

    # ---------- Login ----------
    r = client.post("/auth/login", json={"email": "test@example.com", "password": "testpass123"})
    check(r.status_code == 200, "POST /auth/login succeeds with correct password")

    r = client.post("/auth/login", json={"email": "test@example.com", "password": "wrong"})
    check(r.status_code == 401, "POST /auth/login correctly rejects wrong password")

    # ---------- Me ----------
    r = client.get("/auth/me", headers=headers)
    check(r.status_code == 200 and r.json()["email"] == "test@example.com", "GET /auth/me returns current user")

    r = client.get("/auth/me")
    check(r.status_code == 401, "GET /auth/me without token returns 401")

    # ---------- Profile & password updates (Settings feature) ----------
    r = client.patch("/auth/me", headers=headers, json={
        "shop_name": "Renamed Store", "location": "New City", "full_name": "Updated Name",
    })
    check(r.status_code == 200, f"PATCH /auth/me -> {r.status_code} {r.text}")
    check(r.json()["shop"]["name"] == "Renamed Store", "Shop name actually updated")
    check(r.json()["full_name"] == "Updated Name", "User full name actually updated")

    r = client.post("/auth/change-password", headers=headers, json={
        "current_password": "wrongpassword", "new_password": "newpass123",
    })
    check(r.status_code == 400, "Change password rejects wrong current password")

    r = client.post("/auth/change-password", headers=headers, json={
        "current_password": "testpass123", "new_password": "newpass123",
    })
    check(r.status_code == 200, f"POST /auth/change-password -> {r.status_code} {r.text}")

    r = client.post("/auth/login", json={"email": "test@example.com", "password": "testpass123"})
    check(r.status_code == 401, "Old password no longer works after change")

    r = client.post("/auth/login", json={"email": "test@example.com", "password": "newpass123"})
    check(r.status_code == 200, "New password works after change")

    # ---------- Products ----------
    r = client.get("/products", headers=headers)
    check(r.status_code == 200 and r.json() == [], "GET /products starts empty for new shop")

    r = client.post("/products", headers=headers, json={
        "name": "Test Rice (5kg)", "category": "Groceries", "unit": "bag",
        "perishable": False, "current_stock": 20, "price": 400,
    })
    check(r.status_code == 200, f"POST /products -> {r.status_code} {r.text}")
    product_id = r.json()["id"]

    r = client.post("/products", headers=headers, json={
        "name": "Test Milk (500ml)", "category": "Dairy", "unit": "packet",
        "perishable": True, "current_stock": 5, "price": 30,
    })
    check(r.status_code == 200, "POST /products (second, perishable) succeeds")
    milk_id = r.json()["id"]

    r = client.get("/products", headers=headers)
    check(r.status_code == 200 and len(r.json()) == 2, "GET /products now returns 2 products")

    r = client.patch(f"/products/{product_id}", headers=headers, json={"current_stock": 25})
    check(r.status_code == 200 and r.json()["current_stock"] == 25, "PATCH /products/{id} updates stock")

    # ---------- Sales ----------
    r = client.post("/sales", headers=headers, json={"product_id": product_id, "quantity": 3})
    check(r.status_code == 200, f"POST /sales -> {r.status_code} {r.text}")
    check(r.json()["amount"] == 1200.0, "Sale amount auto-computed from product price (3 x 400)")

    r = client.get("/products", headers=headers)
    rice = next(p for p in r.json() if p["id"] == product_id)
    check(rice["current_stock"] == 22, "Stock correctly decremented after sale (25 - 3 = 22)")

    for _ in range(6):
        r = client.post("/sales", headers=headers, json={"product_id": milk_id, "quantity": 2})
        check(r.status_code == 200, "Repeated sale logging succeeds")

    r = client.post("/sales", headers=headers, json={"product_id": product_id, "quantity": -1})
    check(r.status_code == 400, "POST /sales rejects non-positive quantity")

    r = client.post("/sales", headers=headers, json={"product_id": 99999, "quantity": 1})
    check(r.status_code == 404, "POST /sales rejects unknown product_id")

    r = client.get("/sales", headers=headers)
    check(r.status_code == 200 and len(r.json()) == 7, "GET /sales returns all logged sales (1 rice + 6 milk)")

    # ---------- Stock (with predictions) ----------
    r = client.get("/stock", headers=headers)
    check(r.status_code == 200, f"GET /stock -> {r.status_code} {r.text}")
    stock = r.json()
    milk_stock = next(p for p in stock if p["id"] == milk_id)
    check(milk_stock["predicted_demand_7d"] >= 0, "Stock response includes predicted_demand_7d")
    check(milk_stock["status"] in ("healthy", "watch", "critical", "overstock"), "Stock status is a valid category")
    check(milk_stock["current_stock"] == 0, "Milk stock correctly clamped at 0 (5 - 12 would be negative)")

    # ---------- Alerts ----------
    r = client.get("/alerts", headers=headers)
    check(r.status_code == 200, f"GET /alerts -> {r.status_code} {r.text}")
    alerts = r.json()
    print(f"      (found {len(alerts)} active alerts)")

    if alerts:
        alert_id = alerts[0]["id"]
        r = client.post(f"/alerts/{alert_id}/resolve", headers=headers)
        check(r.status_code == 200, "POST /alerts/{id}/resolve succeeds")

        r = client.get("/alerts", headers=headers)
        check(all(a["id"] != alert_id for a in r.json()), "Resolved alert no longer appears in active list")

    r = client.post("/alerts/999999/resolve", headers=headers)
    check(r.status_code == 404, "Resolving unknown alert returns 404")

    # ---------- Analytics ----------
    r = client.get("/analytics/summary", headers=headers)
    check(r.status_code == 200, f"GET /analytics/summary -> {r.status_code} {r.text}")
    check("today_sales" in r.json(), "Summary includes today_sales")

    r = client.get("/analytics/sales-trend?days=14", headers=headers)
    check(r.status_code == 200 and len(r.json()) == 14, "GET /analytics/sales-trend returns 14 days")

    r = client.get("/analytics/category-breakdown", headers=headers)
    check(r.status_code == 200 and len(r.json()) >= 1, "GET /analytics/category-breakdown returns data")

    r = client.get("/analytics/top-movers", headers=headers)
    check(r.status_code == 200, "GET /analytics/top-movers succeeds")

    # ---------- Cross-shop isolation ----------
    r = client.post("/auth/signup", json={
        "shop_name": "Other Shop", "full_name": "Other Owner",
        "email": "other@example.com", "password": "otherpass123",
    })
    other_token = r.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    r = client.get("/products", headers=other_headers)
    check(r.status_code == 200 and r.json() == [], "New shop cannot see first shop's products (isolation)")

    r = client.patch(f"/products/{product_id}", headers=other_headers, json={"current_stock": 999})
    check(r.status_code == 404, "Shop B cannot modify Shop A's product (isolation enforced)")

    # ---------- Delete ----------
    r = client.delete(f"/products/{milk_id}", headers=headers)
    check(r.status_code == 200, "DELETE /products/{id} succeeds")

    r = client.get("/products", headers=headers)
    check(len(r.json()) == 1, "Product count correctly reduced after delete")

    # ---------- Customers & Credit (Udhaar) ----------
    r = client.get("/customers", headers=headers)
    check(r.status_code == 200 and r.json() == [], "GET /customers starts empty")

    r = client.post("/customers", headers=headers, json={
        "name": "Ramesh Kumar", "phone": "9876543210", "address": "12 MG Road",
    })
    check(r.status_code == 200, f"POST /customers -> {r.status_code} {r.text}")
    customer_id = r.json()["id"]
    check(r.json()["balance"] == 0, "New customer starts with zero balance")

    # Re-create a fresh product for credit-sale testing (rice was deleted... no, milk was deleted, rice remains)
    r = client.post("/products", headers=headers, json={
        "name": "Credit Test Item", "category": "Groceries", "unit": "unit",
        "perishable": False, "current_stock": 50, "price": 100,
    })
    credit_product_id = r.json()["id"]

    # A credit sale with no customer should be rejected
    r = client.post("/sales", headers=headers, json={
        "product_id": credit_product_id, "quantity": 2, "is_credit": True,
    })
    check(r.status_code == 400, "Credit sale without a customer is rejected")

    # A proper credit sale
    r = client.post("/sales", headers=headers, json={
        "product_id": credit_product_id, "quantity": 2, "is_credit": True, "customer_id": customer_id,
    })
    check(r.status_code == 200, f"Credit sale -> {r.status_code} {r.text}")
    check(r.json()["is_credit"] is True, "Sale correctly flagged as credit")
    check(r.json()["customer_name"] == "Ramesh Kumar", "Sale includes customer name")

    r = client.get(f"/customers/{customer_id}", headers=headers)
    check(r.json()["balance"] == 200.0, "Customer balance reflects the credit sale (2 x 100)")

    r = client.get(f"/customers/{customer_id}/transactions", headers=headers)
    check(len(r.json()) == 1 and r.json()[0]["kind"] == "credit", "Credit transaction auto-created from the sale")

    # Manual payment against the balance
    r = client.post(f"/customers/{customer_id}/transactions", headers=headers, json={
        "kind": "payment", "amount": 120, "note": "Partial payment",
    })
    check(r.status_code == 200, f"POST manual payment -> {r.status_code} {r.text}")

    r = client.get(f"/customers/{customer_id}", headers=headers)
    check(r.json()["balance"] == 80.0, "Balance correctly reduced after payment (200 - 120 = 80)")

    # Invalid transaction kind rejected
    r = client.post(f"/customers/{customer_id}/transactions", headers=headers, json={
        "kind": "bogus", "amount": 10,
    })
    check(r.status_code == 400, "Invalid transaction kind is rejected")

    # Negative/zero amount rejected
    r = client.post(f"/customers/{customer_id}/transactions", headers=headers, json={
        "kind": "payment", "amount": 0,
    })
    check(r.status_code == 400, "Zero-amount transaction is rejected")

    # Cross-shop isolation for customers
    r = client.get("/customers", headers=other_headers)
    check(r.json() == [], "Shop B cannot see Shop A's customers")

    r = client.get(f"/customers/{customer_id}", headers=other_headers)
    check(r.status_code == 404, "Shop B cannot access Shop A's customer by ID")

    r = client.post(f"/customers/{customer_id}/transactions", headers=other_headers, json={
        "kind": "payment", "amount": 50,
    })
    check(r.status_code == 404, "Shop B cannot add a transaction to Shop A's customer")

    # Update and delete
    r = client.patch(f"/customers/{customer_id}", headers=headers, json={"phone": "9999999999"})
    check(r.status_code == 200 and r.json()["phone"] == "9999999999", "PATCH /customers/{id} updates phone")

    r = client.delete(f"/customers/{customer_id}", headers=headers)
    check(r.status_code == 200, "DELETE /customers/{id} succeeds")

    r = client.get("/customers", headers=headers)
    check(r.json() == [], "Customer list empty after delete")

    print("\nALL BACKEND TESTS PASSED")


if __name__ == "__main__":
    run()
