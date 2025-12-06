'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { posts, CreatePostData, ApiException } from '@/lib/api';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreatePostData>({
    title: '',
    content: '',
    excerpt: '',
    type: 'post',
    status: 'publish',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);

  const { isAuthenticated } = useAuth();
  const router = useRouter();

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

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    URL.revokeObjectURL(imagePreviews[index]);

    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/') && !file.name.endsWith('.mp4')) {
      setError('Chỉ hỗ trợ file video MP4');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Video không được vượt quá 100MB');
      return;
    }

    // Clear previous video preview
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }

    setSelectedVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      setError('Content is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setValidationErrors(null);

    try {
      const postData: CreatePostData = {
        ...formData,
        title: 'Post',
        images: selectedImages.length > 0 ? selectedImages : undefined,
        video: selectedVideo || undefined,
      };

      await posts.create(postData);

      // Cleanup previews
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }

      // Reset form
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        type: 'post',
        status: 'publish',
      });
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedVideo(null);
      setVideoPreview(null);
      onClose();

      // Show success message
      alert('Post created successfully!');
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

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sign in to create a post</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to create a new post.</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/login')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-lg flex flex-col max-h-[90vh]">

        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || '/default-avatar.png'}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="font-semibold text-lg">Create Post</div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="create-post-form"
              disabled={isLoading || !formData.content.trim()}
              className="bg-blue-500 text-white px-5 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? "Đang đăng..." : "Đăng"}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form
          id="create-post-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Content Textarea */}
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={4}
            placeholder="Chia sẻ trạng thái..."
            className="w-full text-lg focus:outline-none resize-none"
          />
          {getFieldError('content') && (
            <p className="text-red-600 text-xs mt-1">{getFieldError('content')}</p>
          )}

          {/* Preview Images */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} className="w-full h-40 object-cover rounded-xl" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-black text-white rounded-full w-6 h-6 text-sm"
                    onClick={() => removeImage(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Preview Video */}
          {videoPreview && (
            <div className="relative">
              <video
                src={videoPreview}
                className="w-full max-h-80 object-contain rounded-xl bg-black"
                controls
              />
              <button
                type="button"
                className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full w-8 h-8 text-lg flex items-center justify-center hover:bg-opacity-90"
                onClick={removeVideo}
              >
                ×
              </button>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {selectedVideo?.name} ({((selectedVideo?.size || 0) / 1024 / 1024).toFixed(1)} MB)
              </div>
            </div>
          )}

          {/* Footer icons */}
          <div className="flex justify-between border-t pt-3">
            <div className="flex gap-3">
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="px-3 py-1 bg-gray-100 rounded-lg text-sm focus:outline-none"
              >
                <option value="post">📝 Post</option>
                <option value="article">📄 Article</option>
                <option value="news">📰 News</option>
              </select>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="px-3 py-1 bg-gray-100 rounded-lg text-sm focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="publish">Publish</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer hover:opacity-70 transition-opacity" title="Thêm ảnh">
                <span className="text-2xl">🖼️</span>
                <input type="file" className="hidden" multiple onChange={handleImageChange} accept="image/*" />
              </label>
              <label className={`cursor-pointer hover:opacity-70 transition-opacity ${selectedVideo ? 'opacity-50' : ''}`} title="Thêm video">
                <span className="text-2xl">🎬</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleVideoChange}
                  accept="video/mp4,.mp4"
                  disabled={!!selectedVideo}
                />
              </label>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
