'use client';

/**
 * Complete Post Card Example
 * Shows how to integrate all engagement features
 */

import React from 'react';
import Link from 'next/link';
import { EngagementButtons } from './EngagementButtons';
import { CommentsSection } from './CommentsSection';
import { AuthorCard } from './AuthorCard';
import { useEngagement } from '@/contexts/EngagementContext';
import { Post } from '@/lib/api';

interface PostCardExampleProps {
  post: Post;
  currentUserId?: number;
}

export function PostCardExample({ post, currentUserId }: PostCardExampleProps) {
  const { engagements, fetchEngagementStats } = useEngagement();
  const engagement = engagements.get(post.id);

  // Auto-load engagement stats
  React.useEffect(() => {
    if (!engagement) {
      fetchEngagementStats(post.id);
    }
  }, [post.id, engagement, fetchEngagementStats]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Featured Image */}
      {post.featured_image && (
        <div className="h-48 bg-gray-200 overflow-hidden">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Author Card with Profile Link */}
        <AuthorCard
          author={post.author}
          createdAt={post.created_at}
          compact={false}
          showAvatar={false}
        />

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 line-clamp-2">
          {post.title}
        </h2>

        {/* Content Preview */}
        <p className="text-gray-700 mb-4 line-clamp-3">{post.content}</p>

        {/* Engagement Stats Bar */}
        {engagement ? (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="text-sm text-gray-600 flex gap-4">
              <span title="Likes">
                <span className="font-semibold text-gray-900">
                  {engagement.likes.count}
                </span>{' '}
                👍
              </span>
              <span title="Dislikes">
                <span className="font-semibold text-gray-900">
                  {engagement.dislikes.count}
                </span>{' '}
                👎
              </span>
              <span title="Comments">
                <span className="font-semibold text-gray-900">
                  {engagement.comments.count}
                </span>{' '}
                💬
              </span>
              <span title="Shares">
                <span className="font-semibold text-gray-900">
                  {engagement.shares.count}
                </span>{' '}
                📤
              </span>
            </div>

            {/* User Engagement Status */}
            <div className="flex gap-2">
              {engagement.likes.user_liked && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  You liked
                </span>
              )}
              {engagement.dislikes.user_disliked && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                  You disliked
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-6 bg-gray-200 rounded animate-pulse mb-4" />
        )}

        {/* Engagement Buttons */}
        <EngagementButtons
          postId={post.id}
          showLabels={true}
          className="mb-6 flex-wrap"
        />

        {/* Comments Section */}
        <CommentsSection postId={post.id} currentUserId={currentUserId} className="pt-4" />
      </div>
    </article>
  );
}

export default PostCardExample;
