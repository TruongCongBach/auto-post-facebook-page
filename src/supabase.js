import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { dedupe, randomBetween } from './utils.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function extractImages(product) {
  const mediaImages = Array.isArray(product.media)
    ? product.media
        .filter((item) => item?.type === 'image' && item?.src)
        .map((item) => item.src)
    : [];

  const uniqueImages = dedupe([product.default_image, ...mediaImages]).slice(0, config.maxImagesPerPost);
  const shuffledImages = [...uniqueImages];

  for (let index = shuffledImages.length - 1; index > 0; index -= 1) {
    const swapIndex = randomBetween(0, index);
    [shuffledImages[index], shuffledImages[swapIndex]] = [shuffledImages[swapIndex], shuffledImages[index]];
  }

  const imageCount = randomBetween(1, Math.min(shuffledImages.length, config.maxImagesPerPost));

  return shuffledImages.slice(0, imageCount);
}

function normalizeProduct(product) {
  return {
    ...product,
    image_url: extractImages(product)[0] || null,
    images: extractImages(product)
  };
}

export async function testProductsConnection() {
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

function hasImages(product) {
  return Array.isArray(product.images) && product.images.length > 0;
}

function pickRandomProducts(products, limit) {
  const pool = [...products];
  const selected = [];
  const maxItems = Math.min(limit, pool.length);

  while (selected.length < maxItems) {
    const index = randomBetween(0, pool.length - 1);
    selected.push(pool[index]);
    pool.splice(index, 1);
  }

  return selected;
}

async function fetchUnpostedProducts(limit) {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,short_description,price,default_image,media,created_at,updated_at,url,posted_face_at')
    .is('posted_face_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeProduct).filter(hasImages);
}

async function fetchRepostCandidates(limit) {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,short_description,price,default_image,media,created_at,updated_at,url,posted_face_at')
    .not('posted_face_at', 'is', null)
    .order('posted_face_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeProduct).filter(hasImages);
}

export async function fetchProductsForPosting(limit) {
  const candidateLimit = Math.max(limit, 10);
  const unposted = await fetchUnpostedProducts(candidateLimit);

  if (unposted.length >= limit) {
    return pickRandomProducts(unposted, limit);
  }

  const reposts = await fetchRepostCandidates(candidateLimit);

  if (unposted.length > 0) {
    return pickRandomProducts(unposted, limit);
  }

  return pickRandomProducts(reposts, limit);
}

export async function markProductPosted(productId, facebookPostId) {
  const { error } = await supabase
    .from('products')
    .update({
      posted_face_at: new Date().toISOString()
    })
    .eq('id', productId);

  if (error) {
    throw error;
  }
}

export async function insertPostHistory(entry) {
  const { error } = await supabase
    .from('facebook_post_history')
    .insert(entry);

  if (error) {
    throw error;
  }
}

export async function countRecentPosts(hours = 1) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('facebook_post_history')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'posted')
    .gte('created_at', since);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function countPostedInWindow(start, end) {
  const { count, error } = await supabase
    .from('facebook_post_history')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'posted')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function fetchLatestPostedAt() {
  const { data, error } = await supabase
    .from('facebook_post_history')
    .select('posted_at,created_at')
    .eq('status', 'posted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.posted_at || data?.created_at || null;
}
