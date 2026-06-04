/**
 * Runs an asynchronous task with automatic retries and exponential backoff
 * if a ConcurrencyConflictError occurs.
 */
export async function runWithRetry<T>(
  work: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 50
): Promise<T> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await work();
    } catch (error: any) {
      attempts++;
      const isConcurrencyConflict = 
        error.message && error.message.includes('ConcurrencyConflictError');
      
      if (isConcurrencyConflict && attempts < maxAttempts) {
        const backoff = delayMs * Math.pow(2, attempts);
        console.warn(`[OCC Retry] Concurrency conflict detected. Retrying attempt ${attempts}/${maxAttempts} after ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw error;
    }
  }
  throw new Error('ConcurrencyConflictError: Max retry attempts reached.');
}
export default runWithRetry;
