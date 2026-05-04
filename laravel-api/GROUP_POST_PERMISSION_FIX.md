# Group Post Delete Permission Fix

## Problem
When trying to delete a group post as a group owner, the API returned:
```
HTTP/1.1 403 Forbidden
{
  "error": "Unauthorized",
  "message": "You do not have permission to delete this post"
}
```

## Root Causes
1. **Incomplete Permission Logic**: The permission check in `GroupPostController::destroy()` method only allowed:
   - Post author (who created the post)
   - Global admin (site administrator)

   It did NOT allow:
   - Group owner (who owns the group the post belongs to)

2. **Missing Relationship Loading**: The route uses `{id}` parameter instead of `{post}`, which means implicit model binding doesn't work with the typed `GroupPost $post` parameter. The `group()` relationship was never being loaded, so `$post->group` was always null even for valid posts.

## Solution

Updated the authorization logic in `GroupPostController` for the following methods:

### 1. `destroy()` method (DELETE post)
**Before:**
```php
public function destroy(GroupPost $post): JsonResponse {
    // Implicit model binding with typed parameter
    // But route uses {id}, so $post->group never loads
    if ($post->post_author !== auth()->id() && !auth()->user()->isAdmin()) {
        return response()->json([...], 403);
    }
}
```

**After:**
```php
public function destroy($id): JsonResponse {
    // Manually load post with group relationship
    $post = GroupPost::with('group')->findOrFail($id);

    $userId = auth()->id();
    $isPostAuthor = $post->post_author === $userId;
    $isGroupOwner = $post->group && $post->group->group_owner_id === $userId;
    $isGlobalAdmin = auth()->user() && auth()->user()->isAdmin();

    if (!$isPostAuthor && !$isGroupOwner && !$isGlobalAdmin) {
        return response()->json([...], 403);
    }
}
```

**Key Changes:**
- Changed parameter from `GroupPost $post` to `$id`
- Manually loaded post with `->with('group')` to ensure relationship is available
- Added group owner check: `$isGroupOwner = $post->group && $post->group->group_owner_id === $userId`

### 2. `update()` method (UPDATE post)
**Changes:**
- Changed parameter from `GroupPost $post` to `$id`
- Manually load post with relationship: `$post = GroupPost::with('group')->findOrFail($id)`
- Added group owner check

### 3. `setFeaturedImage()` method
**Changes:**
- Changed parameter from `GroupPost $post` to `$id`
- Manually load post with relationship
- Added group owner check

### 4. `bulkDelete()` method (BULK DELETE)
Enhanced to allow group owners to bulk delete posts in their groups:
```php
if (!$isGlobalAdmin) {
    $query->where(function ($q) use ($userId) {
        $q->where('post_author', $userId)
          ->orWhereHas('group', function ($g) use ($userId) {
              $g->where('group_owner_id', $userId);
          });
    });
}
```

## Permission Hierarchy

After this fix, post management permissions work as follows:

| Action | Post Author | Group Owner | Global Admin | Regular Member |
|--------|:-----------:|:-----------:|:------------:|:--------------:|
| Delete | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Set Featured Image | ✅ | ✅ | ✅ | ❌ |
| View | ✅ | ✅ | ✅ | ✅ |
| Like/Dislike | ✅ | ✅ | ✅ | ✅ |

## What This Enables

- **Group Owners** can now moderate content in their groups
- **Group Owners** can delete inappropriate posts from other members
- **Group Owners** can edit post details if needed
- **Group Owners** can manage featured images for posts

## Files Modified

- `laravel-api/app/Http/Controllers/Api/GroupPostController.php`
  - Lines 131-145: `update()` method
  - Lines 187-214: `destroy()` method
  - Lines 285-324: `bulkDelete()` method
  - Lines 530-544: `setFeaturedImage()` method

## Testing

To verify the fix works:

1. **Create a group** as User A
2. **Join the group** as User B
3. **Create a post** as User B
4. **Try to delete the post** as User A (group owner) - should succeed ✅
5. **Try to delete the post** as User C (non-member) - should fail ❌

## API Response Examples

### Success (Group Owner Deleting Member's Post)
```
DELETE /api/v1/group-posts/3
Status: 200 OK
{
  "message": "Group post deleted successfully"
}
```

### Error (Non-Authorized User)
```
DELETE /api/v1/group-posts/3
Status: 403 Forbidden
{
  "error": "Unauthorized",
  "message": "You do not have permission to delete this post"
}
```

## Related Features

This permission model aligns with:
- Group admin role assignment (group creators are auto-admins)
- Group member moderation features
- Post approval/rejection system (admin/moderator only)
- Group management dashboard

## Future Enhancements

Consider adding:
1. Role-based permissions (moderator role can delete posts)
2. Post deletion logs for audit trail
3. Soft deletes instead of hard deletes
4. Bulk edit operations for group owners
5. Post visibility override by group owner
