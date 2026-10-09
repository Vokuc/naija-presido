/**
 * Fly.io tick scheduler (MVP)
 * This process simply triggers the Next.js API endpoints on schedule.
 * It contains no game logic.
 */

const FAST_TICK_INTERVAL = 60_000; // 1 real minute

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TICK_SECRET = process.env.TICK_SECRET || '';

console.log('Starting Naija Presido tick worker...');

setInterval(async () => {
  try {
    const res = await fetch(`${APP_URL}/api/internal/tick/fast`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TICK_SECRET}`
      }
    });
    console.log(`[Fast Tick] Status: ${res.status}`);
  } catch (err) {
    console.error(`[Fast Tick] Failed to trigger:`, err);
  }
}, FAST_TICK_INTERVAL);
