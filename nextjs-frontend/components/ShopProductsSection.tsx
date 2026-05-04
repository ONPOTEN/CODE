import Link from 'next/link';

interface ProductType {
  id: 'all' | 'simple' | 'variant' | 'download';
  label: string;
  emoji: string;
  color: string;
  hoverColor: string;
}

const productTypes: ProductType[] = [
  {
    id: 'all',
    label: 'All',
    emoji: '📋',
    color: 'from-gray-400 to-gray-600',
    hoverColor: 'from-gray-500 to-gray-700',
  },
  {
    id: 'simple',
    label: 'Simple',
    emoji: '🛍️',
    color: 'from-blue-400 to-blue-600',
    hoverColor: 'from-blue-500 to-blue-700',
  },
  {
    id: 'variant',
    label: 'Variant',
    emoji: '🎨',
    color: 'from-purple-400 to-purple-600',
    hoverColor: 'from-purple-500 to-purple-700',
  },
  {
    id: 'download',
    label: 'Download',
    emoji: '📥',
    color: 'from-emerald-400 to-emerald-600',
    hoverColor: 'from-emerald-500 to-emerald-700',
  },
];

interface ShopProductsSectionProps {
  activeView: 'all' | 'simple' | 'variant' | 'download';
  onViewChange: (view: 'all' | 'simple' | 'variant' | 'download') => void;
  children: React.ReactNode;
  shopId: number;
  isOwner: boolean;
  onPaymentSettingsClick?: () => void;
}

export default function ShopProductsSection({
  activeView,
  onViewChange,
  children,
  shopId,
  isOwner,
  onPaymentSettingsClick,
}: ShopProductsSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Sản phẩm
        </h2>

        {/* Cart Button */}
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white text-teal-700 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Giỏ hàng
        </Link>
      </div>

      {/* Owner Quick Actions */}
      {isOwner && (
        <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3">
          <div className="flex flex-wrap gap-2 md:gap-3">
            <Link
              href={`/shops/${shopId}/posts/create`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow hover:shadow-md hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Tạo mới</span>
            </Link>
            <Link
              href={`/shops/${shopId}/posts`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow hover:shadow-md hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Quản lý</span>
            </Link>
            <button
              onClick={onPaymentSettingsClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow hover:shadow-md hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2" />
              </svg>
              <span>Thanh toán</span>
            </button>
            <Link
              href={`/shops/${shopId}/orders`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg text-sm font-medium transition-all duration-300 shadow hover:shadow-md hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Đơn hàng</span>
            </Link>
          </div>
        </div>
      )}

      {/* Product Type Tabs */}
      <div className="px-4 md:px-6 pt-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {productTypes.map((type) => {
            const isActive = activeView === type.id;
            return (
              <button
                key={type.id}
                onClick={() => onViewChange(type.id)}
                className={`
                  relative px-4 py-2.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300
                  ${isActive
                    ? `bg-gradient-to-r ${type.color} text-white shadow-lg scale-105`
                    : `bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105`
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <span>{type.emoji}</span>
                  <span>{type.label}</span>
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Content */}
      <div className="px-4 md:px-6 pb-6 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
