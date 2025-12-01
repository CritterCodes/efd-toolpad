/**
 * Metal Price Service
 * Handles fetching and caching metal prices from metalpriceapi.com
 */

import { connectToDatabase } from '@/lib/mongodb';

/**
 * Fetch current metal prices from metalpriceapi.com
 * API Key should be stored in environment variables
 */
async function fetchMetalPricesFromAPI() {
  try {
    const apiKey = process.env.METAL_PRICE_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ METAL_PRICE_API_KEY not configured');
      return null;
    }

    // Fetch prices from metalpriceapi.com
    // API returns prices in USD per troy ounce
    // We need to convert to per gram
    const response = await fetch(
      `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=XAU`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract rates - API returns prices in USD per troy ounce where XAU=1
    // We need to extract the USD value (which gives us the troy ounce price of gold in USD)
    // Then convert troy ounces to grams (1 troy ounce = 31.1035 grams)
    const ozToGram = 31.1035;
    
    // The USD rate when base is XAU gives us gold price in USD per troy oz
    const goldPricePerOz = data.rates.USD;
    const silverPricePerOz = data.rates.USD / data.rates.XAG;
    const platinumPricePerOz = data.rates.USD / data.rates.XPT;
    const palladiumPricePerOz = data.rates.USD / data.rates.XPD;

    return {
      gold: goldPricePerOz / ozToGram,           // Gold price per gram
      silver: silverPricePerOz / ozToGram,       // Silver price per gram
      platinum: platinumPricePerOz / ozToGram,   // Platinum price per gram
      palladium: palladiumPricePerOz / ozToGram  // Palladium price per gram
    };
  } catch (error) {
    console.error('❌ Error fetching from metalpriceapi.com:', error);
    return null;
  }
}

/**
 * Get current metal prices (from cache if available, otherwise fetch)
 */
export async function getCurrentMetalPrices() {
  try {
    const { db } = await connectToDatabase();

    // Check if we have cached prices from today
    const metalPrices = await db.collection('metalPrices').findOne({
      _id: 'current_prices'
    });

    if (metalPrices) {
      return {
        gold: metalPrices.gold,
        silver: metalPrices.silver,
        platinum: metalPrices.platinum,
        palladium: metalPrices.palladium,
        lastUpdated: metalPrices.lastUpdated
      };
    }

    // If no cached prices, return defaults
    console.warn('⚠️ No cached metal prices available');
    return null;
  } catch (error) {
    console.error('❌ Error getting metal prices:', error);
    return null;
  }
}

/**
 * Update metal prices (called by cron job daily)
 */
export async function updateMetalPrices() {
  try {
    // Fetch latest prices from API
    const prices = await fetchMetalPricesFromAPI();

    if (!prices) {
      throw new Error('Failed to fetch prices from metalpriceapi.com');
    }

    // Save to database
    const { db } = await connectToDatabase();
    
    const result = await db.collection('metalPrices').updateOne(
      { _id: 'current_prices' },
      {
        $set: {
          gold: prices.gold,
          silver: prices.silver,
          platinum: prices.platinum,
          palladium: prices.palladium,
          lastUpdated: new Date(),
          updatedAt: new Date(),
          source: 'metalpriceapi.com'
        }
      },
      { upsert: true }
    );

    console.log('✅ Metal prices updated successfully:', prices);
    return {
      success: true,
      prices,
      message: 'Metal prices updated from API'
    };
  } catch (error) {
    console.error('❌ Error updating metal prices:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get metal prices for frontend calculations
 * Returns prices in format suitable for COG calculations
 */
export async function getMetalPricesForCOG() {
  const prices = await getCurrentMetalPrices();
  
  if (!prices) {
    return null;
  }

  return {
    gold: prices.gold,           // $/gram of 24K gold
    silver: prices.silver,       // $/gram of .999 silver
    platinum: prices.platinum,   // $/gram
    palladium: prices.palladium, // $/gram
    lastUpdated: prices.lastUpdated
  };
}
