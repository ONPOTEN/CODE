'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ShopContactCardProps {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  owner?: {
    avatar?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;
}

export default function ShopContactCard({
  address,
  phone,
  email,
  website,
  city,
  state,
  postalCode,
  country,
  owner,
}: ShopContactCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasContactInfo = address || phone || email || website;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header with gradient - Clickable on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between md:cursor-default"
      >
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Thông tin liên hệ
        </h2>
        {/* Mobile toggle icon */}
        <svg 
          className={`w-6 h-6 text-white md:hidden transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - Always visible on desktop, collapsible on mobile */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:block`}>
        <div className="p-5 md:p-6 space-y-4">
          {/* Contact Items */}
          <div className="space-y-3">
            {address && (
              <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl group hover:from-blue-100 hover:to-indigo-100 transition-all duration-300">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-0.5">Địa chỉ</p>
                  <p className="text-gray-700 text-sm md:text-base">
                    {address}
                    {city && <span className="block text-gray-500 text-xs md:text-sm mt-0.5">{city}{state && `, ${state}`}{postalCode && ` ${postalCode}`}</span>}
                    {country && <span className="block text-gray-500 text-xs md:text-sm">{country}</span>}
                  </p>
                </div>
              </div>
            )}

            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-start gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl group hover:from-emerald-100 hover:to-green-100 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide mb-0.5">Điện thoại</p>
                  <p className="text-emerald-700 font-semibold text-sm md:text-base">{phone}</p>
                </div>
              </a>
            )}

            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-start gap-3 p-3 bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl group hover:from-sky-100 hover:to-cyan-100 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-sky-900 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="text-sky-700 text-sm md:text-base break-all">{email}</p>
                </div>
              </a>
            )}

            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl group hover:from-violet-100 hover:to-purple-100 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-violet-900 uppercase tracking-wide mb-0.5">Trang web</p>
                  <p className="text-violet-700 text-sm md:text-base break-all truncate">{website}</p>
                </div>
              </a>
            )}

            {!hasContactInfo && (
              <div className="text-center py-8 px-4 bg-gray-50 rounded-xl">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 text-sm">Chưa có thông tin liên hệ</p>
              </div>
            )}
          </div>

          {/* Shop Owner Section */}
          {owner && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Chủ cửa hàng
              </h3>
              <Link
                href={`/users/${owner.username || ''}`}
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-300 group"
              >
                <div className="relative">
                  {owner.avatar ? (
                    <img
                      src={owner.avatar}
                      alt={owner.name || owner.username || ''}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-2 ring-white shadow-md">
                      <span className="text-white font-bold text-lg">
                        {(owner.name || owner.username)?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm md:text-base truncate">
                    {owner.name || owner.username || ''}
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm truncate">@{owner.username || ''}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
