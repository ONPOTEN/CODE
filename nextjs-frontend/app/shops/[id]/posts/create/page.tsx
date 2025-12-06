'use client';

import { useState } from 'react';
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
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      // Check if we have any file uploads (featured images, main_image, other_images, download file, video, or variant option images)
      const hasDownloadFile = formData.download_files && (formData.download_files as any).file;
      const hasMainImage = formData.main_image && formData.main_image instanceof File;
      const hasOtherImages = formData.other_images && formData.other_images.some((img) => img instanceof File);
      const hasVideo = selectedVideo !== null;

      // Check if any variant option has an image file
      const hasVariantOptionImages = formData.attributes && (formData.attributes as any[]).some((attr: any) =>
        attr.options && attr.options.some((opt: any) => opt.image instanceof File)
      );

      if (featuredImages.length > 0 || hasDownloadFile || hasMainImage || hasOtherImages || hasVariantOptionImages || hasVideo) {
        // Use FormData for file uploads with S3
        const submitData = new FormData();
        submitData.append('title', formData.title);
        submitData.append('type', formData.type);
        submitData.append('status', formData.status);
        submitData.append('product_type', formData.product_type);

        // Add product type specific fields
        if (formData.price) submitData.append('price', String(formData.price));
        if (formData.sale_price) submitData.append('sale_price', String(formData.sale_price));
        if (formData.short_description) submitData.append('short_description', formData.short_description);
        if (formData.detail_description) submitData.append('detail_description', formData.detail_description);
        if (formData.categories) submitData.append('categories', formData.categories);

        // Handle attributes with option images
        if (formData.attributes && formData.attributes.length > 0) {
          // Process attributes to separate file data from JSON data
          const attributesForJson = (formData.attributes as any[]).map((attr: any, attrIndex: number) => ({
            name: attr.name,
            options: attr.options.map((opt: any, optIndex: number) => {
              const optionData: any = {
                value: opt.value,
              };
              if (opt.price) optionData.price = opt.price;
              // Mark that this option has an image file that will be uploaded separately
              if (opt.image instanceof File) {
                optionData.image_key = `attr_${attrIndex}_opt_${optIndex}`;
              } else if (typeof opt.image === 'string' && opt.image) {
                optionData.image = opt.image;
              }
              return optionData;
            }),
          }));
          submitData.append('attributes', JSON.stringify(attributesForJson));

          // Append variant option images as separate files
          (formData.attributes as any[]).forEach((attr: any, attrIndex: number) => {
            attr.options.forEach((opt: any, optIndex: number) => {
              if (opt.image instanceof File) {
                submitData.append(`variant_option_images[attr_${attrIndex}_opt_${optIndex}]`, opt.image);
              }
            });
          });
        }

        // Handle main_image
        if (hasMainImage) {
          submitData.append('main_image', formData.main_image as File);
        }

        // Handle other_images
        if (hasOtherImages) {
          formData.other_images.forEach((img, index) => {
            if (img instanceof File) {
              submitData.append(`other_images[${index}]`, img);
            }
          });
        }

        // Handle download file
        if (hasDownloadFile) {
          const downloadFileObj = formData.download_files as any;
          submitData.append('download_files[name]', downloadFileObj.name);
          submitData.append('download_files[file]', downloadFileObj.file);
        }

        if (formData.link_files && formData.link_files.length > 0) {
          submitData.append('link_files', JSON.stringify(formData.link_files));
        }

        // Append multiple images
        featuredImages.forEach((image) => {
          submitData.append('featured_images[]', image);
        });

        // Append video if provided
        if (selectedVideo) {
          submitData.append('video', selectedVideo);
        }

        await shopPosts.create(shopId, submitData);
      } else {
        // Use regular JSON for text-only posts
        const submitFormData = {
          ...formData,
          price: formData.price ? String(formData.price) : undefined,
          sale_price: formData.sale_price ? String(formData.sale_price) : undefined,
          download_files: null,
        };
        await shopPosts.create(shopId, submitFormData);
      }

      alert('Tạo bài viết thành công!');
      router.push(`/shops/${shopId}/posts`);
    } catch (error) {
      console.error('Error creating post:', error);
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
                  />
                </label>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
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

          {/* Variant Products Reference - Shows existing variant products as examples */}
          <VariantProductsReference shopId={shopId} />
        </div>
      </div>
    </div>
  );
}
