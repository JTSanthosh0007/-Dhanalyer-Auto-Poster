@echo off
echo ========================================
echo   Dhanalyer Auto Poster
echo   Starting Backend + Frontend...
echo ========================================
echo.

echo [1/2] Starting Backend Server (Port 5000)...
start "Dhanalyer Backend" cmd /k "npm run server"
timeout /t 3 /nobreak >nul

echo [2/2] Starting React Frontend (Port 3000)...
start "Dhanalyer Frontend" cmd /k "npm start"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
echo   Press any key to exit this window...
echo   (The servers will keep running)
echo ========================================
pause >nul
