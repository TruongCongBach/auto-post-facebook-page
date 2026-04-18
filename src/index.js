import { config } from './config.js';
import { logger } from './logger.js';
import { checkSupabaseConnection, runOnce } from './worker.js';
import { sleep } from './utils.js';

let shuttingDown = false;

function logCycleResult(summary, startedAt) {
  const meta = {
    startedAt,
    force: summary.force,
    dryRun: summary.dryRun,
    productCount: summary.productCount,
    postedCount: summary.postedCount,
    failedCount: summary.failedCount,
    dryRunCount: summary.dryRunCount,
    slot: summary.slot,
    latestPostedAt: summary.latestPostedAt,
    nextAllowedAt: summary.nextAllowedAt,
    results: summary.results
  };

  if (summary.postedCount > 0 && summary.failedCount === 0) {
    logger.success(`Đã đăng thành công ${summary.postedCount} bài trong chu kỳ này`, meta);
    return;
  }

  if (summary.failedCount > 0) {
    logger.error(`Chu kỳ này có ${summary.failedCount} bài đăng thất bại`, meta);
    return;
  }

  if (summary.reason === 'no_eligible_products') {
    logger.info('Chu kỳ này không có sản phẩm hợp lệ để đăng', meta);
    return;
  }

  if (summary.reason === 'outside_schedule') {
    logger.info('Chu kỳ này chưa đến khung giờ đăng', meta);
    return;
  }

  if (summary.reason === 'slot_already_posted') {
    logger.info('Chu kỳ này đã có bài trong khung giờ hiện tại', meta);
    return;
  }

  if (summary.reason === 'minimum_gap_not_reached') {
    logger.info('Chu kỳ này chưa đủ khoảng cách tối thiểu để đăng bài mới', meta);
    return;
  }

  if (summary.reason === 'hourly_rate_limit_reached') {
    logger.warn('Chu kỳ này bị bỏ qua vì chạm giới hạn số bài trong 1 giờ', meta);
    return;
  }

  if (summary.dryRunCount > 0) {
    logger.success(`Dry-run thành công ${summary.dryRunCount} bài`, meta);
    return;
  }

  logger.info('Chu kỳ này đã hoàn tất', meta);
}

async function loop() {
  await checkSupabaseConnection();

  logger.success('Worker đăng Facebook đã khởi động', {
    intervalMs: config.schedulerIntervalMs,
    batchSize: config.batchSize,
    maxPostsPerHour: config.maxPostsPerHour
  });

  while (!shuttingDown) {
    const cycleStartedAt = Date.now();
    const cycleStartedAtIso = new Date(cycleStartedAt).toISOString();

    try {
      logger.info('Bắt đầu chu kỳ kiểm tra', {
        startedAt: cycleStartedAtIso
      });

      const summary = await runOnce();
      logCycleResult(summary, cycleStartedAtIso);
    } catch (error) {
      logger.error('Chu kỳ worker bị lỗi', {
        error: error.message
      });
    }

    const elapsed = Date.now() - cycleStartedAt;
    const waitMs = Math.max(config.schedulerIntervalMs - elapsed, 0);

    if (!shuttingDown) {
      logger.info('Kết thúc chu kỳ, chờ lần chạy tiếp theo', {
        elapsedMs: elapsed,
        nextRunInMs: waitMs
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
    error: error.message
  });
  process.exitCode = 1;
});
