'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { shopPosts, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleProductComponent } from './SimpleProductComponent';
import { VariantProductComponent } from './VariantProductComponent';
import { DownloadProductComponent } from './DownloadProductComponent';
import { VariantProductsReference } from './VariantProductsReference';

export default function CreateShopPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const shopId = Number(params.id);

  const [formData, setFormData] = useState({
    title: '',
    type: 'post' as 'post' | 'page',
    status: 'draft' as 'draft' | 'published',
    product_type: 'Đơn giản' as 'Đơn giản' | 'Biến thể' | 'Tải xuống',
    // Simple product fields
    price: '',
    sale_price: '',
    main_image: '' as string | File,
    other_images: [] as (string | File)[],
    short_description: '',
    detail_description: '',
    categories: '',
    // Variant product fields
    attributes: [],
    // Download product fields
    download_files: undefined,
    link_files: [],
  });

  const [featuredImages, setFeaturedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Video upload states
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Video upload mode and progress
  const [videoUploadMode, setVideoUploadMode] = useState<'direct' | 'proxy'>('direct');
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [createdPostId, setCreatedPostId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);

  // Video processing status from the background job
  const [videoProcessingStatus, setVideoProcessingStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [videoProcessingError, setVideoProcessingError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll video status after upload
  useEffect(() => {
    if (!createdPostId || videoProcessingStatus !== 'processing') return;

    pollingRef.current = setInterval(async () => {
      try {
        const status = await shopPosts.getVideoStatus(shopId, createdPostId);
        if (status.video_upload_status === 'completed') {
          clearInterval(pollingRef.current!);
          setVideoProcessingStatus('completed');
          setTimeout(() => router.push(`/shops/${shopId}/posts`), 2000);
        } else if (status.video_upload_status === 'failed') {
          clearInterval(pollingRef.current!);
          setVideoProcessingStatus('failed');
          setVideoProcessingError(status.video_upload_error || 'Video upload failed');
        }
      } catch (e) {
        console.error('Error polling video status:', e);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [createdPostId, videoProcessingStatus, shopId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormDataChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFeaturedImages((prev) => [...prev, ...files]);

      // Generate previews using blob URLs
      files.forEach((file) => {
        const preview = URL.createObjectURL(file);
        setImagePreviews((prev) => [...prev, preview]);
      });
    }
  };

  const removeImage = (index: number) => {
    setFeaturedImages((prev) => prev.filter((_, i) => i !== index));

    // Revoke blob URL to prevent memory leaks
    if (imagePreviews[index] && imagePreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
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
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
    setVideoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Bạn phải đăng nhập để tạo bài viết');
      return;
    }

    if (!formData.title.trim()) {
      alert('Vui lòng nhập tiêu đề');
      return;
    }

    try {
      setLoading(true);

      // Kiểm tra xem có tệp tin để tải lên không
      const hasDownloadFile = formData.download_files && (formData.download_files as any).file;
      const hasMainImage = formData.main_image && formData.main_image instanceof File;
      const hasOtherImages = formData.other_images && formData.other_images.some((img) => img instanceof File);
      const hasVideo = selectedVideo !== null;

      // Kiểm tra xem có tùy chọn biến thể nào có tệp hình ảnh không
      const hasVariantOptionImages = formData.attributes && (formData.attributes as any[]).some((attr: any) =>
        attr.options && attr.options.some((opt: any) => opt.image instanceof File)
      );

      let createdPostId = null;

      // Handle direct video upload (background processing)
      if (hasVideo && !featuredImages.length && !hasMainImage && !hasOtherImages && !hasVariantOptionImages && !hasDownloadFile) {
        // Only video upload case - create post without video first, then upload separately
        const submitFormData: any = {
          title: formData.title,
          type: formData.type,
          status: formData.status,
          product_type: formData.product_type,
        };

        // Add other fields as needed
        if (formData.short_description) submitFormData.short_description = formData.short_description;
        if (formData.detail_description) submitFormData.detail_description = formData.detail_description;
        if (formData.categories) submitFormData.categories = formData.categories;

        // Create post first
        const createResponse = await shopPosts.create(shopId, submitFormData);

        if (createResponse.post) {
          // Store post ID for polling
          setCreatedPostId(createResponse.post.id);
          setVideoProcessingStatus('uploading');

          // Upload video to the newly created post
          await shopPosts.uploadVideo(shopId, createResponse.post.id, selectedVideo!);

          // Job dispatched — switch to polling mode
          setVideoProcessingStatus('processing');
        }

        setLoading(false);
        return; // Don't navigate yet — polling will redirect on completion
      }

      if (featuredImages.length > 0 || hasDownloadFile || hasMainImage || hasOtherImages || hasVariantOptionImages || hasVideo) {
        // Sử dụng FormData để tải lên tệp tin với S3
        const submitData = new FormData();
        submitData.append('title', formData.title);
        submitData.append('type', formData.type);
        submitData.append('status', formData.status);
        submitData.append('product_type', formData.product_type);

        // Thêm các trường cụ thể theo loại sản phẩm
        if (formData.price) submitData.append('price', String(formData.price));
        if (formData.sale_price) submitData.append('sale_price', String(formData.sale_price));
        if (formData.short_description) submitData.append('short_description', formData.short_description);
        if (formData.detail_description) submitData.append('detail_description', formData.detail_description);
        if (formData.categories) submitData.append('categories', formData.categories);

        // Xử lý thuộc tính với hình ảnh tùy chọn
        if (formData.attributes && formData.attributes.length > 0) {
          // Xử lý thuộc tính để tách dữ liệu tệp tin khỏi dữ liệu JSON
          const attributesForJson = (formData.attributes as any[]).map((attr: any, attrIndex: number) => ({
            name: attr.name,
            options: attr.options.map((opt: any, optIndex: number) => {
              const optionData: any = {
                value: opt.value,
              };
              if (opt.price) optionData.price = opt.price;
              // Đánh dấu rằng tùy chọn này có tệp hình ảnh sẽ được tải lên riêng
              if (opt.image instanceof File) {
                optionData.image_key = `attr_${attrIndex}_opt_${optIndex}`;
              } else if (typeof opt.image === 'string' && opt.image) {
                optionData.image = opt.image;
              }
              return optionData;
            }),
          }));
          submitData.append('attributes', JSON.stringify(attributesForJson));

          // Thêm hình ảnh tùy chọn biến thể như các tệp tin riêng biệt
          (formData.attributes as any[]).forEach((attr: any, attrIndex: number) => {
            attr.options.forEach((opt: any, optIndex: number) => {
              if (opt.image instanceof File) {
                submitData.append(`variant_option_images[attr_${attrIndex}_opt_${optIndex}]`, opt.image);
              }
            });
          });
        }

          // Xử lý main_image
          if (hasMainImage) {
            submitData.append('main_image', formData.main_image as File);
          }

          // Xử lý other_images
          if (hasOtherImages) {
            formData.other_images.forEach((img, index) => {
              if (img instanceof File) {
                submitData.append(`other_images[${index}]`, img);
              }
            });
          }

          // Xử lý tệp tải xuống
          if (hasDownloadFile) {
            const downloadFileObj = formData.download_files as any;
            submitData.append('download_files[name]', downloadFileObj.name);
            submitData.append('download_files[file]', downloadFileObj.file);
          }

          if (formData.link_files && formData.link_files.length > 0) {
            submitData.append('link_files', JSON.stringify(formData.link_files));
          }

          // Thêm nhiều hình ảnh
          featuredImages.forEach((image) => {
            submitData.append('featured_images[]', image);
          });

          // Thêm video (uploading through server for background processing)
          if (hasVideo) {
            submitData.append('video', selectedVideo);
          }

          const createResponse = await shopPosts.create(shopId, submitData);

          // Store post ID for polling if video was uploaded
          if (createResponse.post && hasVideo) {
            setCreatedPostId(createResponse.post.id);
          }

          alert('Tạo bài viết thành công!');
          router.push(`/shops/${shopId}/posts`);
      } else {
        // Sử dụng JSON thông thường cho bài viết chỉ có văn bản
        const submitFormData = {
          ...formData,
          price: formData.price ? String(formData.price) : undefined,
          sale_price: formData.sale_price ? String(formData.sale_price) : undefined,
          download_files: null,
        };
        await shopPosts.create(shopId, submitFormData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Lỗi khi tạo bài viết:', error);
      if (error instanceof ApiException) {
        alert(`Không thể tạo bài viết: ${error.message}`);
      } else {
        alert('Không thể tạo bài viết');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-grey-200 rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Tạo bài viết/Trang mới</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập tiêu đề"
              />
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Loại sản phẩm *
              </label>
              <div className="space-y-3">
                {/* Simple Product */}
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="product_type_simple"
                    name="product_type"
                    value="Đơn giản"
                    checked={formData.product_type === 'Đơn giản'}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="product_type_simple" className="ml-3 cursor-pointer flex-1">
                    <div className="font-medium text-gray-900">🛍️ Sản phẩm đơn giản</div>
                    <p className="text-xs text-gray-500">Sản phẩm tiêu chuẩn với giá cả, hình ảnh, mô tả và danh mục</p>
                  </label>
                </div>

                {/* Variant Product */}
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="product_type_variant"
                    name="product_type"
                    value="Biến thể"
                    checked={formData.product_type === 'Biến thể'}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="product_type_variant" className="ml-3 cursor-pointer flex-1">
                    <div className="font-medium text-gray-900">🎨 Sản phẩm biến thể</div>
                    <p className="text-xs text-gray-500">Sản phẩm với thuộc tính (Kích thước, Màu sắc, Chất liệu, v.v.) và nhiều tùy chọn</p>
                  </label>
                </div>

                {/* Download Product */}
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="product_type_download"
                    name="product_type"
                    value="Tải xuống"
                    checked={formData.product_type === 'Tải xuống'}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="product_type_download" className="ml-3 cursor-pointer flex-1">
                    <div className="font-medium text-gray-900">📥 Sản phẩm tải xuống</div>
                    <p className="text-xs text-gray-500">Sản phẩm kỹ thuật số với tệp tải xuống và liên kết ngoài</p>
                  </label>
                </div>
              </div>
            </div>

            {/* Product Type Specific Components */}
            {formData.product_type === 'Đơn giản' && (
              <SimpleProductComponent formData={formData} onFormDataChange={handleFormDataChange} />
            )}

            {formData.product_type === 'Biến thể' && (
              <VariantProductComponent formData={formData} onFormDataChange={handleFormDataChange} />
            )}

            {formData.product_type === 'Tải xuống' && (
              <DownloadProductComponent formData={formData} onFormDataChange={handleFormDataChange} />
            )}

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Loại *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="post">Bài viết</option>
                <option value="page">Trang</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Đã xuất bản</option>
              </select>
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

              {/* Video preview */}
              {videoPreview ? (
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
              ) : (
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
                    disabled={loading}
                  />
                </label>
              )}
            </div>

            {/* Video Processing Status Banner */}
            {videoProcessingStatus !== 'idle' && (
              <div className={`rounded-lg p-4 border ${
                videoProcessingStatus === 'completed' ? 'bg-green-50 border-green-400 text-green-800' :
                videoProcessingStatus === 'failed'    ? 'bg-red-50 border-red-400 text-red-800' :
                'bg-blue-50 border-blue-400 text-blue-800'
              }`}>
                {videoProcessingStatus === 'uploading' && (
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    <div>
                      <p className="font-semibold">Đang tải video lên…</p>
                      <p className="text-sm">Vui lòng đợi, không đóng trang này.</p>
                    </div>
                  </div>
                )}
                {videoProcessingStatus === 'processing' && (
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    <div>
                      <p className="font-semibold">Bài viết đã được tạo ✓ — Đang xử lý video…</p>
                      <p className="text-sm">Video đang được tải lên S3. Trang sẽ tự động chuyển hướng khi hoàn tất.</p>
                    </div>
                  </div>
                )}
                {videoProcessingStatus === 'completed' && (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-semibold">Video đã được tải lên thành công!</p>
                      <p className="text-sm">Đang chuyển hướng về danh sách bài viết…</p>
                    </div>
                  </div>
                )}
                {videoProcessingStatus === 'failed' && (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">❌</span>
                    <div>
                      <p className="font-semibold">Lỗi khi xử lý video</p>
                      <p className="text-sm">{videoProcessingError || 'Đã xảy ra lỗi khi tải video lên.'}</p>
                      <p className="text-sm mt-1">Bài viết đã được tạo, bạn có thể thử tải lại video từ trang chỉnh sửa.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || videoProcessingStatus === 'uploading' || videoProcessingStatus === 'processing' || videoProcessingStatus === 'completed'}
                className="px-6 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Đang tạo...' : 'Tạo'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/shops/${shopId}/posts`)}
                className="px-6 py-2 bg-blue-500 text-gray-700 rounded-md hover:bg-blue-300 transition-colors"
              >
                Hủy
              </button>
            </div>
          </form>

          {/* Tham khảo sản phẩm biến thể - Hiển thị các sản phẩm biến thể hiện có làm ví dụ */}
          <VariantProductsReference shopId={shopId} />
        </div>
      </div>
    </div>
  );
}
