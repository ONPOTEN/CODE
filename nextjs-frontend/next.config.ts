import type { NextConfig } from "next";

// Cloudflare CDN configuration
const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Asset prefix for Cloudflare CDN (static assets like JS, CSS)
  assetPrefix: isProduction && cdnUrl ? cdnUrl : undefined,

  // Allow cross-origin requests from production domain during development
  allowedDevOrigins: ['https://centimet2.com', 'centimet2.com'],

  images: {
    // Use Cloudflare Image Resizing if available
    loader: isProduction && cdnUrl ? 'custom' : 'default',
    loaderFile: isProduction && cdnUrl ? './lib/cloudflareImageLoader.ts' : undefined,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'centimet2.com',
      },
      {
        protocol: 'http',
        hostname: 'centimet2.com',
        port: '8000',
      },
      {
        protocol: 'https',
        hostname: 'atm288528-s3user.vcos1.cloudstorage.com.vn',
      },
      {
        protocol: 'https',
        hostname: '**.vcos1.cloudstorage.com.vn',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Cloudflare CDN domain (wildcard for any subdomain)
      {
        protocol: 'https',
        hostname: '**.cdnflare.com',
      },
    ],
    // Cache optimized images for 60 days
    minimumCacheTTL: 60 * 60 * 24 * 60,
  },
  env: {
    WORDPRESS_API_URL: process.env.WORDPRESS_API_URL || 'https://centimet2.com/wp-json/wp/v2',
    WOOCOMMERCE_API_URL: process.env.WOOCOMMERCE_API_URL || 'https://centimet2.com/wp-json/wc/v3',
  },
  async headers() {
    return [
      // Cache static assets for 1 year (Cloudflare will cache these)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images for 30 days
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      // Cache fonts for 1 year
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          // CORS headers
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://*.facebook.com https://*.fbcdn.net https://accounts.google.com https://www.google.com https://www.gstatic.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; media-src 'self' blob: https:; connect-src 'self' https://api.centimet2.com https://centimet2.com https://socket.centimet2.com wss://api.centimet2.com wss://socket.centimet2.com https://*.facebook.com https://*.fbcdn.net https://accounts.google.com https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://www.google.com https://content-firebaseappcheck.googleapis.com; frame-src https://*.facebook.com https://accounts.google.com https://www.google.com https://*.firebaseapp.com https://www.youtube.com https://youtube.com https://player.vimeo.com https://vimeo.com https://www.tiktok.com https://tiktok.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.facebook.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
