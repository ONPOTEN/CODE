const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const HTTPS_PORT = 8000;
const HTTP_PORT = 8080;
const HOST = '0.0.0.0'; // Bind to all interfaces
const DOMAIN = 'www.centimet2.com';

console.log('\x1b[36m%s\x1b[0m', '========================================');
console.log('\x1b[32m%s\x1b[0m', 'Laravel HTTPS Development Server');
console.log('\x1b[36m%s\x1b[0m', '========================================\n');

// Start Laravel's PHP server on HTTP
console.log('\x1b[33m%s\x1b[0m', `Starting Laravel on http://127.0.0.1:${HTTP_PORT}...`);
const phpServer = spawn('php', ['artisan', 'serve', `--host=127.0.0.1`, `--port=${HTTP_PORT}`], {
    stdio: 'inherit',
    shell: true
});

phpServer.on('error', (err) => {
    console.error('\x1b[31m%s\x1b[0m', 'Failed to start PHP server:', err);
    process.exit(1);
});

// Wait a moment for PHP server to start
setTimeout(() => {
    try {
        // Load PFX certificate
        const pfxPath = path.join(__dirname, 'storage', 'certs', 'server.pfx');

        if (!fs.existsSync(pfxPath)) {
            console.error('\x1b[31m%s\x1b[0m', 'Certificate not found at:', pfxPath);
            console.log('\x1b[33m%s\x1b[0m', 'Please generate the certificate first.');
            phpServer.kill();
            process.exit(1);
        }

        const pfx = fs.readFileSync(pfxPath);

        // Create HTTPS server
        const options = {
            pfx: pfx,
            passphrase: ''
        };

        const server = https.createServer(options, (req, res) => {
            // Proxy request to Laravel HTTP server
            const proxyReq = http.request({
                hostname: '127.0.0.1',
                port: HTTP_PORT,
                path: req.url,
                method: req.method,
                headers: req.headers
            }, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (err) => {
                console.error('\x1b[31m%s\x1b[0m', 'Proxy error:', err.message);
                res.writeHead(502);
                res.end('Bad Gateway');
            });

            req.pipe(proxyReq);
        });

        server.listen(HTTPS_PORT, HOST, () => {
            console.log('\x1b[32m%s\x1b[0m', '\n✓ HTTPS proxy server started successfully!\n');
            console.log('\x1b[36m%s\x1b[0m', '========================================');
            console.log('\x1b[32m%s\x1b[0m', `  Server running at: https://${DOMAIN}:${HTTPS_PORT}`);
            console.log('\x1b[32m%s\x1b[0m', `  Listening on: ${HOST}:${HTTPS_PORT} (all interfaces)`);
            console.log('\x1b[36m%s\x1b[0m', '========================================\n');
            console.log('\x1b[33m%s\x1b[0m', 'Press Ctrl+C to stop the server\n');
            console.log('\x1b[90m%s\x1b[0m', 'Note: Your browser may show a security warning for the');
            console.log('\x1b[90m%s\x1b[0m', 'self-signed certificate. This is normal for development.\n');
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error('\x1b[31m%s\x1b[0m', `Port ${HTTPS_PORT} is already in use.`);
            } else {
                console.error('\x1b[31m%s\x1b[0m', 'Server error:', err);
            }
            phpServer.kill();
            process.exit(1);
        });

    } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', 'Failed to start HTTPS server:', err.message);
        phpServer.kill();
        process.exit(1);
    }
}, 2000);

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down servers...');
    phpServer.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    phpServer.kill();
    process.exit(0);
});
