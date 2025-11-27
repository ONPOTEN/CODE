'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { posts, ApiException } from '@/lib/api';

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    setSelectedImages(filesArray);

    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await posts.create({
        title: 'Post',
        content: content.trim(),
        images: selectedImages,
        status: 'publish',
      });

      imagePreviews.forEach((p) => URL.revokeObjectURL(p));
      router.push('/profile');
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to create post');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-lg flex flex-col max-h-[90vh]">

        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || '/default-avatar.png'}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="font-semibold text-lg">Make new Post</div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="create-post-page-form"
              disabled={isLoading || !content.trim()}
              className="bg-blue-500 text-white px-5 py-2 rounded-lg disabled:opacity-50"
            >
              {isLoading ? "Đang đăng..." : "Đăng"}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form
          id="create-post-page-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Textarea */}
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ trạng thái..."
            className="w-full text-lg focus:outline-none resize-none"
          />

          {/* Preview Images */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} className="w-full h-40 object-cover rounded-xl" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-black text-white rounded-full w-6 h-6 text-sm"
                    onClick={() => removeImage(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer icons */}
          <div className="flex justify-between border-t pt-3">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <span className="text-2xl">🖼️</span>
                <input type="file" className="hidden" multiple onChange={handleImageChange} accept="image/*" />
              </label>
              <span className="text-2xl cursor-pointer">📹</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
