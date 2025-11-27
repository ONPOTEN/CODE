'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { posts, UpdatePostData, ApiException, Post } from '@/lib/api';

export default function EditPostPage() {
  const params = useParams();
  const postId = parseInt(params.id as string);

  const [post, setPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState<UpdatePostData>({
    title: '',
    content: '',
    excerpt: '',
    type: 'post',
    status: 'draft',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notAuthorized, setNotAuthorized] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    async function fetchPost() {
      try {
        setIsFetching(true);
        setError(null);

        console.log('[EditPost] Fetching post ID:', postId);
        const postData = await posts.getById(postId);

        if (!postData) {
          setError('Post data is empty');
          setIsFetching(false);
          return;
        }

        console.log('[EditPost] Fetched complete post data:', {
          id: postData.id,
          title: postData.title,
          content: postData.content,
          excerpt: postData.excerpt,
          type: postData.type,
          status: postData.status,
          authorId: postData.author?.id,
          images: postData.images,
          featured_image: postData.featured_image,
        });

        // Check if current user is the post author
        if (postData.author && user && postData.author.id !== user.id) {
          console.log('[EditPost] Authorization failed:', {
            currentUserId: user.id,
            postAuthorId: postData.author.id,
          });
          setNotAuthorized(true);
          setError('You are not authorized to edit this post.');
          setIsFetching(false);
          return;
        }

        setPost(postData);

        // Set form data with all available fields
        setFormData({
          title: postData.title ? String(postData.title) : '',
          content: postData.content ? String(postData.content) : '',
          excerpt: postData.excerpt ? String(postData.excerpt) : '',
          type: (postData.type as 'post' | 'page' | 'product') || 'post',
          status: (postData.status as 'publish' | 'draft' | 'pending') || 'draft',
        });

        // Collect all images
        const allImages: string[] = [];

        // Add featured image first if it exists
        if (postData.featured_image) {
          allImages.push(postData.featured_image);
          console.log('[EditPost] Added featured image:', postData.featured_image);
        }

        // Add other images from the images array
        if (postData.images && Array.isArray(postData.images) && postData.images.length > 0) {
          postData.images.forEach((img: any, idx: number) => {
            if (img && img.url) {
              // Avoid duplicate if it's the same as featured_image
              if (img.url !== postData.featured_image) {
                allImages.push(img.url);
                console.log(`[EditPost] Added image ${idx + 1}:`, img.url);
              }
            }
          });
        }

        console.log('[EditPost] Total images collected:', allImages.length, allImages);
        setExistingImages(allImages);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[EditPost] Error fetching post:', errorMsg);
        setError(`Failed to load post: ${errorMsg}`);
      } finally {
        setIsFetching(false);
      }
    }

    if (!authLoading && isAuthenticated && postId && user) {
      fetchPost();
    }
  }, [postId, authLoading, isAuthenticated, user]);

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

    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeNewImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    URL.revokeObjectURL(imagePreviews[index]);

    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const removeExistingImage = (index: number) => {
    setImagesToRemove([...imagesToRemove, index]);
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors(null);

    try {
      const updateData: UpdatePostData = {
        ...formData,
        images: selectedImages.length > 0 ? selectedImages : undefined,
        remove_images: imagesToRemove.length > 0 ? imagesToRemove : undefined,
      };

      await posts.update(postId, updateData);

      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));

      router.push(`/posts/${postId}`);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
        if (err.errors) {
          setValidationErrors(err.errors);
        }
      } else {
        setError('Failed to update post. Please try again.');
      }
      console.error('Update post error:', err);
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

  if (authLoading || isFetching) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (notAuthorized) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h2>
              <p className="text-red-700 mb-4">{error}</p>
              <p className="text-red-600 text-sm mb-6">You can only edit posts that you have created.</p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Post Not Found</h2>
              <p className="text-red-700 mb-4">{error || 'Unable to load the requested post.'}</p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-flex items-center gap-1"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Edit Post #{postId}</h1>
            <p className="text-gray-600 mt-2">Update your post information and images</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
            {error && !validationErrors && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border ${
                  getFieldError('title') ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Short description (optional)"
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
                rows={12}
                value={formData.content}
                onChange={handleChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border ${
                  getFieldError('content') ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Write your post content here..."
              />
              {getFieldError('content') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('content')}</p>
              )}
            </div>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Current Images
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {existingImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Existing ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        disabled={isLoading}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center disabled:opacity-50 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Image Upload */}
            <div>
              <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">
                Add New Images (up to 10)
              </label>
              <input
                type="file"
                id="images"
                name="images"
                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                multiple
                onChange={handleImageChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

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
                        onClick={() => removeNewImage(index)}
                        disabled={isLoading}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center disabled:opacity-50"
                      >
                        ×
                      </button>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="publish">Publish</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Post'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isLoading}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
