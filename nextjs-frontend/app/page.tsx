'use client';

import { useState } from 'react';
import Menu from '@/components/Menu';
import CreatePostModal from '@/components/CreatePostModal';
import InfiniteScrollPosts from '@/components/InfiniteScrollPosts';

export default function HomePage() {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Welcome Section - Desktop Only */}
      <div className="hidden lg:block">
        <Menu />
      </div>

      {/* Create Post Button - Below Menu */}
      <div className="lg:block max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => setIsCreatePostOpen(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Post</span>
        </button>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
      />

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
