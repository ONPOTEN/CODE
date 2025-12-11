import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from production domain during development
  allowedDevOrigins: ['https://centimet2.com', 'centimet2.com'],

  images: {
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
    ],
    // Custom loader to handle URL transformations
    unoptimized: false,
  },
  env: {
    WORDPRESS_API_URL: process.env.WORDPRESS_API_URL || 'https://centimet2.com/wp-json/wp/v2',
    WOOCOMMERCE_API_URL: process.env.WOOCOMMERCE_API_URL || 'https://centimet2.com/wp-json/wc/v3',
  },
  async headers() {
    return [
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://*.facebook.com https://*.fbcdn.net https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; media-src 'self' blob: https:; connect-src 'self' https://centimet2.com:8000 https://centimet2.com wss://centimet2.com:8000 wss://centimet2.com:3000 https://*.facebook.com https://*.fbcdn.net https://accounts.google.com; frame-src https://*.facebook.com https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.facebook.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
