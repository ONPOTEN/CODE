'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { posts, users, Post, User, ApiException, PaginatedResponse, CreatePostData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function UserWallPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [wallPosts, setWallPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallLoading, setWallLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Create post form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    type: 'post' as 'post' | 'page' | 'product',
    status: 'publish' as 'publish' | 'draft' | 'pending',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const userId = params.id as string;
  const isOwnWall = currentUser && user && currentUser.id === user.id;

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...selectedImages, ...files].slice(0, 10); // Max 10 images
    setSelectedImages(newFiles);

    // Create preview URLs
    const previews = newFiles.map((file) => URL.createObjectURL(file));
    setImagePreview(previews);
  };

  const removeImage = (index: number) => {
    const newFiles = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newFiles);

    const newPreviews = imagePreview.filter((_, i) => i !== index);
    newPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setImagePreview(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!formData.content.trim()) {
      alert('Please enter content');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const postData: CreatePostData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        type: formData.type,
        status: formData.status,
        images: selectedImages.length > 0 ? selectedImages : undefined,
      };

      // Note: The wall_id should be set in the backend based on context
      // For now, we're creating a post with wall_id = current user ID
      await posts.create(postData);

      setSuccessMessage('Post created successfully on your wall!');
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        type: 'post',
        status: 'publish',
      });
      setSelectedImages([]);
      setImagePreview([]);
      setShowCreateForm(false);

      // Refresh wall posts
      setTimeout(() => {
        setCurrentPage(1);
        setSuccessMessage(null);
      }, 2000);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(`Failed to create post: ${err.message}`);
      } else {
        setError('Failed to create post');
      }
      console.error('Create post error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch user info
  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);

        const numericId = parseInt(userId);

        if (!isNaN(numericId) && numericId.toString() === userId) {
          const userData = await users.getById(numericId);
          setUser(userData.data);
        } else {
          const userData = await users.getByUsername(userId);
          setUser(userData.data);
        }
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`Failed to load user: ${err.message}`);
        } else {
          setError('Failed to load user');
        }
        console.error('Fetch user error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  // Fetch user's wall posts
  useEffect(() => {
    async function fetchWallPosts() {
      if (!user) return;

      try {
        setWallLoading(true);
        setError(null);

        const params: any = {
          per_page: 15,
          page: currentPage,
        };
        if (searchQuery) params.search = searchQuery;
        if (selectedType) params.type = selectedType;

        const response = await posts.userWall(user.id, params);
        setWallPosts(response.data);
        setPagination(response.pagination);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`Failed to load wall posts: ${err.message}`);
        } else {
          setError('Failed to load wall posts');
        }
        console.error('Fetch wall posts error:', err);
      } finally {
        setWallLoading(false);
      }
    }

    fetchWallPosts();
  }, [user, currentPage, searchQuery, selectedType]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading user...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">User not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* User Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="text-gray-600">@{user.username}</p>
            </div>
            {isOwnWall && isAuthenticated && (
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                {showCreateForm ? 'Cancel' : 'Create Post'}
              </button>
            )}
          </div>
          {user.hobby && <p className="text-sm text-gray-600">Hobby: {user.hobby}</p>}
          {user.company && <p className="text-sm text-gray-600">Company: {user.company}</p>}
          {user.location && <p className="text-sm text-gray-600">Location: {user.location}</p>}
        </div>

        {/* Create Post Form */}
        {showCreateForm && isOwnWall && isAuthenticated && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Create New Post</h2>

            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter post title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Enter post content"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Excerpt */}
              <div>
                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
                  Excerpt
                </label>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  placeholder="Enter post excerpt (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="post">Post</option>
                    <option value="page">Page</option>
                    <option value="product">Product</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="publish">Publish</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">
                  Images (up to 10)
                </label>
                <input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={selectedImages.length >= 10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {selectedImages.length}/10 images selected
                </p>
              </div>

              {/* Image Previews */}
              {imagePreview.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Image Previews</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreview.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors font-medium"
                >
                  {isSubmitting ? 'Creating...' : 'Create Post'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Posts
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by title or content..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <select
                id="typeFilter"
                value={selectedType}
                onChange={handleTypeFilter}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="post">Post</option>
                <option value="page">Page</option>
                <option value="product">Product</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Posts List */}
        {wallLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p>Loading posts...</p>
          </div>
        ) : wallPosts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600">No posts found on this wall.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {wallPosts.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`}>
                  <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer">
                    <div className="flex gap-4">
                      {post.featured_image && (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-32 h-32 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {post.type}
                          </span>
                        </div>
                        {post.excerpt && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.excerpt}</p>
                        )}
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                          <div className="flex gap-4">
                            <span>❤️ {post.engagement?.likes?.count || 0}</span>
                            <span>💬 {post.comment_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {currentPage > 1 && (
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    Previous
                  </button>
                )}

                {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                  .slice(
                    Math.max(0, currentPage - 2),
                    Math.min(pagination.total_pages, currentPage + 1)
                  )
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                {currentPage < pagination.total_pages && (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    Next
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-600">
              Showing {wallPosts.length} of {pagination?.total || 0} posts
            </div>
          </>
        )}
      </div>
    </div>
  );
}
