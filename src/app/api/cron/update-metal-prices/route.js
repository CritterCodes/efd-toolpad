/**
 * Cron Job Endpoint: Update Metal Prices Daily
 * Called by Vercel Cron Jobs or external service
 * 
 * Environment: Set CRON_SECRET in .env.local
 * Endpoint: GET /api/cron/update-metal-prices?secret=YOUR_SECRET
 */

import { updateMetalPrices } from '@/lib/metalPriceService';

export async function GET(req) {
  try {
    // Verify cron secret
    const secret = req.nextUrl.searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      console.warn('⚠️ Unauthorized cron job attempt');
      return Response.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 403 });
    }

    // Update metal prices
    const result = await updateMetalPrices();

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
