import Link from 'next/link';

interface ShopHeroProps {
  name: string;
  description?: string | null;
  logo?: string | null;
  banner?: string | null;
  status?: string | null;
  isOwner: boolean;
  shopId: number;
}

export default function ShopHero({
  name,
  description,
  logo,
  banner,
  status,
  isOwner,
  shopId,
}: ShopHeroProps) {
  return (
    <div className="relative">
      {/* Animated Banner */}
      {banner ? (
        <div className="relative h-64 md:h-80 overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <div className="absolute inset-0 bg-black/20" />
          <img
            src={banner}
            alt={`${name} banner`}
            className="w-full h-full object-cover mix-blend-overlay"
          />
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="relative h-64 md:h-80 overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      {/* Floating Logo Card */}
      <div className="relative -mt-16 md:-mt-24 max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          {/* Logo */}
          <div className="relative group flex-shrink-0">
            {logo ? (
              <img
                src={logo}
                alt={name}
                className="w-20 h-20 md:w-28 md:h-28 rounded-xl object-cover ring-4 ring-white shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-4 ring-white shadow-lg">
                <span className="text-white text-2xl md:text-4xl font-bold">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Verified badge for active status */}
            {status === 'active' && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Shop Info */}
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 break-words">
                {name}
              </h1>
              {status && (
                <span
                  className={`inline-flex items-center px-3 py-1 text-xs md:text-sm font-semibold rounded-full ${
                    status === 'active'
                      ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-md'
                      : status === 'inactive'
                      ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                  }`}
                >
                  {status === 'active' && (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {status.toUpperCase()}
                </span>
              )}
            </div>
            {description && (
              <p className="text-gray-600 text-sm md:text-base mt-2 line-clamp-2 max-w-2xl">
                {description}
              </p>
            )}
          </div>

          {/* Action Button */}
          {isOwner && (
            <Link
              href={`/shops/${shopId}/edit`}
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden md:inline">Chỉnh sửa</span>
              <span className="md:hidden">Sửa</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
