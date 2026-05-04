import Link from 'next/link';

interface ShopActionButtonsProps {
  shopName: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
  onMessageClick: () => void;
}

export default function ShopActionButtons({
  shopName,
  shopPhone,
  shopAddress,
  onMessageClick,
}: ShopActionButtonsProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: shopName,
          text: `Xem ${shopName} trên nền tảng của chúng tôi!`,
          url: window.location.href,
        })
        .catch((err) => console.log('Error sharing:', err));
    } else {
      const text = `Xem ${shopName}: ${window.location.href}`;
      navigator.clipboard.writeText(text);
      alert('Đã sao chép liên kết!');
    }
  };

  const buttons = [
    {
      id: 'share',
      label: 'Chia sẻ',
      icon: (
        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13" />
        </svg>
      ),
      href: undefined,
      onClick: handleShare,
      gradient: 'from-sky-400 to-blue-500',
      hoverGradient: 'from-sky-500 to-blue-600',
    },
    {
      id: 'call',
      label: 'Gọi ngay',
      icon: (
        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      href: shopPhone ? `tel:${shopPhone}` : undefined,
      onClick: shopPhone ? undefined : () => alert('Không có số điện thoại'),
      gradient: 'from-emerald-400 to-green-500',
      hoverGradient: 'from-emerald-500 to-green-600',
    },
    {
      id: 'map',
      label: 'Tìm đường',
      icon: (
        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: shopAddress
        ? `https://www.google.com/maps/search/${encodeURIComponent(shopAddress)}`
        : undefined,
      onClick: shopAddress ? undefined : () => alert('Không có địa chỉ'),
      target: '_blank',
      gradient: 'from-violet-400 to-purple-500',
      hoverGradient: 'from-violet-500 to-purple-600',
    },
    {
      id: 'message',
      label: 'Nhắn tin',
      icon: (
        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      href: undefined,
      onClick: onMessageClick,
      gradient: 'from-rose-400 to-pink-500',
      hoverGradient: 'from-rose-500 to-pink-600',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-4">
      {buttons.map((button) => {
        const baseClasses =
          'relative group flex flex-col items-center justify-center gap-1 md:gap-2 py-3 md:py-4 rounded-2xl font-semibold text-xs md:text-sm transition-all duration-300 overflow-hidden';

        const gradientBg = `bg-gradient-to-br ${button.gradient} group-hover:bg-gradient-to-br ${button.hoverGradient}`;

        const content = (
          <>
            {/* Background shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />

            {/* Icon with bounce effect */}
            <div className="relative z-10 p-2 md:p-2.5 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform duration-300">
              <div className="text-white">{button.icon}</div>
            </div>

            {/* Label */}
            <span className="relative z-10 text-white font-medium tracking-wide group-hover:-translate-y-0.5 transition-transform duration-300">
              {button.label}
            </span>

            {/* Shadow */}
            <div className="absolute inset-0 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300" />
          </>
        );

        if (button.href) {
          return (
            <Link
              key={button.id}
              href={button.href}
              target={button.target}
              rel={button.target === '_blank' ? 'noopener noreferrer' : undefined}
              onClick={button.onClick as any}
              className={`${baseClasses} ${gradientBg}`}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={button.id}
            type="button"
            onClick={button.onClick as any}
            className={`${baseClasses} ${gradientBg} cursor-pointer`}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
