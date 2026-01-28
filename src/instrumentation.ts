/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize the plugin system.
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
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize plugins:', error);
    }
  }
}
