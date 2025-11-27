'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groups, groupPosts, Group, GroupPost, ApiException } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ImageItem {
  id: string;
  url: string;
  postId: number;
  postTitle: string;
  authorName: string;
  authorAvatar?: string;
  postDate: string;
}

export default function GroupImagesPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params.id as string);
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Helper function to validate image URL
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') {
      console.warn('[GroupImages] Invalid URL:', url);
      return false;
    }
    // Check if it's a valid URL (starts with http/https or /)
    const isValid = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
    if (!isValid) {
      console.warn('[GroupImages] URL does not start with http(s) or /:', url);
    }
    return isValid;
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details
      const groupResponse = await groups.getById(groupId);
      setGroup(groupResponse.data);

      // Fetch all posts from the group
      const allPostsResponse = await groupPosts.index({
        group_id: groupId,
        per_page: 100,
        // Don't filter by status to get all posts
      });

      console.log('[GroupImages] Posts response:', allPostsResponse);
      console.log('[GroupImages] Total posts:', allPostsResponse.data?.length || 0);

      // Extract all images from posts
      const allImages: ImageItem[] = [];
      if (allPostsResponse.data) {
        allPostsResponse.data.forEach((post: GroupPost, postIndex: number) => {
          console.log(`[GroupImages] Processing post ${postIndex + 1}:`, {
            id: post.id,
            title: post.post_title,
            featured_image: post.featured_image,
            images_array: post.images,
            images_length: post.images?.length || 0,
          });

          // Add featured image if exists and is valid
          if (isValidImageUrl(post.featured_image)) {
            console.log(`[GroupImages] Adding featured image from post ${post.id}:`, post.featured_image);
            allImages.push({
              id: `${post.id}-featured`,
              url: post.featured_image!,
              postId: post.id,
              postTitle: post.post_title,
              authorName: post.author?.name || 'Unknown',
              authorAvatar: post.author?.avatar,
              postDate: post.post_date,
            });
          }

          // Add other images if they exist
          if (post.images && Array.isArray(post.images) && post.images.length > 0) {
            console.log(`[GroupImages] Post ${post.id} has ${post.images.length} images`);
            post.images.forEach((imageUrl: string | any, index: number) => {
              // Handle both string URLs and object formats
              const imgUrl = typeof imageUrl === 'string' ? imageUrl : imageUrl?.url;

              console.log(`[GroupImages] Image ${index} from post ${post.id}:`, imgUrl);

              // Avoid duplicates and only add valid URLs
              if (isValidImageUrl(imgUrl) && imgUrl !== post.featured_image) {
                allImages.push({
                  id: `${post.id}-image-${index}`,
                  url: imgUrl,
                  postId: post.id,
                  postTitle: post.post_title,
                  authorName: post.author?.name || 'Unknown',
                  authorAvatar: post.author?.avatar,
                  postDate: post.post_date,
                });
              }
            });
          }
        });
      }

      console.log('[GroupImages] Total images collected:', allImages.length);
      console.log('[GroupImages] Images array:', allImages);
      setImages(allImages);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to load images');
      }
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const handlePrevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href={`/groups/${groupId}`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Group
          </Link>
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-gray-500 text-lg">Group not found</p>
          <Link href="/groups" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700">
            Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/groups/${groupId}`} className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
            ← Back to {group.group_name}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Group Images</h1>
          <p className="text-gray-600 mt-2">
            {images.length} {images.length === 1 ? 'image' : 'images'} in this group
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Debug Info - Only show if no images found */}
        {images.length === 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <p className="font-semibold mb-2">Debug Information:</p>
            <p>Open the browser console (F12) to see detailed debug logs with the prefix "[GroupImages]"</p>
            <p className="mt-2">The logs will show:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Total posts fetched</li>
              <li>Featured images found</li>
              <li>Additional images in each post</li>
              <li>Total images collected</li>
            </ul>
          </div>
        )}

        {/* Images Gallery */}
        {images.length === 0 ? (
          <div className="bg-gray-50 rounded-lg shadow border border-gray-300 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500 text-lg mb-2">No images yet</p>
            <p className="text-gray-600">Create posts with images to see them here</p>
            <p className="text-gray-500 text-xs mt-4">Make sure posts have either a featured_image or images array with image URLs</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                onClick={() => handleImageClick(index)}
                className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden bg-gray-200 hover:shadow-lg transition-shadow"
              >
                <img
                  src={image.url}
                  alt={image.postTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onLoad={() => {
                    console.log('[GroupImages] Image loaded successfully:', image.url);
                  }}
                  onError={(e) => {
                    console.error('[GroupImages] Image failed to load - broken URL?:', image.url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Hover overlay with post title */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 from-0% to-transparent to-60% opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <div className="text-white text-xs font-medium w-full line-clamp-2">
                    {image.postTitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal - Full Screen Viewer */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          {selectedImageIndex > 0 && (
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next button */}
          {selectedImageIndex < images.length - 1 && (
            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image container */}
          <div className="flex flex-col items-center max-w-4xl max-h-[90vh] w-full">
            <img
              src={images[selectedImageIndex].url}
              alt={images[selectedImageIndex].postTitle}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />

            {/* Image info */}
            <div className="mt-4 text-center text-white w-full">
              <p className="text-lg font-semibold mb-2">{images[selectedImageIndex].postTitle}</p>
              <div className="flex items-center justify-center gap-2 mb-2">
                {images[selectedImageIndex].authorAvatar && (
                  <img
                    src={images[selectedImageIndex].authorAvatar}
                    alt={images[selectedImageIndex].authorName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <span className="text-sm">{images[selectedImageIndex].authorName}</span>
              </div>
              <p className="text-xs text-gray-400">
                {new Date(images[selectedImageIndex].postDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {selectedImageIndex + 1} of {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
