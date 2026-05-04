'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { shopPosts, type ShopPost } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleProductComponent } from '@/app/shops/[id]/posts/create/SimpleProductComponent';
import { VariantProductComponent } from '@/app/shops/[id]/posts/create/VariantProductComponent';
import { DownloadProductComponent } from '@/app/shops/[id]/posts/create/DownloadProductComponent';

export default function EditShopPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const shopId = Number(params.id);
  const postId = Number(params.postId);

  const [post, setPost] = useState<ShopPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'post' as 'post' | 'page',
    status: 'draft' as 'draft' | 'published',
    product_type: '' as string,
    price: '',
    sale_price: '',
    short_description: '',
    detail_description: '',
    categories: '',
    attributes: [] as any[],
    download_files: null as any,
    link_files: [] as any[],
    main_image: '' as string | File,
    other_images: [] as (string | File)[],
  });

  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [existingVideo, setExistingVideo] = useState<string | null>(null);
  const [removeExistingVideo, setRemoveExistingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [shopId, postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      let postData = await shopPosts.getById(shopId, postId);
      // Xử lý cả ShopPost trực tiếp và phản hồi được gói gọn
      if (postData && typeof postData === 'object' && 'data' in postData) {
        postData = (postData as any).data;
      }
      setPost(postData);
      setFormData({
        title: postData.title,
        type: postData.type,
        status: postData.status,
        product_type: postData.product_type || '',
        price: (postData.price ? String(postData.price) : ''),
        sale_price: (postData.sale_price ? String(postData.sale_price) : ''),
        short_description: postData.short_description || '',
        detail_description: postData.detail_description || '',
        categories: Array.isArray(postData.categories) ? postData.categories.join(', ') : postData.categories || '',
        attributes: postData.attributes || [],
        download_files: postData.download_files || null,
        link_files: postData.link_files || [],
        main_image: postData.main_image || '',
        other_images: (postData as any).other_images || [],
      });
      // Đặt hình ảnh hiện có từ bài viết
      setExistingImages(postData.featured_images || []);
      // Đặt video hiện có nếu có
      if (postData.video) {
        setExistingVideo(postData.video);
      }
    } catch (error) {
      console.error('Lỗi khi tải bài viết:', error);
      alert('Không thể tải bài viết');
      router.push(`/shops/${shopId}/posts`);
    } finally {
      setLoading(false);
    }
  };

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
      setNewImages((prev) => [...prev, ...files]);

      // Tạo xem trước
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imagePath: string) => {
    setExistingImages((prev) => prev.filter((img) => img !== imagePath));
    setImagesToRemove((prev) => [...prev, imagePath]);
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

    // Xóa xem trước video trước đó
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }

    setSelectedVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    setVideoError(null);
    // Nếu thêm video mới, đánh dấu video hiện có để xóa
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Bạn phải đăng nhập để sửa bài viết');
      return;
    }

    if (!formData.title.trim()) {
      alert('Vui lòng nhập tiêu đề');
      return;
    }

    try {
      setSaving(true);

      // Tạo FormData để tải lên tệp tin
      const submitData = new FormData();
      submitData.append('_method', 'PUT'); // Giả lập phương thức Laravel
      submitData.append('title', formData.title);
      submitData.append('type', formData.type);
      submitData.append('status', formData.status);

      // Thêm các trường cụ thể theo sản phẩm
      if (formData.product_type) {
        submitData.append('product_type', formData.product_type);
      }
      if (formData.price) {
        submitData.append('price', formData.price.toString());
      }
      if (formData.sale_price) {
        submitData.append('sale_price', formData.sale_price.toString());
      }
      if (formData.short_description) {
        submitData.append('short_description', formData.short_description);
      }
      if (formData.detail_description) {
        submitData.append('detail_description', formData.detail_description);
      }
      if (formData.categories) {
        submitData.append('categories', JSON.stringify(
          typeof formData.categories === 'string'
            ? formData.categories.split(',').map(cat => cat.trim()).filter(Boolean)
            : formData.categories
        ));
      }
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

        // Thêm hình ảnh tùy chọn biến thể như các tệp tin riêng biệt
        (formData.attributes as any[]).forEach((attr: any, attrIndex: number) => {
          attr.options.forEach((opt: any, optIndex: number) => {
            if (opt.image instanceof File) {
              submitData.append(`variant_option_images[attr_${attrIndex}_opt_${optIndex}]`, opt.image);
            }
          });
        });
      }
      if (formData.download_files && (formData.download_files as any).file) {
        const downloadFileObj = formData.download_files as any;
        submitData.append('download_files[name]', downloadFileObj.name);
        submitData.append('download_files[file]', downloadFileObj.file);
      }
      if (formData.link_files && formData.link_files.length > 0) {
        submitData.append('link_files', JSON.stringify(formData.link_files));
      }

      // Xử lý main_image
      if (formData.main_image && formData.main_image instanceof File) {
        submitData.append('main_image', formData.main_image);
      }

      // Xử lý other_images
      if (formData.other_images && formData.other_images.length > 0) {
        formData.other_images.forEach((img, index) => {
          if (img instanceof File) {
            submitData.append(`other_images[${index}]`, img);
          }
        });
      }

      // Thêm hình ảnh mới
      newImages.forEach((image) => {
        submitData.append('featured_images[]', image);
      });

      // Thêm hình ảnh để xóa
      imagesToRemove.forEach((imagePath) => {
        submitData.append('remove_images[]', imagePath);
      });

      // Thêm video nếu có
      if (selectedVideo) {
        submitData.append('video', selectedVideo);
      }

      // Thêm cờ remove_video nếu cần
      if (removeExistingVideo && !selectedVideo) {
        submitData.append('remove_video', '1');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shops/${shopId}/posts/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('api_token')}`,
          'Accept': 'application/json',
        },
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Không thể cập nhật bài viết');
      }

      alert('Cập nhật bài viết thành công!');
      router.push(`/shops/${shopId}/posts`);
    } catch (error) {
      console.error('Lỗi khi cập nhật bài viết:', error);
      alert('Không thể cập nhật bài viết');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${post?.title}" không?`)) {
      return;
    }

    try {
      await shopPosts.delete(shopId, postId);
      alert('Xóa bài viết thành công!');
      router.push(`/shops/${shopId}/posts`);
    } catch (error) {
      console.error('Lỗi khi xóa bài viết:', error);
      alert('Không thể xóa bài viết');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Đang tải...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600">Không tìm thấy bài viết</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-grey-200 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Sửa {post.type === 'post' ? 'Bài viết' : 'Trang'}</h1>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 transition-colors"
            >
              Xóa
            </button>
          </div>

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
                      disabled={saving}
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
                      disabled={saving}
                    >
                      ×
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {selectedVideo?.name} ({((selectedVideo?.size || 0) / 1024 / 1024).toFixed(1)} MB)
                    </div>
                  </div>
                </div>
              )}

              {/* Nhập tải lên video - chỉ hiển thị khi không có video hiện có và không có xem trước video mới */}
              {!videoPreview && (!existingVideo || removeExistingVideo) && (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <span className="text-3xl mb-2">🎬</span>
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Nhấn để tải lên video</span>
                    </p>
                    <p className="text-xs text-gray-500">MP4 (tối đa 100MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleVideoChange}
                    accept="video/mp4,.mp4"
                    disabled={saving}
                  />
                </label>
              )}
            </div>

            {/* Product Type Components */}
            {post.product_type === 'Đơn giản' && (
              <SimpleProductComponent
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />
            )}

            {post.product_type === 'Biến thể' && (
              <VariantProductComponent
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />
            )}

            {post.product_type === 'Tải xuống' && (
              <DownloadProductComponent
                formData={formData}
                onFormDataChange={handleFormDataChange}
              />
            )}

            {/* Thông tin bài viết */}
            <div className="bg-white p-4 rounded-md">
              <div className="text-sm text-gray-600 space-y-1">
                <p>Lượt xem: {post.view_count}</p>
                <p>Ngày tạo: {new Date(post.created_at).toLocaleDateString('vi-VN')}</p>
                <p>Cập nhật lần cuối: {new Date(post.updated_at).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
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
        </div>
      </div>
    </div>
  );
}
