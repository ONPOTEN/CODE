'use client';

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

/**
 * Cloudflare Image Resizing loader for Next.js
 *
 * This loader uses Cloudflare's Image Resizing feature to optimize images.
 * It works when your site is proxied through Cloudflare with Image Resizing enabled.
 *
 * Documentation: https://developers.cloudflare.com/images/transform-images/
 */
export default function cloudflareImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
  const q = quality || 75;

  // If the source is already an absolute URL
  if (src.startsWith('http://') || src.startsWith('https://')) {
    // Use Cloudflare Image Resizing URL format
    // Format: /cdn-cgi/image/width=<width>,quality=<quality>,format=auto/<original-url>
    if (cdnUrl) {
      return `${cdnUrl}/cdn-cgi/image/width=${width},quality=${q},format=auto/${encodeURIComponent(src)}`;
    }
    // Fallback to Cloudflare Polish for images on our domain
    return `${src}?width=${width}&quality=${q}`;
  }

  // For relative URLs, prepend the CDN URL if available
  const normalizedSrc = src.startsWith('/') ? src : `/${src}`;

  if (cdnUrl) {
    // Use Cloudflare Image Resizing
    return `${cdnUrl}/cdn-cgi/image/width=${width},quality=${q},format=auto${normalizedSrc}`;
  }

  // Fallback without CDN
  return normalizedSrc;
}

/**
 * Get optimized image URL for Cloudflare CDN
 * Can be used directly for background images or other non-Next/Image cases
 */
export function getCloudflareImageUrl(
  src: string,
  options: { width?: number; height?: number; quality?: number; fit?: 'contain' | 'cover' | 'crop' | 'scale-down' } = {}
): string {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
  const { width, height, quality = 75, fit = 'cover' } = options;

  if (!cdnUrl) {
    return src;
  }

  // Build transformation parameters
  const params: string[] = [];
  if (width) params.push(`width=${width}`);
  if (height) params.push(`height=${height}`);
  params.push(`quality=${quality}`);
  params.push(`fit=${fit}`);
  params.push('format=auto');

  const transformParams = params.join(',');

  if (src.startsWith('http://') || src.startsWith('https://')) {
    return `${cdnUrl}/cdn-cgi/image/${transformParams}/${encodeURIComponent(src)}`;
  }

  const normalizedSrc = src.startsWith('/') ? src : `/${src}`;
  return `${cdnUrl}/cdn-cgi/image/${transformParams}${normalizedSrc}`;
}
