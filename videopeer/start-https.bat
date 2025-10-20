@echo off
REM Start VideoPeer Socket.IO HTTPS Server with SSL for www.centimet2.com

echo.
echo =========================================
echo VideoPeer Socket.IO HTTPS Server
echo =========================================
echo.
echo Starting Socket.IO HTTPS server on port 3000...
echo Certificate: server.pfx (self-signed for www.centimet2.com)
echo WebRTC Signaling: Ready
echo.

node index.js

pause
