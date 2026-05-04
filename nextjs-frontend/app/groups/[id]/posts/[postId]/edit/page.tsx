'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, groupPosts, Group, GroupPost, ApiException, auth } from '@/lib/api';

export default function EditGroupPostPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = parseInt(params.id as string);
  const postId = parseInt(params.postId as string);

  const [group, setGroup] = useState<Group | null>(null);
  const [post, setPost] = useState<GroupPost | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [replaceImages, setReplaceImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    // Check authentication first
    const token = auth.getToken();
    const isAuth = auth.isAuthenticated();

    console.log('[EditPost] Auth check:', {
      isAuth,
      token: token ? token.substring(0, 20) + '...' : null,
      tokenLength: token?.length
    });

    setIsAuthenticated(isAuth);

    // If not authenticated, redirect to login
    if (!isAuth) {
      console.log('[EditPost] Not authenticated, redirecting to /login');
      router.push('/login');
      return;
    }

    // If authenticated, validate token by fetching group and post
    console.log('[EditPost] Authenticated, fetching group and post');
    validateAndFetch();
  }, [groupId, postId, router]);

  const validateAndFetch = async () => {
    try {
      await fetchGroupAndPost();
    } catch (err) {
      console.error('[EditPost] Validation failed:', err);
      // If validation fails, clear token and redirect to login
      auth.logout();
      router.push('/login');
    }
  };

  const fetchGroupAndPost = async () => {
    try {
      setPageLoading(true);

      // Fetch group
      const groupResponse = await groups.getById(groupId);
      setGroup(groupResponse.data);

      // Fetch post
      const postResponse = await groupPosts.getById(postId);
      const fetchedPost = postResponse.data;
      setPost(fetchedPost);

      // Populate form with post data
      setTitle(fetchedPost.post_title || '');
      setContent(fetchedPost.post_content || '');
      setExcerpt(fetchedPost.post_excerpt || '');
      setVisibility((fetchedPost.visibility as 'public' | 'private') || 'public');

      // Load existing images from S3
      if (fetchedPost.images && fetchedPost.images.length > 0) {
        setExistingImages(fetchedPost.images);
      }

      console.log('[EditPost] Loaded post:', {
        post_id: fetchedPost.id,
        group_id: groupId,
        images_count: fetchedPost.images?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load post. Please try again.');
    } finally {
      setPageLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(filesArray);

      // Create preview URLs using URL.createObjectURL (more efficient than FileReader)
      const previews = filesArray.map((file) => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    // Revoke the URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);

    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData = {
        title: title,
        content: content,
        excerpt: excerpt,
        visibility: visibility,
      };

      // If there are new images or user wants to replace images, use FormData
      if (images.length > 0 || replaceImages) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('excerpt', excerpt);
        formData.append('visibility', visibility);

        // Add new images
        images.forEach((image) => {
          formData.append('images[]', image);
        });

        // If replacing images, set the flag
        if (replaceImages && images.length > 0) {
          formData.append('replace_images', 'true');
        }

        console.log('[EditPost] Submitting post update with images:', {
          groupId,
          postId,
          title: title.substring(0, 50),
          imagesCount: images.length,
          replaceImages: replaceImages,
        });

        const response = await groupPosts.updateWithFiles(postId, formData);
        console.log('[EditPost] Update response:', response);
      } else {
        console.log('[EditPost] Submitting post update without images:', {
          groupId,
          postId,
          title: title.substring(0, 50),
        });

        const response = await groupPosts.update(postId, updateData);
        console.log('[EditPost] Update response:', response);
      }

      // Clean up preview URLs
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));

      router.push(`/groups/${groupId}/manage-posts?message=${encodeURIComponent('Post updated successfully')}`);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to update post. Please try again.');
      }
      console.error('Error updating post:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (!isAuthenticated && pageLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Checking authentication...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading (will redirect shortly)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading post...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Group not found</h1>
            <Link href="/groups" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href={`/groups/${groupId}/manage-posts`} className="text-blue-600 hover:text-blue-700 font-medium mb-8 inline-block">
            ← Back to Manage Posts
          </Link>

          <div className="bg-grey-200 rounded-lg shadow p-8 text-center border border-gray-300">
            <p className="text-gray-600 text-lg">Post not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/groups/${groupId}/manage-posts`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Manage Posts
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Post</h1>
          <p className="text-gray-600 mt-2">Update your post content</p>
        </div>

        {/* Form */}
        <div className="bg-grey-200 rounded-lg shadow p-6">
          {error && (
            <div className="mb-6 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Post Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your post a title..."
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, updates, or ideas..."
                rows={6}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500 resize-vertical"
              />
              <p className="text-xs text-gray-500 mt-1">{content.length} characters</p>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summary (Optional)
              </label>
              <input
                type="text"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary of your post..."
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500"
              >
                <option value="public">Public - Visible to all group members</option>
                <option value="private">Private - Only visible to you</option>
              </select>
            </div>

            {/* Existing Images Section */}
            {existingImages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Images ({existingImages.length})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {existingImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md border border-gray-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Replace Images Checkbox */}
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={replaceImages}
                    onChange={(e) => setReplaceImages(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Replace all images with new ones
                  </span>
                </label>
                {replaceImages && (
                  <p className="text-sm text-amber-600 mb-4">
                    ⚠️ When you upload new images, all current images will be replaced.
                  </p>
                )}
              </div>
            )}

            {/* Images Upload */}
            {(replaceImages || existingImages.length === 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {existingImages.length > 0 ? 'New Images' : 'Images (Optional)'}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={loading}
                    className="hidden"
                    id="images-input"
                  />
                  <label
                    htmlFor="images-input"
                    className={`cursor-pointer block ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
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
                    <p className="text-sm text-gray-600">Click to upload images</p>
                  </label>
                </div>
                {images.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">{images.length} new image(s) selected</p>
                )}
              </div>
            )}

            {/* New Image Previews */}
            {imagePreviews.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Image Previews
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        disabled={loading}
                        className="absolute -top-2 -right-2 bg-grey-2000 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-500 disabled:opacity-50"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-300">
              <Link
                href={`/groups/${groupId}/manage-posts`}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  'Update Post'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
