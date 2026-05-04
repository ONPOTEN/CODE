/**
 * Transforms HTTP image URLs to HTTPS to avoid mixed content warnings
 * @param url - The original image URL
 * @returns The transformed HTTPS URL
 */
export function getSecureImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  // If URL is already HTTPS, return as is
  if (url.startsWith('https://')) {
    return url;
  }

  // If URL is HTTP, convert to HTTPS and remove port 8000
  if (url.startsWith('http://')) {
    return url
      .replace('http://', 'https://')
      .replace(':8000', '');
  }

  // If URL is relative, prepend the base URL
  if (url.startsWith('/')) {
    return `https://centimet2.com${url}`;
  }

  return url;
}

/**
 * Gets the image URL for Next.js Image component
 * Transforms URLs to be compatible with Next.js image optimization
 */
export function getNextImageUrl(url: string | null | undefined): string {
  const secureUrl = getSecureImageUrl(url);

  // If it's an external URL, we need to ensure it's in the remotePatterns
  if (secureUrl.startsWith('http')) {
    return secureUrl;
  }

  return secureUrl;
}
