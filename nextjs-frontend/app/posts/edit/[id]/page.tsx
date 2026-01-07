'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
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
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [existingVideo, setExistingVideo] = useState<string | null>(null);
  const [removeExistingVideo, setRemoveExistingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(true);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Handle paste event for HTML content
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    async function fetchPost() {
      try {
        setIsFetching(true);
        const postData = await posts.getById(postId);
        setPost(postData);
        setFormData({
          title: postData.title,
          content: postData.content,
          excerpt: postData.excerpt || '',
          type: postData.type as any,
          status: postData.status as any,
        });
        if (postData.images) {
          // Convert PostImage objects to URLs
          const imageUrls = postData.images.map(img => typeof img === 'string' ? img : (img.url || ''));
          setExistingImages(imageUrls);
        }
        if (postData.video) {
          setExistingVideo(postData.video);
        }
      } catch (err) {
        setError('Không thể tải bài viết');
        console.error('Fetch post error:', err);
      } finally {
        setIsFetching(false);
      }
    }

    if (!authLoading && isAuthenticated) {
      fetchPost();
    }
  }, [postId, authLoading, isAuthenticated]);

  // Sync content to contentEditable when post is loaded
  useEffect(() => {
    if (contentEditableRef.current && formData.content && !isFetching) {
      contentEditableRef.current.innerHTML = formData.content;
    }
  }, [isFetching]);

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

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/') && !file.name.endsWith('.mp4')) {
      setVideoError('Chỉ hỗ trợ file video MP4');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setVideoError('Video không được vượt quá 100MB');
      return;
    }

    // Clear previous video preview
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }

    setSelectedVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    setVideoError(null);
    // If we're adding a new video, we want to remove the existing one
    if (existingVideo) {
      setRemoveExistingVideo(true);
    }
  };

  const removeNewVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
  };

  const handleRemoveExistingVideo = () => {
    setExistingVideo(null);
    setRemoveExistingVideo(true);
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
        video: selectedVideo || undefined,
        remove_video: removeExistingVideo && !selectedVideo ? true : undefined,
      };

      await posts.update(postId, updateData);

      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }

      router.push('/profile');
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
        if (err.errors) {
          setValidationErrors(err.errors);
        }
      } else {
        setError('Không thể cập nhật bài viết. Vui lòng thử lại.');
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
      <div className="container mx-auto px-4 py-8">
        <p>Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated || !post) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Sửa bài viết</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && !validationErrors && (
            <div className="bg-blue-500 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-3 py-2 border ${
                getFieldError('title') ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-red-500`}
              placeholder="Nhập tiêu đề bài viết"
            />
            {getFieldError('title') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('title')}</p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              Tóm tắt
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              value={formData.excerpt}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Mô tả ngắn (tùy chọn)"
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung
            </label>
            <div
              ref={contentEditableRef}
              contentEditable={!isLoading}
              onInput={handleContentChange}
              onPaste={handlePaste}
              data-placeholder="Viết nội dung bài viết của bạn tại đây..."
              className={`w-full min-h-[300px] px-3 py-2 border ${
                getFieldError('content') ? 'border-red-500' : 'border-gray-300'
              } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400`}
              style={{ whiteSpace: 'pre-wrap' }}
            />
            {isHtmlMode && formData.content && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  Xem HTML source
                </summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-40">
                  {formData.content}
                </pre>
              </details>
            )}
            {getFieldError('content') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('content')}</p>
            )}
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hình ảnh hiện tại
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {existingImages.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img
                      src={imageUrl}
                      alt={`Existing ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      disabled={isLoading}
                      className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500 disabled:opacity-50"
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
              Thêm hình ảnh mới (tối đa 10)
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
                      className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video (MP4, tối đa 100MB)
            </label>

            {videoError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-3">
                {videoError}
              </div>
            )}

            {/* Existing Video */}
            {existingVideo && !removeExistingVideo && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Video hiện tại:</p>
                <div className="relative">
                  <video
                    src={existingVideo}
                    className="w-full max-h-60 object-contain rounded-lg bg-black"
                    controls
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full w-8 h-8 text-lg flex items-center justify-center hover:bg-opacity-90"
                    onClick={handleRemoveExistingVideo}
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* New Video Preview */}
            {videoPreview && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Video mới:</p>
                <div className="relative">
                  <video
                    src={videoPreview}
                    className="w-full max-h-60 object-contain rounded-lg bg-black"
                    controls
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full w-8 h-8 text-lg flex items-center justify-center hover:bg-opacity-90"
                    onClick={removeNewVideo}
                    disabled={isLoading}
                  >
                    ×
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {selectedVideo?.name} ({((selectedVideo?.size || 0) / 1024 / 1024).toFixed(1)} MB)
                  </div>
                </div>
              </div>
            )}

            {/* Video Upload Input */}
            {!videoPreview && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <span className="text-3xl mb-2">🎬</span>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold">Nhấn để tải video</span>
                  </p>
                  <p className="text-xs text-gray-500">MP4 (tối đa 100MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleVideoChange}
                  accept="video/mp4,.mp4"
                  disabled={isLoading}
                />
              </label>
            )}
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Loại
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="post">Bài viết</option>
                <option value="page">Trang</option>
                <option value="product">Sản phẩm</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="draft">Bản nháp</option>
                <option value="pending">Đang chờ</option>
                <option value="publish">Xuất bản</option>
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
              {isLoading ? 'Đang cập nhật...' : 'Cập nhật bài viết'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isLoading}
              className="bg-blue-300 hover:bg-blue-400 text-gray-800 font-medium py-2 px-6 rounded transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
