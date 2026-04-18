import dotenv from 'dotenv';

dotenv.config();

function readRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }

  return parsed;
}

function readBoolean(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const config = {
  supabaseUrl: readRequired('SUPABASE_URL'),
  supabaseKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY,
  pageId: readRequired('PAGE_ID'),
  pageAccessToken: readRequired('PAGE_ACCESS_TOKEN'),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite',
  storeAddress: readRequired('STORE_ADDRESS'),
  storePhone: readRequired('STORE_PHONE'),
  storeMapUrl: readRequired('STORE_MAP_URL'),
  storeZaloUrl: readRequired('STORE_ZALO_URL'),
  baseProductUrl: readRequired('BASE_PRODUCT_URL'),
  graphApiVersion: process.env.GRAPH_API_VERSION || 'v22.0',
  batchSize: readNumber('POST_BATCH_SIZE', 5),
  productFetchMultiplier: readNumber('PRODUCT_FETCH_MULTIPLIER', 5),
  schedulerIntervalMs: readNumber('SCHEDULER_INTERVAL_MS', 60_000),
  minPostDelayMs: readNumber('MIN_POST_DELAY_MS', 8_000),
  maxPostDelayMs: readNumber('MAX_POST_DELAY_MS', 15_000),
  maxPostsPerHour: readNumber('MAX_POSTS_PER_HOUR', 10),
  maxImagesPerPost: readNumber('MAX_IMAGES_PER_POST', 5),
  dryRun: readBoolean('DRY_RUN', false),
  postWithEmojis: readBoolean('POST_WITH_EMOJIS', true)
};

if (!config.supabaseKey) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE, or SUPABASE_ANON_KEY');
}

if (config.minPostDelayMs > config.maxPostDelayMs) {
  throw new Error('MIN_POST_DELAY_MS must be less than or equal to MAX_POST_DELAY_MS');
}

if (config.maxImagesPerPost < 1) {
  throw new Error('MAX_IMAGES_PER_POST must be greater than or equal to 1');
}
