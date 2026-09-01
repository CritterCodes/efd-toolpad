/**
 * Cron Job Endpoint: Update Metal Prices Daily
 * Called by Vercel Cron Jobs or external service
 * 
 * Environment: Set CRON_SECRET in .env.local
 * Endpoint: GET /api/cron/update-metal-prices?secret=YOUR_SECRET
 */

import { updateMetalPrices } from '@/lib/metalPriceService';
import { cronAuthorized } from '@/lib/cronAuth';
import { priceJobDue, markPriceJobRun } from '@/services/cron/priceSchedules';

export async function GET(req) {
  try {
    // Vercel's scheduler sends the secret as an Authorization header;
    // manual runs use ?secret=. Both accepted (lib/cronAuth).
    if (!cronAuthorized(req)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Owner-controlled schedule (settings -> Price Update Schedules): the cron
    // fires hourly; this gate decides whether the job is actually due.
    const { due, schedule } = await priceJobDue('metalPrices');
    if (!due && !req.nextUrl.searchParams.get('force')) {
      return Response.json({ success: true, skipped: true, reason: 'not due', schedule });
    }

    // Update metal prices
    const result = await updateMetalPrices();
    await markPriceJobRun('metalPrices', { status: result.success ? 'ok' : 'error', detail: result.error || '' });

    if (result.success) {
      return Response.json({
        success: true,
        message: 'Metal prices updated successfully',
        prices: result.prices,
        timestamp: new Date().toISOString()
      });
    } else {
      return Response.json({
        success: false,
        error: result.error,
        message: 'Failed to update metal prices'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
