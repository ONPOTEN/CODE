'use client';

import { useEffect, useState } from 'react';
import { posts, Post, ApiException } from '@/lib/api';

interface ShareToWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallUserId: number;
  wallUserName: string;
  onSuccess?: () => void;
}

export function ShareToWallModal({
  isOpen,
  onClose,
  wallUserId,
  wallUserName,
  onSuccess,
}: ShareToWallModalProps) {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user's posts when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function fetchMyPosts() {
      try {
        setLoading(true);
        setError(null);
        const response = await posts.myPosts({ per_page: 50, status: 'publish' });
        setUserPosts(response.data);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load your posts');
      } finally {
        setLoading(false);
      }
    }

    fetchMyPosts();
  }, [isOpen]);

  // Filter posts based on search
  const filteredPosts = userPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleShare = async () => {
    if (!selectedPostId) {
      setError('Please select a post');
      return;
    }

    try {
      setSharing(true);
      setError(null);
      await posts.shareToWall(selectedPostId, wallUserId);
      alert(`Post shared to ${wallUserName}'s wall successfully!`);
      setSelectedPostId(null);
      setSearchTerm('');
      onClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to share post to wall');
      }
      console.error('Error sharing post:', err);
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-4 bg-gray-50 rounded-lg shadow-xl z-50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-50 border-b border-gray-300 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Post on {wallUserName}'s Wall
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Search Box */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search your posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm">You haven't created any published posts yet</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No posts match your search</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPosts.map((post) => (
                <label
                  key={post.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPostId === post.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="post"
                    value={post.id}
                    checked={selectedPostId === post.id}
                    onChange={(e) => setSelectedPostId(Number(e.target.value))}
                    className="w-4 h-4 mt-1 flex-shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{post.type}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-300 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition-colors"
            disabled={sharing}
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={sharing || !selectedPostId || userPosts.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sharing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sharing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
                </svg>
                Share to Wall
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default ShareToWallModal;
