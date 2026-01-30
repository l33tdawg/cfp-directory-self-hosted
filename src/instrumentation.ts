/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize the plugin system and background job worker.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Initializing server...');

    try {
      // Initialize the plugin system
      const { initializePlugins } = await import('@/lib/plugins');
      await initializePlugins();
      console.log('[Instrumentation] Plugin system initialized');

      // Start the internal job worker (processes plugin background jobs)
      const { startInternalWorker } = await import('@/lib/plugins/jobs');
      startInternalWorker();
      console.log('[Instrumentation] Background job worker started');
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize:', error);
    }
  }
}
