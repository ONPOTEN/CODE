'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { groups as groupsApi, Group } from '@/lib/api';
import { GroupCard } from '@/components/GroupCard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function MyGroupsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchMyGroups();
  }, [currentPage, isAuthenticated]);

  const fetchMyGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await groupsApi.myGroups({
        per_page: 12,
        page: currentPage,
      });

      setGroupsList(response.data);
      if (response.meta) {
        setTotalPages(response.meta.last_page);
        setTotalGroups(response.meta.total);
      }

      console.log('[MyGroups] Fetched groups:', {
        count: response.data.length,
        total: response.meta?.total,
        page: currentPage,
        totalPages: response.meta?.last_page,
      });
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load your groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = (groupId: number) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSelectAll = () => {
    if (selectedGroups.length === groupsList.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(groupsList.map((g) => g.group_id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedGroups.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedGroups.length} group(s)?`)) {
      return;
    }

    try {
      await groupsApi.bulkDelete(selectedGroups);
      setSelectedGroups([]);
      fetchMyGroups();
    } catch (err) {
      console.error('Error deleting groups:', err);
      alert('Failed to delete groups');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-grey-200 border-b border-gray-300">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
              {totalGroups > 0 && !loading && (
                <p className="text-gray-600 mt-2">
                  You have joined <span className="font-semibold text-blue-600">{totalGroups}</span> group{totalGroups !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <Link
              href="/groups/create"
              className="px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Create Group
            </Link>
          </div>

          {selectedGroups.length > 0 && (
            <div className="flex items-center justify-between bg-grey-200 border border-blue-200 rounded-lg p-4">
              <span className="text-sm font-medium text-blue-700">
                {selectedGroups.length} group(s) selected
              </span>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : groupsList.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
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
            <p className="text-gray-500 text-lg">You don't have any groups yet</p>
            <Link
              href="/groups/create"
              className="mt-4 inline-block px-6 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Create Your First Group
            </Link>
          </div>
        ) : (
          <>
            {/* Groups Grid with Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {groupsList.map((group) => (
                <div key={group.group_id} className="relative">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.group_id)}
                    onChange={() => handleSelectGroup(group.group_id)}
                    className="absolute top-4 left-4 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer z-10"
                  />
                  <GroupCard group={group} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4">
                {/* Page Info */}
                <p className="text-sm text-gray-600">
                  Showing page {currentPage} of {totalPages}
                </p>

                {/* Pagination Controls */}
                <div className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    ← Previous
                  </button>

                  {/* Smart Page Numbers */}
                  <div className="flex gap-1">
                    {/* First page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span className="px-2 py-2 text-gray-500">...</span>}
                      </>
                    )}

                    {/* Pages around current */}
                    {Array.from(
                      { length: Math.min(5, totalPages) },
                      (_, i) => {
                        const start = Math.max(1, currentPage - 2);
                        return start + i;
                      }
                    )
                      .filter((page) => page <= totalPages)
                      .map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-500 text-gray-900'
                              : 'border border-gray-300 hover:bg-white'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-2 py-2 text-gray-500">...</span>}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
