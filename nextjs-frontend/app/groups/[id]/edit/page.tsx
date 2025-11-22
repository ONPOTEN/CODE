'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { groups as groupsApi, ApiException, Group } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import AvatarCropper from '@/components/AvatarCropper';

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = parseInt(params.id as string);
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
    requires_approval: false,
    requires_approval_posts: false,
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [avatarToCrop, setAvatarToCrop] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setPageLoading(true);
        const response = await groupsApi.getById(groupId);
        const fetchedGroup = response.data;

        // Check if current user is the group owner
        if (currentUser && fetchedGroup.group_owner_id !== currentUser.id) {
          setError('You do not have permission to edit this group');
          return;
        }

        setGroup(fetchedGroup);
        console.log('[EditGroup] Loaded group:', {
          group_id: fetchedGroup.group_id,
          requires_approval: fetchedGroup.requires_approval,
        });
        setFormData({
          group_name: fetchedGroup.group_name,
          description: fetchedGroup.description || '',
          visibility: (fetchedGroup.visibility === 'private' ? 'private' : 'public') as 'public' | 'private',
          requires_approval: (fetchedGroup.requires_approval === true || (typeof fetchedGroup.requires_approval === 'number' && fetchedGroup.requires_approval === 1)),
          requires_approval_posts: (fetchedGroup.requires_approval_posts === true || (typeof fetchedGroup.requires_approval_posts === 'number' && fetchedGroup.requires_approval_posts === 1)),
        });

        if (fetchedGroup.avatar) {
          setAvatarPreview(fetchedGroup.avatar);
        }

        if (fetchedGroup.cover_image) {
          setCoverPreview(fetchedGroup.cover_image);
        }
      } catch (err) {
        if (err instanceof ApiException) {
          setError(err.message);
        } else {
          setError('Failed to load group. Please try again.');
        }
        console.error('Error fetching group:', err);
      } finally {
        setPageLoading(false);
      }
    };

    if (currentUser) {
      fetchGroup();
    }
  }, [groupId, currentUser]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarToCrop(reader.result as string);
        setShowAvatarCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarCropComplete = (croppedBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatar(croppedFile);

    // Create preview URL
    const previewUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(previewUrl);

    // Close cropper
    setShowAvatarCropper(false);
    setAvatarToCrop(null);
  };

  const handleAvatarCropCancel = () => {
    setShowAvatarCropper(false);
    setAvatarToCrop(null);
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
      setError('Group name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const submitData = new FormData();
      submitData.append('group_name', formData.group_name);
      submitData.append('description', formData.description);
      submitData.append('visibility', formData.visibility);
      submitData.append('requires_approval', formData.requires_approval ? '1' : '0');
      submitData.append('requires_approval_posts', formData.requires_approval_posts ? '1' : '0');

      console.log('[EditGroup] Submitting form:', {
        group_id: groupId,
        requires_approval: formData.requires_approval,
        requires_approval_value: formData.requires_approval ? '1' : '0',
        requires_approval_posts: formData.requires_approval_posts,
        requires_approval_posts_value: formData.requires_approval_posts ? '1' : '0',
      });

      if (avatar) {
        submitData.append('avatar', avatar);
      }

      if (coverImage) {
        submitData.append('cover_image', coverImage);
      }

      const response = await groupsApi.updateWithFiles(groupId, submitData);
      console.log('[EditGroup] Update response:', response);

      router.push(`/groups/${groupId}?message=Group updated successfully`);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to update group. Please try again.');
      }
      console.error('Error updating group:', err);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/my-groups" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to My Groups
          </Link>
          <div className="mt-8 p-4 bg-grey-200 border border-red-200 rounded-lg text-red-700">
            {error}
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
          <Link href="/my-groups" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to My Groups
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Group</h1>
          <p className="text-gray-600 mt-2">Update your group settings and preferences</p>
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
                Group Name *
              </label>
              <input
                type="text"
                name="group_name"
                value={formData.group_name}
                onChange={handleInputChange}
                placeholder="Enter group name"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your group (optional)"
                rows={4}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000</p>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <select
                name="visibility"
                value={formData.visibility}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500"
              >
                <option value="public">Public - Anyone can join</option>
                <option value="private">Private - Invite only</option>
              </select>
            </div>

            {/* Requires Approval */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="requires_approval"
                  checked={formData.requires_approval}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-4 h-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">
                  Require admin approval for new members
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-2 ml-7">
                When enabled, new members must be approved by an admin or moderator before joining the group.
              </p>
            </div>

            {/* Requires Approval for Posts */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="requires_approval_posts"
                  checked={formData.requires_approval_posts}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-4 h-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">
                  Require admin approval for new posts
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-2 ml-7">
                When enabled, new posts must be approved by an admin or moderator before appearing in the group.
              </p>
            </div>

            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Avatar
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
                      <img src={avatarPreview} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover mb-2" />
                      <p className="text-sm text-blue-600">Click to change</p>
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
                      <p className="text-sm text-gray-600">Click to upload avatar</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Image
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
                      <img src={coverPreview} alt="Cover preview" className="w-full max-h-32 object-cover rounded mb-2" />
                      <p className="text-sm text-blue-600">Click to change</p>
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
                      <p className="text-sm text-gray-600">Click to upload cover image</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-300">
              <Link
                href="/my-groups"
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
                  'Update Group'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Avatar Cropper Modal */}
      {showAvatarCropper && avatarToCrop && (
        <AvatarCropper
          imageSrc={avatarToCrop}
          onCropComplete={handleAvatarCropComplete}
          onCancel={handleAvatarCropCancel}
        />
      )}
    </div>
  );
}
