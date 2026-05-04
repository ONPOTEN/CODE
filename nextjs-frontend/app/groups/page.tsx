'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { groups as groupsApi, Group } from '@/lib/api';
import { GroupCard } from '@/components/GroupCard';

interface FilterType {
  id: 'all' | 'public' | 'private';
  label: string;
  emoji: string;
  color: string;
}

const visibilityFilters: FilterType[] = [
  { id: 'all', label: 'Tất cả', emoji: '🌐', color: 'from-blue-400 to-blue-600' },
  { id: 'public', label: 'Công khai', emoji: '🔓', color: 'from-green-400 to-green-600' },
  { id: 'private', label: 'Riêng tư', emoji: '🔒', color: 'from-purple-400 to-purple-600' },
];

export default function GroupsPage() {
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);

  useEffect(() => {
    fetchGroups();
  }, [searchTerm, filterVisibility, filterStatus, currentPage]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        per_page: 12,
        page: currentPage,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (filterVisibility !== 'all') {
        params.visibility = filterVisibility;
      }

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await groupsApi.index(params);
      setGroupsList(response.data);
      if (response.meta) {
        setTotalPages(response.meta.last_page);
        setTotalGroups(response.meta.total);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Không thể tải danh sách nhóm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">👥 Nhóm</h1>
              <p className="text-indigo-100 text-lg">
                Khám phá và tham gia các nhóm thú vị. Hiện có{' '}
                <span className="font-bold text-white">{totalGroups.toLocaleString()}</span> nhóm.
              </p>
            </div>
            <Link
              href="/groups/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo nhóm mới
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm nhóm theo tên hoặc mô tả..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Visibility Filters */}
            <div className="flex flex-wrap gap-2">
              {visibilityFilters.map((filter) => {
                const isActive = filterVisibility === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => {
                      setFilterVisibility(filter.id);
                      setCurrentPage(1);
                    }}
                    className={`
                      relative px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300
                      ${isActive
                        ? `bg-gradient-to-r ${filter.color} text-white shadow-lg scale-105`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <span>{filter.emoji}</span>
                      <span>{filter.label}</span>
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="active">✅ Hoạt động</option>
                <option value="inactive">⏸️ Không hoạt động</option>
                <option value="all">📋 Tất cả</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-indigo-400 opacity-20"></div>
            </div>
            <p className="mt-4 text-gray-500 font-medium animate-pulse">Đang tải danh sách nhóm...</p>
          </div>
        ) : groupsList.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6"
                  />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                <span className="text-lg">🔍</span>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchTerm ? 'Không tìm thấy nhóm phù hợp' : 'Chưa có nhóm nào'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              {searchTerm 
                ? 'Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc'
                : 'Hãy là người đầu tiên tạo nhóm và kết nối với cộng đồng!'
              }
            </p>
            <Link
              href="/groups/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo nhóm ngay
            </Link>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Hiển thị <span className="font-semibold text-gray-900">{groupsList.length}</span> nhóm
                {totalGroups > groupsList.length && (
                  <span className="text-gray-500"> trên tổng số {totalGroups.toLocaleString()}</span>
                )}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Trang {currentPage} / {totalPages}</span>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {groupsList.map((group, index) => (
                <GroupCard key={group.group_id} group={group} index={index} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 py-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Trước
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Sau
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
