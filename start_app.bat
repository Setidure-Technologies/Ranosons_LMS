@echo off
echo Starting Ranoson LMS...

:: Start Backend
echo Starting Backend Server...
start "Ranoson Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend
echo Starting Frontend Server...
start "Ranoson Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Application started!
echo Backend running at: http://localhost:8000
echo Frontend running at: http://localhost:3000
echo.
echo Please wait for both windows to initialize...
pause
