'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { posts, Post, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { EngagementButtons } from '@/components/EngagementButtons';
import { CommentsSection } from '@/components/CommentsSection';

// Helper function to render content with links for "tải về" text
function renderContentWithLinks(content: string | null | undefined) {
  if (!content) return 'No content available.';

  const downloadUrl = 'https://drive.google.com/drive/my-drive?hl=vi&fbclid=IwY2xjawQFDmxleHRuA2FlbQIxMABicmlkETJrbXlzM0R6Q2pHZ1BEQURMc3J0YwZhcHBfaWQQMjIyMDM5MTc4';

  // Split content by "tải về" and insert links
  const parts = content.split(/(tải về)/gi);

  return parts.map((part, index) => {
    if (part.toLowerCase() === 'tải về') {
      return (
        <a
          key={index}
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function ViewPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const postId = params.id as string;

  useEffect(() => {
    async function fetchPost() {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching post with ID/slug:', postId);

        // Try to fetch by ID first (if it's a number), otherwise fetch by slug
        let postData;
        const numericId = parseInt(postId);

        if (!isNaN(numericId) && numericId.toString() === postId) {
          // It's a numeric ID
          console.log('Fetching by ID:', numericId);
          postData = await posts.getById(numericId);
        } else {
          // It's a slug
          console.log('Fetching by slug:', postId);
          postData = await posts.getBySlug(postId);
        }
        console.log('Fetched post data:', postData);
        console.log('Post ID:', postData.id);
        console.log('Post slug:', postData.slug);
        console.log('Post content:', postData.content);
        console.log('Post featured_image:', postData.featured_image);
        console.log('Post images array:', postData.images);
        console.log('Images is array?', Array.isArray(postData.images));
        console.log('Images length:', postData.images?.length);

        setPost(postData);
      } catch (err) {
        if (err instanceof ApiException) {
          setError(`Failed to load post: ${err.message}`);
        } else {
          setError('Failed to load post');
        }
        console.error('Error fetching post:', err);
      } finally {
        setLoading(false);
      }
    }

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const handleDelete = async () => {
    if (!post) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this post? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      await posts.delete(post.id);
      router.push('/my-posts');
    } catch (err) {
      if (err instanceof ApiException) {
        alert(`Failed to delete post: ${err.message}`);
      } else {
        alert('Failed to delete post');
      }
      console.error('Error deleting post:', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }
  //console.log(post.images[1]);
  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error || 'Post not found'}</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  //console.log(post.images);
  const isOwner = user?.id === post.id; // You may need to adjust this based on your Post interface

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Posts
        </Link>

        {/* Post Content */}
        <article className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          {/* Featured Image */}
          {(post.featured_image || (post.images && post.images.length > 0)) && (
            <div className="w-full h-96 bg-gray-200 relative">
              <img
                src={post.featured_image || (post.images && post.images.length > 0 ? post.images[0].url : '')}
                alt={post.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="p-8">
            {/* Header */}
            <header className="mb-8 pb-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-4xl font-bold text-gray-900 flex-1">{post.title}</h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap ml-4 ${
                    post.status === 'publish'
                      ? 'bg-green-100 text-green-800'
                      : post.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {post.status}
                </span>
              </div>

              {/* Post Metadata */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    <span className="font-medium">Type:</span> {post.type}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-medium">Posted:</span>{' '}
                    {new Date(post.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {post.updated_at !== post.created_at && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span className="font-medium">Last Updated:</span>{' '}
                    {new Date(post.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}

                {post.slug && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <span className="font-medium">Slug:</span>{' '}
                    <code className="bg-gray-100 px-2 py-0.5 rounded">{post.slug}</code>
                  </div>
                )}

                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                    />
                  </svg>
                  <span className="font-medium">Post ID:</span> {post.id}
                </div>
              </div>
            </header>

            {/* Excerpt */}
            {post.excerpt && (
              <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-1">Summary</p>
                <p className="text-lg text-gray-700 italic">{post.excerpt}</p>
              </div>
            )}

            {/* Additional Images Gallery */}
            {post.images && post.images.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Image Gallery ({post.images.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {post.images.map((image, index) => (
                    <div
                      key={image.id || index}
                      className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group cursor-pointer"
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img
                        src={image.url}
                        alt={`${post.title} - Image ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug info for images */}
            {(!post.images || !Array.isArray(post.images) || post.images.length === 0) && (
              <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Debug:</span> No additional images array found.
                  {post.featured_image && ' (Featured image is displayed above)'}
                </p>
              </div>
            )}

            {/* Content */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Content
              </h3>
              <div className="prose prose-lg max-w-none">
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 p-6 rounded-lg border border-gray-200">
                  {renderContentWithLinks(post.content)}
                </div>
              </div>
            </div>

            {/* Download Link for post 35358 */}
            {post.id === 35358 && (
              <div className="mb-8">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    TÀI LIỆU BẢN VẼ HỐ THANG MÁY THEO CHUẨN HISALINK
                  </h3>
                  <a
                    href="https://drive.google.com/drive/my-drive?hl=vi&fbclid=IwY2xjawQFDmxleHRuA2FlbQIxMABicmlkETJrbXlzM0R6Q2pHZ1BEQURMc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHva3_0vzCICTp2NBE6qNVrJDmqlYSRx2b1plE37XUNxkTpQJ6NWOdTPs8x_v_aem_TqZNMrGAIIf95cO_mctsPg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    TẢI TÀI LIỆU
                  </a>
                </div>
              </div>
            )}

            {/* Engagement Buttons */}
            <div className="mb-8 p-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.646 7.23a2 2 0 01-1.789 1.106H2a2 2 0 01-2-2V8a2 2 0 012-2h1.657a2 2 0 011.414.586l2.828-2.829a2 2 0 112.828 2.829l-.36.36h5.663z"
                  />
                </svg>
                Engagement
              </h3>
              <EngagementButtons
                postId={post.id}
                postTitle={post.title}
                postSlug={post.slug}
                postText={post.excerpt || post.content?.substring(0, 200)}
                showLabels={true}
                className="mb-4"
              />
            </div>

            {/* Comments Section */}
            <div className="mb-8 p-6 border-t border-gray-200">
              <CommentsSection postId={post.id} currentUserId={user?.id} className="mt-6" />
            </div>

            {/* Action Buttons */}
            {isOwner && (
              <div className="flex gap-3 p-6 border-t border-gray-200">
                <Link
                  href={`/posts/edit/${post.id}`}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Post
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            )}
          </div>
        </article>

        {/* Related Actions */}
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/posts/create"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Create New Post
          </Link>
          <Link
            href="/my-posts"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            View My Posts
          </Link>
        </div>
      </div>
    </div>
  );
}
