import { buildPostMessage } from './content.js';
import { publishProduct } from './facebook.js';
import { buildFallbackCopy, generateProductCopy } from './gemini.js';
import { formatDateTime, logger } from './logger.js';
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
import { getActiveScheduleSlot, getMinPostGapMs, getNextPostingOpportunity } from './schedule.js';

function formatProductLabel(product) {
  return product.name ? `${product.name} (#${product.id})` : `#${product.id}`;
}

function formatSlotLabel(slot) {
  if (!slot) {
    return null;
  }

  return `${slot.label} (${formatDateTime(slot.scheduledAt)} - ${formatDateTime(slot.windowEnd)})`;
}

function resolveNextOpportunity(scheduleDecision) {
  const now = new Date();

  if (scheduleDecision.reason === 'minimum_gap_not_reached' && scheduleDecision.nextAllowedAt) {
    return getNextPostingOpportunity(now, new Date(scheduleDecision.nextAllowedAt));
  }

  if (scheduleDecision.reason === 'slot_already_posted') {
    return getNextPostingOpportunity(now, new Date(now.getTime() + 1000));
  }

  return getNextPostingOpportunity(now);
}

async function processProduct(product) {
  let aiCopy;
  try {
    aiCopy = await generateProductCopy(product);
  } catch (error) {
    logger.warn('Gemini lỗi, chuyển sang nội dung dự phòng', {
      'Sản phẩm': formatProductLabel(product),
      'Lý do': error.message
    });
    aiCopy = buildFallbackCopy(product);
  }

  const message = buildPostMessage(product, aiCopy);
  logger.info('Đang đăng bài lên Facebook', {
    'Sản phẩm': formatProductLabel(product),
    'Số ảnh': product.images.length,
    'Cập nhật lúc': product.updated_at ? formatDateTime(product.updated_at) : null
  });

  try {
    if (config.dryRun) {
      logger.info('Dry-run: đã tạo nội dung bài đăng', {
        'Sản phẩm': formatProductLabel(product),
        'Số ảnh': product.images.length,
        'Nội dung xem trước': message
      });
      return {
        status: 'dry_run',
        productId: product.id,
        productName: product.name || null
      };
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
    logger.success('Đã đăng bài thành công', {
      'Sản phẩm': formatProductLabel(product),
      'Facebook post ID': result.facebookPostId,
      'API endpoint': result.endpoint
    });
    return {
      status: 'posted',
      productId: product.id,
      productName: product.name || null,
      facebookPostId: result.facebookPostId
    };
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
        logger.error('Không ghi được lịch sử đăng bài', {
          'Sản phẩm': formatProductLabel(product),
          'Lý do': historyError.message
        });
      }
    }

    logger.error('Đăng bài thất bại', {
      'Sản phẩm': formatProductLabel(product),
      'Lý do': error.message,
      'Mã lỗi': error.code,
      'Loại lỗi': error.type
    });
    return {
      status: 'failed',
      productId: product.id,
      productName: product.name || null,
      error: error.message
    };
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
  const nextOpportunity = resolveNextOpportunity(scheduleDecision);
  const cycleSummary = {
    status: 'idle',
    reason: null,
    force: Boolean(options.force),
    dryRun: config.dryRun,
    productCount: 0,
    postedCount: 0,
    failedCount: 0,
    dryRunCount: 0,
    results: [],
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
    nextAllowedAt: toIsoOrNull(scheduleDecision.nextAllowedAt),
    nextOpportunityAt: nextOpportunity?.availableAt?.toISOString() || null,
    nextOpportunitySlot: nextOpportunity
      ? {
          label: nextOpportunity.label,
          scheduledAt: nextOpportunity.scheduledAt.toISOString(),
          windowEnd: nextOpportunity.windowEnd.toISOString()
        }
      : null
  };

  if (!scheduleDecision.allowed) {
    cycleSummary.reason = scheduleDecision.reason;
    logger.info('Chưa đăng bài trong chu kỳ này', {
      'Lý do':
        {
          outside_schedule: 'Chưa đến khung giờ đăng',
          slot_already_posted: 'Khung giờ hiện tại đã có bài đăng',
          minimum_gap_not_reached: 'Chưa đủ khoảng cách tối thiểu giữa hai bài đăng'
        }[scheduleDecision.reason] || scheduleDecision.reason,
      'Khung hiện tại': formatSlotLabel(scheduleDecision.slot),
      'Bài gần nhất': cycleSummary.latestPostedAt ? formatDateTime(cycleSummary.latestPostedAt) : null,
      'Được đăng sớm nhất từ': cycleSummary.nextAllowedAt
        ? formatDateTime(cycleSummary.nextAllowedAt)
        : null,
      'Có thể đăng tiếp theo vào': cycleSummary.nextOpportunityAt
        ? formatDateTime(cycleSummary.nextOpportunityAt)
        : null,
      'Khung đăng tiếp theo': cycleSummary.nextOpportunitySlot
        ? `${cycleSummary.nextOpportunitySlot.label} (${formatDateTime(
            cycleSummary.nextOpportunitySlot.scheduledAt
          )})`
        : null
    });
    return cycleSummary;
  }

  const recentPostCount = await countRecentPosts(1);
  if (!config.dryRun && recentPostCount >= config.maxPostsPerHour) {
    cycleSummary.reason = 'hourly_rate_limit_reached';
    logger.warn('Bỏ qua chu kỳ vì đã chạm giới hạn bài đăng trong 1 giờ', {
      'Số bài trong 1 giờ gần nhất': recentPostCount,
      'Giới hạn cấu hình': config.maxPostsPerHour
    });
    return cycleSummary;
  }

  const products = await fetchProductsForPosting(1);
  cycleSummary.productCount = products.length;

  if (products.length === 0) {
    cycleSummary.reason = 'no_eligible_products';
    logger.info('Không có sản phẩm hợp lệ để đăng', {
      'Khung hiện tại': formatSlotLabel(scheduleDecision.slot)
    });
    return cycleSummary;
  }

  cycleSummary.reason = config.dryRun ? 'ready_to_preview' : 'ready_to_post';
  logger.info(`Đã chọn ${products.length} sản phẩm để xử lý`, {
    'Khung đăng': formatSlotLabel(scheduleDecision.slot),
    'Chế độ': config.dryRun ? 'Dry-run' : 'Đăng thật',
    'Chạy cưỡng bức': Boolean(options.force) ? 'Có' : null
  });

  for (const [index, product] of products.entries()) {
    if (index > 0) {
      const delay = randomBetween(config.minPostDelayMs, config.maxPostDelayMs);
      logger.info('Đang chờ trước khi đăng bài tiếp theo', {
        'Thời gian chờ': `${Math.round(delay / 1000)} giây`,
        'Sản phẩm kế tiếp': formatProductLabel(product)
      });
      await sleep(delay);
    }

    const result = await processProduct(product);
    cycleSummary.results.push(result);

    if (result.status === 'posted') {
      cycleSummary.postedCount += 1;
    } else if (result.status === 'failed') {
      cycleSummary.failedCount += 1;
    } else if (result.status === 'dry_run') {
      cycleSummary.dryRunCount += 1;
    }
  }

  cycleSummary.reason = cycleSummary.failedCount > 0 ? 'completed_with_failures' : 'completed';
  return cycleSummary;
}

export async function checkSupabaseConnection() {
  const count = await testProductsConnection();
  logger.success('Kết nối Supabase sẵn sàng', {
    'Bảng dữ liệu': 'products',
    'Tổng sản phẩm': count,
    'Chế độ': config.dryRun ? 'Dry-run' : 'Đăng thật'
  });
}
