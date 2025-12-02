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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('You must be logged in to create posts');
      return;
    }

    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      setLoading(true);

      // Check if we have any file uploads (featured images, main_image, other_images, download file, or variant option images)
      const hasDownloadFile = formData.download_files && (formData.download_files as any).file;
      const hasMainImage = formData.main_image && formData.main_image instanceof File;
      const hasOtherImages = formData.other_images && formData.other_images.some((img) => img instanceof File);

      // Check if any variant option has an image file
      const hasVariantOptionImages = formData.attributes && (formData.attributes as any[]).some((attr: any) =>
        attr.options && attr.options.some((opt: any) => opt.image instanceof File)
      );

      if (featuredImages.length > 0 || hasDownloadFile || hasMainImage || hasOtherImages || hasVariantOptionImages) {
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

      alert('Post created successfully!');
      router.push(`/shops/${shopId}/posts`);
    } catch (error) {
      console.error('Error creating post:', error);
      if (error instanceof ApiException) {
        alert(`Failed to create post: ${error.message}`);
      } else {
        alert('Failed to create post');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-grey-200 rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Post/Page</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter title"
              />
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Product Type *
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
                    <div className="font-medium text-gray-900">🛍️ Simple Product (Đơn giản)</div>
                    <p className="text-xs text-gray-500">Standard product with pricing, images, descriptions, and categories</p>
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
                    <div className="font-medium text-gray-900">🎨 Variant Product (Biến thể)</div>
                    <p className="text-xs text-gray-500">Product with attributes (Size, Color, Material, etc) and multiple options</p>
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
                    <div className="font-medium text-gray-900">📥 Download Product (Tải xuống)</div>
                    <p className="text-xs text-gray-500">Digital product with downloadable files and external links</p>
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
                Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="post">Post</option>
                <option value="page">Page</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/shops/${shopId}/posts`)}
                className="px-6 py-2 bg-blue-500 text-gray-700 rounded-md hover:bg-blue-300 transition-colors"
              >
                Cancel
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
