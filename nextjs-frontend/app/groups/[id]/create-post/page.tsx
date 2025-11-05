'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, groupPosts, Group, ApiException, auth } from '@/lib/api';

export default function CreateGroupPostPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = parseInt(params.id as string);

  const [group, setGroup] = useState<Group | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupLoading, setGroupLoading] = useState(true);

  useEffect(() => {
    // Check authentication first
    const token = auth.getToken();
    const isAuth = auth.isAuthenticated();

    console.log('[CreatePost] Auth check:', {
      isAuth,
      token: token ? token.substring(0, 20) + '...' : null,
      tokenLength: token?.length
    });

    setIsAuthenticated(isAuth);

    // If not authenticated, redirect to login
    if (!isAuth) {
      console.log('[CreatePost] Not authenticated, redirecting to /login');
      router.push('/login');
      return;
    }

    // If authenticated, validate token by fetching user profile
    console.log('[CreatePost] Authenticated, validating token and fetching group');
    validateAndFetch();
  }, [groupId, router]);

  const validateAndFetch = async () => {
    try {
      // First, validate the token is actually valid
      // Try to fetch current user or use the membership check as validation
      await fetchGroupAndCheckMembership();
    } catch (err) {
      console.error('[CreatePost] Validation failed:', err);
      // If validation fails, clear token and redirect to login
      auth.logout();
      router.push('/login');
    }
  };

  const fetchGroupAndCheckMembership = async () => {
    try {
      setGroupLoading(true);
      const response = await groups.getById(groupId);
      setGroup(response.data);

      // Check if user is a member of the group
      try {
        const membershipResponse = await groups.checkMembership(groupId);
        setIsMember(membershipResponse.is_member);
      } catch (membershipErr) {
        // If membership check fails, assume user is not a member
        console.error('Error checking membership:', membershipErr);
        setIsMember(false);
      }
    } catch (err) {
      console.error('Error fetching group:', err);
      setError('Failed to load group');
      setIsMember(false);
    } finally {
      setGroupLoading(false);
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

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFeaturedImageFile(file);

      // Create preview URL
      const preview = URL.createObjectURL(file);
      setFeaturedImagePreview(preview);
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

  const removeFeaturedImage = () => {
    if (featuredImagePreview) {
      URL.revokeObjectURL(featuredImagePreview);
    }
    setFeaturedImageFile(null);
    setFeaturedImagePreview('');
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

      const formData = new FormData();
      formData.append('group_id', groupId.toString());
      formData.append('title', title);
      formData.append('content', content);
      formData.append('excerpt', excerpt);
      // If group requires approval for posts, set status to 'pending', otherwise 'publish'
      const postStatus = group.requires_approval_posts ? 'pending' : 'publish';
      formData.append('status', postStatus);
      formData.append('visibility', visibility);

      console.log('[CreatePost] Submitting post:', {
        groupId,
        requires_approval_posts: group.requires_approval_posts,
        postStatus,
        title: title.substring(0, 50),
      });

      // Add featured image if provided
      if (featuredImageFile) {
        formData.append('featured_image', featuredImageFile);
      }

      // Add gallery images if provided
      images.forEach((image) => {
        formData.append('images[]', image);
      });

      const response = await groupPosts.create(formData);

      // Clean up preview URLs
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      if (featuredImagePreview) {
        URL.revokeObjectURL(featuredImagePreview);
      }

      // Check if post is pending approval
      const isPending = response.data?.post_status === 'pending';
      const message = isPending
        ? 'Post created successfully and is awaiting approval'
        : 'Post created successfully';

      router.push(`/groups/${groupId}?message=${encodeURIComponent(message)}`);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to create post. Please try again.');
      }
      console.error('Error creating post:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (!isAuthenticated && groupLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  if (!isMember) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href={`/groups/${groupId}`} className="text-blue-600 hover:text-blue-700 font-medium mb-8 inline-block">
            ← Back to {group.group_name}
          </Link>

          <div className="bg-white rounded-lg shadow p-8 text-center border border-gray-200">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-6">You must be a member of this group to create posts.</p>

            <div className="flex gap-4 justify-center">
              <Link
                href={`/groups/${groupId}`}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Join Group
              </Link>
              <Link
                href="/groups"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Browse Groups
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/groups/${groupId}`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to {group.group_name}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Create a New Post</h1>
          <p className="text-gray-600 mt-2">Share your thoughts with the group</p>
        </div>

        {/* Approval Notice */}
        {group.requires_approval_posts && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-900">Posts require approval</p>
                <p className="text-sm text-amber-700 mt-1">Your post will be reviewed by group moderators before being published.</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-vertical"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="public">Public - Visible to all group members</option>
                <option value="private">Private - Only visible to you</option>
              </select>
            </div>

            {/* Featured Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Featured Image (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedImageChange}
                  disabled={loading}
                  className="hidden"
                  id="featured-image-input"
                />
                <label
                  htmlFor="featured-image-input"
                  className={`cursor-pointer block ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg
                    className="w-12 h-12 mx-auto mb-2 text-gray-400"
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
                  <p className="text-sm text-gray-600">Click to upload featured image</p>
                </label>
              </div>
            </div>

            {/* Featured Image Preview */}
            {featuredImagePreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Featured Image Preview
                </label>
                <div className="relative inline-block">
                  <img
                    src={featuredImagePreview}
                    alt="Featured preview"
                    className="h-48 object-cover rounded-md border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeFeaturedImage}
                    disabled={loading}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                    title="Remove featured image"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Images Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images (Optional)
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
                    className="w-12 h-12 mx-auto mb-2 text-gray-400"
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
                <p className="text-sm text-gray-600 mt-2">{images.length} image(s) selected</p>
              )}
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Previews
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
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                        title="Remove image"
                      >
                        ×
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-0 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-tr">
                          Featured
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <Link
                href={`/groups/${groupId}`}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Create Post'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
