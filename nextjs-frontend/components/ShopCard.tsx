import Link from 'next/link';
import { Shop } from '@/lib/api';

interface ShopCardProps {
  shop: Shop;
}

export function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link href={`/shops/${shop.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden h-full cursor-pointer group">
        {/* Shop Logo/Banner */}
        <div className="relative h-40 bg-gradient-to-br from-blue-100 to-blue-50 overflow-hidden">
          {shop.banner ? (
            <img
              src={shop.banner}
              alt={shop.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : shop.logo ? (
            <div className="flex items-center justify-center h-full">
              <img
                src={shop.logo}
                alt={shop.name}
                className="w-24 h-24 object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <svg
                className="w-16 h-16 text-blue-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Shop Info */}
        <div className="p-4">
          {/* Name and Status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-900 line-clamp-2 flex-1">{shop.name}</h3>
            {shop.status && (
              <span
                className={`text-xs font-medium rounded-full px-2 py-1 whitespace-nowrap ${
                  shop.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : shop.status === 'inactive'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {shop.status.charAt(0).toUpperCase() + shop.status.slice(1)}
              </span>
            )}
          </div>

          {/* Description */}
          {shop.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{shop.description}</p>
          )}

          {/* Location */}
          <div className="mb-3 space-y-1">
            {shop.city && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{shop.city}</span>
              </div>
            )}
            {shop.country && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20H7m6-4h6" />
                </svg>
                <span>{shop.country}</span>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-1 mb-3">
            {shop.phone && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="truncate">{shop.phone}</span>
              </div>
            )}
            {shop.email && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="truncate">{shop.email}</span>
              </div>
            )}
          </div>

          {/* Owner Info */}
          {shop.owner && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {(shop.owner.display_name || shop.owner.name)?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {shop.owner.display_name || shop.owner.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{shop.owner.username}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ShopCard;
