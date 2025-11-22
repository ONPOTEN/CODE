'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { posts, CreatePostData, ApiException } from '@/lib/api';

export default function CreatePostPage() {
  const [formData, setFormData] = useState<CreatePostData>({
    title: '',
    content: '',
    excerpt: '',
    type: 'post',
    status: 'draft',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    setSelectedImages(filesArray);

    // Create preview URLs
    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    // Revoke the URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);

    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors(null);

    try {
      const postData: CreatePostData = {
        ...formData,
        images: selectedImages.length > 0 ? selectedImages : undefined,
      };

      const response = await posts.create(postData);

      // Clean up preview URLs
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));

      router.push('/profile'); // Redirect after successful creation
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
        if (err.errors) {
          setValidationErrors(err.errors);
        }
      } else {
        setError('Failed to create post. Please try again.');
      }
      console.error('Create post error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (field: string): string | null => {
    if (validationErrors && validationErrors[field]) {
      return validationErrors[field][0];
    }
    return null;
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Post</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && !validationErrors && (
            <div className="bg-blue-500 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-3 py-2 border ${
                getFieldError('title') ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-red-500`}
              placeholder="Enter post title"
            />
            {getFieldError('title') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('title')}</p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              value={formData.excerpt}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Short description (optional)"
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              rows={12}
              required
              value={formData.content}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-3 py-2 border ${
                getFieldError('content') ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-red-500`}
              placeholder="Write your post content here..."
            />
            {getFieldError('content') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('content')}</p>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">
              Images (up to 10)
            </label>
            <input
              type="file"
              id="images"
              name="images"
              accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
              multiple
              onChange={handleImageChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {getFieldError('images') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('images')}</p>
            )}

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      disabled={isLoading}
                      className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500 disabled:opacity-50"
                    >
                      ×
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-0 left-0 bg-grey-2000 text-gray-900 text-xs px-2 py-1 rounded-tr">
                        Featured
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="publish">Publish</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-2 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Post'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isLoading}
              className="bg-blue-300 hover:bg-blue-400 text-gray-800 font-medium py-2 px-6 rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
