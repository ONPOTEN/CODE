'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { users, posts, friends, User, Post, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import UserSearchAutocomplete from '@/components/UserSearchAutocomplete';
import { WallPostCard } from '@/components/WallPostCard';
import { ShareToWallModal } from '@/components/ShareToWallModal';
import { CreateWallPostModal } from '@/components/CreateWallPostModal';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const userId = params.id as string;

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching user with ID/username:', userId);

        // Try to fetch by ID first (if it's a number), otherwise fetch by username
        let userData;
        const numericId = parseInt(userId);

        if (!isNaN(numericId) && numericId.toString() === userId) {
          // It's a numeric ID
          console.log('Fetching user by ID:', numericId);
          userData = await users.getById(numericId);
        } else {
          // It's a username
          console.log('Fetching user by username:', userId);
          userData = await users.getByUsername(userId);
        }

        console.log('Fetched user data:', userData);
        if (userData && typeof userData === 'object' && 'data' in userData) {
          userData = (userData as any).data;
        }
        setUser(userData as any);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`Failed to load user: ${err.message}`);
        } else {
          setError('Failed to load user');
        }
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUserWallPosts = async () => {
    if (!user) return;

    try {
      setPostsLoading(true);
      // Fetch posts from the user's wall
      const response = await posts.userWall(user.id, { per_page: 50 });
      setUserPosts(response.data);
    } catch (err) {
      console.error('Error fetching user wall posts:', err);
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserWallPosts();
  }, [user]);

  const handleSendFriendRequest = async () => {
    if (!user) return;

    try {
      setFriendActionLoading(true);
      await friends.sendRequest(user.id);
      // Update local state
      setUser({ ...user, friend_request_sent: true });
      alert('Friend request sent successfully!');
    } catch (err) {
      console.error('Full error object:', err);
      if (err instanceof ApiException) {
        console.error('ApiException details - Status:', err.status, 'Message:', err.message, 'Errors:', err.errors);
        alert(`Failed to send friend request: ${err.message}`);
      } else {
        alert('Failed to send friend request: An unexpected error occurred');
      }
      console.error('Error sending friend request:', err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!user) return;

    try {
      setFriendActionLoading(true);
      await friends.acceptRequest(user.id);
      // Update local state
      setUser({ ...user, is_friend: true, friend_request_received: false });
      alert('Friend request accepted!');
    } catch (err) {
      console.error('Full error object:', err);
      if (err instanceof ApiException) {
        console.error('ApiException details - Status:', err.status, 'Message:', err.message, 'Errors:', err.errors);
        alert(`Failed to accept friend request: ${err.message}`);
      } else {
        alert('Failed to accept friend request: An unexpected error occurred');
      }
      console.error('Error accepting friend request:', err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!user) return;

    try {
      setFriendActionLoading(true);
      await friends.rejectRequest(user.id);
      // Update local state
      setUser({ ...user, friend_request_received: false });
      alert('Friend request rejected');
    } catch (err) {
      console.error('Full error object:', err);
      if (err instanceof ApiException) {
        console.error('ApiException details - Status:', err.status, 'Message:', err.message, 'Errors:', err.errors);
        alert(`Failed to reject friend request: ${err.message}`);
      } else {
        alert('Failed to reject friend request: An unexpected error occurred');
      }
      console.error('Error rejecting friend request:', err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      `Are you sure you want to unfriend ${user.name}?`
    );

    if (!confirmed) return;

    try {
      setFriendActionLoading(true);
      await friends.unfriend(user.id);
      // Update local state
      setUser({ ...user, is_friend: false });
      alert('Successfully unfriended');
    } catch (err) {
      console.error('Full error object:', err);
      if (err instanceof ApiException) {
        console.error('ApiException details - Status:', err.status, 'Message:', err.message, 'Errors:', err.errors);
        alert(`Failed to unfriend: ${err.message}`);
      } else {
        alert('Failed to unfriend: An unexpected error occurred');
      }
      console.error('Error unfriending:', err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  const isOwnProfile = currentUser && currentUser.id === user?.id;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error || 'User not found'}</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back Button and Search Bar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>

          {/* User Search Autocomplete */}
          <div className="flex-1 max-w-md">
            <UserSearchAutocomplete placeholder="Search other users..." />
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 mb-8">
          {/* Profile Header */}
          <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-200">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
                  <p className="text-gray-600 text-lg mb-1">@{user.username}</p>
                  <p className="text-gray-500 text-sm">User ID: {user.id}</p>
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && currentUser && (
                  <div className="flex flex-col gap-3">
                    {user.is_friend ? (
                      // Already friends - show unfriend button
                      <button
                        onClick={handleUnfriend}
                        disabled={friendActionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                        </svg>
                        {friendActionLoading ? 'Processing...' : 'Unfriend'}
                      </button>
                    ) : user.friend_request_received ? (
                      // Received friend request - show accept/reject buttons
                      <div className="flex gap-2">
                        <button
                          onClick={handleAcceptFriendRequest}
                          disabled={friendActionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {friendActionLoading ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          onClick={handleRejectFriendRequest}
                          disabled={friendActionLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {friendActionLoading ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    ) : user.friend_request_sent ? (
                      // Friend request already sent - show pending button
                      <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Request Pending
                      </button>
                    ) : (
                      // Not friends - show add friend button
                      <button
                        onClick={handleSendFriendRequest}
                        disabled={friendActionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        {friendActionLoading ? 'Sending...' : 'Add Friend'}
                      </button>
                    )}
                    {/* Post on Wall Button */}
                    <button
                      onClick={() => setShowShareModal(true)}
                      disabled={friendActionLoading}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Post on Wall
                    </button>
                    {/* Create New Post on Wall Button */}
                    <button
                      onClick={() => setShowCreateModal(true)}
                      disabled={friendActionLoading}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Post
                    </button>
                  </div>
                )}
              </div>

              {/* Friendship Status Badge */}
              {!isOwnProfile && user.is_friend && (
                <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Friends
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium text-gray-700">Username</span>
                </div>
                <p className="text-gray-900 ml-7">{user.username}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-700">Email</span>
                </div>
                <p className="text-gray-900 ml-7">{user.email}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-700">Member Since</span>
                </div>
                <p className="text-gray-900 ml-7">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="font-medium text-gray-700">User ID</span>
                </div>
                <p className="text-gray-900 ml-7">{user.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Wall Posts Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {user.name}'s Wall
          </h2>
          <p className="text-gray-600 mb-6 text-sm">Posts shared to {user.name}'s wall</p>

          {postsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : userPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userPosts.map((post) => (
                <WallPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">No posts on wall</p>
              <p className="text-sm mt-1">No posts have been shared to {user.name}'s wall yet.</p>
            </div>
          )}
        </div>

        {/* Share to Wall Modal */}
        <ShareToWallModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          wallUserId={user.id}
          wallUserName={user.name}
          onSuccess={() => {
            // Refresh the wall posts
            fetchUserWallPosts();
          }}
        />

        {/* Create Post on Wall Modal */}
        <CreateWallPostModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          wallUserId={user.id}
          wallUserName={user.name}
          currentUser={currentUser as any}
          onSuccess={() => {
            // Refresh the wall posts
            fetchUserWallPosts();
          }}
        />
      </div>
    </div>
  );
}
