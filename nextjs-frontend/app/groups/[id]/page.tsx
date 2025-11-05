'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, Group, auth } from '@/lib/api';
import GroupPostForm from '@/components/GroupPostForm';
import InfiniteScrollGroupPosts from '@/components/InfiniteScrollGroupPosts';

export default function GroupWallPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'pending' | 'approved' | 'none'>('none');
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [isJoiningOrLeaving, setIsJoiningOrLeaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sortBy, setSortBy] = useState<'post_date' | 'comment_count'>('post_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchGroupDetails();
    checkUserMembership();
  }, [groupId]);

  const checkUserMembership = async () => {
    try {
      setIsCheckingMembership(true);

      // Check if user is authenticated
      const token = auth.getToken();
      const isAuth = auth.isAuthenticated();

      console.log('[GroupPage] Auth check:', {
        isAuth,
        token: token ? token.substring(0, 20) + '...' : null,
      });

      setIsAuthenticated(isAuth);

      // If not authenticated, don't check membership
      if (!isAuth) {
        setIsMember(false);
        setCurrentUserId(null);
        return;
      }

      // User is authenticated, check membership
      try {
        const response = await groups.checkMembership(parseInt(groupId));
        setIsMember(response.is_member);
        console.log('[GroupPage] Membership check successful:', response);
      } catch (memberErr) {
        console.error('[GroupPage] Membership check failed, token might be invalid:', memberErr);
        // If membership check fails, token might be invalid
        setIsMember(false);
        // If 401 error, clear the invalid token
        if (memberErr instanceof ApiException && memberErr.status === 401) {
          console.log('[GroupPage] Token is invalid (401), clearing');
          auth.logout();
        }
      }

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

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details only
      const groupResponse = await groups.getById(parseInt(groupId));
      setGroup(groupResponse.data);
    } catch (err) {
      console.error('Error fetching group:', err);
      setError('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (isJoiningOrLeaving) return;
    try {
      setIsJoiningOrLeaving(true);
      const response = await groups.joinGroup(parseInt(groupId));

      console.log('[GroupPage] Join response:', {
        message: response.message,
        is_member: response.is_member,
        status: response.status,
        group_id: groupId,
      });

      // Set membership status based on response
      if (response.status === 'pending') {
        setMembershipStatus('pending');
        setIsMember(false); // Not a full member yet
        alert('Join request submitted! Your request is pending approval from the group admin.');
      } else {
        setMembershipStatus('approved');
        setIsMember(true);
      }
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
              <div className="flex gap-3 flex-wrap items-center">
                {isMember ? (
                  <>
                    <button
                      onClick={() => {
                        // Check if authenticated before navigating
                        if (!auth.isAuthenticated()) {
                          console.log('[CreatePost] Not authenticated, redirecting to login');
                          router.push('/login');
                          return;
                        }
                        // If authenticated, navigate to create post
                        router.push(`/groups/${group.group_id}/create-post`);
                      }}
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      Create Post
                    </button>
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
                ) : membershipStatus === 'pending' ? (
                  <div className="flex items-center gap-2 px-6 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <svg className="w-5 h-5 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-yellow-800 font-medium">Request Pending</span>
                  </div>
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
        {/* Post Form - Only visible to authenticated group members */}
        {!isCheckingMembership && (
          <>
            {!isAuthenticated ? (
              // User is not authenticated - show login prompt
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Sign In to Create Posts</h3>
                <p className="text-yellow-700 mb-4">You must be signed in to create posts in this group. Please log in to continue.</p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors"
                >
                  Sign In
                </Link>
              </div>
            ) : isMember ? (
              // User is authenticated and is a member - show post form
              <GroupPostForm
                groupId={parseInt(groupId)}
                onPostCreated={() => {
                  // Refresh will happen automatically with infinite scroll
                }}
              />
            ) : (
              // User is authenticated but not a member - show join prompt
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Join to Create Posts</h3>
                <p className="text-blue-700 mb-4">You must be a member of this group to create posts. Join the group to get started!</p>
                <button
                  onClick={handleJoinGroup}
                  disabled={isJoiningOrLeaving}
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoiningOrLeaving ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Sort Options */}
        <div className="flex gap-4 mb-6 items-center flex-wrap">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
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

        {/* Infinite Scroll Posts */}
        <InfiniteScrollGroupPosts
          groupId={parseInt(groupId)}
          sortBy={sortBy}
          order={order}
        />
      </div>
    </div>
  );
}
