'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups as groupsApi, ApiException } from '@/lib/api';

export default function CreateGroupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    visibility: 'public' as const,
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.group_name.trim()) {
      setError('Tên nhóm là bắt buộc');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const submitData = new FormData();
      submitData.append('group_name', formData.group_name);
      submitData.append('description', formData.description);
      submitData.append('visibility', formData.visibility);

      if (avatar) {
        submitData.append('avatar', avatar);
      }

      if (coverImage) {
        submitData.append('cover_image', coverImage);
      }

      await groupsApi.store(submitData as any);

      router.push('/groups?message=Tạo nhóm thành công');
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Không thể tạo nhóm. Vui lòng thử lại.');
      }
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/groups" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Quay lại danh sách nhóm
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Tạo nhóm mới</h1>
          <p className="text-gray-600 mt-2">Tạo cộng đồng riêng của bạn và kết nối mọi người</p>
        </div>

        {/* Form */}
        <div className="bg-grey-200 rounded-lg shadow p-6">
          {error && (
            <div className="mb-6 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên nhóm *
              </label>
              <input
                type="text"
                name="group_name"
                value={formData.group_name}
                onChange={handleInputChange}
                placeholder="Nhập tên nhóm"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Mô tả về nhóm của bạn (tùy chọn)"
                rows={4}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000</p>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hiển thị
              </label>
              <select
                name="visibility"
                value={formData.visibility}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500"
              >
                <option value="public">Công khai - Ai cũng có thể tham gia</option>
                <option value="private">Riêng tư - Chỉ mời</option>
              </select>
            </div>

            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh đại diện nhóm
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={loading}
                  className="hidden"
                  id="avatar-input"
                />
                <label
                  htmlFor="avatar-input"
                  className={`cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {avatarPreview ? (
                    <div className="flex flex-col items-center">
                      <img src={avatarPreview} alt="Xem trước ảnh đại diện" className="w-24 h-24 rounded-full object-cover mb-2" />
                      <p className="text-sm text-blue-600">Nhấn để thay đổi</p>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="w-12 h-12 mx-auto mb-2 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấn để tải ảnh đại diện</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh bìa
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  disabled={loading}
                  className="hidden"
                  id="cover-input"
                />
                <label
                  htmlFor="cover-input"
                  className={`cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {coverPreview ? (
                    <div className="flex flex-col items-center">
                      <img src={coverPreview} alt="Xem trước ảnh bìa" className="w-full max-h-32 object-cover rounded mb-2" />
                      <p className="text-sm text-blue-600">Nhấn để thay đổi</p>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="w-12 h-12 mx-auto mb-2 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm text-gray-600">Nhấn để tải ảnh bìa</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-300">
              <Link
                href="/groups"
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition-colors"
              >
                Hủy
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang tạo...
                  </>
                ) : (
                  'Tạo nhóm'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
