'use client';

import { useEffect, useState } from 'react';
import { posts, users, Post, User, ApiException } from '@/lib/api';

export default function ApiTestPage() {
  const [postsList, setPostsList] = useState<Post[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch posts and users from Laravel API
        const [postsData, usersData] = await Promise.all([
          posts.getAll({ per_page: 10 }),
          users.getAll({ per_page: 10 }),
        ]);

        setPostsList(postsData.data);
        setUsersList(usersData.data);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`API Error: ${err.message} (Status: ${err.status})`);
        } else {
          setError('Failed to fetch data from API');
        }
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">API Test Page</h1>
        <p>Loading data from Laravel API...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">API Test Page</h1>
        <div className="bg-blue-500 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          <p className="mt-2 text-sm">
            Make sure your Laravel API is running on http://localhost:8000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">API Test Page</h1>

      {/* Posts Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Posts from Laravel API</h2>
        {postsList.length === 0 ? (
          <p className="text-gray-600">No posts found</p>
        ) : (
          <div className="grid gap-4">
            {postsList.map((post) => (
              <div key={post.id} className="border rounded-lg p-4 shadow-sm">
                <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                <p className="text-gray-600 text-sm mb-2">Slug: {post.slug}</p>
                <p className="text-gray-700 mb-2">{post.excerpt}</p>
                <div className="text-sm text-gray-500">
                  <span className="mr-4">Type: {post.type}</span>
                  <span>Status: {post.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Users from Laravel API</h2>
        {usersList.length === 0 ? (
          <p className="text-gray-600">No users found</p>
        ) : (
          <div className="grid gap-4">
            {usersList.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 shadow-sm">
                <h3 className="text-xl font-semibold mb-2">{user.name}</h3>
                <p className="text-gray-600 text-sm mb-1">Username: {user.username}</p>
                <p className="text-gray-600 text-sm">Email: {user.email}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
