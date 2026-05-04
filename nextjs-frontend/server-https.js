const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = false;
const hostname = process.env.HOSTNAME || '0.0.0.0';
const httpPort = process.env.HTTP_PORT || 80;
const httpsPort = process.env.HTTPS_PORT || 443;

// Try local pfx first, then fallback to laravel-api directory
const pfxPath = path.join(__dirname, 'server.pfx');
const pfxPathFallback = path.join(__dirname, '..', 'laravel-api', 'server.pfx');

console.log(`\n[${'═'.repeat(50)}]`);
console.log('Next.js HTTP/HTTPS Server Configuration');
console.log(`[${'═'.repeat(50)}]\n`);
console.log(`Hostname: ${hostname}`);
console.log(`HTTP Port: ${httpPort}`);
console.log(`HTTPS Port: ${httpsPort}`);

// Determine which PFX path to use
let finalPfxPath = pfxPath;
if (!fs.existsSync(pfxPath)) {
  if (fs.existsSync(pfxPathFallback)) {
    finalPfxPath = pfxPathFallback;
    console.log(`PFX Path: ${pfxPathFallback} (using fallback)`);
  } else {
    console.log(`PFX Path: ${pfxPath} ✗ Not found`);
    console.error(`\n✗ ERROR: PFX certificate not found at:\n  - ${pfxPath}\n  - ${pfxPathFallback}`);
    console.error(`\nPlease ensure the certificate exists. Generate it using:\n`);
    console.error(`  cd laravel-api`);
    console.error(`  openssl pkcs12 -export -out server.pfx -inkey server.key -in server.crt -password pass:""\n`);
    process.exit(1);
  }
} else {
  console.log(`PFX Path: ${pfxPath} ✓ Found`);
}

// Initialize Next.js app
const app = next({ dev, hostname, port: httpsPort });
const handle = app.getRequestHandler();

// Load SSL certificates from PFX
const httpsOptions = {
  pfx: fs.readFileSync(finalPfxPath),
  passphrase: 'H5f9p5h4!' // Empty passphrase - no password on our cert
};

app.prepare().then(() => {
  // Request handler
  const requestHandler = async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  };

  // HTTP Server - redirect to HTTPS
  createHttpServer((req, res) => {
    const host = req.headers.host?.replace(`:${httpPort}`, '') || hostname;
    const httpsUrl = `https://${host}${httpsPort !== 443 ? ':' + httpsPort : ''}${req.url}`;
    res.writeHead(301, { Location: httpsUrl });
    res.end();
  }).listen(httpPort, hostname, (err) => {
    if (err) throw err;
    console.log(`✓ HTTP Server listening on port ${httpPort} (redirects to HTTPS)`);
  });

  // HTTPS Server
  createHttpsServer(httpsOptions, requestHandler).listen(httpsPort, hostname, (err) => {
    if (err) throw err;
    console.log(`\n[${'═'.repeat(50)}]`);
    console.log('✓ Next.js HTTPS Server Started Successfully');
    console.log(`[${'═'.repeat(50)}]\n`);
    console.log(`🌐 HTTP URL: http://www.centimet2.com (redirects to HTTPS)`);
    console.log(`🔒 HTTPS URL: https://www.centimet2.com`);
    console.log(`📦 Certificate: server.pfx`);
    console.log(`\n⚠️  Ports 80/443 require administrator/root privileges.\n`);
    console.log(`Press Ctrl+C to stop the server\n`);
  });
});
