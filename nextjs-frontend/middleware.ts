import { NextRequest, NextResponse } from 'next/server';

// EMERGENCY: Blacklist malicious IPs
const BLACKLISTED_IPS = new Set([
  '176.117.107.158',  // Malware distribution server
  '45.61.157.12',     // Secondary attack server
]);

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window

// IP-based rate limiting
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  record.count++;
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`[Security] Rate limit exceeded for IP: ${ip}`);
    return true;
  }

  return false;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// Allowed API paths (whitelist)
const ALLOWED_API_PATHS = [
  // Shops
  /^shops$/,
  /^shops\/\d+$/,
  /^shops\/\d+\/products$/,
  /^shops\/\d+\/posts$/,
  /^shops\/\d+\/posts\/\d+$/,
  /^shops\/\d+\/orders$/,
  /^shops\/\d+\/orders\/\d+$/,
  /^shops\/\d+\/messages$/,
  /^shops\/\d+\/messages\/.*$/,  // Allow all shop messages sub-routes (unread-count, etc.)

  // Products
  /^products$/,
  /^products\/\d+$/,

  // Shop Posts
  /^shop-posts$/,
  /^shop-posts\/\d+$/,
  /^shop-posts\/\d+\/.*$/,  // Allow all shop-post sub-routes (engagement, comments, etc.)

  // Posts (ADDED)
  /^posts$/,
  /^posts\/\d+$/,
  /^posts\/\d+\/engagement$/,
  /^posts\/\d+\/.*$/,  // Allow all post sub-routes
  /^posts\/slug\/[\w-]+$/,  // Allow posts by slug (alphanumeric and hyphens)
  /^my-posts$/,
  /^my-shops$/,

  // Group Posts
  /^group-posts$/,
  /^group-posts\/\d+$/,
  /^group-posts\/\d+\/.*$/,  // Allow all group-post sub-routes (engage, comments, etc.)

  // Groups
  /^groups$/,
  /^groups\/\d+$/,
  /^groups\/\d+\/.*$/,  // Allow all group sub-routes
  /^my-groups$/,  // User's groups

  // Auth
  /^auth\/.*$/,  // Allow all auth routes

  // Users
  /^users$/,
  /^users\/search$/,  // Allow user search
  /^users\/\d+$/,
  /^users\/\d+\/.*$/,  // Allow user sub-routes

  // Profile
  /^profile$/,
  /^profile\/.*$/,  // Allow all profile sub-routes (avatar, etc.)

  // Messages & Conversations
  /^messages$/,
  /^messages\/\d+$/,
  /^conversations$/,
  /^conversations\/\d+$/,
  /^conversations\/\d+\/.*$/,

  // Rooms
  /^rooms$/,
  /^rooms\/\d+$/,

  // Orders
  /^orders$/,
  /^orders\/\d+$/,

  // Categories
  /^categories$/,
  /^categories\/\d+$/,

  // Static Pages
  /^pages$/,
  /^pages\/[\w-]+$/,  // Allow pages by slug

  // Health check
  /^health$/,

  // Debug routes (for diagnostics)
  /^debug\/.*$/,

  // Admin routes
  /^admin\/.*$/,  // Allow all admin routes

  // Friends
  /^friends$/,
  /^friends\/pending$/,
  /^friends\/status\/\d+$/,
  /^friends\/request\/\d+$/,
  /^friends\/accept\/\d+$/,
  /^friends\/reject\/\d+$/,
  /^friends\/unfriend\/\d+$/,
  /^friends\/block\/\d+$/,
  /^friends\/unblock\/\d+$/,

  // Share Image
  /^share-image\/\d+$/,
  /^share-image\/\d+\/image$/,
  /^share-image\/\d+\/debug$/,
  /^share-image\/\d+\/debug-shop$/,
  /^share-image\/\d+\/invalidate$/,
  /^share-image\/shop-post\/\d+\/image$/,
];

// Validate if path is allowed
function isAllowedPath(path: string): boolean {
  return ALLOWED_API_PATHS.some(pattern => pattern.test(path));
}

