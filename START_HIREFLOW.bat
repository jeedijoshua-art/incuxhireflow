@echo off
title HireFlow Launcher
color 0B
echo.
echo  =============================================
echo    HireFlow - Starting all 3 services...
echo  =============================================
echo.

REM Kill any old processes on these ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5175 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo  [1/4] Starting INTERVIEW ENGINE (Python) on port 5174...
start "HireFlow Interview Engine" /D "%~dp0backend\interview-engine" cmd /k "py -3.11 -m uvicorn main:app --port 5174"

timeout /t 3 /nobreak >nul

echo  [2/4] Starting RESUME ANALYZER (Python) on port 5175...
start "HireFlow Resume Analyzer" /D "%~dp0backend\resume-analyzer" cmd /k "py -3.11 -m uvicorn main:app --port 5175"

timeout /t 3 /nobreak >nul

echo  [3/4] Starting FRONTEND (React) on port 5173...
start "HireFlow Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

timeout /t 6 /nobreak >nul

echo  [4/4] Opening browser...
start http://localhost:5173/

echo.
echo  =============================================
echo    DONE!  Site opens in your browser.
echo.
echo    Three windows opened:
echo      - HireFlow Interview Engine   (port 5174)
echo      - HireFlow Resume Analyzer    (port 5175)
echo      - HireFlow Frontend           (port 5173)
echo.
echo    CLOSING this launcher is OK.
echo    DO NOT close the 3 server windows.
echo  =============================================
echo.
pause
