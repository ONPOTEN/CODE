# WordPress to Next.js Migration - Setup Guide

## ✅ What Has Been Created

Your WordPress frontend has been successfully converted to a modern Next.js application with the following features:

### Core Features
- ✅ Next.js 15 with App Router (latest stable version)
- ✅ TypeScript for type safety
- ✅ Tailwind CSS matching your original WordPress theme design
- ✅ Responsive mobile-first design
- ✅ WordPress REST API integration
- ✅ WooCommerce API integration

### Pages Created
1. **Home Page** (`/`) - Product grid with categories
2. **Product Detail** (`/san-pham/[slug]`) - Individual product pages
3. **Shopping Cart** (`/gio-hang`) - Cart functionality with localStorage
4. **Studio Page** (`/studio`) - Design service order form
5. **Category Pages** (`/danh-muc/[slug]`) - Category browsing

### Components Created
- `Header` - Navigation with search, cart, mobile menu
- `Footer` - Multi-column footer with links
- `ProductCard` - Product display with discounts, ratings
- `ProductGrid` - Responsive product grid layout
- `CategorySlider` - Horizontal scrolling category list
- `SearchBar` - Search functionality
- `CartIcon` - Dynamic cart count
- `AddToCartButton` - Add to cart with quantity selector
- `HeroBanner` - Hero section for homepage

## 🚀 Quick Start

### 1. Configure WooCommerce API Keys

Before running the app, you need to generate API keys in WordPress:

1. Go to WordPress Admin
2. Navigate to: **WooCommerce → Settings → Advanced → REST API**
3. Click **"Add Key"**
4. Fill in:
   - Description: `Next.js Frontend`
   - User: Select an admin user
   - Permissions: `Read/Write`
5. Click **"Generate API Key"**
6. **Copy the Consumer Key and Consumer Secret**

### 2. Update Environment Variables

Edit `.env.local` in the project root:

```env
WORDPRESS_API_URL=https://centimet2.com/wp-json/wp/v2
WOOCOMMERCE_API_URL=https://centimet2.com/wp-json/wc/v3
NEXT_PUBLIC_SITE_URL=https://centimet2.com

# Replace these with your actual keys
WC_CONSUMER_KEY=ck_1234567890abcdef1234567890abcdef12345678
WC_CONSUMER_SECRET=cs_1234567890abcdef1234567890abcdef12345678
```

### 3. Enable CORS in WordPress (If Needed)

If you encounter CORS errors, add this to your WordPress theme's `functions.php`:

```php
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        return $value;
    });
}, 15);
```

### 4. Run the Development Server

The server is already running at:
- **Local**: http://localhost:3000
- **Network**: http://192.168.1.100:3000

If you need to restart it:

```bash
cd nextjs-frontend
npm run dev
```

### 5. Test the Application

Visit http://localhost:3000 and verify:
- [ ] Products are loading from WordPress
- [ ] Categories are displaying
- [ ] Search is working
- [ ] Product details page loads
- [ ] Add to cart functionality works
- [ ] Cart page shows items
- [ ] Studio form submits

## 📁 Project Structure

```
nextjs-frontend/
├── app/                        # Next.js App Router
│   ├── layout.tsx             # Root layout (Header + Footer)
│   ├── page.tsx               # Home page
│   ├── globals.css            # Global styles with Tailwind
│   ├── san-pham/              # Product pages
│   │   └── [slug]/page.tsx   # Dynamic product detail
│   ├── danh-muc/              # Category pages
│   │   └── [slug]/page.tsx   # Dynamic category page
│   ├── studio/                # Design service page
│   │   └── page.tsx
│   └── gio-hang/              # Shopping cart
│       └── page.tsx
│
├── components/                 # React components
│   ├── Header.tsx             # Site header with nav
│   ├── Footer.tsx             # Site footer
│   ├── SearchBar.tsx          # Search functionality
│   ├── CartIcon.tsx           # Cart with item count
│   ├── ProductCard.tsx        # Individual product card
│   ├── ProductGrid.tsx        # Product grid layout
│   ├── CategorySlider.tsx     # Category carousel
│   ├── AddToCartButton.tsx    # Add to cart button
│   └── HeroBanner.tsx         # Homepage hero
│
├── lib/                       # Utilities
│   └── wordpress.ts           # WordPress/WooCommerce API
│
├── types/                     # TypeScript types
│   └── index.ts               # Product, Category, Cart types
│
├── public/                    # Static files
│   └── placeholder.svg        # Placeholder image
│
├── .env.local                 # Environment variables
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies
```

## 🎨 Design & Styling

The design closely matches your original WordPress Flatsome theme:

### Color Scheme
- **Primary**: `#f53d2d` (red/orange gradient - Shopee style)
- **Secondary**: `#f6470e` (orange)
- **Background**: `#f5f5f5` (light gray)

### Key Design Elements
- Product cards with hover effects and discount badges
- Category cards with circular images
- Shopee-style pricing and discounts
- Star ratings and sold counters
- Responsive grid layouts (2 cols mobile → 5 cols desktop)

## 🔧 Key APIs Used

### WordPress REST API
```
GET /wp-json/wp/v2/posts         # Blog posts
GET /wp-json/wp/v2/pages         # Pages
GET /wp-json/wp/v2/categories    # Post categories
```

### WooCommerce REST API
```
GET /wp-json/wc/v3/products                # Get products
GET /wp-json/wc/v3/products/:id            # Get single product
GET /wp-json/wc/v3/products/categories     # Get categories
POST /wp-json/wc/v3/orders                 # Create order
```

## 🔨 Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 📋 Next Steps

### Immediate Tasks
1. [ ] Generate and add WooCommerce API keys to `.env.local`
2. [ ] Test all pages and features
3. [ ] Configure CORS if needed
4. [ ] Add real product images

### Future Enhancements
1. [ ] Implement user authentication (JWT or NextAuth.js)
2. [ ] Add checkout and payment integration
3. [ ] Create user account/orders pages
4. [ ] Add product filtering and sorting
5. [ ] Implement product search with autocomplete
6. [ ] Add product reviews system
7. [ ] Create wishlist functionality
8. [ ] SEO optimization (meta tags, sitemaps)
9. [ ] Analytics integration (Google Analytics, etc.)
10. [ ] Performance optimization (caching, ISR)

### Production Deployment
Consider deploying to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Your own VPS** with Docker

## 🐛 Troubleshooting

### Products not loading
- Check WordPress REST API is enabled: visit `https://centimet2.com/wp-json/`
- Verify WooCommerce API keys are correct
- Check CORS headers are configured

### Build errors
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check all environment variables are set

### Cart not working
- Check browser localStorage is enabled
- Open browser DevTools → Application → Local Storage
- Verify cart data is being saved

## 📞 Support Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [WooCommerce REST API Docs](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## ✨ What's Different from WordPress?

| Feature | WordPress | Next.js |
|---------|-----------|---------|
| **Rendering** | Server-side PHP | Server-side React (RSC) + Client components |
| **Routing** | WordPress rewrite rules | File-based routing |
| **Data** | Direct database queries | REST API calls |
| **Styling** | CSS files | Tailwind CSS utility classes |
| **Cart** | WooCommerce sessions | LocalStorage (can be upgraded) |
| **Performance** | Traditional page load | Fast navigation, prefetching |
| **SEO** | WordPress SEO plugins | Built-in with App Router |

---

**Your Next.js frontend is now ready!** 🎉

The development server is running at: http://localhost:3000

Start by configuring your WooCommerce API keys and testing the application.
