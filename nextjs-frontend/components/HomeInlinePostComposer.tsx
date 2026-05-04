'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { posts, CreatePostData, ApiException } from '@/lib/api';
import { useVideoUpload } from '@/contexts/VideoUploadContext';

export default function HomeInlinePostComposer() {
  const { user, isAuthenticated } = useAuth();
  const { uploadVideo } = useVideoUpload();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
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
  const [isHtmlMode] = useState(true);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [imagePreviews, videoPreview]);

  const focusEditor = () => {
    setTimeout(() => {
      contentEditableRef.current?.focus();
    }, 0);
  };

  const openComposer = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setExpanded(true);
    focusEditor();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html && isHtmlMode) {
      document.execCommand('insertHTML', false, html);
    } else {
      document.execCommand('insertText', false, text);
    }

    if (contentEditableRef.current) {
      setFormData((prev) => ({
        ...prev,
        content: contentEditableRef.current?.innerHTML || '',
      }));
    }
  };

  const handleContentChange = () => {
    if (contentEditableRef.current) {
      setFormData((prev) => ({
        ...prev,
        content: contentEditableRef.current?.innerHTML || '',
      }));
    }
  };

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    const previews = filesArray.map((file) => URL.createObjectURL(file));

    setSelectedImages(filesArray);
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    const nextImages = selectedImages.filter((_, i) => i !== index);
    const nextPreviews = imagePreviews.filter((_, i) => i !== index);

    URL.revokeObjectURL(imagePreviews[index]);

    setSelectedImages(nextImages);
    setImagePreviews(nextPreviews);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.endsWith('.mp4')) {
      setError('Chỉ hỗ trợ file video MP4');
      return;
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Video không được vượt quá 100MB');
      return;
    }

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

  const getPlainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const resetComposer = () => {
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }

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
    setValidationErrors(null);
    setError(null);
    setExpanded(false);

    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const plainText = getPlainText(formData.content || '');
    if (!plainText) {
      setError('Nội dung là bắt buộc');
      return;
    }

    setIsLoading(true);
    setError(null);
    setValidationErrors(null);

    try {
      const payload: CreatePostData = {
        ...formData,
        title: 'Post',
        images: selectedImages.length > 0 ? selectedImages : undefined,
      };

      const result = await posts.create(payload);
      const newPostId = result?.post?.id;

      if (selectedVideo && newPostId) {
        uploadVideo(newPostId, selectedVideo);
      } else {
        alert('Bài viết đã được tạo thành công!');
      }

      resetComposer();
      router.refresh();
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

  return (
    <div id="home-inline-post-composer" className="max-w-4xl mx-auto px-4 pt-5 pb-2">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-3 md:p-4">
        <div className="flex items-center gap-3">
          <img
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover"
            src={user?.avatar || '/default-avatar.png'}
          />

          {expanded ? (
            <div
              ref={contentEditableRef}
              contentEditable
              onInput={handleContentChange}
              onPaste={handlePaste}
              data-placeholder="Bạn đang nghĩ gì thế?"
              className="flex-1 min-h-[86px] text-left px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
              style={{ whiteSpace: 'pre-wrap' }}
            />
          ) : (
            <button
              type="button"
              onClick={openComposer}
              className="flex-1 text-left px-4 py-3 rounded-full border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Bạn đang nghĩ gì thế?
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {getFieldError('content') && (
          <p className="mt-2 text-red-600 text-xs">{getFieldError('content')}</p>
        )}

        {expanded && imagePreviews.length > 0 && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} className="w-full h-36 object-cover rounded-xl" />
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

        {expanded && videoPreview && (
          <div className="mt-3 relative">
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
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
              <span aria-hidden="true">🖼️</span>
              Ảnh/Video
              <input
                type="file"
                className="hidden"
                multiple
                onChange={handleImageChange}
                accept="image/*"
              />
            </label>

            <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer ${selectedVideo ? 'opacity-50' : ''}`}>
              <span aria-hidden="true">😊</span>
              Cảm xúc
              <input
                type="file"
                className="hidden"
                onChange={handleVideoChange}
                accept="video/mp4,.mp4"
                disabled={!!selectedVideo}
              />
            </label>

            {expanded && (
              <>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleFieldChange}
                  className="px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none"
                >
                  <option value="post">📝 Bài viết</option>
                  <option value="article">📄 Bài báo</option>
                  <option value="news">📰 Tin tức</option>
                </select>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFieldChange}
                  className="px-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none"
                >
                  <option value="draft">Bản nháp</option>
                  <option value="publish">Xuất bản</option>
                </select>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {expanded && (
              <button
                type="button"
                onClick={resetComposer}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
            )}
            <button
              type={expanded ? 'submit' : 'button'}
              onClick={expanded ? undefined : openComposer}
              disabled={isLoading || (expanded && !getPlainText(formData.content || ''))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {isLoading ? 'Đang đăng...' : 'Tạo bài viết'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
