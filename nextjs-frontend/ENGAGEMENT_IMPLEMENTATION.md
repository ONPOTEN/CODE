# Facebook-Like Engagement System - Next.js Implementation

## 🎯 Overview

Complete Facebook-style engagement system for your Next.js frontend with real-time updates via Socket.io, fully integrated with your Laravel backend.

**Features:**
- ✅ Real-time likes/dislikes with mutual exclusivity
- ✅ Comment system with threading support
- ✅ Multi-platform share tracking
- ✅ Socket.io real-time updates
- ✅ Full CRUD operations
- ✅ User state management
- ✅ Loading states & error handling

---

## 📦 Files Created

### Services
- **`lib/engagementService.ts`** - Socket.io & API integration service

### Context & Hooks
- **`contexts/EngagementContext.tsx`** - State management with Context API + Hooks

### Components
- **`components/EngagementButtons.tsx`** - Like, Dislike, Share buttons with menu
- **`components/CommentsSection.tsx`** - Comments display and management with threading

---

## ⚡ Quick Start

### 1. Wrap Your App with Provider

In your `app/layout.tsx`:

```tsx
'use client';

import { EngagementProvider } from '@/contexts/EngagementContext';
import { useAuth } from '@/contexts/AuthContext'; // Your auth context

export default function RootLayout({ children }) {
  const { token } = useAuth();

  return (
    <html>
      <body>
        <EngagementProvider token={token || ''}>
          {children}
        </EngagementProvider>
      </body>
    </html>
  );
}
```

### 2. Use in Your Post Components

```tsx
'use client';

import { EngagementButtons } from '@/components/EngagementButtons';
import { CommentsSection } from '@/components/CommentsSection';
import { useEngagement } from '@/contexts/EngagementContext';

export function PostCard({ post, currentUserId }) {
  const { engagements } = useEngagement();
  const engagement = engagements.get(post.id);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-2">{post.title}</h2>
      <p className="text-gray-700 mb-4">{post.content}</p>

      {/* Engagement Stats */}
      {engagement && (
        <div className="text-sm text-gray-600 mb-4 flex gap-4">
          <span>{engagement.likes.count} likes</span>
          <span>{engagement.comments.count} comments</span>
          <span>{engagement.shares.count} shares</span>
        </div>
      )}

      {/* Engagement Buttons */}
      <EngagementButtons postId={post.id} showLabels={true} className="mb-4" />

      {/* Comments Section */}
      <CommentsSection postId={post.id} currentUserId={currentUserId} />
    </div>
  );
}
```

---

## 🔌 Socket.io Integration

### Real-Time Events

The service automatically listens for these events:

**From Backend:**
- `engagement:like-added` - New like received
- `engagement:like-removed` - Like removed
- `engagement:dislike-added` - New dislike received
- `engagement:dislike-removed` - Dislike removed
- `engagement:comment-added` - New comment received
- `engagement:comment-updated` - Comment edited
- `engagement:comment-removed` - Comment deleted
- `engagement:share-added` - New share received

**Automatic UI Updates:**
All counts and user statuses update in real-time without page refresh.

---

## 📚 API Integration

### Engagement Service Methods

```typescript
// Like/Dislike
await engagementService.likePost(postId);
await engagementService.unlikePost(postId);
await engagementService.dislikePost(postId);
await engagementService.removeDislikePost(postId);

// Shares
await engagementService.sharePost(postId, 'facebook');

// Stats
await engagementService.getEngagementStats(postId);
await engagementService.getPostLikes(postId, page);
await engagementService.getPostShares(postId, page);

// Comments
await engagementService.getPostComments(postId, page);
await engagementService.createComment(postId, content, parentId);
await engagementService.updateComment(commentId, content);
await engagementService.deleteComment(commentId);
```

### Context Hooks

```typescript
import { useEngagement } from '@/contexts/EngagementContext';

function MyComponent() {
  const {
    // Data
    engagements,           // Map<postId, Engagement>
    comments,              // Map<postId, Comment[]>

    // Actions
    toggleLike,            // (postId) => Promise<void>
    toggleDislike,         // (postId) => Promise<void>
    sharePost,             // (postId, platform) => Promise<void>
    addComment,            // (postId, content, parentId?) => Promise<void>
    updateComment,         // (commentId, content) => Promise<void>
    deleteComment,         // (postId, commentId) => Promise<void>

    // Fetching
    fetchEngagementStats,  // (postId) => Promise<void>
    fetchComments,         // (postId, page?) => Promise<void>
    fetchLikes,            // (postId, page?) => Promise<any>
    fetchShares,           // (postId, page?) => Promise<any>

    // Real-time
    socketConnected,       // boolean
    socketError,           // string | null
  } = useEngagement();
}
```

---

## 🎨 Component Usage

### EngagementButtons Component

```tsx
<EngagementButtons
  postId={1}
  showLabels={true}           // Show text labels
  compact={false}             // Compact mode (smaller buttons)
  className="gap-2"           // Custom CSS
/>
```

**Features:**
- Like button with count
- Dislike button with count
- Share button with platform menu
- Comment button with scroll-to-section
- Auto-loads engagement stats
- Real-time count updates
- Loading states

### CommentsSection Component

```tsx
<CommentsSection
  postId={1}
  currentUserId={userId}      // For edit/delete checks
  className="mt-4"            // Custom CSS
/>
```

**Features:**
- Display all comments with pagination
- Reply to comments (threading)
- Edit own comments
- Delete own comments
- Show pending approval status
- Real-time comment additions
- Load more button

---

