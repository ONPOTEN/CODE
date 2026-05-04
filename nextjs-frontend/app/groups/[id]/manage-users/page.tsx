'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, Group, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface GroupMember {
  user_id: number;
  group_id: number;
  id: number;
  group_user_id: number;
  status: 'approved' | 'pending' | 'inactive' | 'banned';
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface PendingRequest {
  user_id: number;
  id: number;
  group_id: number;
  status?: 'pending';
  requested_at: string;
  user?: {
    id: number;
    name: string;
    username: string;
    email: string;
    avatar?: string;
  };
}

export default function ManageUsersPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params.id as string);
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [approvedMembers, setApprovedMembers] = useState<GroupMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

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
        setError('Bạn không có quyền quản lý nhóm này');
        return;
      }

      setGroup(groupData);

      // Fetch pending requests
      const pendingResponse = await groups.getPendingRequests(groupId);
      console.log('[ManageUsers] Pending requests response:', pendingResponse);
      setPendingRequests(pendingResponse.data || []);

      // Fetch group members
      const membersResponse = await groups.getGroupMembers(groupId);
      setApprovedMembers(membersResponse.data?.filter((m: GroupMember) => m.status === 'approved') || []);
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

  const handleApproveMember = async (userId: number) => {
    try {
      setApprovingId(userId);
      console.log('[ManageUsers] Approving user:', { groupId, userId });
      await groups.acceptJoinRequest(groupId, userId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error approving member:', err);
      setError('Không thể duyệt thành viên');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectMember = async (userId: number) => {
    if (!confirm('Bạn có chắc muốn từ chối yêu cầu tham gia này không?')) return;

    try {
      setRejectingId(userId);
      console.log('[ManageUsers] Rejecting user:', { groupId, userId });
      await groups.rejectJoinRequest(groupId, userId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error rejecting member:', err);
      setError('Không thể từ chối thành viên');
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeleteMember = async (userId: number) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi nhóm không?')) return;

    try {
      setDeletingId(userId);
      await groups.removeMember(groupId, userId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error deleting member:', err);
      setError('Không thể xóa thành viên');
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
            ← Quay lại Nhóm của tôi
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
            Quay lại Nhóm của tôi
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
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Quản lý người dùng</h1>
          <p className="text-gray-600 mt-2">Duyệt yêu cầu tham gia và quản lý thành viên nhóm</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="bg-grey-200 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm0-5a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              Yêu cầu tham gia chờ duyệt ({pendingRequests.length})
            </h2>

            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {request.user?.avatar && (
                      <img src={request.user.avatar} alt={request.user.name} className="w-10 h-10 rounded-full object-cover" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{request.user?.name}</p>
                      <p className="text-sm text-gray-600">{request.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveMember(request.user_id)}
                      disabled={approvingId === request.user_id}
                      className="px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approvingId === request.user_id ? 'Đang duyệt...' : 'Duyệt'}
                    </button>
                    <button
                      onClick={() => handleRejectMember(request.user_id)}
                      disabled={rejectingId === request.user_id}
                      className="px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rejectingId === request.user_id ? 'Đang từ chối...' : 'Từ chối'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Members Section */}
        <div className="bg-grey-200 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
            </svg>
            Thành viên đã duyệt ({approvedMembers.length})
          </h2>

          {approvedMembers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có thành viên nào được duyệt</p>
          ) : (
            <div className="space-y-3">
              {approvedMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    {member.user?.avatar && (
                      <img src={member.user.avatar} alt={member.user?.name} className="w-10 h-10 rounded-full object-cover" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{member.user?.name}</p>
                      <p className="text-sm text-gray-600">{member.user?.email}</p>
                      <p className="text-xs text-gray-500">Tham gia {new Date(member.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMember(member.group_user_id)}
                    disabled={deletingId === member.group_user_id}
                    className="px-4 py-2 bg-blue-500 text-red-600 rounded-lg hover:bg-blue-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === member.group_user_id ? 'Đang xóa...' : 'Xóa'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
