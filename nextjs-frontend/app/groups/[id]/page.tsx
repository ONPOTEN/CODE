'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { groups, groupPosts, Group, GroupPost } from '@/lib/api';
import GroupPostCard from '@/components/GroupPostCard';
import GroupPostForm from '@/components/GroupPostForm';

export default function GroupWallPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [isJoiningOrLeaving, setIsJoiningOrLeaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'post_date' | 'comment_count'>('post_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [isUserModerator, setIsUserModerator] = useState(false);
  const perPage = 10;

  useEffect(() => {
    fetchGroupAndPosts();
    checkUserMembership();
  }, [groupId, currentPage, sortBy, order]);

  const checkUserMembership = async () => {
    try {
      setIsCheckingMembership(true);
      const response = await groups.checkMembership(parseInt(groupId));
      setIsMember(response.is_member);

      // Get current user ID from localStorage or auth context
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      }
    } catch (err) {
      console.error('Error checking membership:', err);
      setIsMember(false);
    } finally {
      setIsCheckingMembership(false);
    }
  };

  const fetchGroupAndPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details
      const groupResponse = await groups.getById(parseInt(groupId));
      setGroup(groupResponse.data);

      // Fetch group posts
      const postsResponse = await groupPosts.getByGroupId(parseInt(groupId), {
        per_page: perPage,
        page: currentPage,
        status: 'publish',
        sort_by: sortBy,
        order: order,
      });

      setPosts(postsResponse.data);
      setTotalPages(postsResponse.pagination.last_page);
    } catch (err) {
      console.error('Error fetching group and posts:', err);
      setError('Failed to load group or posts');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (isJoiningOrLeaving) return;
    try {
      setIsJoiningOrLeaving(true);
      await groups.joinGroup(parseInt(groupId));
      setIsMember(true);
    } catch (err) {
      console.error('Error joining group:', err);
      alert('Failed to join group');
    } finally {
      setIsJoiningOrLeaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isJoiningOrLeaving) return;
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      setIsJoiningOrLeaving(true);
      await groups.leaveGroup(parseInt(groupId));
      setIsMember(false);
    } catch (err) {
      console.error('Error leaving group:', err);
      alert('Failed to leave group');
    } finally {
      setIsJoiningOrLeaving(false);
    }
  };

  const handlePostApproved = (postId: number) => {
    // Remove the approved post from the list
    setPosts(posts.filter(p => p.id !== postId));
  };

  const handlePostRejected = (postId: number) => {
    // Remove the rejected post from the list
    setPosts(posts.filter(p => p.id !== postId));
  };

  if (loading && !group) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
          <Link href="/groups" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-gray-500 text-lg">Group not found</p>
          <Link href="/groups" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Group Header */}
      <div className="bg-white border-b border-gray-200">
        {/* Cover Image */}
        <div className="relative h-64 bg-gradient-to-r from-blue-400 to-blue-600 overflow-hidden">
          {group.cover_image ? (
            <img
              src={group.cover_image}
              alt={group.group_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
              <svg className="w-24 h-24 text-blue-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6" />
              </svg>
            </div>
          )}
        </div>

        {/* Group Info */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-end gap-6 -mt-20 mb-6 relative z-10">
            {/* Avatar */}
            {group.avatar ? (
              <img
                src={group.avatar}
                alt={group.group_name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-300 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            <div className="flex-1 pb-2">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{group.group_name}</h1>
              {group.description && <p className="text-gray-600 text-lg mb-4">{group.description}</p>}

              {/* Group Stats */}
              <div className="flex gap-8 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{group.posts_count || 0}</div>
                  <div className="text-sm text-gray-600">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{group.members_count || 0}</div>
                  <div className="text-sm text-gray-600">Members</div>
                </div>
                <div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${group.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {group.visibility}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {isMember ? (
                  <>
                    <Link
                      href={`/groups/${group.group_id}/create-post`}
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      Create Post
                    </Link>
                    {currentUserId === group.group_owner_id && (
                      <Link
                        href={`/groups/${group.group_id}/requests`}
                        className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                      >
                        Manage Requests
                      </Link>
                    )}
                    <button
                      onClick={handleLeaveGroup}
                      disabled={isJoiningOrLeaving}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isJoiningOrLeaving ? 'Leaving...' : 'Leave Group'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleJoinGroup}
                    disabled={isJoiningOrLeaving || isCheckingMembership}
                    className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoiningOrLeaving ? 'Joining...' : isCheckingMembership ? 'Loading...' : 'Join Group'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Post Form - Only visible to approved members */}
        {isMember && !isCheckingMembership && (
          <GroupPostForm
            groupId={parseInt(groupId)}
            onPostCreated={fetchGroupAndPosts}
          />
        )}

        {/* Sort Options */}
        <div className="flex gap-4 mb-6 items-center">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="post_date">Date</option>
            <option value="comment_count">Comments</option>
          </select>

          <select
            value={order}
            onChange={(e) => {
              setOrder(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Posts List */}
        {!loading && posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <p className="text-gray-500 text-lg mb-4">No posts yet</p>
            <Link
              href={`/groups/${group.group_id}/create-post`}
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Create the first post
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {posts.map((post) => (
                <GroupPostCard
                  key={post.id}
                  post={post}
                  groupId={parseInt(groupId)}
                  groupOwnerId={group?.group_owner_id}
                  isUserModerator={currentUserId === group?.group_owner_id}
                  onPostApproved={handlePostApproved}
                  onPostRejected={handlePostRejected}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg font-medium ${
                          currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-2 py-2 text-gray-500">...</span>}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
