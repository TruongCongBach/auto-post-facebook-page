import { config } from './config.js';
import { formatDateTime, logger } from './logger.js';
import { checkSupabaseConnection, runOnce } from './worker.js';
import { sleep } from './utils.js';

let shuttingDown = false;

function logCycleResult(summary) {
  const sharedDetails = {
    'Chế độ': summary.dryRun ? 'Dry-run' : 'Đăng thật',
    'Số sản phẩm xử lý': summary.productCount || null,
    'Khung đăng tiếp theo': summary.nextOpportunitySlot
      ? `${summary.nextOpportunitySlot.label} (${formatDateTime(summary.nextOpportunitySlot.scheduledAt)})`
      : null,
    'Có thể đăng tiếp theo vào': summary.nextOpportunityAt
      ? formatDateTime(summary.nextOpportunityAt)
      : null
  };

  if (summary.postedCount > 0 && summary.failedCount === 0) {
    logger.success(`Đã đăng thành công ${summary.postedCount} bài trong chu kỳ này`, sharedDetails);
    return;
  }

  if (summary.failedCount > 0) {
    logger.error(`Chu kỳ này có ${summary.failedCount} bài đăng thất bại`, sharedDetails);
    return;
  }

  if (summary.reason === 'no_eligible_products') {
    logger.info('Chu kỳ này không có sản phẩm hợp lệ để đăng', sharedDetails);
    return;
  }

  if (summary.reason === 'outside_schedule') {
    logger.info('Chu kỳ này chưa đến khung giờ đăng', sharedDetails);
    return;
  }

  if (summary.reason === 'slot_already_posted') {
    logger.info('Chu kỳ này đã có bài trong khung giờ hiện tại', sharedDetails);
    return;
  }

  if (summary.reason === 'minimum_gap_not_reached') {
    logger.info('Chu kỳ này chưa đủ khoảng cách tối thiểu để đăng bài mới', sharedDetails);
    return;
  }

  if (summary.reason === 'hourly_rate_limit_reached') {
    logger.warn('Chu kỳ này bị bỏ qua vì chạm giới hạn số bài trong 1 giờ', sharedDetails);
    return;
  }

  if (summary.dryRunCount > 0) {
    logger.success(`Dry-run thành công ${summary.dryRunCount} bài`, sharedDetails);
    return;
  }

  logger.info('Chu kỳ này đã hoàn tất', sharedDetails);
}

async function loop() {
  await checkSupabaseConnection();

  logger.success('Worker đăng Facebook đã khởi động', {
    'Chu kỳ quét': `${Math.round(config.schedulerIntervalMs / 1000)} giây`,
    'Số bài mỗi lượt': config.batchSize,
    'Giới hạn 1 giờ': config.maxPostsPerHour
  });

  while (!shuttingDown) {
    const cycleStartedAt = Date.now();
    const cycleStartedAtIso = new Date(cycleStartedAt).toISOString();

    try {
      logger.info('Bắt đầu chu kỳ kiểm tra', {
        'Thời điểm': formatDateTime(cycleStartedAtIso)
      });

      const summary = await runOnce();
      logCycleResult(summary);
    } catch (error) {
      logger.error('Chu kỳ worker bị lỗi', {
        'Lý do': error.message
      });
    }

    const elapsed = Date.now() - cycleStartedAt;
    const waitMs = Math.max(config.schedulerIntervalMs - elapsed, 0);

    if (!shuttingDown) {
      const nextRunAt = new Date(Date.now() + waitMs);
      logger.info('Kết thúc chu kỳ, chờ lần chạy tiếp theo', {
        'Thời gian xử lý': `${Math.round(elapsed / 1000)} giây`,
        'Lần kiểm tra tiếp theo': formatDateTime(nextRunAt)
      });
      await sleep(waitMs);
    }
  }

  logger.warn('Worker đăng Facebook đã dừng');
}

function setupSignal(signal) {
  process.on(signal, () => {
    logger.warn(`Nhận tín hiệu ${signal}, đang tắt worker an toàn`);
    shuttingDown = true;
  });
}

setupSignal('SIGINT');
setupSignal('SIGTERM');

loop().catch((error) => {
  logger.error('Worker bị lỗi nghiêm trọng', {
    'Lý do': error.message
  });
  process.exitCode = 1;
});
