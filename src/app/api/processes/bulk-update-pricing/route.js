import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import pricingEngine from '@/services/PricingEngine';

/**
 * Bulk update process pricing based on new admin settings
 */
export async function POST(request) {
  try {
    const { adminSettings } = await request.json();
    
    if (!adminSettings) {
      return NextResponse.json({ error: 'Admin settings required' }, { status: 400 });
    }
    
    await db.connect();
    const processesCollection = db._instance.collection('repairProcesses');
    
    // Get all processes
    const processes = await processesCollection.find({ isActive: { $ne: false } }).toArray();
    
    console.log(`🔄 Updating pricing for ${processes.length} processes`);
    
    const laborRates = adminSettings.laborRates || { basic: 22.5, standard: 30, advanced: 37.5, expert: 45 };
    const materialMarkup = adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup || 1.3;
    const updateOperations = [];
    
    for (const process of processes) {
      // Use PricingEngine for consistent calculations
      console.warn('⚠️ DEPRECATED: Inline pricing calculation - Using PricingEngine');
      
      const processPricing = pricingEngine.calculateProcessCost(process, adminSettings);
      
      const updatedPricing = {
        laborCost: processPricing.laborCost,
        baseMaterialsCost: processPricing.baseMaterialsCost,
        materialsCost: processPricing.materialsCost,
        materialMarkup: processPricing.materialMarkup,
        hourlyRate: processPricing.hourlyRate,
        totalCost: processPricing.totalCost,
        calculatedAt: processPricing.calculatedAt
      };
      
      updateOperations.push({
        updateOne: {
          filter: { _id: process._id },
          update: {
            $set: {
              pricing: updatedPricing,
              updatedAt: new Date()
            }
          }
        }
      });
    }
    
    if (updateOperations.length > 0) {
      const result = await processesCollection.bulkWrite(updateOperations);
      console.log(`✅ Updated ${result.modifiedCount} processes`);
      
      return NextResponse.json({
        success: true,
        updated: result.modifiedCount,
        message: `Updated ${result.modifiedCount} processes with new pricing`
      });
    }
    
    return NextResponse.json({
      success: true,
      updated: 0,
      message: 'No processes to update'
    });
    
  } catch (error) {
    console.error('❌ Error updating process pricing:', error);
    return NextResponse.json(
      { error: 'Failed to update process pricing' },
      { status: 500 }
    );
  }
}
