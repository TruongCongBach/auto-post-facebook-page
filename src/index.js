import { config } from './config.js';
import { logger } from './logger.js';
import { checkSupabaseConnection, runOnce } from './worker.js';
import { sleep } from './utils.js';

let shuttingDown = false;

async function loop() {
  await checkSupabaseConnection();

  logger.info('Facebook posting worker started', {
    intervalMs: config.schedulerIntervalMs,
    batchSize: config.batchSize,
    maxPostsPerHour: config.maxPostsPerHour
  });

  while (!shuttingDown) {
    const cycleStartedAt = Date.now();

    try {
      await runOnce();
    } catch (error) {
      logger.error('Worker cycle failed', {
        error: error.message
      });
    }

    const elapsed = Date.now() - cycleStartedAt;
    const waitMs = Math.max(config.schedulerIntervalMs - elapsed, 0);

    if (!shuttingDown) {
      logger.info('Worker cycle completed', {
        elapsedMs: elapsed,
        nextRunInMs: waitMs
      });
      await sleep(waitMs);
    }
  }

  logger.info('Facebook posting worker stopped');
}

function setupSignal(signal) {
  process.on(signal, () => {
    logger.warn(`Received ${signal}, shutting down gracefully`);
    shuttingDown = true;
  });
}

setupSignal('SIGINT');
setupSignal('SIGTERM');

loop().catch((error) => {
  logger.error('Fatal worker error', {
    error: error.message
  });
  process.exitCode = 1;
});
