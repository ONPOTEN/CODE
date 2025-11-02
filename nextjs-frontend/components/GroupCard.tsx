'use client';

import Link from 'next/link';
import { Group } from '@/lib/api';

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/groups/${group.group_id}`}>
      <article className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden hover:border-blue-300 cursor-pointer h-full flex flex-col">
        {/* Cover Image */}
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
          </div>
        ) : (
          <div className="relative h-40 bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6" />
            </svg>
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
  );
}

export default GroupCard;
