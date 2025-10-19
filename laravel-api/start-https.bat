@echo off
REM Start Laravel HTTPS Proxy with SSL for www.centimet2.com

echo.
echo =========================================
echo Laravel HTTPS Proxy Startup Script
echo =========================================
echo.
echo Starting Node.js HTTPS proxy on port 8088...
echo Certificate: server.crt (self-signed for www.centimet2.com)
echo Backend: http://127.0.0.1:8000
echo.

node https-proxy.cjs

pause
