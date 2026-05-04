'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { groupPosts, Group, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface CreateGroupPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  group?: Group;
  onPostCreated?: () => void;
}

export default function CreateGroupPostModal({
  isOpen,
  onClose,
  groupId,
  group,
  onPostCreated,
}: CreateGroupPostModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    setSelectedImages(filesArray);

    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
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

    if (!title.trim() || !content.trim()) {
      setError('Tiêu đề và nội dung là bắt buộc');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('group_id', groupId.toString());
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      formData.append('status', 'publish');

      // Add images if provided
      selectedImages.forEach((image) => {
        formData.append('images[]', image);
      });

      // Add video if provided
      if (selectedVideo) {
        formData.append('video', selectedVideo);
      }

      await groupPosts.create(formData);

      // Clean up previews
      imagePreviews.forEach((p) => URL.revokeObjectURL(p));
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }

      // Reset form
      setTitle('');
      setContent('');
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedVideo(null);
      setVideoPreview(null);

      // Notify parent and close
      if (onPostCreated) {
        onPostCreated();
      }
      onClose();
      alert('Bài viết đã được tạo thành công!');
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Không thể tạo bài viết');
      }
      console.error('Create post error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

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
            <div>
              <div className="font-semibold text-lg">Tạo bài viết</div>
              <div className="text-sm text-gray-500">{group?.group_name}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="create-group-post-form"
              disabled={isLoading || !title.trim() || !content.trim()}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {isLoading ? 'Đang đăng...' : 'Đăng'}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form
          id="create-group-post-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài viết..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ suy nghĩ của bạn..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Preview Images */}
          {imagePreviews.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hình ảnh ({imagePreviews.length})
              </label>
              <div className="grid grid-cols-3 gap-3">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} className="w-full h-40 object-cover rounded-lg" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-black bg-opacity-70 text-white rounded-full w-6 h-6 text-sm hover:bg-opacity-100 transition-all flex items-center justify-center"
                      onClick={() => removeImage(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Video */}
          {videoPreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video
              </label>
              <div className="relative">
                <video
                  src={videoPreview}
                  className="w-full max-h-80 object-contain rounded-lg bg-black"
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
            </div>
          )}

          {/* Footer icons */}
          <div className="flex justify-between border-t pt-4">
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
            <div className="text-sm text-gray-500">
              {selectedImages.length > 0 && `${selectedImages.length} hình ảnh đã chọn`}
              {selectedImages.length > 0 && selectedVideo && ' • '}
              {selectedVideo && '1 video đã chọn'}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
