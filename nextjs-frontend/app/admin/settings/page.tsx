'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { settings, ImageSettings, VideoSettings } from '@/lib/api';

export default function AdminSettingsPage() {
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Image settings
  const [imageSettings, setImageSettings] = useState<ImageSettings>({
    image_width: 1200,
    image_height: 1200,
    image_quality: 80,
    max_file_size: 10,
  });

  // Video settings
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    video_width: 1920,
    video_height: 1080,
    video_max_file_size: 100,
  });

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [imageResponse, videoResponse] = await Promise.all([
        settings.getImageSettings(),
        settings.getVideoSettings(),
      ]);

      if (imageResponse.success && imageResponse.data) {
        setImageSettings(imageResponse.data);
      }
      if (videoResponse.success && videoResponse.data) {
        setVideoSettings(videoResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setMessage({ type: 'error', text: 'Không thể tải cài đặt' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!authLoading && !isAdmin(currentUser)) {
      router.push('/');
      return;
    }

    if (!authLoading && isAuthenticated && isAdmin(currentUser)) {
      fetchSettings();
    }
  }, [isAuthenticated, authLoading, currentUser, router, fetchSettings]);

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const [imageResponse, videoResponse] = await Promise.all([
        settings.updateImageSettings({
          image_width: imageSettings.image_width,
          image_height: imageSettings.image_height,
          image_quality: imageSettings.image_quality,
          max_file_size: imageSettings.max_file_size,
        }),
        settings.updateVideoSettings({
          video_width: videoSettings.video_width,
          video_height: videoSettings.video_height,
          video_max_file_size: videoSettings.video_max_file_size,
        }),
      ]);

      if (imageResponse.success && videoResponse.success) {
        setMessage({ type: 'success', text: 'Đã lưu cài đặt thành công!' });
      } else {
        setMessage({ type: 'error', text: 'Không thể lưu cài đặt' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Không thể lưu cài đặt. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  // Handle image input change
  const handleImageChange = (field: keyof ImageSettings, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setImageSettings((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  // Handle video input change
  const handleVideoChange = (field: keyof VideoSettings, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setVideoSettings((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin(currentUser)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cài đặt hệ thống</h1>
            <p className="text-gray-600 mt-2">Quản lý các cài đặt chung của hệ thống</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 'bg-red-100 text-red-700 border border-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image Settings Card */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Cài đặt hình ảnh
                </h2>
                <p className="text-sm text-gray-600 mt-1">Cấu hình kích thước và chất lượng hình ảnh upload</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Image Width */}
                <div>
                  <label htmlFor="image_width" className="block text-sm font-medium text-gray-700 mb-2">
                    Chiều rộng tối đa (pixels)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      id="image_width"
                      value={imageSettings.image_width}
                      onChange={(e) => handleImageChange('image_width', e.target.value)}
                      min="100"
                      max="4096"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500 w-24">100 - 4096 px</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Hình ảnh sẽ được resize nếu chiều rộng vượt quá giá trị này</p>
                </div>

                {/* Image Height */}
                <div>
                  <label htmlFor="image_height" className="block text-sm font-medium text-gray-700 mb-2">
                    Chiều cao tối đa (pixels)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      id="image_height"
                      value={imageSettings.image_height}
                      onChange={(e) => handleImageChange('image_height', e.target.value)}
                      min="100"
                      max="4096"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500 w-24">100 - 4096 px</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Hình ảnh sẽ được resize nếu chiều cao vượt quá giá trị này</p>
                </div>

                {/* Image Quality */}
                <div>
                  <label htmlFor="image_quality" className="block text-sm font-medium text-gray-700 mb-2">
                    Chất lượng hình ảnh (%)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      id="image_quality"
                      value={imageSettings.image_quality}
                      onChange={(e) => handleImageChange('image_quality', e.target.value)}
                      min="10"
                      max="100"
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      value={imageSettings.image_quality}
                      onChange={(e) => handleImageChange('image_quality', e.target.value)}
                      min="10"
                      max="100"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Chất lượng nén JPEG/WebP (10-100). Giá trị cao hơn = chất lượng tốt hơn nhưng dung lượng lớn hơn</p>
                </div>

                {/* Max File Size */}
                <div>
                  <label htmlFor="max_file_size" className="block text-sm font-medium text-gray-700 mb-2">
                    Dung lượng tối đa (MB)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      id="max_file_size"
                      value={imageSettings.max_file_size}
                      onChange={(e) => handleImageChange('max_file_size', e.target.value)}
                      min="1"
                      max="100"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500 w-24">1 - 100 MB</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Giới hạn dung lượng file hình ảnh được upload</p>
                </div>
              </div>
            </div>

            {/* Video Settings Card */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Cài đặt video
                </h2>
                <p className="text-sm text-gray-600 mt-1">Cấu hình kích thước và dung lượng video upload</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Video Width */}
                <div>
                  <label htmlFor="video_width" className="block text-sm font-medium text-gray-700 mb-2">
                    Chiều rộng tối đa (pixels)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      id="video_width"
                      value={videoSettings.video_width}
                      onChange={(e) => handleVideoChange('video_width', e.target.value)}
                      min="320"
                      max="4096"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500 w-24">320 - 4096 px</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Video sẽ được resize nếu chiều rộng vượt quá giá trị này</p>
                </div>

                {/* Video Height */}
                <div>
                  <label htmlFor="video_height" className="block text-sm font-medium text-gray-700 mb-2">
                    Chiều cao tối đa (pixels)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      id="video_height"
                      value={videoSettings.video_height}
                      onChange={(e) => handleVideoChange('video_height', e.target.value)}
                      min="240"
                      max="4096"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500 w-24">240 - 4096 px</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Video sẽ được resize nếu chiều cao vượt quá giá trị này</p>
                </div>

                {/* Video Max File Size */}
                <div>
                  <label htmlFor="video_max_file_size" className="block text-sm font-medium text-gray-700 mb-2">
                    Dung lượng tối đa (MB)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      id="video_max_file_size"
                      value={videoSettings.video_max_file_size}
                      onChange={(e) => handleVideoChange('video_max_file_size', e.target.value)}
                      min="1"
                      max="500"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500 w-24">1 - 500 MB</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Giới hạn dung lượng file video được upload</p>
                </div>
              </div>
            </div>

            {/* Preview Card - Image */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Tóm tắt cài đặt hình ảnh</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Chiều rộng</p>
                  <p className="text-2xl font-bold text-gray-900">{imageSettings.image_width}</p>
                  <p className="text-xs text-gray-500">pixels</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Chiều cao</p>
                  <p className="text-2xl font-bold text-gray-900">{imageSettings.image_height}</p>
                  <p className="text-xs text-gray-500">pixels</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Chất lượng</p>
                  <p className="text-2xl font-bold text-gray-900">{imageSettings.image_quality}</p>
                  <p className="text-xs text-gray-500">%</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Max Size</p>
                  <p className="text-2xl font-bold text-gray-900">{imageSettings.max_file_size}</p>
                  <p className="text-xs text-gray-500">MB</p>
                </div>
              </div>
            </div>

            {/* Preview Card - Video */}
            <div className="bg-purple-50 rounded-lg border border-purple-200 p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">Tóm tắt cài đặt video</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Chiều rộng</p>
                  <p className="text-2xl font-bold text-gray-900">{videoSettings.video_width}</p>
                  <p className="text-xs text-gray-500">pixels</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Chiều cao</p>
                  <p className="text-2xl font-bold text-gray-900">{videoSettings.video_height}</p>
                  <p className="text-xs text-gray-500">pixels</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Max Size</p>
                  <p className="text-2xl font-bold text-gray-900">{videoSettings.video_max_file_size}</p>
                  <p className="text-xs text-gray-500">MB</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button
                onClick={fetchSettings}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Hủy thay đổi
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Lưu cài đặt
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
