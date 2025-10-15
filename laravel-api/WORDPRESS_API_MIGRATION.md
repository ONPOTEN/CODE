# WordPress to Laravel API Migration Guide

## Overview

This Laravel API provides a RESTful interface to your existing WordPress database, allowing you to access WordPress content through modern API endpoints without migrating data.

## Database Analysis

Your WordPress installation (`centimet2`) contains:
- **2,795 posts** (post type: `post`)
- **854 products** (WooCommerce)
- **238 autonews posts** (custom post type)
- Custom post types: `cm2_product`, `cm2_order`, `cm2_shop`, `cm2_report`, `cm2_appeal`
- BuddyPress social features (activity, groups, messages)
- Custom tables: `wp_cm2_activity`, `wp_cm2_messages`, `wp_videos`, `wp_zalo_users`

## Installation

### 1. Install Dependencies
```bash
cd laravel-api
composer install
```

### 2. Configure Environment
The `.env` file is already configured:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=centimet2
DB_USERNAME=root
DB_PASSWORD=123456
```

### 3. Start Development Server
```bash
php artisan serve
```

API available at: `http://localhost:8000`

## API Endpoints

### Base URL
All endpoints: `/api/v1`

### Authentication
```
POST /api/v1/auth/login
POST /api/v1/auth/logout
```

### Posts
```
GET  /api/v1/posts                    # List published posts
GET  /api/v1/posts/{id}               # Get by ID
GET  /api/v1/posts/slug/{slug}        # Get by slug
GET  /api/v1/posts/type/{type}        # Get by type
```

**Query Parameters:**
- `type` - Filter by post type
- `search` - Search title/content
- `order_by` - Sort field (default: post_date)
- `order` - asc/desc (default: desc)
- `per_page` - Max 100 (default: 15)
- `include_meta` - Include metadata

### Users
```
GET  /api/v1/users                    # List users
GET  /api/v1/users/{id}               # Get by ID
GET  /api/v1/users/username/{username} # Get by username
```

## Example Requests

### Get All Posts
```bash
curl http://localhost:8000/api/v1/posts
```

### Get WooCommerce Products
```bash
curl http://localhost:8000/api/v1/posts/type/product
```

### Search Posts
```bash
curl "http://localhost:8000/api/v1/posts?search=keyword&per_page=20"
```

### Get Post by Slug
```bash
curl http://localhost:8000/api/v1/posts/slug/my-post-slug
```

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

## Response Format

### Post Resource
```json
{
  "id": 1,
  "title": "Post Title",
  "slug": "post-slug",
  "content": "Content...",
  "excerpt": "Excerpt...",
  "status": "publish",
  "type": "post",
  "author": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "display_name": "Admin"
  },
  "created_at": "2025-01-01T00:00:00+00:00",
  "updated_at": "2025-01-02T00:00:00+00:00",
  "featured_image": "https://example.com/image.jpg",
  "comments_count": 5
}
```

### Paginated Response
```json
{
  "data": [...],
  "links": {
    "first": "...",
    "last": "...",
    "prev": null,
    "next": "..."
  },
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 150
  }
}
```

## Models Created

- `WpPost` - WordPress posts/pages/custom types
- `WpUser` - WordPress users
- `WpPostMeta` - Post metadata
- `WpUserMeta` - User metadata
- `WpComment` - Comments

## Custom Post Types

Access your custom content:
```bash
# CM2 Products
curl http://localhost:8000/api/v1/posts/type/cm2_product

# Auto News
curl http://localhost:8000/api/v1/posts/type/autonews_post

# WooCommerce Products
curl http://localhost:8000/api/v1/posts/type/product
```

## Authentication Setup

### Production Authentication
Install WordPress password library:
```bash
composer require hautelook/phpass
```

Update `AuthController.php`:
```php
protected function verifyWordPressPassword(string $password, string $hash): bool
{
    $hasher = new PasswordHash(8, true);
    return $hasher->CheckPassword($password, $hash);
}
```

### Sanctum Tokens
For secure API access, implement token authentication in `AuthController`:
```php
$token = $user->createToken('api-token')->plainTextToken;
return response()->json(['token' => $token]);
```

## CORS Configuration

Edit `config/cors.php`:
```php
'paths' => ['api/*'],
'allowed_origins' => ['*'], // Or specific domains
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
```

## Performance

### Enable Caching
```bash
php artisan config:cache
php artisan route:cache
```

### Rate Limiting
In `app/Http/Kernel.php`:
```php
'api' => [
    'throttle:60,1', // 60 requests/minute
],
```

## Migration Strategies

### 1. Gradual Migration
- Keep WordPress running
- Add Laravel API alongside
- Migrate features incrementally

### 2. Headless CMS
- WordPress for content management
- Laravel API for content delivery
- Frontend consumes API (React/Vue/Mobile)

### 3. Complete Migration
- Replace WordPress frontend
- Keep database structure
- Build new frontend on API

## Security

1. ✅ Sensitive data filtered (passwords, keys)
2. ⏳ Implement Sanctum authentication
3. ⏳ Add rate limiting
4. ⏳ Use HTTPS in production
5. ⏳ Validate all inputs
6. ⏳ Use read-only DB user if only reading

## Next Steps

1. ✅ Models created
2. ✅ Controllers created
3. ✅ Routes configured
4. ✅ Authentication scaffold
5. ⏳ Install `hautelook/phpass`
6. ⏳ Implement Sanctum tokens
7. ⏳ Add BuddyPress endpoints
8. ⏳ Add WooCommerce endpoints
9. ⏳ API documentation (Swagger)
10. ⏳ Deploy to production

## Files Created

```
laravel-api/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   ├── PostController.php
│   │   │   └── UserController.php
│   │   └── Resources/
│   │       ├── PostResource.php
│   │       └── UserResource.php
│   └── Models/
│       ├── WpPost.php
│       ├── WpUser.php
│       ├── WpPostMeta.php
│       ├── WpUserMeta.php
│       └── WpComment.php
├── routes/
│   └── api.php (configured)
└── .env (configured with WordPress database)
```

## Testing the API

Start server:
```bash
php artisan serve
```

Test endpoints:
```bash
# List posts
curl http://localhost:8000/api/v1/posts

# Get specific post
curl http://localhost:8000/api/v1/posts/1

# Search
curl "http://localhost:8000/api/v1/posts?search=test"
```

## Support Resources

- [Laravel Docs](https://laravel.com/docs)
- [Sanctum Docs](https://laravel.com/docs/sanctum)
- [WordPress DB Schema](https://codex.wordpress.org/Database_Description)

## License

MIT License
