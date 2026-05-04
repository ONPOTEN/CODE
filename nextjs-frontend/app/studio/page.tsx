'use client';

import { useState } from 'react';

export default function StudioPage() {
  const [formData, setFormData] = useState({
    width: '',
    length: '',
    bedrooms: '',
    bathrooms: '',
    package: '',
    phone: '',
    email: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate form submission
    // In production, you'd send this to your WordPress API or backend
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);

      // Reset form
      setFormData({
        width: '',
        length: '',
        bedrooms: '',
        bathrooms: '',
        package: '',
        phone: '',
        email: '',
      });

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto bg-grey-200 rounded-sm shadow-sm p-8">
        <h1 className="text-2xl font-medium mb-6">Đặt dịch vụ thiết kế mặt bằng</h1>

        {success && (
          <div className="mb-6 p-4 bg-blue-500 text-green-700 rounded-sm">
            Đặt dịch vụ thành công! Chúng tôi sẽ liên hệ với bạn sớm.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Chiều rộng (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="width"
                value={formData.width}
                onChange={handleChange}
                step="0.1"
                placeholder="Ví dụ: 8.5"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Chiều dài (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="length"
                value={formData.length}
                onChange={handleChange}
                step="0.1"
                placeholder="Ví dụ: 12.5"
                required
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Số phòng ngủ <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                min="1"
                max="10"
                placeholder="Ví dụ: 3"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Số nhà vệ sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                min="1"
                max="10"
                placeholder="Ví dụ: 2"
                required
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Chọn gói <span className="text-red-500">*</span>
            </label>
            <select
              name="package"
              value={formData.package}
              onChange={handleChange}
              required
              className="input-field"
            >
              <option value="">-- Chọn gói --</option>
              <option value="Cấp 4 - 299k">Cấp 4 – 299.000đ</option>
              <option value="Nhà >2 tầng - 499k">Nhà &gt;2 tầng – 499.000đ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              pattern="[0-9\s\+\-]{9,15}"
              placeholder="Ví dụ: 0987 654 321"
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Email của bạn <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ví dụ: email@domain.com"
              required
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-secondary disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Đặt dịch vụ ngay'}
          </button>
        </form>

        <div className="mt-8 p-6 bg-white rounded-sm">
          <h3 className="font-medium mb-2">Lưu ý:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ</li>
            <li>Thời gian hoàn thành: 3-5 ngày làm việc</li>
            <li>Bạn có thể tự tạo ảnh 3D nhà và xem phong thủy miễn phí tại studio</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
