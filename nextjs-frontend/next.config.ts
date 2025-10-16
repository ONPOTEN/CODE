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
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://centimet2.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
