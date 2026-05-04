'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export interface FBPostCardProps {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content?: string;
  images?: string[];
  createdAt: string;
  likes?: number;
  comments?: number;
  shares?: number;
  isLiked?: boolean;
  showComments?: boolean;
}

export default function FBPostCard({
  id,
  author,
  content = '',
  images = [],
  createdAt,
  likes = 0,
  comments = 0,
  shares = 0,
  isLiked = false,
  showComments = false,
}: FBPostCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  const handleComment = () => {
    if (commentText.trim()) {
      // TODO: Gửi bình luận
      setCommentText('');
      setShowCommentInput(false);
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <article className="fb-post-card mb-4">
      {/* Tiêu đề bài viết */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/users/${author.id}`} className="flex items-center gap-3 hover:underline">
          <div className="w-10 h-10 rounded-full bg-fb-blue flex items-center justify-center overflow-hidden">
            {author.avatar ? (
              <Image src={author.avatar} alt={author.name} width={40} height={40} className="object-cover" />
            ) : (
              <span className="text-sm font-semibold text-white">{author.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-text-primary hover:underline">{author.name}</p>
            <p className="text-fb-xs text-text-secondary flex items-center gap-1">
              <span>{formatTime(createdAt)}</span>
              <span>·</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </p>
          </div>
        </Link>
        <button className="w-9 h-9 rounded-full hover:bg-bg-hover flex items-center justify-center transition-colors">
          <svg className="w-5 h-5 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Nội dung bài viết */}
      {content && (
        <div className="px-4 pb-3">
          <p className="text-fb-base text-text-primary whitespace-pre-wrap">{content}</p>
        </div>
      )}

      {/* Hình ảnh bài viết */}
      {images.length > 0 && (
        <div className={`relative bg-neutral-100 ${images.length === 1 ? 'aspect-auto' : 'aspect-[4/3]'}`}>
          {images.length === 1 ? (
            <div className="relative w-full">
              <Image
                src={images[0]}
                alt="Hình ảnh bài viết"
                width={680}
                height={400}
                className="w-full h-auto object-cover"
              />
            </div>
          ) : images.length === 2 ? (
            <div className="grid grid-cols-2 gap-0.5 h-full">
              {images.map((img, index) => (
                <div key={index} className="relative h-full">
                  <Image
                    src={img}
                    alt={`Hình ảnh bài viết ${index + 1}`}
                    width={340}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5 h-full">
              {images.slice(0, 4).map((img, index) => (
                <div key={index} className={`relative ${index === 0 && images.length > 2 ? 'row-span-2' : ''}`}>
                  <Image
                    src={img}
                    alt={`Hình ảnh bài viết ${index + 1}`}
                    width={340}
                    height={index === 0 && images.length > 2 ? 600 : 300}
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-2xl font-semibold">+{images.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Thống kê bài viết */}
      {(likeCount > 0 || comments > 0 || shares > 0) && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200/50">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-fb-blue flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z" />
                </svg>
              </div>
            </div>
            <span className="text-fb-sm text-text-secondary">
              {likeCount > 0 && <span className="font-semibold text-text-primary">{likeCount}</span>}
              {likeCount > 0 && comments > 0 && ' '}
              {comments > 0 && <span>{comments} bình luận</span>}
            </span>
          </div>
          <div className="text-fb-sm text-text-secondary">
            {shares > 0 && <span>{shares} chia sẻ</span>}
          </div>
        </div>
      )}

      {/* Hành động bài viết */}
      <div className="flex items-center justify-around px-2 py-1 border-t border-neutral-200/50">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-150 ${
            liked ? 'text-fb-blue' : 'text-text-secondary hover:bg-bg-hover'
          }`}
        >
          <svg className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={liked ? 0 : 2}
              d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"
            />
          </svg>
          <span className="font-semibold">{liked ? 'Đã thích' : 'Thích'}</span>
        </button>
        <button
          onClick={() => setShowCommentInput(!showCommentInput)}
          className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:bg-bg-hover rounded-lg transition-all duration-150"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            />
          </svg>
          <span className="font-semibold">Bình luận</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:bg-bg-hover rounded-lg transition-all duration-150">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13"
            />
          </svg>
          <span className="font-semibold">Chia sẻ</span>
        </button>
      </div>

      {/* Ô nhập bình luận */}
      {showCommentInput && (
        <div className="p-4 border-t border-neutral-200/50">
          <div className="flex gap-2">
            <div className="w-9 h-9 rounded-full bg-neutral-300 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-text-primary">U</span>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Viết bình luận..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                className="flex-1 h-9 px-3 bg-bg-base rounded-full text-fb-sm placeholder-text-secondary hover:bg-white focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-400 transition-all duration-150"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="w-9 h-9 rounded-full bg-fb-blue text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phần bình luận */}
      {showComments && comments > 0 && (
        <div className="p-4 border-t border-neutral-200/50">
          {/* Bình luận giả lập - trong ứng dụng thật, sẽ lấy bình luận thực tế */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-white">N</span>
              </div>
              <div className="fb-comment-bubble flex-1">
                <p className="text-fb-sm">
                  <span className="font-semibold">Nguyễn Văn A</span>{' '}
                  <span className="text-text-primary">Bài viết rất hay!</span>
                </p>
                <div className="flex items-center gap-2 mt-1 text-fb-xs text-text-secondary">
                  <button className="hover:underline">Thích</button>
                  <button className="hover:underline">Trả lời</button>
                  <span>2 giờ</span>
                </div>
              </div>
            </div>
          </div>
          <button className="mt-3 text-fb-sm text-text-secondary hover:underline">
            Xem tất cả {comments} bình luận
          </button>
        </div>
      )}
    </article>
  );
}
