@echo off
echo ===================================================
echo Stopping FixMate Microservices...
echo ===================================================

echo Scanning for processes on port 8761 (Eureka)...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "LISTENING" ^| findstr ":8761 "') DO (
    echo Killing process %%T
    taskkill /F /PID %%T
)

echo Scanning for processes on port 8081 (Backend)...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "LISTENING" ^| findstr ":8081 "') DO (
    echo Killing process %%T
    taskkill /F /PID %%T
)

echo Scanning for processes on port 8080 (API Gateway)...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "LISTENING" ^| findstr ":8080 "') DO (
    echo Killing process %%T
    taskkill /F /PID %%T
)

echo.
echo All backend services have been successfully stopped!
echo.
pause
