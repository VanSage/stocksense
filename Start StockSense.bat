@echo off
start "StockSense Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
start "StockSense Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 4 /nobreak >nul
start http://localhost:5173/