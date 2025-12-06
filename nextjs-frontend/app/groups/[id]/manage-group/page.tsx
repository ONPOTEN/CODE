'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, groupPosts, Group, GroupPost, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ManageGroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params.id as string);
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [pendingPosts, setPendingPosts] = useState<GroupPost[]>([]);
  const [approvedPosts, setApprovedPosts] = useState<GroupPost[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const [postsSubTab, setPostsSubTab] = useState<'pending' | 'approved'>('pending');
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

      // Check authorization - allow group owner or admin
      const currentUserRole = (currentUser as any)?.role;
      const isGroupOwner = currentUser && groupData.group_owner_id === currentUser.id;
      const isAdmin = currentUserRole === 'admin' || currentUserRole === 'administrator';

      if (currentUser && !isGroupOwner && !isAdmin) {
        setError('Bạn không có quyền quản lý nhóm này');
        return;
      }

      setGroup(groupData);

      // Fetch pending posts
      const pendingResponse = await groupPosts.getPendingPosts(groupId);
      console.log('[ManageGroup] Pending posts response:', pendingResponse);
      setPendingPosts(pendingResponse.data || []);

      // Fetch all posts and filter approved ones (all except pending)
      const allPostsResponse = await groupPosts.index({ group_id: groupId, per_page: 100 });
      console.log('[ManageGroup] All posts response:', allPostsResponse);
      const approved = allPostsResponse.data?.filter((p: GroupPost) => p.post_status !== 'pending') || [];
      setApprovedPosts(approved);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Không thể tải dữ liệu');
      }
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePost = async (postId: number) => {
    try {
      setApprovingId(postId);
      console.log('[ManageGroup] Approving post:', { groupId, postId });
      await groupPosts.approvePost(groupId, postId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error approving post:', err);
      setError('Không thể duyệt bài viết');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectPost = async (postId: number) => {
    if (!confirm('Bạn có chắc muốn từ chối bài viết này không?')) return;

    try {
      setRejectingId(postId);
      console.log('[ManageGroup] Rejecting post:', { groupId, postId });
      await groupPosts.rejectPost(groupId, postId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error rejecting post:', err);
      setError('Không thể từ chối bài viết');
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này không? Hành động này không thể hoàn tác.')) return;

    try {
      setDeletingId(postId);
      console.log('[ManageGroup] Deleting post:', { groupId, postId });
      await groupPosts.deletePost(postId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Không thể xóa bài viết');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/my-groups" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Quay lại nhóm của tôi
          </Link>
          <div className="mt-8 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-gray-500 text-lg">Không tìm thấy nhóm</p>
          <Link href="/my-groups" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700">
            Quay lại nhóm của tôi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/groups/${groupId}`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← Quay lại {group.group_name}
          </Link>
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quản lý nhóm</h1>
              <p className="text-gray-600 mt-2">Quản lý bài viết và thành viên nhóm</p>
            </div>
            <Link
              href={`/groups/${groupId}/edit`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Chỉnh sửa nhóm
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Main Tabs - Posts vs Users */}
        <div className="bg-grey-200 rounded-lg shadow mb-8 border border-gray-300">
          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-grey-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                  <path d="M2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z" />
                </svg>
                Bài viết
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-grey-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 6a3 3 0 11-6 0 3 3 0 016 0zm0 0h12v1a6 6 0 01-6 6H3a6 6 0 01-6-6v-1h12z" />
                </svg>
                Thành viên
              </div>
            </button>
          </div>

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div>
              {/* Posts Subtabs */}
              <div className="flex border-b border-gray-300 bg-white">
                <button
                  onClick={() => setPostsSubTab('pending')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    postsSubTab === 'pending'
                      ? 'text-amber-600 border-b-2 border-amber-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm0-5a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    Chờ duyệt ({pendingPosts.length})
                  </div>
                </button>
                <button
                  onClick={() => setPostsSubTab('approved')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    postsSubTab === 'approved'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                    Đã duyệt ({approvedPosts.length})
                  </div>
                </button>
              </div>

              {/* Pending Posts Subtab */}
              {postsSubTab === 'pending' && (
                <div className="p-6">
                  {pendingPosts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Không có bài viết chờ duyệt</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingPosts.map((post) => (
                        <div key={post.id} className="border border-amber-200 bg-blue-500 rounded-lg p-4">
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
                                Gửi ngày {new Date(post.post_date).toLocaleDateString('vi-VN', {
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
                                className="px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {approvingId === post.id ? 'Đang duyệt...' : 'Duyệt'}
                              </button>
                              <button
                                onClick={() => handleRejectPost(post.id)}
                                disabled={rejectingId === post.id}
                                className="px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {rejectingId === post.id ? 'Đang từ chối...' : 'Từ chối'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Approved Posts Subtab */}
              {postsSubTab === 'approved' && (
                <div className="p-6">
                  {approvedPosts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Không có bài viết đã duyệt</p>
                  ) : (
                    <div className="space-y-4">
                      {approvedPosts.map((post) => (
                        <div key={post.id} className="border border-gray-300 rounded-lg p-4 hover:bg-white transition-colors">
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
                                Đăng ngày {new Date(post.post_date).toLocaleDateString('vi-VN', {
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
                                onClick={() => router.push(`/groups/${groupId}/posts/${post.id}/edit`)}
                                className="px-4 py-2 bg-blue-500 text-blue-600 rounded-lg hover:bg-blue-500 font-medium transition-colors whitespace-nowrap"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                disabled={deletingId === post.id}
                                className="px-4 py-2 bg-blue-500 text-red-600 rounded-lg hover:bg-blue-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {deletingId === post.id ? 'Đang xóa...' : 'Xóa'}
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
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-6">
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-lg font-medium text-gray-700 mb-2">Quản lý thành viên sắp ra mắt</p>
                <p className="text-sm">Tính năng quản lý thành viên nhóm sẽ được thêm trong bản cập nhật sau.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
