'use client';

import React, { useState, useRef } from 'react';

interface AttributeOption {
  value: string;
  image?: string | File;
  imagePreview?: string;
  price?: string | number;
}

interface Attribute {
  name: string;
  options: AttributeOption[];
}

interface VariantProductComponentProps {
  formData: {
    price?: string | number;
    sale_price?: string | number;
    short_description?: string;
    detail_description?: string;
    attributes?: Attribute[];
    main_image?: string | File;
    other_images?: (string | File)[];
  };
  onFormDataChange: (field: string, value: any) => void;
}

export const VariantProductComponent: React.FC<VariantProductComponentProps> = ({
  formData,
  onFormDataChange,
}) => {
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeOption, setNewAttributeOption] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [newOptionImage, setNewOptionImage] = useState<File | null>(null);
  const [newOptionImagePreview, setNewOptionImagePreview] = useState<string | null>(null);
  const [selectedAttributeIndex, setSelectedAttributeIndex] = useState<number | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(
    formData.main_image instanceof File ? URL.createObjectURL(formData.main_image) : (typeof formData.main_image === 'string' ? formData.main_image : null)
  );
  const [otherImagePreviews, setOtherImagePreviews] = useState<string[]>(
    (formData.other_images || []).map((img) =>
      img instanceof File ? URL.createObjectURL(img) : typeof img === 'string' ? img : ''
    ).filter(Boolean)
  );
  const optionImageInputRef = useRef<HTMLInputElement>(null);

  const attributes = formData.attributes || [];

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

  const handleAddAttribute = () => {
    if (!newAttributeName.trim()) {
      alert('Vui lòng nhập tên thuộc tính');
      return;
    }

    const newAttribute: Attribute = {
      name: newAttributeName,
      options: [],
    };

    onFormDataChange('attributes', [...attributes, newAttribute]);
    setNewAttributeName('');
    setSelectedAttributeIndex(attributes.length);
  };

  const handleOptionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewOptionImage(file);
      setNewOptionImagePreview(URL.createObjectURL(file));
    }
  };

  const clearNewOptionImage = () => {
    if (newOptionImagePreview && newOptionImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(newOptionImagePreview);
    }
    setNewOptionImage(null);
    setNewOptionImagePreview(null);
    if (optionImageInputRef.current) {
      optionImageInputRef.current.value = '';
    }
  };

  const handleAddOption = () => {
    if (selectedAttributeIndex === null) {
      alert('Vui lòng chọn thuộc tính trước');
      return;
    }

    if (!newAttributeOption.trim()) {
      alert('Vui lòng nhập giá trị tùy chọn');
      return;
    }

    const updatedAttributes = [...attributes];
    const newOption: AttributeOption = {
      value: newAttributeOption,
    };

    // Add price if provided
    if (newOptionPrice.trim()) {
      newOption.price = newOptionPrice;
    }

    // Add image if provided
    if (newOptionImage) {
      newOption.image = newOptionImage;
      newOption.imagePreview = newOptionImagePreview || undefined;
    }

    updatedAttributes[selectedAttributeIndex].options.push(newOption);

    onFormDataChange('attributes', updatedAttributes);
    setNewAttributeOption('');
    setNewOptionPrice('');
    clearNewOptionImage();
  };

  const handleRemoveAttribute = (index: number) => {
    // Clean up image previews for all options in this attribute
    const attrToRemove = attributes[index];
    attrToRemove.options.forEach((opt) => {
      if (opt.imagePreview && opt.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(opt.imagePreview);
      }
    });

    const updatedAttributes = attributes.filter((_, i) => i !== index);
    onFormDataChange('attributes', updatedAttributes);
    if (selectedAttributeIndex === index) {
      setSelectedAttributeIndex(null);
    } else if (selectedAttributeIndex !== null && selectedAttributeIndex > index) {
      setSelectedAttributeIndex(selectedAttributeIndex - 1);
    }
  };

  const handleRemoveOption = (attributeIndex: number, optionIndex: number) => {
    const optionToRemove = attributes[attributeIndex].options[optionIndex];
    if (optionToRemove.imagePreview && optionToRemove.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(optionToRemove.imagePreview);
    }

    const updatedAttributes = [...attributes];
    updatedAttributes[attributeIndex].options = updatedAttributes[attributeIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    onFormDataChange('attributes', updatedAttributes);
  };

  const handleUpdateOptionImage = (attributeIndex: number, optionIndex: number, file: File) => {
    const updatedAttributes = [...attributes];
    const option = updatedAttributes[attributeIndex].options[optionIndex];

    // Clean up old preview
    if (option.imagePreview && option.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(option.imagePreview);
    }

    option.image = file;
    option.imagePreview = URL.createObjectURL(file);
    onFormDataChange('attributes', updatedAttributes);
  };

  const handleRemoveOptionImage = (attributeIndex: number, optionIndex: number) => {
    const updatedAttributes = [...attributes];
    const option = updatedAttributes[attributeIndex].options[optionIndex];

    if (option.imagePreview && option.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(option.imagePreview);
    }

    option.image = undefined;
    option.imagePreview = undefined;
    onFormDataChange('attributes', updatedAttributes);
  };

  const handleUpdateOptionPrice = (attributeIndex: number, optionIndex: number, price: string) => {
    const updatedAttributes = [...attributes];
    updatedAttributes[attributeIndex].options[optionIndex].price = price;
    onFormDataChange('attributes', updatedAttributes);
  };

  const formatPrice = (price: string | number | undefined): string => {
    if (!price) return '';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return '';
    return new Intl.NumberFormat('vi-VN').format(numPrice) + ' ₫';
  };

  return (
    <div className="bg-grey-200 border border-purple-200 rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
        🎨 Thông tin sản phẩm biến thể
      </h3>

      {/* Price */}
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
          Giá gốc
        </label>
        <input
          type="number"
          id="price"
          name="price"
          step="0.01"
          value={formData.price || ''}
          onChange={(e) => onFormDataChange('price', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          placeholder="Nhập giá gốc"
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
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
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
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          placeholder="Tóm tắt ngắn gọn về sản phẩm biến thể"
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
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          placeholder="Thông tin chi tiết về sản phẩm biến thể"
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
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-purple-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <svg className="w-6 h-6 text-purple-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs text-purple-600">Nhấp để thay đổi hình ảnh</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-purple-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-purple-600 font-medium">Tải lên hình ảnh chính</p>
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
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-700 transition-colors"
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
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-purple-50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-2 pb-2">
            <svg className="w-6 h-6 text-purple-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs text-purple-600 font-medium">Nhấp hoặc kéo để thêm hình ảnh</p>
          </div>
          <input type="file" className="hidden" accept="image/*" multiple onChange={handleOtherImagesChange} />
        </label>
      </div>

      {/* Attributes Section */}
      <div className="border-t border-purple-200 pt-4">
        <h4 className="text-md font-semibold text-purple-900 mb-4">📋 Thuộc tính sản phẩm (Biến thể)</h4>
        <p className="text-sm text-gray-600 mb-4">
          Thêm thuộc tính như Kích thước, Màu sắc, v.v. Mỗi tùy chọn có thể có hình ảnh và giá riêng.
        </p>

        {/* Add New Attribute */}
        <div className="bg-white p-4 rounded-lg border border-purple-300 mb-4">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
              placeholder="Tên thuộc tính (ví dụ: Kích thước, Màu sắc)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleAddAttribute}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Thêm thuộc tính
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Ví dụ: Kích thước, Màu sắc, Chất liệu, Trọng lượng, v.v.
          </p>
        </div>

        {/* Existing Attributes */}
        {attributes.length > 0 && (
          <div className="space-y-4 mb-4">
            {attributes.map((attribute, attrIndex) => (
              <div key={attrIndex} className="bg-white p-4 rounded-lg border border-purple-300">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAttributeIndex(attrIndex)}
                    className={`flex-1 text-left px-3 py-2 rounded-md font-medium transition-colors ${
                      selectedAttributeIndex === attrIndex
                        ? 'bg-purple-100 text-purple-900 border-2 border-purple-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {attribute.name} ({attribute.options.length} tùy chọn)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(attrIndex)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors ml-2"
                  >
                    Xóa
                  </button>
                </div>

                {/* Options for selected attribute */}
                {selectedAttributeIndex === attrIndex && (
                  <div className="border-t border-purple-200 pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-3">Thêm tùy chọn với hình ảnh & giá:</p>

                    {/* Add Option Form */}
                    <div className="bg-purple-50 p-4 rounded-lg mb-4 space-y-3">
                      {/* Option Value */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Giá trị tùy chọn *</label>
                        <input
                          type="text"
                          value={newAttributeOption}
                          onChange={(e) => setNewAttributeOption(e.target.value)}
                          placeholder={`Ví dụ: Lớn, Đỏ, Cotton...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      {/* Option Price */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Giá cho tùy chọn này (Tùy chọn)</label>
                        <input
                          type="number"
                          value={newOptionPrice}
                          onChange={(e) => setNewOptionPrice(e.target.value)}
                          placeholder="Để trống để sử dụng giá gốc"
                          step="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      {/* Option Image */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hình ảnh cho tùy chọn này (Tùy chọn)</label>
                        {newOptionImagePreview ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={newOptionImagePreview}
                              alt="Option preview"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={clearNewOptionImage}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                            >
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm text-gray-500">Nhấp để thêm hình ảnh</span>
                            </div>
                            <input
                              ref={optionImageInputRef}
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleOptionImageChange}
                            />
                          </label>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                      >
                        + Thêm tùy chọn
                      </button>
                    </div>

                    {/* Display Options */}
                    {attribute.options.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">Tùy chọn:</p>
                        {attribute.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            {/* Option Image */}
                            <div className="flex-shrink-0">
                              {option.imagePreview || (typeof option.image === 'string' && option.image) ? (
                                <div className="relative">
                                  <img
                                    src={option.imagePreview || (option.image as string)}
                                    alt={option.value}
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOptionImage(attrIndex, optIndex)}
                                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-700 transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center justify-center w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUpdateOptionImage(attrIndex, optIndex, file);
                                    }}
                                  />
                                </label>
                              )}
                            </div>

                            {/* Option Details */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">{option.value}</div>
                              <div className="mt-1">
                                <label className="text-xs text-gray-500">Giá:</label>
                                <input
                                  type="number"
                                  value={option.price || ''}
                                  onChange={(e) => handleUpdateOptionPrice(attrIndex, optIndex, e.target.value)}
                                  placeholder="Dùng giá gốc"
                                  step="1000"
                                  className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm w-32"
                                />
                                {option.price && (
                                  <span className="ml-2 text-sm text-green-600 font-medium">
                                    {formatPrice(option.price)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(attrIndex, optIndex)}
                              className="flex-shrink-0 p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {attribute.options.length === 0 && (
                      <p className="text-sm text-gray-500 italic text-center py-4">Chưa có tùy chọn nào. Thêm tùy chọn ở trên.</p>
                    )}
                  </div>
                )}

                {/* Show options summary for non-selected attributes */}
                {selectedAttributeIndex !== attrIndex && attribute.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attribute.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className="inline-flex items-center gap-2 bg-purple-100 text-purple-900 px-3 py-1 rounded-full text-sm"
                      >
                        {(option.imagePreview || option.image) && (
                          <img
                            src={option.imagePreview || (option.image as string)}
                            alt={option.value}
                            className="w-5 h-5 object-cover rounded-full"
                          />
                        )}
                        <span>{option.value}</span>
                        {option.price && (
                          <span className="text-xs text-purple-600">({formatPrice(option.price)})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {attributes.length === 0 && (
          <div className="bg-white rounded-lg p-6 text-center border border-dashed border-gray-300">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-600 mb-2">Chưa có thuộc tính nào</p>
            <p className="text-sm text-gray-500">
              Thêm thuộc tính như Kích thước, Màu sắc, Chất liệu để tạo biến thể sản phẩm.
              Mỗi tùy chọn biến thể có thể có hình ảnh và giá riêng.
            </p>
          </div>
        )}

        {/* Summary */}
        {attributes.length > 0 && (
          <div className="mt-4 p-4 bg-purple-100 rounded-lg">
            <p className="text-sm text-purple-900">
              <strong>Tổng số thuộc tính:</strong> {attributes.length}
              <br />
              <strong>Tổng số tùy chọn:</strong> {attributes.reduce((sum, attr) => sum + attr.options.length, 0)}
              <br />
              <strong>Tùy chọn có hình ảnh:</strong> {attributes.reduce((sum, attr) => sum + attr.options.filter(opt => opt.image || opt.imagePreview).length, 0)}
              <br />
              <strong>Tùy chọn có giá riêng:</strong> {attributes.reduce((sum, attr) => sum + attr.options.filter(opt => opt.price).length, 0)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
