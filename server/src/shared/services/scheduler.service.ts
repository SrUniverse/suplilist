import cron from 'node-cron';
import SupplementService from '../../modules/supplements/application/supplement.service.js';

/**
 * Scheduler service for background tasks (daily Firecrawl, etc.)
 *
 * Runs crawlAllSources() daily at 2:00 AM UTC to update supplement prices
 * from Amazon, Mercado Livre, and Shopee.
 */
export class SchedulerService {
  private static instance: SchedulerService;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {}

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Initialize scheduler and start all background jobs
   */
  async initialize(): Promise<void> {
    this.startDailySupplementCrawl();
    console.log('[Scheduler] Background jobs initialized');
  }

  /**
   * Run supplement crawl at 2:00 AM UTC daily
   * Cron format: minute hour day month day-of-week
   * 0 2 * * * = every day at 02:00 UTC
   */
  private startDailySupplementCrawl(): void {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') {
      console.log('[Scheduler] Skipping daily crawl in test environment');
      return;
    }

    this.cronJob = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('[Scheduler] Starting daily supplement crawl...');
        await SupplementService.crawlAllSources();
        console.log('[Scheduler] Daily supplement crawl completed');
      } catch (error) {
        console.error('[Scheduler] Daily crawl failed:', error);
      }
    });

    console.log('[Scheduler] Daily supplement crawl scheduled for 02:00 UTC');
  }

  /**
   * Stop all scheduled jobs (for graceful shutdown)
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('[Scheduler] All background jobs stopped');
    }
  }
}
