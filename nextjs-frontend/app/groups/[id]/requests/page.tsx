'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, Group } from '@/lib/api';

interface PendingRequest {
  id: number;
  group_id: number;
  user_id: number;
  user: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
    email: string;
  };
  requested_at: string;
}

export default function GroupJoinRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupAndRequests();
  }, [groupId]);

  const fetchGroupAndRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details
      const groupResponse = await groups.getById(parseInt(groupId));
      setGroup(groupResponse.data);

      // Fetch pending requests
      const requestsResponse = await groups.getPendingRequests(parseInt(groupId));
      setRequests(requestsResponse.data);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      if (err.message?.includes('403') || err.message?.includes('Unauthorized')) {
        setError('You do not have permission to manage join requests. Only group admins and moderators can access this page.');
      } else {
        setError('Failed to load join requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (userId: number, userName: string) => {
    if (processingId !== null) return;

    try {
      setProcessingId(userId);
      await groups.acceptJoinRequest(parseInt(groupId), userId);

      // Remove from list and show success message
      setRequests(requests.filter((r) => r.user_id !== userId));
      setSuccessMessage(`${userName} has been accepted to the group!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error accepting request:', err);
      setError('Failed to accept join request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: number, userName: string) => {
    if (processingId !== null) return;
    if (!confirm(`Are you sure you want to reject ${userName}'s request?`)) return;

    try {
      setProcessingId(userId);
      await groups.rejectJoinRequest(parseInt(groupId), userId);

      // Remove from list and show success message
      setRequests(requests.filter((r) => r.user_id !== userId));
      setSuccessMessage(`${userName}'s request has been rejected.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject join request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700 mb-4">
            {error}
          </div>
          <Link href="/groups" className="inline-block px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700">
            Back to Groups
          </Link>
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
      {/* Header */}
      <div className="bg-grey-200 border-b border-gray-300">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  🏠 Home
                </Link>
                <span className="text-gray-600">/</span>
                <Link
                  href={`/groups/${group.group_id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Back to {group.group_name}
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Join Requests</h1>
              <p className="text-gray-600 mt-1">{requests.length} pending request(s)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-grey-200 border border-green-200 rounded-lg text-green-700 flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-grey-200 rounded-lg border border-gray-300">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No pending join requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-grey-200 rounded-lg border border-gray-300 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    {request.user.avatar ? (
                      <img
                        src={request.user.avatar}
                        alt={request.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-300 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{request.user.name}</h3>
                      <p className="text-gray-600 text-sm">@{request.user.username}</p>
                      <p className="text-gray-500 text-xs mt-1">Requested: {formatDate(request.requested_at)}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 ml-4">
                    <button
                      onClick={() => handleAccept(request.user_id, request.user.name)}
                      disabled={processingId !== null}
                      className="px-6 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === request.user_id ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleReject(request.user_id, request.user.name)}
                      disabled={processingId !== null}
                      className="px-6 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === request.user_id ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
