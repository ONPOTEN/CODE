# Laravel HTTPS Development Server Setup

This Laravel application is configured to run on **HTTPS** mode on **port 8000**.

## Quick Start

To start the server with HTTPS support:

```bash
# Option 1: Using batch file (Windows)
start-https.bat

# Option 2: Using Node.js directly
node https-proxy.js

# Option 3: Using PowerShell script
powershell -ExecutionPolicy Bypass -File serve-https.ps1
```

## How It Works

The HTTPS setup consists of:

1. **SSL Certificate**: A self-signed certificate for `localhost` stored in `storage/certs/localhost.pfx`
2. **Node.js Proxy**: An HTTPS proxy server (`https-proxy.js`) that forwards requests to Laravel
3. **Laravel Server**: Runs on HTTP internally (port 8080) and is proxied through HTTPS

## URLs

- **HTTPS URL**: https://localhost:8000 (public-facing)
- **Internal HTTP**: http://127.0.0.1:8080 (proxied, not directly accessible)

## Certificate Details

- **Location**: `storage/certs/localhost.pfx`
- **Password**: `laravel`
- **Type**: Self-signed certificate
- **Validity**: 5 years

## Browser Security Warning

Your browser will show a security warning because the certificate is self-signed. This is normal for development. To proceed:

- **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
- **Firefox**: Click "Advanced" → "Accept the Risk and Continue"

## Trusting the Certificate (Optional)

To avoid browser warnings, you can trust the certificate:

### Windows:
1. Double-click `storage/certs/localhost.pfx`
2. Select "Current User" → Next
3. Enter password: `laravel` → Next
4. Select "Place all certificates in the following store"
5. Browse → "Trusted Root Certification Authorities" → OK
6. Next → Finish

## Configuration

The APP_URL in `.env` is set to:
```
APP_URL=https://localhost:8000
```

## Troubleshooting

### Port already in use
If port 8000 or 8080 is already in use:
- Check running processes: `netstat -ano | findstr :8000`
- Kill the process or change the port in `https-proxy.js`

### Certificate errors
If you encounter certificate issues:
1. Delete `storage/certs/localhost.pfx`
2. Re-run the certificate generation script
3. Restart the HTTPS server

### PHP server fails to start
Ensure you're in the Laravel project directory and PHP is in your PATH:
```bash
php --version
php artisan --version
```

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Production Deployment

This setup is for **development only**. For production:
- Use a proper web server (Nginx, Apache)
- Obtain a real SSL certificate (Let's Encrypt, commercial CA)
- Configure proper security headers and HTTPS settings
