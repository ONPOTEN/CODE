import { NextRequest, NextResponse } from 'next/server';

// Get the backend API URL - this must be a server-side environment variable
// Using api.centimet2.com subdomain on standard HTTPS port 443 (works with Cloudflare)
const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://api.centimet2.com/api/v1';

// App Router segment config
// 'force-dynamic' prevents caching of this route (needed for proxy)
export const dynamic = 'force-dynamic';
// Max function duration for video uploads (5 minutes)
export const maxDuration = 300;

console.log('[API Proxy] Initialized with LARAVEL_API_URL:', LARAVEL_API_URL);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PATCH');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${LARAVEL_API_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[API Proxy] ${method} ${url}`);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Forward important headers
    const headersToForward = [
      'authorization',
      'content-type',
      'accept',
      'cookie',
      'x-csrf-token',
      'x-requested-with',
    ];

    headersToForward.forEach((header) => {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
        console.log(`[API Proxy] Including header: ${header} = ${header === 'authorization' ? value.substring(0, 30) + '...' : value}`);
      } else {
        console.log(`[API Proxy] Missing header: ${header}`);
      }
    });

    // Debug: Log forwarded headers (hide auth token for security)
    const debugHeaders = { ...headers };
    if (debugHeaders['authorization']) {
      debugHeaders['authorization'] = debugHeaders['authorization'].substring(0, 20) + '...';
    }
    console.log(`[API Proxy] Forwarded headers:`, debugHeaders);

    // Don't set Content-Type yet - we need to handle it based on body type
    const options: RequestInit = {
      method,
      headers,
      // Add timeout using AbortController
      // Use 5 minutes (300s) for large video uploads; 30s was too short
      signal: AbortSignal.timeout(300000), // 5 minute timeout
    };

    // Add body for POST, PUT, PATCH, and DELETE requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const contentType = request.headers.get('content-type');
      console.log(`[API Proxy] Request content-type: ${contentType}`);

      // TRANSPARENT PASSTHROUGH + CONTENT SNIFFING
      // Read the raw body as bytes and forward as-is.
      // Cloudflare can silently strip the multipart boundary from the content-type header,
      // leaving content-type: application/json while the body is still raw multipart.
      // We detect this by sniffing the first bytes: multipart bodies always start with "--".
      try {
        const rawBody = await request.arrayBuffer();
        if (rawBody.byteLength > 0) {
          options.body = rawBody;
          console.log(`[API Proxy] Raw body size: ${rawBody.byteLength} bytes`);

          // Sniff actual body content: multipart/form-data always starts with "--"
          const firstBytes = new Uint8Array(rawBody.slice(0, 2));
          const startsWithDashes = firstBytes[0] === 45 && firstBytes[1] === 45; // "--"

          if (startsWithDashes && contentType?.includes('application/json')) {
            // Cloudflare mangled the content-type. The real content is multipart/form-data.
            // Extract the boundary from the first line of the body
            const decoder = new TextDecoder();
            const firstLine = decoder.decode(rawBody.slice(0, 200)).split('\r\n')[0];
            const boundary = firstLine.replace(/^--/, '');
            const fixedContentType = `multipart/form-data; boundary=${boundary}`;
            headers['content-type'] = fixedContentType;
            console.log(`[API Proxy] Detected Cloudflare-mangled multipart. Fixed content-type: ${fixedContentType}`);
          } else if (contentType) {
            // Forward the content-type as-is
            headers['content-type'] = contentType;
          }
        } else {
          console.log(`[API Proxy] Empty body for ${method} request`);
          if (!headers['content-type']) {
            headers['content-type'] = 'application/json';
          }
        }
      } catch (bodyError) {
        const bodyErrorMsg = bodyError instanceof Error ? bodyError.message : 'Unknown error reading body';
        console.error(`[API Proxy] Error reading request body: ${bodyErrorMsg}`);
        throw new Error(`Failed to read request body: ${bodyErrorMsg}`);
      }
    } else {
      // For GET, HEAD, etc — do not set Content-Type (no body)
      delete headers['content-type'];
    }

    console.log(`[API Proxy] Attempting to fetch from backend: ${url}`);
    let response;

    try {
      response = await fetch(url, options);
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      console.error(`[API Proxy] Backend connection failed: ${errorMessage}`);
      console.error(`[API Proxy] Backend URL: ${url}`);
      console.error(`[API Proxy] Backend is running at: ${LARAVEL_API_URL}`);

      return NextResponse.json(
        {
          error: 'Proxy request failed',
          details: `Failed to connect to backend: ${errorMessage}. Ensure Laravel API is running at ${LARAVEL_API_URL}`,
          backend_url: LARAVEL_API_URL,
          requested_endpoint: path,
        },
        { status: 502 } // Bad Gateway status code
      );
    }

    // Get response body as ArrayBuffer first to handle any content type
    const arrayBuffer = await response.arrayBuffer();
    const contentLength = arrayBuffer.byteLength;

    // Forward response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Skip some headers that shouldn't be forwarded
      if (!['connection', 'keep-alive', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Add CORS headers - STRICT: only allow your domain
    const allowedOrigins = ['https://centimet2.com', 'https://www.centimet2.com'];
    const requestOrigin = request.headers.get('origin');
    const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

    responseHeaders.set('Access-Control-Allow-Origin', origin);
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');

    // Ensure Content-Type is set properly if missing
    const originalContentType = responseHeaders.get('Content-Type');

    // Debug: Log response details
    console.log(`[API Proxy] Response status: ${response.status}, Content-Type: ${originalContentType}, Size: ${contentLength}bytes`);

    // Log error responses for debugging
    if (response.status >= 400) {
      const textContent = new TextDecoder().decode(arrayBuffer);
      console.error(`[API Proxy] ERROR Response (${response.status}): ${textContent}`);

      // Special handling for 401 - log more details
      if (response.status === 401) {
        console.error(`[API Proxy] 401 Unauthorized - Token may be invalid or not recognized`);
        console.error(`[API Proxy] Request URL: ${url}`);
        console.error(`[API Proxy] Auth Header Sent: ${request.headers.get('authorization')?.substring(0, 50)}`);
      }
    }

    // Handle empty responses
    if (contentLength === 0) {
      console.error(`[API Proxy] ERROR: Backend returned empty response!`);
      console.error(`[API Proxy] Status: ${response.status}, Headers:`, Object.fromEntries(response.headers.entries()));
    }

    // If we got HTML instead of JSON, log the response for debugging
    if (originalContentType?.includes('text/html') && contentLength > 0) {
      const textContent = new TextDecoder().decode(arrayBuffer);
      console.error(`[API Proxy] ERROR: Backend returned HTML instead of JSON. Response preview:`, textContent.substring(0, 500));
    }

    // Set proper content type if missing
    if (!responseHeaders.has('Content-Type')) {
      responseHeaders.set('Content-Type', 'application/json');
    }

    return new NextResponse(arrayBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';

    console.error('[API Proxy] Unexpected error:', error);
    console.error('[API Proxy] Error message:', errorMessage);
    console.error('[API Proxy] Error stack:', errorStack);

    return NextResponse.json(
      {
        error: 'Proxy request failed',
        details: errorMessage,
        laravel_api_url: LARAVEL_API_URL,
        method,
        path: pathSegments.join('/'),
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  // STRICT: only allow your domain
  const allowedOrigins = ['https://centimet2.com', 'https://www.centimet2.com'];
  const requestOrigin = request.headers.get('origin');
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// Health check endpoint for debugging
export async function HEAD(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  if (path.join('/') === 'health') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-API-URL': LARAVEL_API_URL,
      },
    });
  }

  return new NextResponse(null, { status: 404 });
}
