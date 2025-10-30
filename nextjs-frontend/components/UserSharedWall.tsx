'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { posts, Post, ApiException } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PostCardExample from './PostCardExample';

interface UserSharedWallProps {
  userId: number;
  maxPosts?: number;
}

export default function UserSharedWall({ userId, maxPosts = 10 }: UserSharedWallProps) {
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  const fetchSharedWallPosts = useCallback(
    async (pageNum: number) => {
      if (loading || !hasMore) return;

      try {
        setLoading(true);
        setError(null);

        const response = await posts.sharedWall(userId, {
          per_page: maxPosts,
          page: pageNum,
        });

        // Check if this is the first page and it's empty
        if (pageNum === 1 && response.data.length === 0) {
          setIsEmpty(true);
          setHasMore(false);
          return;
        }

        if (response.data.length === 0) {
          setHasMore(false);
        } else {
          setPostsList((prev) => {
            // Avoid duplicates
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = response.data.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });

          // Check if there are more pages
          if (response.meta) {
            setHasMore(pageNum < response.meta.last_page);
          }
        }
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`API Error: ${err.message}`);
        } else {
          setError('Failed to fetch shared wall posts');
        }
        console.error('Shared Wall API Error:', err);
      } finally {
        setLoading(false);
      }
    },
    [userId, loading, hasMore, maxPosts]
  );

  // Initial fetch
  useEffect(() => {
    fetchSharedWallPosts(1);
  }, [userId]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
          fetchSharedWallPosts(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchSharedWallPosts]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        <p className="font-semibold">Error loading shared wall posts</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No shared posts on this wall yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {postsList.length > 0 && (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Shared Posts ({postsList.length})
            </h3>
          </div>

          <div className="space-y-4">
            {postsList.map((post) => (
              <PostCardExample
                key={post.id}
                post={post}
                isOwnPost={false}
              />
            ))}
          </div>
        </>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="py-8 text-center"
        >
          {loading && <p className="text-gray-500">Loading more posts...</p>}
        </div>
      )}

      {!hasMore && postsList.length > 0 && (
        <div className="py-4 text-center text-gray-500 text-sm">
          No more posts to load
        </div>
      )}
    </div>
  );
}
