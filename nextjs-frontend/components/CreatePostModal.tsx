'use client';

import { useState, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { posts, CreatePostData, ApiException } from '@/lib/api';
import { useVideoUpload } from '@/contexts/VideoUploadContext';

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
  const [isHtmlMode, setIsHtmlMode] = useState(true);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Video upload context
  const { uploadVideo } = useVideoUpload();

  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Handle paste event to clean up pasted HTML
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html && isHtmlMode) {
      // Insert HTML content
      document.execCommand('insertHTML', false, html);
    } else {
      // Insert plain text
      document.execCommand('insertText', false, text);
    }

    // Update formData
    if (contentEditableRef.current) {
      setFormData({
        ...formData,
        content: contentEditableRef.current.innerHTML,
      });
    }
  };

  // Handle content change in contentEditable
  const handleContentChange = () => {
    if (contentEditableRef.current) {
      setFormData({
        ...formData,
        content: contentEditableRef.current.innerHTML,
      });
    }
  };

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
    setSelectedImages(prev => [...prev, ...filesArray]);

    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
    
    // Reset input so the same file can be selected again
    e.target.value = '';
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
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi|wmv|mkv|webm)$/i)) {
      setError('Chỉ hỗ trợ file video hợp lệ');
      e.target.value = '';
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
    e.target.value = '';
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
  };



  const resetForm = () => {
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
    setIsHtmlMode(false);
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = '';
    }
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      setError('Nội dung là bắt buộc');
      return;
    }

    setIsLoading(true);
    setError(null);
    setValidationErrors(null);

    try {
      const postData: CreatePostData = {
        ...formData,
        title: formData.content.substring(0, 50).replace(/(<([^>]+)>)/gi, "") || 'Post',
        images: selectedImages.length > 0 ? selectedImages : undefined,
        // We DO NOT submit the video directly through create post API anymore
      };

      console.log('--- DEBUG S3 UPLOAD START ---');
      console.log('Submitting post with images:', selectedImages.length, 'video:', !!selectedVideo);

      const result = await posts.create(postData);
      
      console.log('--- DEBUG S3 UPLOAD END ---');
      console.log('Backend Response:', JSON.stringify(result, null, 2));
      
      // Cleanup previews for images
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));

      // Handle video upload as step 2
      const newPostId = (result as any)?.post?.id || (result as any)?.data?.id || (result as any)?.id;
      
      if (selectedVideo && newPostId) {
        // Run background upload via context
        uploadVideo(newPostId, selectedVideo);
      } else if (selectedVideo && !newPostId) {
        console.error("Failed to extract new post ID for video upload", result);
        alert('Bài viết được tạo nhưng không thể tải video (không tìm thấy ID).');
      } else {
        if (videoPreview) {
          URL.revokeObjectURL(videoPreview);
        }
        alert('Bài viết đã được tạo thành công!');
      }

      resetForm();
      onClose();
      setIsLoading(false);
      window.location.href = '/';
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
        if (err.errors) {
          setValidationErrors(err.errors);
        }
      } else {
        setError('Không thể tạo bài viết. Vui lòng thử lại.');
      }
      console.error('Create post error:', err);
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">Đăng nhập để tạo bài viết</h2>
          <p className="text-gray-600 mb-6">Bạn cần đăng nhập để tạo bài viết mới.</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/login')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Đăng nhập
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
            <div className="font-semibold text-lg">Tạo bài viết</div>
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



          {/* Content Editor */}
          <div className="relative">
            {/* ContentEditable Div */}
            <div
              ref={contentEditableRef}
              contentEditable
              onInput={handleContentChange}
              onPaste={handlePaste}
              data-placeholder="Chia sẻ trạng thái..."
              className="w-full h-[120px] overflow-y-auto text-lg focus:outline-none resize-none border border-gray-200 rounded-lg p-3 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 prose prose-sm max-w-none"
              style={{ whiteSpace: 'pre-wrap' }}
            />

            {/* Raw HTML Preview (when in HTML mode) */}
            {isHtmlMode && formData.content && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  Xem HTML source
                </summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-32">
                  {formData.content}
                </pre>
              </details>
            )}
          </div>
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
                <option value="post">📝 Bài viết</option>
                <option value="article">📄 Bài báo</option>
                <option value="news">📰 Tin tức</option>
              </select>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="px-3 py-1 bg-gray-100 rounded-lg text-sm focus:outline-none"
              >
                <option value="draft">Bản nháp</option>
                <option value="publish">Xuất bản</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer hover:opacity-70 transition-opacity" title="Thêm ảnh">
                <span className="text-2xl">🖼️</span>
                <input type="file" className="sr-only" multiple onChange={handleImageChange} accept="image/*" />
              </label>
              <label className={`cursor-pointer hover:opacity-70 transition-opacity ${selectedVideo ? 'opacity-50' : ''}`} title="Thêm video">
                <span className="text-2xl">🎬</span>
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleVideoChange}
                  accept="video/*"
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
