import { config } from './config.js';
import { formatDateTime, logger } from './logger.js';
import { checkSupabaseConnection, runOnce } from './worker.js';

async function main() {
  await checkSupabaseConnection();
  logger.info('Đang chạy 1 chu kỳ worker thủ công', {
    'Số bài mỗi lượt': config.batchSize,
    'Chế độ': config.dryRun ? 'Dry-run' : 'Đăng thật'
  });
  const summary = await runOnce({ force: true });
  const details = {
    'Khung đăng tiếp theo': summary.nextOpportunitySlot
      ? `${summary.nextOpportunitySlot.label} (${formatDateTime(summary.nextOpportunitySlot.scheduledAt)})`
      : null,
    'Có thể đăng tiếp theo vào': summary.nextOpportunityAt
      ? formatDateTime(summary.nextOpportunityAt)
      : null
  };

  if (summary.postedCount > 0 && summary.failedCount === 0) {
    logger.success(`Chạy tay thành công ${summary.postedCount} bài`, details);
  } else if (summary.failedCount > 0) {
    logger.error(`Chạy tay có ${summary.failedCount} bài thất bại`, details);
  } else if (summary.dryRunCount > 0) {
    logger.success(`Dry-run thành công ${summary.dryRunCount} bài`, details);
  } else {
    logger.info('Chạy tay kết thúc nhưng không có bài nào được đăng', details);
  }
  logger.info('Đã chạy xong 1 chu kỳ worker thủ công');
}

main().catch((error) => {
  logger.error('Chạy worker 1 lần bị lỗi', {
    'Lý do': error.message
  });
  process.exitCode = 1;
});