// Validate path segments for malicious patterns
function containsMaliciousPattern(path: string): boolean {
  // Decode the path first to catch encoded attacks
  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch (e) {
    // If decoding fails, it might be malicious
    return true;
  }

  const maliciousPatterns = [
    /\.\.\//,         // Directory traversal (with slash)
    /[<>]/,           // HTML/script tags
    /[;|`]/,          // Shell metacharacters (removed & as it's used in query params)
    /\\x[0-9a-f]{2}/i, // Hex encoding
    /\0/,             // Null bytes
    // Only match dangerous commands with clear intent (must have spaces/context)
    /wget\s+http|curl\s+-O|chmod\s+[0-9]{3,4}|sh\s+.*\.sh|bash\s+-c/i,
    /rm\s+-rf|kill\s+-9|pkill\s+/i,
    // Shell scripts - only match when NOT part of a domain
    /(?<![\w])\.sh(?:\s|$|\?|&)/i, // .sh followed by whitespace, end, or query param
    // Suspicious file operations in system dirs
    /\/tmp\/[^?\s&]+\.(sh|bin|exe)|\/var\/tmp\/[^?\s&]+\.(sh|bin|exe)|\/dev\/[^?\s&]+\.(sh|bin|exe)/i,
    // Block direct IP malware download URLs
    /wget\s+http:\/\/(?!127\.0\.0\.1|localhost)\d+\.\d+\.\d+\.\d+/i,
    /curl\s+(-O\s+)?http:\/\/(?!127\.0\.0\.1|localhost)\d+\.\d+\.\d+\.\d+/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(decodedPath));
}

// Validate request body for malicious content
function containsMaliciousContent(body: string): boolean {
  const attackPatterns = [
    /wget|curl.*http/i,
    /chmod\s+\d+/i,
    /sh\s+.*\.sh/i,
    /bash\s+-c/i,
    /\/bin\/sh|\/bin\/bash/i,
    /exec\s*\(/i,
    /system\s*\(/i,
    /passthru\s*\(/i,
    /shell_exec/i,
    /proc_open/i,
    /popen/i,
    /`.*`/,  // Backtick command execution
    /\$\(.*\)/,  // Command substitution
    /\|\s*sh/i,  // Pipe to shell
    /176\.117\.107\.158|45\.61\.157\.12/,  // Known attack IPs
  ];

  return attackPatterns.some(pattern => pattern.test(body));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers for all responses
  const securityHeaders = {
    'X-DNS-Prefetch-Control': 'off',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };

  // EMERGENCY: Check IP blacklist FIRST
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';

  if (BLACKLISTED_IPS.has(ip)) {
    console.error(`[SECURITY ALERT] Blocked blacklisted IP: ${ip} attempting to access: ${pathname}`);
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403, headers: securityHeaders }
    );
  }

  // Check for malicious content in the URL itself (but only for API routes and form submissions)
  const fullUrl = request.url;
  const isApiOrFormRoute = pathname.startsWith('/api/') || request.method === 'POST' || request.method === 'PUT';

  if (isApiOrFormRoute && containsMaliciousPattern(fullUrl)) {
    console.error(`[SECURITY ALERT] Malicious URL pattern detected from IP ${ip}: ${fullUrl}`);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400, headers: securityHeaders }
    );
  }

  // Only apply security checks to API proxy routes
  if (pathname.startsWith('/api/proxy/')) {
    // Extract path without query parameters
    const proxyPath = pathname.replace('/api/proxy/', '').split('?')[0];

    // 1. Check for malicious patterns
    if (containsMaliciousPattern(proxyPath)) {
      console.error(`[Security] Blocked malicious path attempt: ${proxyPath}`);
      return NextResponse.json(
        { error: 'Invalid request path' },
        { status: 400, headers: securityHeaders }
      );
    }

    // 2. Validate against whitelist
    if (!isAllowedPath(proxyPath)) {
      console.error(`[Security] Blocked unauthorized path: ${proxyPath}`);
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404, headers: securityHeaders }
      );
    }

    // 3. Rate limiting (IP already extracted above)
    if (isRateLimited(ip)) {
      console.error(`[Security] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { ...securityHeaders, 'Retry-After': '60' } }
      );
    }

    // 4. Validate Content-Type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      const allowedTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'];

      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        console.error(`[Security] Invalid content-type: ${contentType}`);
        return NextResponse.json(
          { error: 'Invalid content type' },
          { status: 415, headers: securityHeaders }
        );
      }
    }

    // Log legitimate request
    console.log(`[Security] Allowed request: ${request.method} ${proxyPath} from ${ip}`);
  }

  // Continue with security headers
  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
