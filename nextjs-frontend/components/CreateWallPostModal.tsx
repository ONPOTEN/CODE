'use client';

import { useState } from 'react';
import { posts, ApiException, User } from '@/lib/api';

interface CreateWallPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallUserId: number;
  wallUserName: string;
  currentUser?: User | null;
  onSuccess?: () => void;
}

export function CreateWallPostModal({
  isOpen,
  onClose,
  wallUserId,
  wallUserName,
  currentUser,
  onSuccess,
}: CreateWallPostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [type, setType] = useState<'post' | 'page' | 'product'>('post');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setImageError(null);
    const newImages: File[] = [];
    const newPreviews: string[] = [];

    // Limit to 5 images
    const filesToProcess = Array.from(files).slice(0, 5 - images.length);

    if (filesToProcess.length + images.length > 5) {
      setImageError('Maximum 5 images allowed');
      return;
    }

    filesToProcess.forEach((file) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setImageError('Only image files are allowed');
        return;
      }

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setImageError('Image size must be less than 5MB');
        return;
      }

      newImages.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create the post
      const response = await posts.create({
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || undefined,
        type,
        status: 'publish',
        images: images.length > 0 ? images : undefined,
      });

      // Share the post to the wall
      const postId = (response as any).data?.id || (response as any).id;
      if (postId) {
        await posts.shareToWall(postId, wallUserId);
      }

      alert(`Post created and shared to ${wallUserName}'s wall successfully!`);
      resetForm();
      onClose();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to create post. Please try again.');
      }
      console.error('Error creating post:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setExcerpt('');
    setType('post');
    setImages([]);
    setImagePreviews([]);
    setError(null);
    setImageError(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl z-50 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Create Post on {wallUserName}'s Wall
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Context Info */}
          {currentUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {currentUser.name?.charAt(0).toUpperCase() || currentUser.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {currentUser.name || currentUser.username}
                </p>
                <p className="text-xs text-gray-600">
                  Posting on {wallUserName}'s wall
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter post content"
              rows={5}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt (optional)
            </label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary of the post"
              disabled={loading}
              maxLength={200}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">{excerpt.length}/200</p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'post' | 'page' | 'product')}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="post">Post</option>
              <option value="page">Page</option>
              <option value="product">Product</option>
            </select>
          </div>

          {/* Images Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images (optional - max 5)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading || images.length >= 5}
                className="hidden"
                id="image-input"
              />
              <label
                htmlFor="image-input"
                className={`cursor-pointer ${
                  images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <svg
                  className="w-12 h-12 mx-auto mb-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-600">
                  Click to upload images or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF up to 5MB each
                </p>
              </label>
            </div>
            {imageError && (
              <p className="text-sm text-red-600 mt-2">{imageError}</p>
            )}
            {images.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {images.length} image{images.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Previews
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      disabled={loading}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !content.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Post
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default CreateWallPostModal;
