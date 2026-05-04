'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import UserSearchAutocomplete from '@/components/UserSearchAutocomplete';
import { friends, FriendRequest, users } from '@/lib/api';
import Menu from '@/components/Menu';

// Skeleton Component for Loading State
const ProfileSkeleton = () => (
  <div className="min-h-screen bg-slate-50 animate-pulse">
    <div className="h-48 lg:h-64 bg-slate-200" />
    <div className="max-w-4xl mx-auto px-4 -mt-20">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-32 h-32 rounded-full bg-slate-200 border-4 border-white shadow-xl" />
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="h-8 w-48 bg-slate-200 rounded mx-auto md:mx-0" />
            <div className="h-4 w-32 bg-slate-200 rounded mx-auto md:mx-0" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-64 bg-white rounded-3xl shadow-sm border border-slate-100" />
        ))}
      </div>
    </div>
  </div>
);

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && isAuthenticated) {
        try {
          setProfileLoading(true);
          const response = await users.getById(user.id);
          const userData = response && typeof response === 'object' && 'data' in response
            ? response.data
            : response;
          setProfileData(userData);
        } catch (error) {
          console.error('[Profile] Error fetching user profile:', error);
          setProfileData(user);
        } finally {
          setProfileLoading(false);
        }
      }
    };
    fetchUserProfile();
  }, [user, isAuthenticated]);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!isAuthenticated || !user) return;
      try {
        setRequestsLoading(true);
        const response = await friends.getPendingRequests();
        setPendingRequests(response.data);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchPendingRequests();
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleAcceptRequest = async (requestId: number, senderId: number) => {
    try {
      setActionLoading(senderId);
      await friends.acceptRequest(senderId);
      setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: number, senderId: number) => {
    try {
      setActionLoading(senderId);
      await friends.rejectRequest(senderId);
      setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || profileLoading) return <ProfileSkeleton />;
  if (!user || !profileData) return null;

  const displayUser = profileData;
  const isPublic = (value: any) => value === null || value === true || value === 1 || value === "1" || value === "true";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="hidden lg:block relative z-50">
        <Menu />
      </div>

      {/* Cover/Hero Section */}
      <div className="relative h-48 lg:h-72 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
        </div>
        <div className="absolute top-0 right-0 p-4">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-xl font-bold text-sm transition-all hover:bg-white/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 text-center md:text-left">
              <div className="relative w-32 h-32 mx-auto md:mx-0 -mt-16 mb-6">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl relative bg-slate-50">
                  {displayUser.avatar || displayUser.avatar_url ? (
                    <img src={displayUser.avatar || displayUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-black">
                      {displayUser.display_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full" />
              </div>
              
              <div className="space-y-1 mb-6">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">{displayUser.display_name}</h1>
                <p className="text-slate-400 font-bold text-sm truncate">@{displayUser.username}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {displayUser.role || 'Thành viên'}
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                  ID: #{displayUser.id}
                </span>
              </div>

              <Link href="/profile/edit" className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-indigo-600/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Chỉnh sửa hồ sơ
              </Link>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Thành tựu</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/my-posts" className="p-4 bg-slate-50 rounded-2xl group hover:bg-indigo-50 transition-colors">
                  <div className="text-2xl font-black text-slate-800 group-hover:text-indigo-600">Bài viết</div>
                  <div className="text-xs text-slate-400 font-bold">Xem của tôi</div>
                </Link>
                <Link href="/friends" className="p-4 bg-slate-50 rounded-2xl group hover:bg-indigo-50 transition-colors">
                  <div className="text-2xl font-black text-slate-800 group-hover:text-indigo-600">Bạn bè</div>
                  <div className="text-xs text-slate-400 font-bold">Danh sách</div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Details and Requests */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* User Info Details */}
            <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </span>
                Thông tin cá nhân
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                {[
                  { label: "Email", value: displayUser.email, public: displayUser.email_public },
                  { label: "Sở thích", value: displayUser.hobby, public: displayUser.hobby_public },
                  { label: "Công ty", value: displayUser.company, public: displayUser.company_public },
                  { label: "Nghề nghiệp", value: displayUser.occupation, public: displayUser.occupation_public },
                  { label: "Địa chỉ", value: displayUser.location, public: displayUser.location_public },
                  { label: "Số điện thoại", value: displayUser.phone, public: displayUser.phone_public }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1 group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isPublic(item.public) ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isPublic(item.public) ? 'Công khai' : 'Riêng tư'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                      {item.value || 'Chưa cập nhật'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <span className="text-2xl">🛡️</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">Quyền riêng tư hồ sơ</h4>
                  <p className="text-xs text-slate-500 font-bold">
                    Hồ sơ của bạn hiện đang ở chế độ 
                    <span className={`ml-1 ${displayUser.profile_visibility === 'private' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {displayUser.profile_visibility === 'private' ? 'Riêng tư' : 'Công khai'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Friend Requests */}
            <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </span>
                  Lời mời kết bạn
                </h2>
                {pendingRequests.length > 0 && (
                  <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-[10px] font-black">
                    {pendingRequests.length} MỚI
                  </span>
                )}
              </div>

              {requestsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-white flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-200/50">
                      <div className="flex items-center gap-4">
                        <Link href={`/users/${req.sender_id}`}>
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black hover:scale-105 transition-transform">
                            {req.sender?.name?.charAt(0).toUpperCase()}
                          </div>
                        </Link>
                        <div>
                          <Link href={`/users/${req.sender_id}`} className="text-sm font-black text-slate-800 hover:text-indigo-600 block">
                            {req.sender?.name}
                          </Link>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(req.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleAcceptRequest(req.id, req.sender_id)}
                          disabled={actionLoading === req.sender_id}
                          className="flex-1 sm:flex-none px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs transition-all hover:bg-indigo-500 disabled:opacity-50"
                        >
                          {actionLoading === req.sender_id ? 'Đang chờ...' : 'Chấp nhận'}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id, req.sender_id)}
                          disabled={actionLoading === req.sender_id}
                          className="flex-1 sm:flex-none px-6 py-2 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all hover:bg-slate-300 disabled:opacity-50"
                        >
                          {actionLoading === req.sender_id ? '...' : 'Từ chối'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                  <div className="text-4xl mb-4 opacity-50">💌</div>
                  <p className="text-slate-500 font-bold italic">Chưa có lời mời kết bạn mới</p>
                </div>
              )}
            </div>

            {/* User Search & Discovery */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-8 lg:p-10 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
              <div className="relative z-10">
                <h3 className="text-xl font-black text-white mb-6">Khám phá bạn bè mới</h3>
                <div className="max-w-md">
                  <UserSearchAutocomplete placeholder="Tìm người dùng..." />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
