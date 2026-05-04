'use client';

import React, { useMemo } from 'react';

interface VideoEmbedProps {
  url: string;
  className?: string;
}

interface VideoInfo {
  type: 'youtube' | 'vimeo' | 'dailymotion' | 'facebook' | 'tiktok' | 'unknown';
  embedUrl: string | null;
  thumbnailUrl?: string;
}

/**
 * Parses a video URL and returns video information
 */
function parseVideoUrl(url: string): VideoInfo {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
        thumbnailUrl: `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`,
      };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${match[1]}`,
      };
    }
  }

  // Dailymotion patterns
  const dailymotionPatterns = [
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
    /dai\.ly\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of dailymotionPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        type: 'dailymotion',
        embedUrl: `https://www.dailymotion.com/embed/video/${match[1]}`,
      };
    }
  }

  // Facebook video patterns
  const facebookPattern = /facebook\.com\/(?:watch\/\?v=|.*\/videos\/)(\d+)/;
  const fbMatch = url.match(facebookPattern);
  if (fbMatch && fbMatch[1]) {
    return {
      type: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
    };
  }

  // TikTok patterns
  const tiktokPattern = /tiktok\.com\/@[^\/]+\/video\/(\d+)/;
  const tiktokMatch = url.match(tiktokPattern);
  if (tiktokMatch && tiktokMatch[1]) {
    return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
    };
  }

  return { type: 'unknown', embedUrl: null };
}

/**
 * Extracts all video URLs from text content
 */
export function extractVideoUrls(text: string): string[] {
  if (!text) return [];

  // Match URLs that might be video links
  const urlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com|dailymotion\.com|dai\.ly|facebook\.com|tiktok\.com)[^\s<>"']+/gi;
  const matches = text.match(urlPattern);
  return matches || [];
}

/**
 * VideoEmbed component - renders an embedded video player
 */
export function VideoEmbed({ url, className = '' }: VideoEmbedProps) {
  const videoInfo = useMemo(() => parseVideoUrl(url), [url]);

  if (!videoInfo.embedUrl) {
    return null;
  }

  return (
    <div className={`video-embed-container relative w-full ${className}`}>
      <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg bg-gray-900">
        <iframe
          src={videoInfo.embedUrl}
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={`${videoInfo.type} video`}
        />
      </div>
      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
        {videoInfo.type === 'youtube' && (
          <span className="inline-flex items-center gap-1 text-red-600">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            YouTube
          </span>
        )}
        {videoInfo.type === 'vimeo' && (
          <span className="inline-flex items-center gap-1 text-blue-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197a315.065 315.065 0 003.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/>
            </svg>
            Vimeo
          </span>
        )}
        {videoInfo.type === 'dailymotion' && (
          <span className="inline-flex items-center gap-1 text-blue-700">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.004 0C5.376 0 0 5.376 0 12.004 0 18.632 5.376 24 12.004 24 18.632 24 24 18.632 24 12.004 24 5.376 18.632 0 12.004 0zm4.218 15.986c-1.278 1.28-3.32 1.28-4.598 0-1.28-1.278-1.28-3.32 0-4.598 1.278-1.28 3.32-1.28 4.598 0 1.28 1.278 1.28 3.32 0 4.598z"/>
            </svg>
            Dailymotion
          </span>
        )}
        {videoInfo.type === 'facebook' && (
          <span className="inline-flex items-center gap-1 text-blue-600">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </span>
        )}
        {videoInfo.type === 'tiktok' && (
          <span className="inline-flex items-center gap-1 text-gray-900">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
            TikTok
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * VideoEmbedList component - renders multiple video embeds from text content
 */
interface VideoEmbedListProps {
  content: string;
  className?: string;
  maxVideos?: number;
}

export function VideoEmbedList({ content, className = '', maxVideos = 5 }: VideoEmbedListProps) {
  const videoUrls = useMemo(() => {
    const urls = extractVideoUrls(content);
    // Remove duplicates and limit
    const uniqueUrls = [...new Set(urls)];
    return uniqueUrls.slice(0, maxVideos);
  }, [content, maxVideos]);

  if (videoUrls.length === 0) {
    return null;
  }

  return (
    <div className={`video-embed-list space-y-4 ${className}`}>
      {videoUrls.map((url, index) => (
        <VideoEmbed key={`${url}-${index}`} url={url} />
      ))}
    </div>
  );
}

export default VideoEmbed;
