const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || 'https://centimet2.com/wp-json/wp/v2';
const WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL || 'https://centimet2.com/wp-json/wc/v3';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${WORDPRESS_API_URL}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch from WordPress API: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchWooCommerceAPI(endpoint: string, options: RequestInit = {}) {
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;

  const url = new URL(`${WOOCOMMERCE_API_URL}${endpoint}`);

  // Add authentication
  if (consumerKey && consumerSecret) {
    url.searchParams.append('consumer_key', consumerKey);
    url.searchParams.append('consumer_secret', consumerSecret);
  }

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch from WooCommerce API: ${res.statusText}`);
  }

  return res.json();
}

export async function getProducts(params?: { per_page?: number; page?: number; category?: string }) {
  const searchParams = new URLSearchParams();

  if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.category) searchParams.append('category', params.category);

  const query = searchParams.toString() ? `?${searchParams}` : '';
  return fetchWooCommerceAPI(`/products${query}`);
}

export async function getProduct(id: string | number) {
  return fetchWooCommerceAPI(`/products/${id}`);
}

export async function getCategories(params?: { per_page?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.per_page) searchParams.append('per_page', params.per_page.toString());

  const query = searchParams.toString() ? `?${searchParams}` : '';
  return fetchWooCommerceAPI(`/products/categories${query}`);
}

export async function getPosts(params?: { per_page?: number; page?: number }) {
  const searchParams = new URLSearchParams();

  if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
  if (params?.page) searchParams.append('page', params.page.toString());

  const query = searchParams.toString() ? `?${searchParams}` : '';
  return fetchAPI(`/posts${query}`);
}

export async function getPost(slug: string) {
  const posts = await fetchAPI(`/posts?slug=${slug}`);
  return posts[0];
}
