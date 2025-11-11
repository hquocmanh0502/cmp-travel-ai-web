@echo off
title CMP Travel - Shutdown Script
color 0C

echo.
echo ===============================================================================
echo                           🔥 SHUTTING DOWN CMP TRAVEL                          
echo ===============================================================================
echo.

echo 🛑 Finding and terminating services...

echo.
echo 📍 Checking Backend (Port 3000)...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :3000') do (
    echo    Killing process %%i
    taskkill /PID %%i /F >nul 2>&1
)

echo.
echo 📍 Checking Chatbot API (Port 5000)...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :5000') do (
    echo    Killing process %%i  
    taskkill /PID %%i /F >nul 2>&1
)

echo.
echo 📍 Checking Frontend (Port 8080)...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :8080') do (
    echo    Killing process %%i
    taskkill /PID %%i /F >nul 2>&1
)

echo.
echo 📍 Checking Dashboard (Port 5173)...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :5173') do (
    echo    Killing process %%i
    taskkill /PID %%i /F >nul 2>&1
)

echo.
echo 🧹 Cleaning up Node.js processes...
taskkill /IM node.exe /F >nul 2>&1

echo.
echo 🧹 Cleaning up Python processes...
taskkill /IM python.exe /F >nul 2>&1

echo.
echo ===============================================================================
echo                              ✅ SHUTDOWN COMPLETE!                             
echo ===============================================================================
echo.
echo 📊 All CMP Travel services have been terminated.
echo 🔄 You can now restart using start_all.bat
echo.
pause