## 🔄 Real-Time Flow Example

### When User Likes a Post:

```
1. User clicks Like button
   ↓
2. toggleLike() called
   ↓
3. API call: POST /posts/{id}/like
   ↓
4. Backend processes, emits Socket event
   ↓
5. Socket.io event received: 'engagement:like-added'
   ↓
6. Context updates: engagement.likes.count++
   ↓
7. UI re-renders automatically (React state)
   ↓
8. Other users see updated count in real-time
```

---

## ⚙️ Configuration

### Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

### Custom API Base URL

In your components:

```tsx
// Option 1: Use default from env
// (automatically uses NEXT_PUBLIC_API_URL)

// Option 2: Initialize with custom URL
// Already handled in EngagementService singleton
```

---

## 🔐 Authentication

The service automatically includes Bearer token in all requests:

```typescript
// In EngagementProvider
await engagementService.initializeSocket(token);

// Token is used in all API calls
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}
```

---

## 🎯 Advanced Usage

### Manual Stats Fetching

```tsx
import { useEngagement } from '@/contexts/EngagementContext';

function MyComponent({ postId }) {
  const { engagements, fetchEngagementStats } = useEngagement();

  useEffect(() => {
    // Manually fetch engagement stats
    fetchEngagementStats(postId);
  }, [postId]);

  return (
    <div>
      Likes: {engagements.get(postId)?.likes.count}
    </div>
  );
}
```

### Listening to Real-Time Events

```tsx
import engagementService from '@/lib/engagementService';

useEffect(() => {
  // Listen to specific events
  engagementService.on('comment-added', (data) => {
    console.log('New comment:', data);
  });

  return () => {
    engagementService.off('comment-added');
  };
}, []);
```

### Custom Share Handler

```tsx
const handleCustomShare = async (postId, platform) => {
  // Add custom logic here
  if (platform === 'custom') {
    // Do something special
  }

  await sharePost(postId, platform);
};
```

---

## 🧪 Testing

### Test Like Functionality

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { EngagementButtons } from '@/components/EngagementButtons';
import { EngagementProvider } from '@/contexts/EngagementContext';

test('Like button updates count', async () => {
  const { rerender } = render(
    <EngagementProvider token="test-token">
      <EngagementButtons postId={1} />
    </EngagementProvider>
  );

  const likeButton = screen.getByTitle('Like this post');
  fireEvent.click(likeButton);

  // Wait for async update
  await screen.findByText(/1/);
});
```

---

## 📊 Performance Optimization

### 1. Lazy Load Comments

```tsx
<CommentsSection
  postId={postId}
  // Comments loaded on demand
/>
```

### 2. Memoize Components

```tsx
import { memo } from 'react';

const EngagementButtons = memo(function EngagementButtons(props) {
  // Won't re-render unless props change
  return ...;
});
```

### 3. Use Selective Subscriptions

```tsx
// Only subscribe to relevant posts
useEffect(() => {
  engagementService.on(`engagement:post-${postId}`, handler);
}, [postId]);
```

---

## 🐛 Troubleshooting

### Socket Connection Issues

```typescript
const { socketConnected, socketError } = useEngagement();

if (!socketConnected) {
  return <div>Reconnecting... {socketError}</div>;
}
```

### API Errors

```typescript
try {
  await toggleLike(postId);
} catch (error) {
  console.error('Like failed:', error);
  // Show user-friendly error message
}
```

### Token Expiration

```typescript
// Ensure token is refreshed before initialization
const { token, refreshToken } = useAuth();

useEffect(() => {
  if (token) {
    initializeEngagement(token);
  }
}, [token]);
```

---

## 📈 Backend Integration Checklist

- [ ] Laravel API running at `NEXT_PUBLIC_API_URL`
- [ ] All migrations run (`php artisan migrate`)
- [ ] Socket.io server configured
- [ ] CORS enabled for Next.js frontend
- [ ] Authentication tokens working
- [ ] POST endpoints return proper responses
- [ ] Real-time events broadcasting correctly

---

## 🚀 Deployment

### Production Setup

1. **Update Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://your-api.com
NEXT_PUBLIC_SOCKET_URL=https://your-api.com
```

2. **SSL Certificate:**
Ensure HTTPS is configured on backend for Socket.io

3. **CORS Configuration:**
Add frontend domain to Laravel CORS config

4. **Build & Deploy:**
```bash
npm run build
npm start
```

---

## 📚 Related Files

### Backend
- Laravel API: `/laravel-api/`
- Engagement Controller: `app/Http/Controllers/Api/EngagementController.php`
- Comment Controller: `app/Http/Controllers/Api/CommentController.php`

### Frontend
- Engagement Service: `lib/engagementService.ts`
- Engagement Context: `contexts/EngagementContext.tsx`
- Components: `components/Engagement*.tsx`

---

## 🔗 API Reference

See `/laravel-api/ENGAGEMENT_API.md` for complete API documentation.

---

## 💡 Tips & Best Practices

1. **Always wrap components with EngagementProvider**
2. **Use memoization for heavy components**
3. **Handle errors gracefully**
4. **Test Socket.io connection on startup**
5. **Validate user input before submission**
6. **Use pagination for large comment lists**
7. **Implement rate limiting on client-side**

---

## 📞 Support

For issues or questions:
1. Check Socket.io connection status
2. Verify API endpoints are accessible
3. Check browser console for errors
4. Ensure authentication token is valid
5. Review backend logs

---

**Status: ✅ Ready for Production**

All files created and integrated with your Next.js frontend and Laravel backend.
