'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Group, groups as groupsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface GroupCardProps {
  group: Group;
  onDeleted?: (groupId: number) => void;
  index?: number;
}

export function GroupCard({ group, onDeleted, index = 0 }: GroupCardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Animation delay based on index
  const animationDelay = `${index * 50}ms`;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  // Check if current user is the group admin/owner
  const isGroupAdmin = currentUser && currentUser.id === group.group_owner_id;

  const handleEditGroup = () => {
    router.push(`/groups/${group.group_id}/edit`);
  };

  const handleManageUsers = () => {
    router.push(`/groups/${group.group_id}/manage-users`);
    setShowMenu(false);
  };

  const handleManagePosts = () => {
    router.push(`/groups/${group.group_id}/manage-posts`);
    setShowMenu(false);
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Bạn có chắc muốn xóa nhóm này không? Hành động này không thể hoàn tác.')) return;

    try {
      setIsDeleting(true);
      await groupsApi.delete(group.group_id);
      setShowMenu(false);
      if (onDeleted) {
        onDeleted(group.group_id);
      }
      // Redirect to groups list
      router.push('/groups?message=Xóa nhóm thành công');
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Không thể xóa nhóm');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Link href={`/groups/${group.group_id}`}>
        <article 
          className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden hover:-translate-y-1 cursor-pointer h-full flex flex-col relative animate-fade-in"
          style={{ animationDelay, animationFillMode: 'both' }}
        >
        {/* Cover Image */}
        <div className="relative h-44 overflow-hidden">
          {group.cover_image ? (
            <img
              src={group.cover_image}
              alt={group.group_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center">
              <svg className="w-16 h-16 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6" />
              </svg>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Three Dot Menu - Only show for group admin */}
          {isGroupAdmin && (
            <div className="absolute top-3 right-3" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                title="Tùy chọn nhóm"
              >
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-2 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleManageUsers();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors flex items-center gap-3 text-purple-600 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.308 4 4 0 010-8.308M15 21H9a6 6 0 01-6-6v-1h18v1a6 6 0 01-6 6z" />
                    </svg>
                    Quản lý thành viên
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleManagePosts();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50 transition-colors flex items-center gap-3 text-amber-600 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1l-4 4H5" />
                    </svg>
                    Quản lý bài viết
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEditGroup();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-3 text-blue-600 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Chỉnh sửa nhóm
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteGroup();
                    }}
                    disabled={isDeleting}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600 font-medium disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {isDeleting ? 'Đang xóa...' : 'Xóa nhóm'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar and Content */}
        <div className="p-5 flex-1 flex flex-col -mt-8 relative z-10">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            {group.avatar ? (
              <img
                src={group.avatar}
                alt={group.group_name}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {group.group_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Group Info */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 text-center group-hover:text-indigo-600 transition-colors">
            {group.group_name}
          </h3>

          {group.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1 text-center">
              {group.description}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex items-center justify-center gap-6 py-3 border-t border-b border-gray-100 mb-3">
            <div className="text-center">
              <span className="block text-lg font-bold text-gray-900">
                {group.posts_count?.toLocaleString() || 0}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Bài viết</span>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <span className="block text-lg font-bold text-gray-900">
                {group.members_count?.toLocaleString() || 0}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Thành viên</span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${
                group.status === 'active'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : group.status === 'inactive'
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                group.status === 'active' ? 'bg-green-500' : group.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              {group.status === 'active' ? 'Hoạt động' : group.status === 'inactive' ? 'Tạm dừng' : 'Đã khóa'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${
                group.visibility === 'public'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {group.visibility === 'public' ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  Công khai
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Riêng tư
                </>
              )}
            </span>
          </div>
        </div>
      </article>
      </Link>
    </>
  );
}

export default GroupCard;
