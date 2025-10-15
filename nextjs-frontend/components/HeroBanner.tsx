'use client';

export default function HeroBanner() {
  return (
    <section className="container py-4">
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-sm overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-8 text-white">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">Chào mừng đến với Centimet2</h2>
            <p className="text-lg mb-4">Mua sắm thông minh, giá tốt mỗi ngày</p>
            <button className="bg-white text-primary px-6 py-2 rounded-sm font-medium hover:opacity-90 transition-opacity">
              Khám phá ngay
            </button>
          </div>
          <div className="hidden md:block">
            <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-6xl">🎁</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
