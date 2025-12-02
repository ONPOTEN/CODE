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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [shopId, postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      let postData = await shopPosts.getById(shopId, postId);
      // Handle both direct ShopPost and wrapped response
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
      // Set existing images from the post
      setExistingImages(postData.featured_images || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      alert('Failed to load post');
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

      // Generate previews
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('You must be logged in to edit posts');
      return;
    }

    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      setSaving(true);

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('_method', 'PUT'); // Laravel method spoofing
      submitData.append('title', formData.title);
      submitData.append('type', formData.type);
      submitData.append('status', formData.status);

      // Add product-specific fields
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
      if (formData.download_files && (formData.download_files as any).file) {
        const downloadFileObj = formData.download_files as any;
        submitData.append('download_files[name]', downloadFileObj.name);
        submitData.append('download_files[file]', downloadFileObj.file);
      }
      if (formData.link_files && formData.link_files.length > 0) {
        submitData.append('link_files', JSON.stringify(formData.link_files));
      }

      // Handle main_image
      if (formData.main_image && formData.main_image instanceof File) {
        submitData.append('main_image', formData.main_image);
      }

      // Handle other_images
      if (formData.other_images && formData.other_images.length > 0) {
        formData.other_images.forEach((img, index) => {
          if (img instanceof File) {
            submitData.append(`other_images[${index}]`, img);
          }
        });
      }

      // Append new images
      newImages.forEach((image) => {
        submitData.append('featured_images[]', image);
      });

      // Append images to remove
      imagesToRemove.forEach((imagePath) => {
        submitData.append('remove_images[]', imagePath);
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shops/${shopId}/posts/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('api_token')}`,
          'Accept': 'application/json',
        },
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Failed to update post');
      }

      alert('Post updated successfully!');
      router.push(`/shops/${shopId}/posts`);
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${post?.title}"?`)) {
      return;
    }

    try {
      await shopPosts.delete(shopId, postId);
      alert('Post deleted successfully!');
      router.push(`/shops/${shopId}/posts`);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600">Post not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-grey-200 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Edit {post.type === 'post' ? 'Post' : 'Page'}</h1>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 transition-colors"
            >
              Delete
            </button>
          </div>

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

            {/* Post Info */}
            <div className="bg-white p-4 rounded-md">
              <div className="text-sm text-gray-600 space-y-1">
                <p>Views: {post.view_count}</p>
                <p>Created: {new Date(post.created_at).toLocaleDateString()}</p>
                <p>Last Updated: {new Date(post.updated_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-500 text-gray-900 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
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
        </div>
      </div>
    </div>
  );
}
