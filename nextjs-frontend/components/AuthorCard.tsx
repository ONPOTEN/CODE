'use client';

import Link from 'next/link';

interface Author {
  id: number;
  username?: string;
  display_name?: string;
  user_nicename?: string;
  avatar?: string;
  location?: string;
  company?: string;
  role?: string;
}

interface AuthorCardProps {
  author: Author;
  createdAt: string;
  compact?: boolean;
  showAvatar?: boolean;
}

export function AuthorCard({ author, createdAt, compact = false, showAvatar = false }: AuthorCardProps) {
  const authorName = author.display_name || author.username || author.user_nicename || 'Anonymous';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {showAvatar && author.avatar && (
          <img
            src={author.avatar}
            alt={authorName}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
          />
        )}
        <div className="flex-1 min-w-0">
          <Link
            href={`/users/${author.id}`}
            className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors truncate block"
            title={authorName}
          >
            {authorName}
          </Link>
          <p className="text-xs text-gray-500">{formatDate(createdAt)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-200">
      {showAvatar && author.avatar && (
        <Link href={`/users/${author.id}`} className="flex-shrink-0">
          <img
            src={author.avatar}
            alt={authorName}
            className="w-12 h-12 rounded-full object-cover border border-gray-200 hover:border-blue-400 transition-colors"
          />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <Link
          href={`/users/${author.id}`}
          className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors inline-block"
        >
          {authorName}
        </Link>
        {author.role && (
          <span className="ml-2 text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {author.role}
          </span>
        )}
        {(author.location || author.company) && (
          <p className="text-sm text-gray-600 mt-1">
            {author.location && <span>{author.location}</span>}
            {author.location && author.company && <span className="mx-2">•</span>}
            {author.company && <span>{author.company}</span>}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1">{formatDate(createdAt)}</p>
      </div>
    </div>
  );
}

export default AuthorCard;
