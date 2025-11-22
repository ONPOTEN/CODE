'use client';

export default function HeroBanner() {
  return (
    <section className="py-4">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-8 text-gray-900">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">Chào mừng đến với Threads</h2>
              <p className="text-lg mb-4">Mua sắm thông minh, giá tốt mỗi ngày</p>
              <button className="bg-gray-50 text-blue-600 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Khám phá ngay
              </button>
            </div>
            <div className="hidden md:block">
              <div className="w-48 h-48 bg-gray-50/10 rounded-full flex items-center justify-center">
                <span className="text-6xl">🎁</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
