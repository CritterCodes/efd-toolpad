/**
 * Metal Prices API Route
 * GET: Retrieve current metal prices
 * POST: Update metal prices (admin only, called daily by cron job)
 */

import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/lib/auth';

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    
    // Try to get prices from cache (within 24 hours)
    const metalPrices = await db.collection('metalPrices').findOne({
      _id: 'current_prices'
    });

    if (!metalPrices) {
      return Response.json({
        success: false,
        error: 'Metal prices not available. Please try again later.',
        prices: null
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      prices: {
        gold: metalPrices.gold,        // Price per gram of 24K gold
        silver: metalPrices.silver,    // Price per gram of .999 silver
        platinum: metalPrices.platinum, // Price per gram
        palladium: metalPrices.palladium, // Price per gram
      },
      lastUpdated: metalPrices.lastUpdated,
      updatedAt: metalPrices.updatedAt
    });
  } catch (error) {
    console.error('❌ Error fetching metal prices:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    const cronSecret = req.headers.get('x-cron-secret');

    // Only admins and the cron job can update prices
    if (session?.user?.role !== 'admin' && cronSecret !== process.env.CRON_SECRET) {
      return Response.json({
        success: false,
        error: 'Unauthorized. Only admins can update metal prices.'
      }, { status: 403 });
    }

    const { gold, silver, platinum, palladium, source } = await req.json();

    // Validate prices
    if (typeof gold !== 'number' || gold <= 0) {
      return Response.json({
        success: false,
        error: 'Invalid gold price'
      }, { status: 400 });
    }

    if (typeof silver !== 'number' || silver <= 0) {
      return Response.json({
        success: false,
        error: 'Invalid silver price'
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Update or create metal prices
    const result = await db.collection('metalPrices').updateOne(
      { _id: 'current_prices' },
      {
        $set: {
          gold,
          silver,
          platinum: platinum || null,
          palladium: palladium || null,
          lastUpdated: new Date(),
          updatedAt: new Date(),
          source: source || 'metalpriceapi.com',
          updatedBy: session?.user?.email || 'cron-job'
        }
      },
      { upsert: true }
    );

    console.log('✅ Metal prices updated:', { gold, silver, platinum, palladium });

    return Response.json({
      success: true,
      message: 'Metal prices updated successfully',
      prices: {
        gold,
        silver,
        platinum,
        palladium
      },
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('❌ Error updating metal prices:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
