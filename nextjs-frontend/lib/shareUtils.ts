/**
 * Utility functions for sharing posts to various social media platforms
 */

export interface ShareOptions {
  url: string;
  title: string;
  text?: string;
  hashtags?: string[];
}

/**
 * Share to Facebook
 */
export function shareToFacebook(options: ShareOptions): void {
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(options.url)}`;
  window.open(facebookShareUrl, 'facebook-share', 'width=600,height=400');
}

/**
 * Share to Twitter
 */
export function shareToTwitter(options: ShareOptions): void {
  const hashtags = options.hashtags?.join(',') || '';
  const text = options.text || options.title;
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    options.url
  )}&text=${encodeURIComponent(text)}${hashtags ? `&hashtags=${hashtags}` : ''}`;
  window.open(twitterShareUrl, 'twitter-share', 'width=600,height=400');
}

/**
 * Share to WhatsApp
 */
export function shareToWhatsApp(options: ShareOptions): void {
  const text = `${options.title}\n${options.url}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappShareUrl, 'whatsapp-share', 'width=600,height=400');
}

/**
 * Share to LinkedIn
 */
export function shareToLinkedIn(options: ShareOptions): void {
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(options.url)}`;
  window.open(linkedinShareUrl, 'linkedin-share', 'width=600,height=400');
}

/**
 * Share via Email
 */
export function shareViaEmail(options: ShareOptions): void {
  const subject = encodeURIComponent(options.title);
  const body = encodeURIComponent(`Check this out: ${options.text || options.title}\n\n${options.url}`);
  const emailShareUrl = `mailto:?subject=${subject}&body=${body}`;
  window.location.href = emailShareUrl;
}

/**
 * Copy direct link to clipboard
 */
export async function copyDirectLink(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern Clipboard API if available
      await navigator.clipboard.writeText(url);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy link:', error);
    return false;
  }
}

/**
 * Open Web Share API if available (for mobile devices)
 */
export async function useWebShareAPI(options: ShareOptions): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: options.title,
      text: options.text,
      url: options.url,
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled the share
      return false;
    }
    console.error('Error using Web Share API:', error);
    return false;
  }
}

/**
 * Get the share URL for a post
 */
export function getPostShareUrl(postId: number | string, postSlug?: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://centimet2.com';

  if (postSlug) {
    return `${baseUrl}/posts/${postSlug}`;
  }

  return `${baseUrl}/posts/${postId}`;
}

/**
 * Handle social media share with appropriate platform
 */
export async function handleSocialShare(
  platform: string,
  postId: number,
  postTitle: string,
  postSlug?: string,
  postText?: string
): Promise<void> {
  const shareUrl = getPostShareUrl(postId, postSlug);

  const options: ShareOptions = {
    url: shareUrl,
    title: postTitle,
    text: postText || postTitle,
    hashtags: ['centimet2', 'marketplace'],
  };

  switch (platform.toLowerCase()) {
    case 'facebook':
      shareToFacebook(options);
      break;
    case 'twitter':
      shareToTwitter(options);
      break;
    case 'whatsapp':
      shareToWhatsApp(options);
      break;
    case 'linkedin':
      shareToLinkedIn(options);
      break;
    case 'email':
      shareViaEmail(options);
      break;
    case 'direct':
      const copied = await copyDirectLink(shareUrl);
      if (copied) {
        // Show a success toast/notification
        console.log('Link copied to clipboard!');
      } else {
        console.error('Failed to copy link');
      }
      break;
    default:
      console.warn(`Unknown share platform: ${platform}`);
  }
}
