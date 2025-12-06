'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { shops, ApiException } from '@/lib/api';

export default function CreateShopPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');

  // 5 image fields (Vietnamese labels)
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null, null, null]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(['', '', '', '', '']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const preview = URL.createObjectURL(file);
      setLogoPreview(preview);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      const preview = URL.createObjectURL(file);
      setBannerPreview(preview);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview('');
  };

  const removeBanner = () => {
    setBannerFile(null);
    if (bannerPreview.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreview);
    }
    setBannerPreview('');
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFiles = [...imageFiles];
      newFiles[index] = file;
      setImageFiles(newFiles);

      const preview = URL.createObjectURL(file);
      const newPreviews = [...imagePreviews];
      newPreviews[index] = preview;
      setImagePreviews(newPreviews);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles[index] = null;
    setImageFiles(newFiles);

    if (imagePreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    const newPreviews = [...imagePreviews];
    newPreviews[index] = '';
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check if we have file uploads
      const hasImages = logoFile || bannerFile || imageFiles.some(f => f !== null);
      if (hasImages) {
        // Use FormData for file uploads
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          data.append(key, value);
        });
        if (logoFile) {
          data.append('logo', logoFile);
        }
        if (bannerFile) {
          data.append('banner', bannerFile);
        }
        // Add 5 images to FormData
        imageFiles.forEach((file, index) => {
          if (file) {
            data.append(`image_${index + 1}`, file);
          }
        });
        await shops.create(data);
      } else {
        // Use regular JSON for text-only updates
        await shops.create(formData);
      }

      alert('Tạo cửa hàng thành công!');
      router.push('/shops');
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Không thể tạo cửa hàng. Vui lòng thử lại.');
      }
      console.error('Error creating shop:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tạo cửa hàng mới</h1>
          <Link
            href="/shops"
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-grey-200 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-grey-200 rounded-lg shadow p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Thông tin cơ bản
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Tên cửa hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Giới thiệu về cửa hàng của bạn..."
                  />
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                </svg>
                Hình ảnh cửa hàng
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Logo Upload */}
                <div>
                  <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                    Logo cửa hàng (Ảnh đại diện)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="logo"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <label htmlFor="logo" className="cursor-pointer">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấp để tải lên logo</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG tối đa 2MB</p>
                    </label>
                  </div>
                  {logoPreview && (
                    <div className="mt-4">
                      <div className="relative inline-block">
                        <img src={logoPreview} alt="Logo preview" className="h-32 w-32 object-cover rounded-lg border border-gray-300" />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Banner Upload */}
                <div>
                  <label htmlFor="banner" className="block text-sm font-medium text-gray-700 mb-2">
                    Ảnh bìa cửa hàng
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="banner"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                    <label htmlFor="banner" className="cursor-pointer">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấp để tải lên ảnh bìa</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG tối đa 5MB</p>
                    </label>
                  </div>
                  {bannerPreview && (
                    <div className="mt-4">
                      <div className="relative inline-block w-full">
                        <img src={bannerPreview} alt="Banner preview" className="w-full h-40 object-cover rounded-lg border border-gray-300" />
                        <button
                          type="button"
                          onClick={removeBanner}
                          className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Images Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                </svg>
                Thông Tin Cửa Hàng
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Image 1: Giay DKKD */}
                <div>
                  <label htmlFor="image-0" className="block text-sm font-medium text-gray-700 mb-2">
                    Giấy DKKD
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="image-0"
                      accept="image/*"
                      onChange={(e) => handleImageChange(0, e)}
                      className="hidden"
                    />
                    <label htmlFor="image-0" className="cursor-pointer">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấp để tải lên</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG tối đa 5MB</p>
                    </label>
                  </div>
                  {imagePreviews[0] && (
                    <div className="mt-4">
                      <div className="relative inline-block w-full">
                        <img src={imagePreviews[0]} alt="Preview 1" className="w-full h-40 object-cover rounded-lg border border-gray-300" />
                        <button
                          type="button"
                          onClick={() => removeImage(0)}
                          className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image 2: Anh Bang Hieu */}
                <div>
                  <label htmlFor="image-1" className="block text-sm font-medium text-gray-700 mb-2">
                    Ảnh Bảng Hiệu
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="image-1"
                      accept="image/*"
                      onChange={(e) => handleImageChange(1, e)}
                      className="hidden"
                    />
                    <label htmlFor="image-1" className="cursor-pointer">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấp để tải lên</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG tối đa 5MB</p>
                    </label>
                  </div>
                  {imagePreviews[1] && (
                    <div className="mt-4">
                      <div className="relative inline-block w-full">
                        <img src={imagePreviews[1]} alt="Preview 2" className="w-full h-40 object-cover rounded-lg border border-gray-300" />
                        <button
                          type="button"
                          onClick={() => removeImage(1)}
                          className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image 3: Anh Gian Hang */}
                <div>
                  <label htmlFor="image-2" className="block text-sm font-medium text-gray-700 mb-2">
                    Ảnh Gian Hàng
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="image-2"
                      accept="image/*"
                      onChange={(e) => handleImageChange(2, e)}
                      className="hidden"
                    />
                    <label htmlFor="image-2" className="cursor-pointer">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấp để tải lên</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG tối đa 5MB</p>
                    </label>
                  </div>
                  {imagePreviews[2] && (
                    <div className="mt-4">
                      <div className="relative inline-block w-full">
                        <img src={imagePreviews[2]} alt="Preview 3" className="w-full h-40 object-cover rounded-lg border border-gray-300" />
                        <button
                          type="button"
                          onClick={() => removeImage(2)}
                          className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image 4: Anh Cua Hang */}
                <div>
                  <label htmlFor="image-3" className="block text-sm font-medium text-gray-700 mb-2">
                    Ảnh Cửa Hàng
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="image-3"
                      accept="image/*"
                      onChange={(e) => handleImageChange(3, e)}
                      className="hidden"
                    />
                    <label htmlFor="image-3" className="cursor-pointer">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấp để tải lên</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG tối đa 5MB</p>
                    </label>
                  </div>
                  {imagePreviews[3] && (
                    <div className="mt-4">
                      <div className="relative inline-block w-full">
                        <img src={imagePreviews[3]} alt="Preview 4" className="w-full h-40 object-cover rounded-lg border border-gray-300" />
                        <button
                          type="button"
                          onClick={() => removeImage(3)}
                          className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image 5: Giay Chung Nhan */}
                <div>
                  <label htmlFor="image-4" className="block text-sm font-medium text-gray-700 mb-2">
                    Giấy Chứng Nhận (Nếu Có)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      id="image-4"
                      accept="image/*"
                      onChange={(e) => handleImageChange(4, e)}
                      className="hidden"
                    />
                    <label htmlFor="image-4" className="cursor-pointer">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l5.172 5.172m-9-9l1.414-1.414a2 2 0 012.828 0L19 12m-5-5l1.414-1.414a2 2 0 012.828 0L21 8" />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấp để tải lên</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG tối đa 5MB</p>
                    </label>
                  </div>
                  {imagePreviews[4] && (
                    <div className="mt-4">
                      <div className="relative inline-block w-full">
                        <img src={imagePreviews[4]} alt="Preview 5" className="w-full h-40 object-cover rounded-lg border border-gray-300" />
                        <button
                          type="button"
                          onClick={() => removeImage(4)}
                          className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Thông tin liên hệ
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="shop@example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                    Trang web
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="https://yourshop.com"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Địa chỉ
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ đường
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="123 Đường ABC"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    Thành phố
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Hồ Chí Minh"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    Tỉnh/Thành phố
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="TP.HCM"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Quốc gia
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Việt Nam"
                  />
                </div>

                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Mã bưu chính
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="700000"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang tạo...' : 'Tạo cửa hàng'}
              </button>
              <Link
                href="/shops"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors"
              >
                Hủy
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
