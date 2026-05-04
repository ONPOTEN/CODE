'use client';

import HeroBanner from '@/components/HeroBanner';
import Menu from '@/components/Menu';
import InfiniteScrollPosts from '@/components/InfiniteScrollPosts';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <HeroBanner />

      {/* Welcome Section */}
      <Menu />

      {/* Posts Section with Infinite Scroll */}
      <InfiniteScrollPosts />

      {/* Features Section */}
      <section className="container py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg mb-2">🔐 User Authentication</h3>
              <p className="text-gray-600 text-sm">
                Secure login and registration with Laravel Sanctum
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg mb-2">📝 Content Management</h3>
              <p className="text-gray-600 text-sm">
                Create and manage posts with rich content
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg mb-2">🚀 Modern Stack</h3>
              <p className="text-gray-600 text-sm">
                Built with Next.js 15, React 19, and Laravel 11
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg mb-2">🎨 Tailwind CSS</h3>
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
