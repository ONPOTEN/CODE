'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, users, friends, chat, Group, User, auth, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import GroupPostForm from '@/components/GroupPostForm';
import InfiniteScrollGroupPosts from '@/components/InfiniteScrollGroupPosts';

export default function GroupWallPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { user: authUser } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'pending' | 'approved' | 'none'>('none');
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [isJoiningOrLeaving, setIsJoiningOrLeaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sortBy, setSortBy] = useState<'post_date' | 'comment_count'>('post_date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteTab, setInviteTab] = useState<'link' | 'friend'>('link');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<number>>(new Set());
  const [invitingFriends, setInvitingFriends] = useState(false);

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
      } catch (memberErr) {
        // If membership check fails, token might be invalid
        setIsMember(false);
        // If 401 error, clear the invalid token
        if (memberErr instanceof ApiException && memberErr.status === 401) {
          auth.logout();
        }
      }

      // Get current user ID and role from AuthContext first, then fallback to localStorage
      let user: any = null;

      // Priority 1: Use authUser from context
      if (authUser && authUser.id) {
        user = authUser;
      }
      // Priority 2: Fallback to localStorage
      else {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          user = JSON.parse(userStr);
        }
      }

      if (user) {
        // Extract user ID - handle if it's a number, string, or nested object
        let userId: number | null = null;
        if (typeof user.id === 'number') {
          userId = user.id;
        } else if (typeof user.id === 'string') {
          userId = parseInt(user.id, 10);
        } else if (user.id && typeof user.id === 'object' && user.id.id) {
          // Handle nested object case
          userId = typeof user.id.id === 'number' ? user.id.id : parseInt(user.id.id, 10);
        }

        if (userId && !isNaN(userId)) {
          setCurrentUserId(userId);
        }

        setCurrentUserRole(user.role);
      }
    } catch (err) {
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
      alert('Failed to leave group');
    } finally {
      setIsJoiningOrLeaving(false);
    }
  };

  const handleInviteFriend = async () => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/groups/${groupId}`;
      setInviteLink(link);
      setShowInviteModal(true);
      setInviteTab('link');
      setSelectedFriends(new Set());

      // Load friends list
      await loadFriendsList();
    }
  };

  const loadFriendsList = async () => {
    try {
      setIsLoadingFriends(true);
      const response = await friends.getAll();
      setAllFriends(response.data || []);
    } catch (err) {
      setSearchError('Failed to load friends list');
      setAllFriends([]);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('Link copied to clipboard!');
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = () => {
    const text = `Check out this group: ${group?.group_name}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(inviteLink)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = () => {
    const text = `Check out this group: ${group?.group_name} ${inviteLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    setSearchError(null);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await users.search(query);
      setSearchResults(response.data || []);
    } catch (err) {
      setSearchError('Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFriendSelection = (userId: number) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedFriends(newSelected);
  };

  const selectAllFriends = () => {
    if (selectedFriends.size === allFriends.length) {
      setSelectedFriends(new Set());
    } else {
      setSelectedFriends(new Set(allFriends.map((f) => f.id)));
    }
  };

  const sendInvitationsToSelectedFriends = async () => {
    if (selectedFriends.size === 0) {
      alert('Please select at least one friend to invite');
      return;
    }

    try {
      setInvitingFriends(true);
      const selectedFriendsList = allFriends.filter((f) => selectedFriends.has(f.id));
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUserName = currentUser.display_name || 'A user';

      // Send invitation message to each selected friend
      let successCount = 0;
      let failedCount = 0;
      const failedFriends: string[] = [];

      for (const friend of selectedFriendsList) {
        try {
          // Get or create conversation with the friend
          const conversation = await chat.getOrCreateConversation(friend.id);

          // Create invitation message with group link
          const inviteMessage = `${currentUserName} wants you to join the "${group?.group_name}" group. Click here to join: ${inviteLink}`;

          // Send the message
          await chat.sendMessage(conversation.id, inviteMessage);

          successCount++;
        } catch (err) {
          failedCount++;
          failedFriends.push(friend.display_name);
        }
      }

      // Show results
      let resultMessage = `✓ Invitations sent successfully!\n\n${successCount} friend${successCount > 1 ? 's' : ''} invited`;

      if (failedCount > 0) {
        resultMessage += `\n\n⚠ Failed to send to ${failedCount} friend${failedCount > 1 ? 's' : ''}:\n${failedFriends.join(', ')}`;
      }

      alert(resultMessage);

      setSelectedFriends(new Set());
      setShowInviteModal(false);
    } catch (err) {
      alert('Failed to send invitations. Please try again.');
    } finally {
      setInvitingFriends(false);
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
        {/* Cover Image with Avatar */}
        <div className="relative h-64 bg-gradient-to-r from-blue-400 to-blue-600 overflow-visible pb-16">
          {group.cover_image ? (
            <img
              src={group.cover_image}
              alt={group.group_name}
              className="w-full h-64 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
              <svg className="w-24 h-24 text-blue-200 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6" />
              </svg>
            </div>
          )}

          {/* Avatar - Bottom Middle of Cover Image */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 flex items-center justify-center z-10">
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
          </div>
        </div>

        {/* Group Info - Below Avatar */}
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">{group.group_name}</h1>
          {group.description && <p className="text-gray-600 text-lg mb-4 text-center">{group.description}</p>}

          {/* Group Stats */}
          <div className="flex gap-8 mb-4 justify-center">
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

          {/* Determine if user is group admin/owner */}
          {(() => {
            const isOwner = currentUserId && group && Number(currentUserId) === Number(group.group_owner_id);
            const isGlobalAdmin = currentUserRole === 'admin' || currentUserRole === 'administrator';
            // isGroupAdmin only shows TRUE if currentUserId === group_owner_id
            const isGroupAdmin = isOwner;

            return (
              <>
                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap items-center justify-center mt-6">
                  {/* Check if user is group admin/owner (regardless of membership) */}
                  {isGroupAdmin ? (
              // Admin/Owner buttons
              <>
                {isMember && (
                  <>
                    <button
                      onClick={() => {
                        // Check if authenticated before navigating
                        if (!auth.isAuthenticated()) {
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
                    <button
                      onClick={handleInviteFriend}
                      className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                    >
                      Invite Friends
                    </button>
                  </>
                )}
                <Link
                  href={`/groups/${group.group_id}/requests`}
                  className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                >
                  Manage Requests
                </Link>
                <Link
                  href={`/groups/${group.group_id}/manage-group`}
                  className="inline-block px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                >
                  Group Manager
                </Link>
                {isMember && (
                  <button
                    onClick={handleLeaveGroup}
                    disabled={isJoiningOrLeaving}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoiningOrLeaving ? 'Leaving...' : 'Leave Group'}
                  </button>
                )}
              </>
            ) : isMember ? (
              // Regular member buttons
              <>
                <button
                  onClick={() => {
                    // Check if authenticated before navigating
                    if (!auth.isAuthenticated()) {
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
                <button
                  onClick={handleInviteFriend}
                  className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  Invite Friends
                </button>
                <Link
                  href={`/groups/${group.group_id}/my-posts`}
                  className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                >
                  Manage Posts
                </Link>
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
              </>
            );
          })()} {/* End of isGroupAdmin IIFE */}
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
                group={group}
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Invite Friends</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6 pt-4">
              <button
                onClick={() => setInviteTab('link')}
                className={`px-4 py-2 font-medium transition-colors ${
                  inviteTab === 'link'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Share Link
              </button>
              <button
                onClick={() => setInviteTab('friend')}
                className={`px-4 py-2 font-medium transition-colors ${
                  inviteTab === 'friend'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Invite Friend
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Group Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Invite friends to: <strong>{group?.group_name}</strong>
                </p>
                <p className="text-xs text-gray-600">
                  {inviteTab === 'link'
                    ? 'Share this link with friends to invite them to the group.'
                    : 'Search and select friends to send them an invitation.'}
                </p>
              </div>

              {/* Link Sharing Tab */}
              {inviteTab === 'link' && (
                <>
                  {/* Copy Link Section */}
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors whitespace-nowrap text-sm"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Share Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share On
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={shareOnFacebook}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                  <button
                    onClick={shareOnTwitter}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 002.856-3.915 9.964 9.964 0 01-2.866.36 3.995 3.995 0 001.753-2.199 7.978 7.978 0 01-2.537.967 3.996 3.996 0 00-6.868 3.645 11.38 11.38 0 01-8.25-4.144A3.99 3.99 0 005.031 6.694a3.995 3.995 0 01-1.853-.505c0 .153 0 .306.015.459A3.996 3.996 0 007.98 9.967a3.996 3.996 0 01-1.853.07 3.995 3.995 0 003.734 2.774 8.007 8.007 0 01-4.947 1.707c-.323 0-.64-.02-.955-.059a11.37 11.37 0 006.167 1.8c7.4 0 11.439-6.147 11.439-11.48 0-.175-.005-.348-.015-.52a8.179 8.179 0 002.085-2.083"/>
                    </svg>
                  </button>
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.947 1.227l-.356.214-3.71-.975 1.005 3.652-.235.364a9.868 9.868 0 001.51 5.335c2.34 4.053 6.965 6.456 11.313 6.456 2.205 0 4.396-.503 6.289-1.504l.364-.214 3.677 1.018-1.035-3.68.221-.364a9.86 9.86 0 00-.663-5.573 9.87 9.87 0 00-8.184-5.623"/>
                    </svg>
                  </button>
                </div>
              </div>

                  {/* Info Message */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      Friends can click the link to view the group and join.
                      {group?.requires_approval && ' Membership requests require your approval.'}
                    </p>
                  </div>
                </>
              )}

              {/* Friend Selection Tab */}
              {inviteTab === 'friend' && (
                <>
                  {/* Loading State */}
                  {isLoadingFriends && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}

                  {/* Error Message */}
                  {searchError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {searchError}
                    </div>
                  )}

                  {/* Friends List */}
                  {!isLoadingFriends && allFriends.length > 0 && (
                    <>
                      {/* Select All Button */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFriends.size === allFriends.length && allFriends.length > 0}
                            onChange={selectAllFriends}
                            disabled={isLoadingFriends}
                            className="w-4 h-4 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Select All ({selectedFriends.size}/{allFriends.length})
                          </span>
                        </label>
                      </div>

                      {/* Friends List Items */}
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {allFriends.map((friend) => (
                          <label
                            key={friend.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFriends.has(friend.id)}
                              onChange={() => toggleFriendSelection(friend.id)}
                              disabled={isLoadingFriends}
                              className="w-4 h-4 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex-shrink-0"
                            />
                            {friend.avatar && (
                              <img
                                src={friend.avatar}
                                alt={friend.display_name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{friend.display_name}</p>
                              <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Send Invitations Button */}
                      {selectedFriends.size > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={sendInvitationsToSelectedFriends}
                            disabled={invitingFriends}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {invitingFriends ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Preparing Invitations...
                              </>
                            ) : (
                              `Send to ${selectedFriends.size} Friend${selectedFriends.size > 1 ? 's' : ''}`
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* No Friends Message */}
                  {!isLoadingFriends && allFriends.length === 0 && !searchError && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6" />
                      </svg>
                      <p className="text-sm text-gray-600 mt-2">You don't have any friends yet</p>
                      <p className="text-xs text-gray-500 mt-1">Add friends to invite them to groups</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
