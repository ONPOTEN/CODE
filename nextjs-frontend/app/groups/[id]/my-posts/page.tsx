'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, groupPosts, Group, GroupPost, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function MyPostsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params.id as string);
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [myPosts, setMyPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details
      const groupResponse = await groups.getById(groupId);
      setGroup(groupResponse.data);

      // Fetch all posts from the group without status filtering
      // This ensures we get all post statuses: draft, pending, publish, trash
      const allPostsResponse = await groupPosts.index({
        group_id: groupId,
        per_page: 100,
        // Note: Not specifying status parameter to get all posts
      });
      console.log('[MyPosts] All posts response:', allPostsResponse);

      // Filter posts to show only those created by current user (by auth ID)
      // Include all post statuses: draft, pending, publish, trash
      const userPosts = allPostsResponse.data?.filter((p: GroupPost) => {
        return p.post_author === currentUser?.id;
      }) || [];
      setMyPosts(userPosts);
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

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      setDeletingId(postId);
      console.log('[MyPosts] Deleting post:', { groupId, postId });
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

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      setIsLeavingGroup(true);
      await groups.leaveGroup(groupId);
      router.push('/groups');
    } catch (err) {
      console.error('Error leaving group:', err);
      setError('Failed to leave group');
      setIsLeavingGroup(false);
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
          <Link href={`/groups/${groupId}`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Group
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
          <p className="text-gray-500 text-lg">Group not found</p>
          <Link href="/groups" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700">
            Back to Groups
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
          <div className="flex items-center justify-between mb-4">
            <Link href={`/groups/${groupId}`} className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to {group.group_name}
            </Link>
            <button
              onClick={handleLeaveGroup}
              disabled={isLeavingGroup}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLeavingGroup ? 'Leaving...' : 'Leave Group'}
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">My Posts</h1>
          <p className="text-gray-600 mt-2">Manage your posts in this group</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Posts Container */}
        <div className="bg-grey-200 rounded-lg shadow border border-gray-300">
          {myPosts.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-gray-500 text-lg">No posts yet</p>
              <p className="text-gray-600 mt-2">Create your first post to get started!</p>
              <Link
                href={`/groups/${groupId}/create-post`}
                className="mt-4 inline-block px-6 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Create Post
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {myPosts.map((post) => (
                <div key={post.id} className="p-6 hover:bg-white transition-colors">
                  <div className="flex gap-4">
                    {/* Post Author Avatar */}
                    {post.author?.avatar && (
                      <img src={post.author.avatar} alt={post.author.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    )}

                    {/* Post Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{post.author?.name}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-3">{post.post_content}</p>

                      {/* Status Badge */}
                      <div className="mt-3 flex items-center gap-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          post.post_status === 'publish'
                            ? 'bg-blue-500 text-green-800'
                            : post.post_status === 'draft'
                            ? 'bg-blue-500 text-amber-800'
                            : 'bg-blue-500 text-red-800'
                        }`}>
                          {post.post_status?.charAt(0).toUpperCase() + post.post_status?.slice(1) || 'Draft'}
                        </span>
                        <p className="text-xs text-gray-500">
                          {new Date(post.post_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {post.post_status === 'publish' && (
                        <button
                          onClick={() => router.push(`/groups/${groupId}/posts/${post.id}/edit`)}
                          className="px-4 py-2 bg-blue-500 text-blue-600 rounded-lg hover:bg-blue-500 font-medium transition-colors whitespace-nowrap"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingId === post.id}
                        className="px-4 py-2 bg-blue-500 text-red-600 rounded-lg hover:bg-blue-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
      </div>
    </div>
  );
}
