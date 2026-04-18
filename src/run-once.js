import { config } from './config.js';
import { logger } from './logger.js';
import { checkSupabaseConnection, runOnce } from './worker.js';

async function main() {
  await checkSupabaseConnection();
  logger.info('Running single worker cycle', {
    batchSize: config.batchSize,
    dryRun: config.dryRun,
    force: true
  });
  await runOnce({ force: true });
  logger.info('Single worker cycle finished');
}

main().catch((error) => {
  logger.error('Run-once execution failed', {
    error: error.message
  });
  process.exitCode = 1;
});
