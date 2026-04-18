import { config } from './config.js';
import { logger } from './logger.js';
import { checkSupabaseConnection, runOnce } from './worker.js';

async function main() {
  await checkSupabaseConnection();
  logger.info('Đang chạy 1 chu kỳ worker thủ công', {
    batchSize: config.batchSize,
    dryRun: config.dryRun,
    force: true
  });
  const summary = await runOnce({ force: true });
  if (summary.postedCount > 0 && summary.failedCount === 0) {
    logger.success(`Chạy tay thành công ${summary.postedCount} bài`, {
      status: summary.reason,
      results: summary.results
    });
  } else if (summary.failedCount > 0) {
    logger.error(`Chạy tay có ${summary.failedCount} bài thất bại`, {
      status: summary.reason,
      results: summary.results
    });
  } else if (summary.dryRunCount > 0) {
    logger.success(`Dry-run thành công ${summary.dryRunCount} bài`, {
      status: summary.reason,
      results: summary.results
    });
  } else {
    logger.info('Chạy tay kết thúc nhưng không có bài nào được đăng', {
      status: summary.reason,
      results: summary.results
    });
  }
  logger.info('Đã chạy xong 1 chu kỳ worker thủ công');
}

main().catch((error) => {
  logger.error('Chạy worker 1 lần bị lỗi', {
    error: error.message
  });
  process.exitCode = 1;
});
