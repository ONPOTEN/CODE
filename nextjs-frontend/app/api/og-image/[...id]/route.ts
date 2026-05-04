import { NextRequest, NextResponse } from 'next/server';

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'https://api.centimet2.com/api/v1';
const S3_BASE_URL = process.env.NEXT_PUBLIC_S3_STORAGE_URL || 'https://atm288528-s3user.vcos1.cloudstorage.com.vn';

export const dynamic = 'force-dynamic';

function isNumericId(id: string): boolean {
  return /^\d+$/.test(id);
}

async function getShopPostImageUrl(shopId: string, postId: string): Promise<string | null> {
  try {
    const endpoint = `/shops/${shopId}/posts/${postId}`;
    console.log(`[OG Image] Fetching shop post from: ${LARAVEL_API_URL}${endpoint}`);
    
    const response = await fetch(`${LARAVEL_API_URL}${endpoint}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10000),
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NextJS-OG-Image/1.0',
      },
    });

    console.log(`[OG Image] Shop post response status: ${response.status}`);

    if (!response.ok) {
      console.log(`[OG Image] Shop post failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const postData = data.data || data;
    
    let imageUrl = postData.main_image || postData.featured_images?.[0] || postData.featured_image || null;
    
    console.log(`[OG Image] Shop post image:`, imageUrl);

    if (imageUrl) {
      if (imageUrl.startsWith('/')) {
        imageUrl = `${S3_BASE_URL}${imageUrl}`;
      }
      console.log(`[OG Image] Found shop post image: ${imageUrl}`);
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error(`[OG Image] Error fetching shop post:`, error);
    return null;
  }
}

async function getPostImageUrl(type: string, id: string): Promise<string | null> {
  let endpoint: string;
  
  switch (type) {
    case 'group-post':
    case 'group':
      endpoint = `/group-posts/${id}`;
      break;
    case 'post':
    default:
      endpoint = isNumericId(id) ? `/posts/${id}` : `/posts/slug/${id}`;
      break;
  }

  try {
    console.log(`[OG Image] Fetching from: ${LARAVEL_API_URL}${endpoint}`);
    
    const response = await fetch(`${LARAVEL_API_URL}${endpoint}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10000),
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NextJS-OG-Image/1.0',
      },
    });

    console.log(`[OG Image] Response status: ${response.status}`);

    if (!response.ok) {
      console.log(`[OG Image] Failed: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const postData = data.data || data;
    
    console.log(`[OG Image] Data keys:`, Object.keys(postData));
    
    let imageUrl: string | null = null;

    if (type === 'group-post' || type === 'group') {
      imageUrl = postData.featured_image || postData.post?.featured_image || null;
      if (!imageUrl && postData.images?.length > 0) {
        const firstImage = postData.images[0];
        imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;
      }
      console.log(`[OG Image] Group post image:`, imageUrl);
    } else {
      imageUrl = postData.featured_image || null;
      if (!imageUrl && postData.images?.length > 0) {
        const firstImage = postData.images[0];
        imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;
      }
      console.log(`[OG Image] Post image:`, imageUrl);
    }

    if (imageUrl) {
      if (imageUrl.startsWith('/')) {
        imageUrl = `${S3_BASE_URL}${imageUrl}`;
      }
      console.log(`[OG Image] Found image: ${imageUrl}`);
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error(`[OG Image] Error:`, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  const { id } = await params;
  
  let imageUrl: string | null = null;

  console.log(`[OG Image] Request: id array =`, id);

  try {
    if (id.length >= 3 && id[id.length - 2] === 'posts') {
      const shopId = id[id.length - 3];
      const postId = id[id.length - 1];
      console.log(`[OG Image] Shop post: shopId=${shopId}, postId=${postId}`);
      imageUrl = await getShopPostImageUrl(shopId, postId);
    } else if (id.length === 2) {
      const type = id[0];
      const postId = id[1];
      console.log(`[OG Image] Type: ${type}, id: ${postId}`);
      imageUrl = await getPostImageUrl(type, postId);
    } else if (id.length === 1) {
      const postId = id[0];
      console.log(`[OG Image] Default post id: ${postId}`);
      imageUrl = await getPostImageUrl('post', postId);
    }
  } catch (error) {
    console.error('[OG Image] Error getting image URL:', error);
  }

  if (!imageUrl) {
    return new NextResponse('Image not found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  console.log(`[OG Image] Fetching from S3: ${imageUrl}`);

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': 'FacebookBot/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[OG Image] S3 Error: ${response.status}`);
      return new NextResponse('Failed to fetch image from S3', { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[OG Image] Error:', error);
    return new NextResponse('Internal server error', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
