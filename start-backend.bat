@echo off
echo ===================================================
echo Starting FixMate Microservices Ecosystem...
echo ===================================================

echo [1/3] Starting Eureka Discovery Server...
start "Eureka Server (Port 8761)" cmd /c "cd /d d:\Projects\fixmate-eureka-server && title Eureka Server && mvn spring-boot:run"

:: Wait a few seconds to let Eureka initialize before starting backend
timeout /t 5 /nobreak >nul

echo [2/3] Starting FixMate Core Backend...
start "FixMate Backend (Port 8081)" cmd /c "cd /d d:\Projects\fixmate && title FixMate Backend && mvn spring-boot:run"

:: Wait a few seconds
timeout /t 5 /nobreak >nul

echo [3/3] Starting API Gateway...
start "API Gateway (Port 8080)" cmd /c "cd /d d:\Projects\fixmate-api-gateway && title API Gateway && mvn spring-boot:run"

echo.
echo All backend services have been launched in separate windows!
echo Please wait a few moments for all of them to fully initialize.
echo.
pause
