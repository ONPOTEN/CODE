'use client';

import Link from 'next/link';
import { Post } from '@/lib/api';

interface WallPostCardProps {
  post: Post;
}

export function WallPostCard({ post }: WallPostCardProps) {
  // Get featured image - prioritize featured_image, then first image from images array
  const featuredImageUrl = post.featured_image ||
    (post.images && post.images.length > 0 ? post.images[0] : null);

  // Format date
  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/posts/${post.id}`}>
      <article className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden hover:border-blue-300 cursor-pointer h-full flex flex-col">
        {/* Featured Image */}
        {featuredImageUrl && (
          <div className="relative h-48 bg-gray-200 overflow-hidden">
            <img
              src={typeof featuredImageUrl === 'string' ? featuredImageUrl : featuredImageUrl.url || ''}
              alt={post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400';
                  placeholder.innerHTML = `
                    <svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  `;
                  e.currentTarget.parentElement.appendChild(placeholder);
                }
              }}
            />
          </div>
        )}

        {/* Image Placeholder */}
        {!featuredImageUrl && (
          <div className="relative h-48 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2 line-clamp-2">
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1">
              {post.excerpt}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {post.type}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formattedDate}
              </span>
            </div>

            {/* Status Badge */}
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                post.status === 'publish'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {post.status}
            </span>
          </div>

          {/* Image Count Badge */}
          {post.images && post.images.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-blue-600 font-medium">
                📷 +{post.images.length - 1} more {post.images.length === 2 ? 'image' : 'images'}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export default WallPostCard;
