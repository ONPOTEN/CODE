const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT || 8088;

// Try local pfx first, then fallback to laravel-api directory
const pfxPath = path.join(__dirname, 'server.pfx');
const pfxPathFallback = path.join(__dirname, '..', 'laravel-api', 'server.pfx');

console.log(`\n[${'═'.repeat(50)}]`);
console.log('Next.js HTTPS Server Configuration');
console.log(`[${'═'.repeat(50)}]\n`);
console.log(`Hostname: ${hostname}`);
console.log(`Port: ${port}`);

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
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Load SSL certificates from PFX
const httpsOptions = {
  pfx: fs.readFileSync(finalPfxPath),
  passphrase: '' // Empty passphrase - no password on our cert
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`\n[${'═'.repeat(50)}]`);
    console.log('✓ Next.js HTTPS Server Started Successfully');
    console.log(`[${'═'.repeat(50)}]\n`);
    console.log(`🔒 Secure URL: https://www.centimet2.com:${port}`);
    console.log(`🔒 Alt URL: https://localhost:${port}`);
    console.log(`📦 Certificate: server.pfx (self-signed for www.centimet2.com)`);
    console.log(`\n⚠️  Browser will show a security warning - this is normal for development.\n`);
    console.log(`Press Ctrl+C to stop the server\n`);
  });
});
