# Security Hardening Guide

## Overview
This document outlines the security measures implemented to protect the Next.js application from common web vulnerabilities and attacks.

## Vulnerabilities Fixed

### 1. Open Proxy Vulnerability (CRITICAL)
**Problem:** The API proxy at `/api/proxy/[...path]` accepted ANY path and forwarded requests without validation.

**Attack Vector:**
- Attackers could inject malicious paths containing directory traversal (`../`)
- Shell metacharacters could be injected (`;`, `|`, `&`, `` ` ``)
- Arbitrary endpoints could be accessed on the backend

**Solution:**
- Implemented path whitelist in `middleware.ts`
- Added malicious pattern detection
- Strict path validation before proxying

### 2. CORS Misconfiguration (HIGH)
**Problem:** CORS was set to accept requests from any origin (`*` or any requesting origin).

**Attack Vector:**
- Malicious websites could make authenticated requests
- CSRF attacks were possible
- Session hijacking risk

**Solution:**
- Strict origin whitelist: Only `https://centimet2.com` and `https://www.centimet2.com`
- Updated in both `route.ts` and `next.config.ts`

### 3. No Rate Limiting (HIGH)
**Problem:** No protection against brute force or DoS attacks.

**Attack Vector:**
- Automated credential stuffing
- API endpoint flooding
- Resource exhaustion

**Solution:**
- IP-based rate limiting (100 requests per minute)
- Automatic cleanup of old records
- 429 status with Retry-After header

### 4. Insecure Server Binding (MEDIUM)
**Problem:** Server bound to `0.0.0.0` exposing all network interfaces.

**Attack Vector:**
- Unnecessary exposure to external networks
- Increased attack surface

**Solution:**
- Changed default to `localhost`
- Use `HOSTNAME` environment variable for production

### 5. Missing Security Headers (MEDIUM)
**Problem:** No protection against XSS, clickjacking, MIME sniffing, etc.

**Solution:**
Implemented comprehensive security headers:
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Strict-Transport-Security` - Forces HTTPS
- `Content-Security-Policy` - Restricts resource loading
- `Permissions-Policy` - Disables unnecessary browser features

## Files Modified

### New Files
1. **`middleware.ts`** - Security middleware with:
   - Rate limiting
   - Path validation
   - Malicious pattern detection
   - Content-Type validation
   - Security headers

### Modified Files
1. **`app/api/proxy/[...path]/route.ts`**
   - Strict CORS origin validation
   - Whitelisted allowed origins only

2. **`next.config.ts`**
   - Added comprehensive security headers
   - Enhanced CSP policy

3. **`server-https.js`**
   - Changed hostname default to `localhost`
   - Enhanced TLS configuration (TLS 1.2+ only)
   - Secure cipher suites
   - Environment variable for SSL passphrase

## Security Features Implemented

### 1. Request Validation
```typescript
// Malicious patterns blocked:
- Directory traversal: ../
- Double slashes: //
- Shell metacharacters: ; & | ` $
- HTML/script tags: < >
- Hex/URL encoding of dangerous chars
- Null bytes
- Dangerous function names: eval, exec, system
```

### 2. Path Whitelist
Only these API endpoints are allowed:
- `/api/proxy/shops`
- `/api/proxy/shops/{id}`
- `/api/proxy/shops/{id}/products`
- `/api/proxy/shops/{id}/posts`
- `/api/proxy/shops/{id}/posts/{postId}`
- `/api/proxy/products`
- `/api/proxy/products/{id}`
- `/api/proxy/auth/*`
- `/api/proxy/users/{id}`
- `/api/proxy/messages/*`
- `/api/proxy/conversations/*`
- `/api/proxy/rooms/*`

### 3. Rate Limiting
- **Window:** 60 seconds
- **Max Requests:** 100 per IP
- **Action:** Returns 429 with Retry-After header
- **Cleanup:** Automatic every 60 seconds

### 4. Content Security Policy (CSP)
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com
style-src 'self' 'unsafe-inline'
img-src 'self' data: https: blob:
connect-src 'self' https://centimet2.com:8000 wss://centimet2.com:8000
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

## Environment Variables

Add these to your `.env` file:

```bash
# Server Configuration
HOSTNAME=localhost  # Use specific IP in production (not 0.0.0.0)
HTTP_PORT=80
HTTPS_PORT=443

# SSL Configuration
SSL_PASSPHRASE=your_secure_passphrase_here

# API Configuration
LARAVEL_API_URL=https://centimet2.com:8000/api/v1
NEXT_PUBLIC_API_URL=https://centimet2.com:8000/api/v1
```

## Production Deployment Checklist

- [ ] Set `HOSTNAME` to specific server IP (NOT `0.0.0.0`)
- [ ] Move `SSL_PASSPHRASE` to environment variable (remove from code)
- [ ] Review and update allowed API paths in middleware
- [ ] Verify CORS origins match your domains
- [ ] Enable HTTPS-only cookies in production
- [ ] Configure firewall rules to limit port access
- [ ] Set up monitoring for rate limit violations
- [ ] Enable logging for security events
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Additional Recommendations

### 1. Add Authentication Validation
Consider adding JWT validation in middleware:
```typescript
if (requiresAuth(path)) {
  const token = request.headers.get('authorization');
  if (!isValidToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### 2. Implement Request Logging
Log all API proxy requests for security monitoring:
```typescript
console.log(`[Security] ${new Date().toISOString()} - ${ip} - ${method} ${path}`);
```

### 3. Add IP Blacklisting
Maintain a blacklist of malicious IPs:
```typescript
const BLACKLISTED_IPS = new Set(['suspicious.ip.here']);
if (BLACKLISTED_IPS.has(ip)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 4. Use WAF (Web Application Firewall)
Consider adding Cloudflare or AWS WAF for additional protection.

### 5. Regular Security Audits
- Run `npm audit` regularly
- Use tools like OWASP ZAP or Burp Suite for penetration testing
- Monitor server logs for suspicious activity

## Testing Security

### Test Rate Limiting
```bash
# Send 101 requests quickly - should get 429 on the last one
for i in {1..101}; do curl https://centimet2.com/api/proxy/shops; done
```

### Test Path Validation
```bash
# Should be blocked - directory traversal
curl https://centimet2.com/api/proxy/../../../etc/passwd

# Should be blocked - malicious characters
curl https://centimet2.com/api/proxy/shops;ls

# Should be allowed
curl https://centimet2.com/api/proxy/shops
```

### Test CORS
```bash
# Should be rejected - wrong origin
curl -H "Origin: https://evil.com" https://centimet2.com/api/proxy/shops

# Should be allowed
curl -H "Origin: https://centimet2.com" https://centimet2.com/api/proxy/shops
```

## Incident Response

If you detect an attack:

1. **Immediate Actions:**
   - Check server logs for the attack pattern
   - Add attacker IP to blacklist
   - Review recent requests for data breaches

2. **Investigation:**
   - Identify attack vector
   - Determine if any data was compromised
   - Review other systems for similar vulnerabilities

3. **Recovery:**
   - Patch vulnerabilities immediately
   - Rotate credentials if necessary
   - Monitor for continued attack attempts

4. **Post-Incident:**
   - Document the incident
   - Update security measures
   - Train team on new threats

## Contact

For security issues, please contact your security team immediately.

**DO NOT** disclose security vulnerabilities publicly.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
