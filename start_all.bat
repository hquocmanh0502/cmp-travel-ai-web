@echo off
title CMP Travel - Startup Script
color 0A

echo.
echo  ██████╗███╗   ███╗██████╗     ████████╗██████╗  █████╗ ██╗   ██╗███████╗██╗     
echo ██╔════╝████╗ ████║██╔══██╗    ╚══██╔══╝██╔══██╗██╔══██╗██║   ██║██╔════╝██║     
echo ██║     ██╔████╔██║██████╔╝       ██║   ██████╔╝███████║██║   ██║█████╗  ██║     
echo ██║     ██║╚██╔╝██║██╔═══╝        ██║   ██╔══██╗██╔══██║╚██╗ ██╔╝██╔══╝  ██║     
echo ╚██████╗██║ ╚═╝ ██║██║            ██║   ██║  ██║██║  ██║ ╚████╔╝ ███████╗███████╗
echo  ╚═════╝╚═╝     ╚═╝╚═╝            ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚══════╝
echo.
echo                        🚀 AI-Powered Travel Platform 🤖                           
echo.
echo ===============================================================================
echo                              STARTING ALL SERVICES...                            
echo ===============================================================================
echo.

echo 🔥 Step 1/4: Starting Backend API Server (Port 3000)...
start "🏗️ CMP Backend" cmd /k "cd /d E:\cmp-travel-main\backend && echo ✅ Backend Starting... && npm start"

echo.
timeout /t 3 /nobreak >nul

echo 🤖 Step 2/4: Starting AI Chatbot API (Port 5000)...
start "🤖 Chatbot API" cmd /k "cd /d E:\cmp-travel-main\rag-chatbot && echo ✅ Chatbot API Starting... && python chatbot_api.py"

echo.
timeout /t 3 /nobreak >nul

echo 📊 Step 3/4: Starting React Dashboard (Port 5173)...
start "📊 Dashboard" cmd /k "cd /d E:\cmp-travel-main\travelie_dashboard && echo ✅ Dashboard Starting... && npm run dev"

echo.
timeout /t 3 /nobreak >nul

echo 🌐 Step 4/4: Starting Frontend Website (Port 8080)...
start "🌐 Frontend" cmd /k "cd /d E:\cmp-travel-main\frontend && echo ✅ Frontend Starting... && python -m http.server 8080"

echo.
echo ===============================================================================
echo                                 ✅ ALL SERVICES LAUNCHED!                        
echo ===============================================================================
echo.
echo 📋 Service Status:
echo    🏗️  Backend API:       http://localhost:3000
echo    🤖  Chatbot API:       http://localhost:5000
echo    📊  React Dashboard:   http://localhost:5173
echo    🌐  Website:           http://localhost:8080
echo.
echo 💡 What's Next:
echo    1. Wait 15-20 seconds for all services to fully start
echo    2. Main Website:       http://localhost:8080
echo    3. Admin Dashboard:    http://localhost:5173
echo    4. Test chatbot widget in bottom-right corner
echo    5. Try: "Show me tours under $3000"
echo.
echo 🔧 Troubleshooting:
echo    - If ports are busy, close other applications using these ports
echo    - Check each terminal window for detailed startup logs
echo    - MongoDB must be accessible from your network
echo.
echo 🎉 Enjoy your CMP Travel AI-powered website!
echo.
pause
