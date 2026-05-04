# Engagement System - Quick Start (5 Minutes)

## 🚀 Setup

### Step 1: Verify Provider is Configured

Edit your `app/layout.tsx` or main layout file:

```tsx
'use client';

import { EngagementProvider } from '@/contexts/EngagementContext';

export default function RootLayout({ children }) {
  const token = localStorage.getItem('auth_token') || '';

  return (
    <html>
      <body>
        <EngagementProvider token={token}>
          {children}
        </EngagementProvider>
      </body>
    </html>
  );
}
```

### Step 2: Add Components to Post

```tsx
'use client';

import { EngagementButtons } from '@/components/EngagementButtons';
import { CommentsSection } from '@/components/CommentsSection';

export function PostCard({ post, userId }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2>{post.title}</h2>
      <p>{post.content}</p>

      {/* Add these two lines */}
      <EngagementButtons postId={post.id} showLabels={true} />
      <CommentsSection postId={post.id} currentUserId={userId} />
    </div>
  );
}
```

### Step 3: Done! ✅

That's it. Everything works now:
- Real-time likes/dislikes
- Comments with threading
- Share tracking
- Socket.io updates

---

## 📖 Usage Examples

### Example 1: Display Engagement Stats

```tsx
import { useEngagement } from '@/contexts/EngagementContext';

export function PostStats({ postId }) {
  const { engagements } = useEngagement();
  const stats = engagements.get(postId);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="flex gap-4 text-sm">
      <span>👍 {stats.likes.count}</span>
      <span>👎 {stats.dislikes.count}</span>
      <span>💬 {stats.comments.count}</span>
      <span>📤 {stats.shares.count}</span>
    </div>
  );
}
```

### Example 2: Manual Like Action

```tsx
import { useEngagement } from '@/contexts/EngagementContext';

export function LikeButton({ postId }) {
  const { toggleLike, engagements } = useEngagement();
  const stats = engagements.get(postId);

  return (
    <button
      onClick={() => toggleLike(postId)}
      className={stats?.likes.user_liked ? 'text-blue-500' : 'text-gray-500'}
    >
      👍 Like
    </button>
  );
}
```

### Example 3: Manual Comment Posting

```tsx
import { useEngagement } from '@/contexts/EngagementContext';
import { useState } from 'react';

export function CommentForm({ postId }) {
  const { addComment } = useEngagement();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await addComment(postId, text);
      setText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your comment..."
        rows={3}
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Posting...' : 'Post'}
      </button>
    </div>
  );
}
```

---

## 🔌 Features at a Glance

| Feature | Status | Description |
|---------|--------|-------------|
| Like/Unlike | ✅ | Toggle likes with real-time updates |
| Dislike/Remove | ✅ | Toggle dislikes (mutually exclusive with likes) |
| Comments | ✅ | Full CRUD, threaded replies |
| Shares | ✅ | Multi-platform tracking |
| Real-time | ✅ | Socket.io instant updates |
| Threading | ✅ | Nested comment replies |
| Edit/Delete | ✅ | Manage your own comments |
| Pagination | ✅ | Load more comments/likes |

---

## 🎯 Common Tasks

### Get Comment Count
```tsx
const { engagements } = useEngagement();
const count = engagements.get(postId)?.comments.count;
```

### Check if User Liked
```tsx
const liked = engagements.get(postId)?.likes.user_liked;
```

### Share to Platform
```tsx
const { sharePost } = useEngagement();
await sharePost(postId, 'facebook');
```

### Listen to Real-time Events
```tsx
import engagementService from '@/lib/engagementService';

useEffect(() => {
  engagementService.on('comment-added', (data) => {
    console.log('New comment:', data);
  });

  return () => engagementService.off('comment-added');
}, []);
```

---

## 🔐 Environment Setup

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

For production:
```env
NEXT_PUBLIC_API_URL=https://your-api.com
NEXT_PUBLIC_SOCKET_URL=https://your-api.com
```

---

## 📱 Component Props

### EngagementButtons

```tsx
<EngagementButtons
  postId={number}              // Required: Post ID
  showLabels={boolean}         // Optional: Show text labels (default: true)
  compact={boolean}            // Optional: Smaller buttons (default: false)
  className={string}           // Optional: Custom CSS classes
/>
```

### CommentsSection

```tsx
<CommentsSection
  postId={number}              // Required: Post ID
  currentUserId={number}       // Optional: Current user ID (enables edit/delete)
  className={string}           // Optional: Custom CSS classes
/>
```

---

## ✅ Verification Checklist

- [ ] Provider wrapped in layout
- [ ] Components added to posts
- [ ] API URL configured in `.env.local`
- [ ] Can see engagement buttons
- [ ] Like button increments count
- [ ] Can post comments
- [ ] Real-time updates working
- [ ] Share menu appears

---

## 🐛 Quick Troubleshooting

**Socket not connecting?**
```
Check: NEXT_PUBLIC_SOCKET_URL in .env.local
Check: Backend running with Socket.io
```

**API 401 errors?**
```
Check: Token is valid
Check: Token passed to EngagementProvider
```

**Comments not loading?**
```
Check: Browser console for errors
Check: API endpoint accessible
```

**Real-time not working?**
```
Check: Socket connection status in browser devtools
Check: Backend broadcasting events
```

---

## 📚 More Info

- Full docs: `ENGAGEMENT_IMPLEMENTATION.md`
- Backend docs: `/laravel-api/ENGAGEMENT_API.md`
- API reference: `/laravel-api/ENGAGEMENT_SETUP.md`

---

**You're all set! Start using engagement now! 🎉**
