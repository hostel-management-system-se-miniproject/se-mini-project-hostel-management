'use strict';

const DEFAULT_SCHEDULE = '0 8 * * *'; // every day at 08:00 server time

// Starts the daily fee due-date job. It never throws: if notifications are off or
// node-cron cannot load, it logs why and the rest of the app keeps working.
function startFeeNotificationJob({ notifier, schedule = DEFAULT_SCHEDULE, cron, logger = console } = {}) {
  if (!notifier || !notifier.enabled) {
    logger.log('Fee notifications are disabled (no SMTP settings). The daily job is not scheduled.');
    return null;
  }

  try {
    const scheduler = cron || require('node-cron');
    const task = scheduler.schedule(schedule, async () => {
      try {
        const result = await notifier.run();
        logger.log(`Fee notification job finished: ${result.sent} sent, ${result.failed} failed.`);
      } catch (error) {
        logger.error(`Fee notification job failed: ${error.message}`);
      }
    });
    logger.log(`Fee notification job scheduled (${schedule}).`);
    return task;
  } catch (error) {
    logger.error(`Fee notification job could not start: ${error.message}`);
    return null;
  }
}

module.exports = { startFeeNotificationJob, DEFAULT_SCHEDULE };
