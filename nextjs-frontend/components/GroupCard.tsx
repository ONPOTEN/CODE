'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Group, groups as groupsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface GroupCardProps {
  group: Group;
  onDeleted?: (groupId: number) => void;
}

export function GroupCard({ group, onDeleted }: GroupCardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

    try {
      setIsDeleting(true);
      await groupsApi.delete(group.group_id);
      setShowMenu(false);
      if (onDeleted) {
        onDeleted(group.group_id);
      }
      // Redirect to groups list
      router.push('/groups?message=Group deleted successfully');
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Failed to delete group');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Link href={`/groups/${group.group_id}`}>
        <article className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden hover:border-blue-300 cursor-pointer h-full flex flex-col">
        {/* Cover Image with Menu Button */}
        {group.cover_image ? (
          <div className="relative h-40 bg-gray-200 overflow-hidden">
            <img
              src={group.cover_image}
              alt={group.group_name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  const placeholder = document.createElement('div');
                  placeholder.className =
                    'w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-300 to-blue-400';
                  placeholder.innerHTML = `
                    <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6" />
                    </svg>
                  `;
                  e.currentTarget.parentElement.appendChild(placeholder);
                }
              }}
            />
            {/* Three Dot Menu - Only show for group admin */}
            {isGroupAdmin && (
              <div className="absolute top-2 right-2" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Group options"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20 py-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleManageUsers();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2 text-purple-600 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.308 4 4 0 010-8.308M15 21H9a6 6 0 01-6-6v-1h18v1a6 6 0 01-6 6z" />
                      </svg>
                      Manage Users
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleManagePosts();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-amber-50 transition-colors flex items-center gap-2 text-amber-600 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v11l-5-5H5" />
                      </svg>
                      Manage Posts
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditGroup();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 text-blue-600 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Group
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteGroup();
                      }}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {isDeleting ? 'Deleting...' : 'Delete Group'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative h-40 bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6" />
            </svg>
            {/* Three Dot Menu - Only show for group admin */}
            {isGroupAdmin && (
              <div className="absolute top-2 right-2" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Group options"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20 py-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleManageUsers();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2 text-purple-600 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.308 4 4 0 010-8.308M15 21H9a6 6 0 01-6-6v-1h18v1a6 6 0 01-6 6z" />
                      </svg>
                      Manage Users
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleManagePosts();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-amber-50 transition-colors flex items-center gap-2 text-amber-600 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v11l-5-5H5" />
                      </svg>
                      Manage Posts
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditGroup();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 text-blue-600 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Group
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteGroup();
                      }}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {isDeleting ? 'Deleting...' : 'Delete Group'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Avatar and Content */}
        <div className="p-4 flex-1 flex flex-col -mt-8 relative z-10">
          {/* Avatar */}
          {group.avatar && (
            <div className="flex justify-center mb-3">
              <img
                src={group.avatar}
                alt={group.group_name}
                className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    const placeholder = document.createElement('div');
                    placeholder.className =
                      'w-16 h-16 rounded-full border-4 border-white shadow-md flex items-center justify-center bg-gray-300';
                    placeholder.innerHTML = `
                      <svg class="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                      </svg>
                    `;
                    e.currentTarget.parentElement.appendChild(placeholder);
                  }
                }}
              />
            </div>
          )}

          {/* Group Info */}
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2 line-clamp-2 text-center">
            {group.group_name}
          </h3>

          {group.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-1 text-center">
              {group.description}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex justify-around text-center">
              <span className="flex flex-col items-center">
                <span className="font-semibold text-gray-900">
                  {group.posts_count || 0}
                </span>
                <span>Posts</span>
              </span>
              <span className="flex flex-col items-center">
                <span className="font-semibold text-gray-900">
                  {group.members_count || 0}
                </span>
                <span>Members</span>
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-3 flex items-center justify-between">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                group.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : group.status === 'inactive'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {group.status}
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                group.visibility === 'public'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {group.visibility}
            </span>
          </div>
        </div>
      </article>
      </Link>
    </>
  );
}

export default GroupCard;
