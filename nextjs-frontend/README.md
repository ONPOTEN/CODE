# Next.js Frontend for WordPress/WooCommerce

This is a Next.js 15 frontend that connects to your WordPress/WooCommerce backend API.

## Features

- ✅ Server-side rendering with Next.js 15 App Router
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for styling (matches your WordPress theme design)
- ✅ WordPress REST API integration
- ✅ WooCommerce API integration
- ✅ Product listing and detail pages
- ✅ Shopping cart functionality
- ✅ Category browsing
- ✅ Search functionality
- ✅ Custom pages (Studio, Design Order Form)
- ✅ Responsive design (mobile-first)
- ✅ Image optimization with Next.js Image

## Prerequisites

Before running this project, you need to:

1. **Enable WordPress REST API** (already enabled by default in WordPress)

2. **Generate WooCommerce API Keys:**
   - Go to WordPress Admin → WooCommerce → Settings → Advanced → REST API
   - Click "Add Key"
   - Description: "Next.js Frontend"
   - User: Select an admin user
   - Permissions: Read/Write
   - Copy the Consumer Key and Consumer Secret

3. **Enable CORS in WordPress** (if needed):
   Add this to your WordPress `functions.php`:
   ```php
   add_action('rest_api_init', function() {
       remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
       add_filter('rest_pre_serve_request', function($value) {
           header('Access-Control-Allow-Origin: *');
           header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
           header('Access-Control-Allow-Credentials: true');
           return $value;
       });
   }, 15);
   ```

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd nextjs-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Edit the `.env.local` file and add your WooCommerce API credentials:
   ```env
   WORDPRESS_API_URL=https://centimet2.com/wp-json/wp/v2
   WOOCOMMERCE_API_URL=https://centimet2.com/wp-json/wc/v3
   NEXT_PUBLIC_SITE_URL=https://centimet2.com

   WC_CONSUMER_KEY=ck_your_consumer_key_here
   WC_CONSUMER_SECRET=cs_your_consumer_secret_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
nextjs-frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with Header/Footer
│   ├── page.tsx           # Home page
│   ├── san-pham/          # Product pages
│   │   └── [slug]/        # Dynamic product detail
│   ├── danh-muc/          # Category pages
│   ├── studio/            # Studio page (design service)
│   └── gio-hang/          # Shopping cart
├── components/            # React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── CategorySlider.tsx
│   ├── AddToCartButton.tsx
│   └── ...
├── lib/                   # Utility functions
│   └── wordpress.ts       # WordPress/WooCommerce API functions
├── types/                 # TypeScript type definitions
│   └── index.ts
└── public/                # Static files
```

## Key Pages

- **Home** (`/`) - Featured products and categories
- **Product Detail** (`/san-pham/[slug]`) - Individual product page
- **Category** (`/danh-muc/[slug]`) - Category product listing
- **Cart** (`/gio-hang`) - Shopping cart
- **Studio** (`/studio`) - Design service order form

## API Integration

### WordPress REST API
- Posts: `/wp-json/wp/v2/posts`
- Pages: `/wp-json/wp/v2/pages`
- Categories: `/wp-json/wp/v2/categories`

### WooCommerce REST API
- Products: `/wp-json/wc/v3/products`
- Categories: `/wp-json/wc/v3/products/categories`
- Orders: `/wp-json/wc/v3/orders`

See `lib/wordpress.ts` for all API functions.

## Styling

This project uses:
- **Tailwind CSS** for utility-first styling
- **Custom CSS classes** matching your WordPress theme design
- **Colors:**
  - Primary: `#f53d2d` (red/orange - Shopee style)
  - Secondary: `#f6470e` (orange)

The design closely matches your original WordPress Flatsome theme.

## Cart Functionality

The shopping cart uses browser `localStorage` for client-side state management. For production, consider:
- Moving cart to server-side with sessions
- Using a state management library (Zustand, Redux)
- Integrating with WooCommerce cart API

## Building for Production

```bash
npm run build
npm start
```

## Deployment

You can deploy this Next.js app to:
- **Vercel** (recommended) - Easy deployment with GitHub integration
- **Netlify** - Static site hosting with serverless functions
- **Your own server** - Using Node.js or Docker

### Vercel Deployment:
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Todo / Future Enhancements

- [ ] Implement user authentication (JWT)
- [ ] Add user account pages (orders, profile)
- [ ] Integrate checkout process with WooCommerce
- [ ] Add payment gateway integration
- [ ] Implement product search with autocomplete
- [ ] Add product reviews/ratings
- [ ] Implement wishlist functionality
- [ ] Add breadcrumbs navigation
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Analytics integration
- [ ] Add loading states and error boundaries
- [ ] Implement caching strategy
- [ ] Add tests (Jest, React Testing Library)

## Support

For issues or questions:
- Check WordPress REST API: `https://centimet2.com/wp-json/`
- Check WooCommerce API: `https://centimet2.com/wp-json/wc/v3/`
- Review Next.js docs: [nextjs.org/docs](https://nextjs.org/docs)

## License

MIT
