import { buildPostMessage } from './content.js';
import { publishProduct } from './facebook.js';
import { buildFallbackCopy, generateProductCopy } from './gemini.js';
import { logger } from './logger.js';
import {
  countPostedInWindow,
  countRecentPosts,
  fetchProductsForPosting,
  fetchLatestPostedAt,
  insertPostHistory,
  markProductPosted,
  testProductsConnection
} from './supabase.js';
import { config } from './config.js';
import { randomBetween, sleep } from './utils.js';
import { getActiveScheduleSlot, getMinPostGapMs } from './schedule.js';

async function processProduct(product) {
  let aiCopy;
  try {
    aiCopy = await generateProductCopy(product);
  } catch (error) {
    logger.warn('Gemini generation failed, using fallback copy', {
      productId: product.id,
      error: error.message
    });
    aiCopy = buildFallbackCopy(product);
  }

  const message = buildPostMessage(product, aiCopy);
  logger.info('Posting product to Facebook', {
    productId: product.id,
    updatedAt: product.updated_at || null,
    imageCount: product.images.length
  });

  try {
    if (config.dryRun) {
      logger.info('Dry-run mode: generated Facebook post content', {
        productId: product.id,
        imageUrls: product.images,
        preview: message
      });
      return;
    }

    const result = await publishProduct(product, message);
    await markProductPosted(product.id, result.facebookPostId);
    await insertPostHistory({
      product_id: product.id,
      facebook_post_id: result.facebookPostId,
      status: 'posted',
      message,
      images: product.images,
      posted_at: new Date().toISOString()
    });
    logger.info('Product posted successfully', {
      productId: product.id,
      facebookPostId: result.facebookPostId,
      endpoint: result.endpoint
    });
  } catch (error) {
    if (!config.dryRun) {
      try {
        await insertPostHistory({
          product_id: product.id,
          status: 'failed',
          message,
          images: product.images,
          error_message: String(error.message || 'Unknown error').slice(0, 1000)
        });
      } catch (historyError) {
        logger.error('Failed to write Facebook post history', {
          productId: product.id,
          error: historyError.message
        });
      }
    }

    logger.error('Failed to post product', {
      productId: product.id,
      error: error.message,
      code: error.code,
      type: error.type
    });
  }
}

function toIsoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

async function canPostNow({ force = false } = {}) {
  if (force) {
    return {
      allowed: true,
      reason: 'forced_run'
    };
  }

  const slot = getActiveScheduleSlot();

  if (!slot) {
    return {
      allowed: false,
      reason: 'outside_schedule'
    };
  }

  const [postedInSlot, latestPostedAt] = await Promise.all([
    countPostedInWindow(slot.windowStart, slot.windowEnd),
    fetchLatestPostedAt()
  ]);

  if (postedInSlot > 0) {
    return {
      allowed: false,
      reason: 'slot_already_posted',
      slot
    };
  }

  if (latestPostedAt) {
    const latestPostedTime = new Date(latestPostedAt).getTime();
    const minAllowedAt = latestPostedTime + getMinPostGapMs();

    if (Date.now() < minAllowedAt) {
      return {
        allowed: false,
        reason: 'minimum_gap_not_reached',
        slot,
        latestPostedAt,
        nextAllowedAt: new Date(minAllowedAt).toISOString()
      };
    }
  }

  return {
    allowed: true,
    reason: 'within_schedule',
    slot,
    latestPostedAt
  };
}

export async function runOnce(options = {}) {
  const scheduleDecision = await canPostNow(options);

  if (!scheduleDecision.allowed) {
    logger.info('Skipping worker cycle due to schedule rules', {
      reason: scheduleDecision.reason,
      slot: scheduleDecision.slot
        ? {
            key: scheduleDecision.slot.key,
            label: scheduleDecision.slot.label,
            scheduledAt: scheduleDecision.slot.scheduledAt.toISOString(),
            windowStart: scheduleDecision.slot.windowStart.toISOString(),
            windowEnd: scheduleDecision.slot.windowEnd.toISOString()
          }
        : null,
      latestPostedAt: toIsoOrNull(scheduleDecision.latestPostedAt),
      nextAllowedAt: toIsoOrNull(scheduleDecision.nextAllowedAt)
    });
    return;
  }

  const recentPostCount = await countRecentPosts(1);
  if (!config.dryRun && recentPostCount >= config.maxPostsPerHour) {
    logger.warn('Rate limit reached for the last hour, skipping this cycle', {
      recentPostCount,
      maxPostsPerHour: config.maxPostsPerHour
    });
    return;
  }

  const products = await fetchProductsForPosting(1);

  if (products.length === 0) {
    logger.info('No eligible products found in Supabase');
    return;
  }

  logger.info('Selected products for posting', {
    count: products.length,
    slot: scheduleDecision.slot
      ? {
          key: scheduleDecision.slot.key,
          label: scheduleDecision.slot.label,
          scheduledAt: scheduleDecision.slot.scheduledAt.toISOString()
        }
      : null,
    force: Boolean(options.force)
  });

  for (const [index, product] of products.entries()) {
    if (index > 0) {
      const delay = randomBetween(config.minPostDelayMs, config.maxPostDelayMs);
      logger.info('Waiting before next Facebook post', {
        delayMs: delay,
        productId: product.id
      });
      await sleep(delay);
    }

    await processProduct(product);
  }
}

export async function checkSupabaseConnection() {
  const count = await testProductsConnection();
  logger.info('Supabase connection ready', {
    table: 'products',
    totalProducts: count,
    dryRun: config.dryRun
  });
}
