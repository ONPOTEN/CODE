# Laravel HTTPS Server - centimet2.com Configuration

This Laravel application is configured to run on **HTTPS** mode on **port 8000** with the domain **centimet2.com**.

## Quick Start

To start the server with HTTPS support:

```bash
# Start the HTTPS server
node https-proxy.cjs

# Or use the batch file
start-https.bat
```

## Current Configuration

### URLs
- **HTTPS URL**: https://centimet2.com:8000 (public-facing)
- **Internal HTTP**: http://127.0.0.1:8080 (proxied, not directly accessible)
- **Binding**: 0.0.0.0:8000 (accessible from all network interfaces)

### Environment Variables (.env)
```
APP_URL=https://centimet2.com:8000
SESSION_DOMAIN=.centimet2.com
```

## SSL Certificate Details

- **Location**: `storage/certs/centimet2.pfx`
- **Password**: `laravel`
- **Type**: Self-signed certificate
- **Domains**: centimet2.com, *.centimet2.com
- **Validity**: 5 years

## DNS Configuration Required

To access the server via **https://centimet2.com:8000**, you need to configure DNS or hosts file:

### Option 1: Modify Hosts File (Local Development)

#### Windows:
Edit `C:\Windows\System32\drivers\etc\hosts` (as Administrator):
```
127.0.0.1    centimet2.com
```

#### Linux/Mac:
Edit `/etc/hosts` (with sudo):
```
127.0.0.1    centimet2.com
```

### Option 2: DNS Configuration (Production/Network Access)
Point the domain `centimet2.com` to your server's IP address in your DNS provider:
- **A Record**: centimet2.com → [Your Server IP]
- **Port**: Ensure port 8000 is open in your firewall

## How It Works

The HTTPS setup consists of:

1. **SSL Certificate**: Self-signed certificate for centimet2.com stored in `storage/certs/centimet2.pfx`
2. **Node.js HTTPS Proxy**: Runs on 0.0.0.0:8000 (all interfaces) and forwards to Laravel
3. **Laravel Server**: Runs on HTTP internally (port 8080) and is proxied through HTTPS

## Network Access

The server is configured to accept connections from any network interface (`0.0.0.0`):
- **Local access**: https://centimet2.com:8000 or https://localhost:8000
- **LAN access**: https://centimet2.com:8000 (if DNS configured)
- **Remote access**: Configure your router/firewall to forward port 8000

## Browser Security Warning

Your browser will show a security warning because the certificate is self-signed. This is normal for development:

- **Chrome/Edge**: Click "Advanced" → "Proceed to centimet2.com (unsafe)"
- **Firefox**: Click "Advanced" → "Accept the Risk and Continue"

## Trusting the Certificate (Optional)

To avoid browser warnings, import and trust the certificate:

### Windows:
1. Double-click `storage/certs/centimet2.pfx`
2. Select "Current User" → Next
3. Enter password: `laravel` → Next
4. Select "Place all certificates in the following store"
5. Browse → "Trusted Root Certification Authorities" → OK
6. Next → Finish

### Linux/Mac:
```bash
# Extract certificate
openssl pkcs12 -in storage/certs/centimet2.pfx -clcerts -nokeys -out centimet2.crt -passin pass:laravel

# Trust certificate (Ubuntu/Debian)
sudo cp centimet2.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# Trust certificate (macOS)
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain centimet2.crt
```

## Firewall Configuration

To allow external access, configure your firewall:

### Windows Firewall:
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Laravel HTTPS" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

### Linux (ufw):
```bash
sudo ufw allow 8000/tcp
```

## Troubleshooting

### Port already in use
```bash
# Windows - Find process using port 8000
netstat -ano | findstr :8000

# Kill process by PID
taskkill /PID [PID] /F
```

### Cannot access from other devices
1. Verify firewall allows port 8000
2. Check DNS/hosts file configuration
3. Ensure server is bound to 0.0.0.0 (not 127.0.0.1)
4. Verify network connectivity

### Certificate errors
If you encounter certificate issues:
1. Regenerate certificate: `powershell -ExecutionPolicy Bypass -File export-cert-centimet2.ps1`
2. Import certificate into browser/system trust store
3. Clear browser cache and restart

### CORS Issues
If accessing from a different domain, configure CORS in Laravel:
```php
// config/cors.php
'allowed_origins' => ['https://centimet2.com:8000'],
```

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Production Deployment

⚠️ **This setup is for development only!**

For production:
- Use a proper web server (Nginx, Apache, Caddy)
- Obtain a real SSL certificate from Let's Encrypt or commercial CA
- Configure proper security headers
- Use environment-specific configuration
- Enable rate limiting and security middleware
- Remove self-signed certificates

### Example Nginx Configuration (Production)
```nginx
server {
    listen 8000 ssl http2;
    server_name centimet2.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    root /path/to/laravel/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

## Checking Server Status

To verify the server is running:
```bash
# Check if port is listening
netstat -an | findstr :8000

# Test HTTPS connection (PowerShell)
curl -k https://centimet2.com:8000

# View server logs
# Logs are in storage/logs/laravel.log
```
