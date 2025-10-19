@echo off
REM Start Next.js HTTPS Server with SSL for www.centimet2.com

echo.
echo =========================================
echo Next.js HTTPS Server Startup Script
echo =========================================
echo.
echo Starting Next.js HTTPS server on port 8088...
echo Certificate: server.pfx (self-signed for www.centimet2.com)
echo.
echo Make sure Laravel is running:
echo   cd ..\laravel-api
echo   php artisan serve
echo.

node server.js

pause
