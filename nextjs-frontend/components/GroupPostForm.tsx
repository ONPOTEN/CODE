'use client';

import { useState, FormEvent } from 'react';
import { groupPosts } from '@/lib/api';

interface GroupPostFormProps {
  groupId: number;
  onPostCreated?: () => void;
  onCancel?: () => void;
}

export default function GroupPostForm({ groupId, onPostCreated, onCancel }: GroupPostFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('group_id', groupId.toString());
      formData.append('title', title);
      formData.append('content', content);
      formData.append('excerpt', excerpt);
      formData.append('status', 'publish');
      formData.append('visibility', visibility);

      // Add images if provided
      images.forEach((image) => {
        formData.append('images[]', image);
      });

      await groupPosts.create(formData);

      setSuccess(true);
      setTitle('');
      setContent('');
      setExcerpt('');
      setImages([]);
      setVisibility('public');
      setShowForm(false);

      setTimeout(() => setSuccess(false), 3000);

      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      {/* Header */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 font-medium"
        >
          What's on your mind? Share something with the group...
        </button>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Post Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a title..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Content Textarea */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, updates, or ideas..."
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              disabled={loading}
            />
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
              Summary (optional)
            </label>
            <input
              type="text"
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary of your post..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Images */}
          <div>
            <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">
              Images (optional)
            </label>
            <input
              type="file"
              id="images"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            {images.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">{images.length} image(s) selected</p>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Post created successfully!
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTitle('');
                setContent('');
                setExcerpt('');
                setImages([]);
                setError(null);
                if (onCancel) onCancel();
              }}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
