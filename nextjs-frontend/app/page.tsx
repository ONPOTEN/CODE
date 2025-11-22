'use client';

import HeroBanner from '@/components/HeroBanner';
import Menu from '@/components/Menu';
import InfiniteScrollPosts from '@/components/InfiniteScrollPosts';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner */}
      <HeroBanner />

      {/* Welcome Section - Desktop Only */}
      <div className="hidden lg:block">
        <Menu />
      </div>

      {/* Posts Section with Infinite Scroll */}
      <InfiniteScrollPosts />

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-grey-200 border border-gray-300 p-6 rounded-lg shadow-sm hover:border-blue-600 transition-colors">
              <h3 className="font-semibold text-lg mb-2 text-gray-900">🔐 User Authentication</h3>
              <p className="text-gray-600 text-sm">
                Secure login and registration with Laravel Sanctum
              </p>
            </div>
            <div className="bg-grey-200 border border-gray-300 p-6 rounded-lg shadow-sm hover:border-blue-600 transition-colors">
              <h3 className="font-semibold text-lg mb-2 text-gray-900">📝 Content Management</h3>
              <p className="text-gray-600 text-sm">
                Create and manage posts with rich content
              </p>
            </div>
            <div className="bg-grey-200 border border-gray-300 p-6 rounded-lg shadow-sm hover:border-blue-600 transition-colors">
              <h3 className="font-semibold text-lg mb-2 text-gray-900">🚀 Modern Stack</h3>
              <p className="text-gray-600 text-sm">
                Built with Next.js 15, React 19, and Laravel 11
              </p>
            </div>
            <div className="bg-grey-200 border border-gray-300 p-6 rounded-lg shadow-sm hover:border-blue-600 transition-colors">
              <h3 className="font-semibold text-lg mb-2 text-gray-900">🎨 Tailwind CSS</h3>
              <p className="text-gray-600 text-sm">
                Beautiful, responsive UI components
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
