'use client';

import React, { useState } from 'react';

interface DownloadFile {
  name: string;
  file: File; // Browser File object
  size: string;
}

interface DownloadLink {
  title: string;
  url: string;
}

interface DownloadProductComponentProps {
  formData: {
    price?: string | number;
    sale_price?: string | number;
    short_description?: string;
    detail_description?: string;
    categories?: string;
    download_files?: DownloadFile;
    link_files?: DownloadLink[];
    main_image?: string | File;
    other_images?: (string | File)[];
  };
  onFormDataChange: (field: string, value: any) => void;
}

export const DownloadProductComponent: React.FC<DownloadProductComponentProps> = ({
  formData,
  onFormDataChange,
}) => {
  const [downloadFile, setDownloadFile] = useState<DownloadFile | null>(formData.download_files || null);
  const [linkFiles, setLinkFiles] = useState<DownloadLink[]>(formData.link_files || []);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(
    formData.main_image instanceof File ? URL.createObjectURL(formData.main_image) : (typeof formData.main_image === 'string' ? formData.main_image : null)
  );
  const [otherImagePreviews, setOtherImagePreviews] = useState<string[]>(
    (Array.isArray(formData.other_images) ? formData.other_images : []).map((img) =>
      img instanceof File ? URL.createObjectURL(img) : typeof img === 'string' ? img : ''
    ).filter(Boolean)
  );

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFormDataChange('main_image', file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleOtherImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newOtherImages = [...(formData.other_images || []), ...files];
      onFormDataChange('other_images', newOtherImages);
      setOtherImagePreviews([
        ...otherImagePreviews,
        ...files.map((file) => URL.createObjectURL(file)),
      ]);
    }
  };

  const removeMainImage = () => {
    if (mainImagePreview && mainImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(mainImagePreview);
    }
    setMainImagePreview(null);
    onFormDataChange('main_image', '');
  };

  const removeOtherImage = (index: number) => {
    if (otherImagePreviews[index] && otherImagePreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(otherImagePreviews[index]);
    }
    const newOtherImages = (formData.other_images || []).filter((_, i) => i !== index);
    const newPreviews = otherImagePreviews.filter((_, i) => i !== index);
    onFormDataChange('other_images', newOtherImages);
    setOtherImagePreviews(newPreviews);
  };

  const setDownloadFileData = (file: DownloadFile | null) => {
    setDownloadFile(file);
    onFormDataChange('download_files', file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const uploadedFile = files[0];
    const fileSizeMB = (uploadedFile.size / (1024 * 1024)).toFixed(2);

    const newFile: DownloadFile = {
      name: uploadedFile.name,
      file: uploadedFile,
      size: `${fileSizeMB} MB`,
    };

    setDownloadFileData(newFile);
  };

  const removeDownloadFile = () => {
    setDownloadFileData(null);
  };

  const addLinkFile = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      alert('Vui lòng nhập cả tiêu đề và URL liên kết');
      return;
    }

    const newLink: DownloadLink = {
      title: newLinkTitle,
      url: newLinkUrl,
    };

    const updatedLinks = [...linkFiles, newLink];
    setLinkFiles(updatedLinks);
    onFormDataChange('link_files', updatedLinks);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const removeLinkFile = (index: number) => {
    const updatedLinks = linkFiles.filter((_, i) => i !== index);
    setLinkFiles(updatedLinks);
    onFormDataChange('link_files', updatedLinks);
  };

  return (
    <div className="bg-grey-200 border border-green-200 rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
        📥 Thông tin sản phẩm tải xuống
      </h3>

      <p className="text-sm text-gray-600">
        Thêm mô tả sản phẩm, danh mục, tệp tải xuống và liên kết ngoài cho sản phẩm kỹ thuật số của bạn.
      </p>

      {/* Price */}
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
          Giá
        </label>
        <input
          type="number"
          id="price"
          name="price"
          step="0.01"
          value={formData.price || ''}
          onChange={(e) => onFormDataChange('price', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          placeholder="Nhập giá"
        />
      </div>

      {/* Sale Price */}
      <div>
        <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 mb-2">
          Giá khuyến mãi (Tùy chọn)
        </label>
        <input
          type="number"
          id="sale_price"
          name="sale_price"
          step="0.01"
          value={formData.sale_price || ''}
          onChange={(e) => onFormDataChange('sale_price', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          placeholder="Nhập giá khuyến mãi (để trống nếu không giảm giá)"
        />
        {formData.price && formData.sale_price && (
          <p className="text-sm text-green-600 mt-1">
            Giảm giá: {(((Number(formData.price) - Number(formData.sale_price)) / Number(formData.price)) * 100).toFixed(1)}%
          </p>
        )}
      </div>

      {/* Short Description */}
      <div>
        <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-2">
          Mô tả ngắn
        </label>
        <input
          type="text"
          id="short_description"
          name="short_description"
          value={formData.short_description || ''}
          onChange={(e) => onFormDataChange('short_description', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          placeholder="Tóm tắt ngắn gọn về sản phẩm tải xuống"
          maxLength={255}
        />
        <p className="text-xs text-gray-500 mt-1">
          {(formData.short_description || '').toString().length}/255
        </p>
      </div>

      {/* Detail Description */}
      <div>
        <label htmlFor="detail_description" className="block text-sm font-medium text-gray-700 mb-2">
          Mô tả chi tiết
        </label>
        <textarea
          id="detail_description"
          name="detail_description"
          value={formData.detail_description || ''}
          onChange={(e) => onFormDataChange('detail_description', e.target.value)}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          placeholder="Thông tin chi tiết về sản phẩm tải xuống"
        />
      </div>

      {/* Categories */}
      <div>
        <label htmlFor="categories" className="block text-sm font-medium text-gray-700 mb-2">
          Danh mục (phân cách bằng dấu phẩy)
        </label>
        <input
          type="text"
          id="categories"
          name="categories"
          value={formData.categories || ''}
          onChange={(e) => onFormDataChange('categories', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          placeholder="Ví dụ: Phần mềm, Mẫu, Sách điện tử, Công cụ"
        />
      </div>

      {/* Main Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hình ảnh sản phẩm chính
        </label>
        {mainImagePreview ? (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={mainImagePreview}
                alt="Main product"
                className="w-full h-48 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={removeMainImage}
                className="absolute top-2 right-2 p-2 bg-blue-500 text-gray-900 rounded-full hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-green-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-blue-500 transition-colors">
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <svg className="w-6 h-6 text-green-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs text-green-600">Nhấp để thay đổi hình ảnh</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-green-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-blue-500 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-green-600 font-medium">Tải lên hình ảnh chính</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF tối đa 5MB</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
          </label>
        )}
      </div>

      {/* Other Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hình ảnh bổ sung
        </label>
        {otherImagePreviews.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {otherImagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Image ${index + 1}`}
                    className="w-full h-28 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeOtherImage(index)}
                    className="absolute top-1 right-1 p-1 bg-blue-500 text-gray-900 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-green-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-blue-500 transition-colors">
          <div className="flex flex-col items-center justify-center pt-2 pb-2">
            <svg className="w-6 h-6 text-green-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs text-green-600 font-medium">Nhấp hoặc kéo để thêm hình ảnh</p>
          </div>
          <input type="file" className="hidden" accept="image/*" multiple onChange={handleOtherImagesChange} />
        </label>
      </div>

      {/* Download File Section */}
      <div className="border border-green-300 rounded-lg p-4 bg-grey-200">
        <h4 className="font-medium text-gray-900 mb-4">📁 Tệp tải xuống</h4>

        {/* File Upload Input */}
        {!downloadFile && (
          <div className="space-y-3 mb-4">
            <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
              <label className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">Tải lên tệp</p>
                    <p className="text-xs text-gray-500">Nhấp để chọn hoặc kéo và thả</p>
                  </div>
                </div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Hỗ trợ: Mọi loại tệp (zip, pdf, exe, v.v.)
            </p>
          </div>
        )}

        {/* File Display */}
        {downloadFile && (
          <div className="space-y-3">
            <div className="flex items-start justify-between bg-grey-200 p-4 rounded border border-green-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 16.5a.5.5 0 01-.5-.5v-5H5a.5.5 0 010-1h2.5V4a.5.5 0 011 0v6H11a.5.5 0 010 1h-2.5v5a.5.5 0 01-.5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="font-medium text-gray-900">{downloadFile.name}</p>
                </div>
                <p className="text-xs text-gray-500">Kích thước: {downloadFile.size}</p>
              </div>
              <button
                type="button"
                onClick={removeDownloadFile}
                className="ml-2 px-3 py-1 bg-blue-500 text-gray-900 text-sm rounded hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                Xóa
              </button>
            </div>
            <label className="block">
              <button
                type="button"
                onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                className="w-full px-4 py-2 text-green-600 border border-green-300 rounded-md hover:bg-grey-200 transition-colors font-medium"
              >
                Thay thế tệp
              </button>
            </label>
          </div>
        )}

        {!downloadFile && (
          <p className="text-sm text-gray-500 italic text-center">Chưa chọn tệp nào.</p>
        )}
      </div>

      {/* External Links Section */}
      <div className="border border-green-300 rounded-lg p-4 bg-grey-200">
        <h4 className="font-medium text-gray-900 mb-4">Liên kết ngoài</h4>

        {/* Add Link Form */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            value={newLinkTitle}
            onChange={(e) => setNewLinkTitle(e.target.value)}
            placeholder="Tiêu đề liên kết (ví dụ: Demo trực tiếp)"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
          <input
            type="url"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="URL liên kết (https://...)"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
          <button
            type="button"
            onClick={addLinkFile}
            className="w-full px-4 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Thêm liên kết ngoài
          </button>
        </div>

        {/* Link List */}
        {linkFiles.length > 0 && (
          <div className="space-y-2">
            {linkFiles.map((link, index) => (
              <div key={index} className="flex items-center justify-between bg-grey-200 p-3 rounded border border-green-200">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{link.title}</p>
                  <p className="text-xs text-gray-500">{link.url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLinkFile(index)}
                  className="ml-2 px-3 py-1 bg-blue-500 text-gray-900 text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        )}

        {linkFiles.length === 0 && (
          <p className="text-sm text-gray-500 italic">Chưa thêm liên kết nào.</p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-500 border border-green-300 rounded p-3">
        <p className="text-sm text-green-900">
          📊 Tổng kết: {downloadFile ? `1 tệp (${downloadFile.size})` : '0 tệp'} + {linkFiles.length} liên kết
        </p>
      </div>
    </div>
  );
};
