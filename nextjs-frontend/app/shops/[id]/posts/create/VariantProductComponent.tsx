'use client';

import React, { useState } from 'react';

interface Attribute {
  name: string;
  options: Array<{ value: string }>;
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
  const [selectedAttributeIndex, setSelectedAttributeIndex] = useState<number | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(
    formData.main_image instanceof File ? URL.createObjectURL(formData.main_image) : (typeof formData.main_image === 'string' ? formData.main_image : null)
  );
  const [otherImagePreviews, setOtherImagePreviews] = useState<string[]>(
    (formData.other_images || []).map((img) =>
      img instanceof File ? URL.createObjectURL(img) : typeof img === 'string' ? img : ''
    ).filter(Boolean)
  );

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
      alert('Please enter an attribute name');
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

  const handleAddOption = () => {
    if (selectedAttributeIndex === null) {
      alert('Please select an attribute first');
      return;
    }

    if (!newAttributeOption.trim()) {
      alert('Please enter an option value');
      return;
    }

    const updatedAttributes = [...attributes];
    updatedAttributes[selectedAttributeIndex].options.push({
      value: newAttributeOption,
    });

    onFormDataChange('attributes', updatedAttributes);
    setNewAttributeOption('');
  };

  const handleRemoveAttribute = (index: number) => {
    const updatedAttributes = attributes.filter((_, i) => i !== index);
    onFormDataChange('attributes', updatedAttributes);
    if (selectedAttributeIndex === index) {
      setSelectedAttributeIndex(null);
    }
  };

  const handleRemoveOption = (attributeIndex: number, optionIndex: number) => {
    const updatedAttributes = [...attributes];
    updatedAttributes[attributeIndex].options = updatedAttributes[attributeIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    onFormDataChange('attributes', updatedAttributes);
  };

  return (
    <div className="bg-grey-200 border border-purple-200 rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
        🎨 Variant Product Fields
      </h3>

      {/* Price */}
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
          Price
        </label>
        <input
          type="number"
          id="price"
          name="price"
          step="0.01"
          value={formData.price || ''}
          onChange={(e) => onFormDataChange('price', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter price"
        />
      </div>

      {/* Sale Price */}
      <div>
        <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 mb-2">
          Sale Price (Optional)
        </label>
        <input
          type="number"
          id="sale_price"
          name="sale_price"
          step="0.01"
          value={formData.sale_price || ''}
          onChange={(e) => onFormDataChange('sale_price', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter sale price (leave empty for no discount)"
        />
        {formData.price && formData.sale_price && (
          <p className="text-sm text-green-600 mt-1">
            Discount: {(((Number(formData.price) - Number(formData.sale_price)) / Number(formData.price)) * 100).toFixed(1)}%
          </p>
        )}
      </div>

      {/* Short Description */}
      <div>
        <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-2">
          Short Description
        </label>
        <input
          type="text"
          id="short_description"
          name="short_description"
          value={formData.short_description || ''}
          onChange={(e) => onFormDataChange('short_description', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          placeholder="Brief summary of the variant product"
          maxLength={255}
        />
        <p className="text-xs text-gray-500 mt-1">
          {(formData.short_description || '').toString().length}/255
        </p>
      </div>

      {/* Detail Description */}
      <div>
        <label htmlFor="detail_description" className="block text-sm font-medium text-gray-700 mb-2">
          Detail Description
        </label>
        <textarea
          id="detail_description"
          name="detail_description"
          value={formData.detail_description || ''}
          onChange={(e) => onFormDataChange('detail_description', e.target.value)}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          placeholder="Detailed information about the variant product"
        />
      </div>

      {/* Main Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Main Product Image
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
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-blue-500 transition-colors">
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <svg className="w-6 h-6 text-purple-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs text-purple-600">Click to replace image</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-blue-500 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-purple-600 font-medium">Upload Main Image</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleMainImageChange} />
          </label>
        )}
      </div>

      {/* Other Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Images
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
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-grey-200 hover:bg-blue-500 transition-colors">
          <div className="flex flex-col items-center justify-center pt-2 pb-2">
            <svg className="w-6 h-6 text-purple-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs text-purple-600 font-medium">Click or drag to add more images</p>
          </div>
          <input type="file" className="hidden" accept="image/*" multiple onChange={handleOtherImagesChange} />
        </label>
      </div>

      {/* Attributes Section */}
      <div className="border-t border-purple-200 pt-4">
        <h4 className="text-md font-semibold text-purple-900 mb-4">📋 Product Attributes</h4>

        {/* Add New Attribute */}
        <div className="bg-grey-200 p-4 rounded-lg border border-purple-300 mb-4">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
              placeholder="Attribute name (e.g., Size, Color)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleAddAttribute}
              className="px-4 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Attribute
            </button>
          </div>
          <p className="text-xs text-gray-500">
            e.g., Size, Color, Material, Weight, etc.
          </p>
        </div>

        {/* Existing Attributes */}
        {attributes.length > 0 && (
          <div className="space-y-3 mb-4">
            {attributes.map((attribute, attrIndex) => (
              <div key={attrIndex} className="bg-grey-200 p-4 rounded-lg border border-purple-300">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAttributeIndex(attrIndex)}
                    className={`flex-1 text-left px-3 py-2 rounded-md font-medium transition-colors ${
                      selectedAttributeIndex === attrIndex
                        ? 'bg-blue-500 text-purple-900'
                        : 'bg-blue-500 text-gray-900 hover:bg-blue-500'
                    }`}
                  >
                    {attribute.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(attrIndex)}
                    className="px-3 py-2 bg-blue-500 text-red-700 rounded-md hover:bg-blue-500 transition-colors ml-2"
                  >
                    Remove
                  </button>
                </div>

                {/* Options for selected attribute */}
                {selectedAttributeIndex === attrIndex && (
                  <div className="border-t border-purple-200 pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>

                    {/* Add Option */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newAttributeOption}
                        onChange={(e) => setNewAttributeOption(e.target.value)}
                        placeholder={`Add option for ${attribute.name}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="px-3 py-2 bg-grey-2000 text-gray-900 rounded-md hover:bg-blue-500 transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {/* Display Options */}
                    {attribute.options.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attribute.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className="inline-flex items-center gap-2 bg-blue-500 text-purple-900 px-3 py-1 rounded-full text-sm"
                          >
                            <span>{option.value}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(attrIndex, optIndex)}
                              className="text-purple-600 hover:text-purple-800 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {attribute.options.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No options added yet</p>
                    )}
                  </div>
                )}

                {/* Show options summary for non-selected attributes */}
                {selectedAttributeIndex !== attrIndex && attribute.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attribute.options.map((option, optIndex) => (
                      <span
                        key={optIndex}
                        className="inline-block bg-blue-500 text-purple-900 px-2 py-1 rounded text-xs"
                      >
                        {option.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {attributes.length === 0 && (
          <div className="bg-white rounded-lg p-4 text-center border border-dashed border-gray-300">
            <p className="text-sm text-gray-600">
              No attributes added yet. Add attributes like Size, Color, Material, etc.
            </p>
          </div>
        )}

        {/* Summary */}
        {attributes.length > 0 && (
          <div className="mt-4 p-3 bg-blue-500 rounded-lg">
            <p className="text-sm text-purple-900">
              <strong>Total Attributes:</strong> {attributes.length}
              <br />
              <strong>Total Options:</strong> {attributes.reduce((sum, attr) => sum + attr.options.length, 0)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
