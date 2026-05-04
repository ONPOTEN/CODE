'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { groupPosts, auth, Group, chat } from '@/lib/api';

interface GroupPostFormProps {
  groupId: number;
  group?: Group;
  onPostCreated?: () => void;
  onCancel?: () => void;
}

export default function GroupPostForm({ groupId, group, onPostCreated, onCancel }: GroupPostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const sendApprovalNotifications = async () => {
    if (!group?.requires_approval_posts) return;

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userName = currentUser.display_name || currentUser.name || 'A user';

      // Notify group owner
      if (group.group_owner_id) {
        try {
          const conversation = await chat.getOrCreateConversation(group.group_owner_id);
          const message = `Your Group "${group.group_name}" has a new post that needs approval from: ${userName}`;
          await chat.sendMessage(conversation.id, message);
          console.log('[GroupPostForm] Notification sent to group owner');
        } catch (err) {
          console.error('[GroupPostForm] Failed to notify group owner:', err);
        }
      }

      // TODO: Add notification to moderators when moderator system is implemented
    } catch (err) {
      console.error('[GroupPostForm] Error sending approval notifications:', err);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!auth.isAuthenticated()) {
      console.log('[GroupPostForm] Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError('Tiêu đề và nội dung là bắt buộc');
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
      formData.append('status', 'publish');
      formData.append('visibility', visibility);

      // Add images if provided
      images.forEach((image) => {
        formData.append('images[]', image);
      });

      await groupPosts.create(formData);

      // Check if post requires approval
      const requiresApproval = group?.requires_approval_posts;

      // Check if current user is admin (group owner)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const isGroupOwner = currentUser.id === group?.group_owner_id;
      const isAdmin = currentUser.role === 'admin' || currentUser.role === 'administrator';

      // If user is admin/moderator or approval is not required, show success
      if (isGroupOwner || isAdmin || !requiresApproval) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Regular member needs approval - send notifications and show modal
        if (requiresApproval) {
          await sendApprovalNotifications();
          setShowApprovalModal(true);
        } else {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      }

      setTitle('');
      setContent('');
      setExcerpt('');
      setImages([]);
      setVisibility('public');
      setShowForm(false);

      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Không thể tạo bài viết');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-300 p-6 mb-8">
      {/* Header */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full text-left px-4 py-3 bg-white rounded-lg hover:bg-gray-200 transition-colors text-gray-600 font-medium"
        >
          Bạn đang nghĩ gì? Chia sẻ điều gì đó với nhóm...
        </button>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Tiêu đề bài viết
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Đặt tiêu đề cho bài viết của bạn..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Content Textarea */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Nội dung
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ suy nghĩ, cập nhật hoặc ý tưởng của bạn..."
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              disabled={loading}
            />
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
              Tóm tắt (tùy chọn)
            </label>
            <input
              type="text"
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Tóm tắt ngắn gọn về bài viết của bạn..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Images */}
          <div>
            <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">
              Hình ảnh (tùy chọn)
            </label>
            <input
              type="file"
              id="images"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            {images.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">{images.length} hình ảnh đã chọn</p>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Chế độ hiển thị
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="public">Công khai</option>
              <option value="private">Riêng tư</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Bài viết đã được tạo thành công!
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTitle('');
                setContent('');
                setExcerpt('');
                setImages([]);
                setError(null);
                if (onCancel) onCancel();
              }}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang tạo...' : 'Tạo bài viết'}
            </button>
          </div>
        </form>
      )}

      {/* Post Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-50 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            {/* Icon */}
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bài viết đã được gửi để xem xét</h3>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              Bài viết của bạn cần {group?.requires_approval_posts ? 'xác minh của Admin hoặc Điều phối viên' : 'xác minh'}. Quản trị viên nhóm sẽ xem xét và phê duyệt sớm.
            </p>

            {/* Action Button */}
            <button
              onClick={() => {
                setShowApprovalModal(false);
                setShowForm(false);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Đã hiểu, cảm ơn!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
