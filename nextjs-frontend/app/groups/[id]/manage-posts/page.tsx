'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, groupPosts, Group, GroupPost, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ManagePostsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params.id as string);
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [pendingPosts, setPendingPosts] = useState<GroupPost[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<GroupPost[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details
      const groupResponse = await groups.getById(groupId);
      const groupData = groupResponse.data;

      // Check authorization
      if (currentUser && groupData.group_owner_id !== currentUser.id) {
        setError('You do not have permission to manage posts in this group');
        return;
      }

      setGroup(groupData);

      // Fetch pending posts
      const pendingResponse = await groupPosts.getPendingPosts(groupId);
      console.log('[ManagePosts] Pending posts response:', pendingResponse);
      setPendingPosts(pendingResponse.data || []);

      // Fetch all posts and filter approved ones
      const allPostsResponse = await groupPosts.index({ group_id: groupId, per_page: 100 });
      console.log('[ManagePosts] All posts response:', allPostsResponse);
      const approved = allPostsResponse.data?.filter((p: GroupPost) => p.post_status === 'published') || [];
      setApprovedPosts(approved);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to load data');
      }
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePost = async (postId: number) => {
    try {
      setApprovingId(postId);
      console.log('[ManagePosts] Approving post:', { groupId, postId });
      await groupPosts.approvePost(groupId, postId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error approving post:', err);
      setError('Failed to approve post');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectPost = async (postId: number) => {
    if (!confirm('Are you sure you want to reject this post?')) return;

    try {
      setRejectingId(postId);
      console.log('[ManagePosts] Rejecting post:', { groupId, postId });
      await groupPosts.rejectPost(groupId, postId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error rejecting post:', err);
      setError('Failed to reject post');
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      setDeletingId(postId);
      console.log('[ManagePosts] Deleting post:', { groupId, postId });
      await groupPosts.deletePost(postId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/my-groups" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to My Groups
          </Link>
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-gray-500 text-lg">Group not found</p>
          <Link href="/my-groups" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to My Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/groups/${groupId}`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to {group.group_name}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Manage Posts</h1>
          <p className="text-gray-600 mt-2">Approve pending posts and manage approved posts</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8 border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm0-5a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                Pending ({pendingPosts.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'approved'
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                Approved ({approvedPosts.length})
              </div>
            </button>
          </div>

          {/* Pending Posts Tab */}
          {activeTab === 'pending' && (
            <div className="p-6">
              {pendingPosts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending posts</p>
              ) : (
                <div className="space-y-4">
                  {pendingPosts.map((post) => (
                    <div key={post.id} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                      <div className="flex gap-4">
                        {/* Post Author Avatar */}
                        {post.author?.avatar && (
                          <img src={post.author.avatar} alt={post.author.name} className="w-12 h-12 rounded-full object-cover" />
                        )}

                        {/* Post Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{post.author?.name}</p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-3">{post.post_content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Submitted on {new Date(post.post_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApprovePost(post.id)}
                            disabled={approvingId === post.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {approvingId === post.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleRejectPost(post.id)}
                            disabled={rejectingId === post.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {rejectingId === post.id ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Approved Posts Tab */}
          {activeTab === 'approved' && (
            <div className="p-6">
              {approvedPosts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No approved posts</p>
              ) : (
                <div className="space-y-4">
                  {approvedPosts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        {/* Post Author Avatar */}
                        {post.author?.avatar && (
                          <img src={post.author.avatar} alt={post.author.name} className="w-12 h-12 rounded-full object-cover" />
                        )}

                        {/* Post Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{post.author?.name}</p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-3">{post.post_content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Published on {new Date(post.post_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingId === post.id}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {deletingId === post.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
