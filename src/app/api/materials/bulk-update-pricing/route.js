import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import pricingEngine from '@/services/PricingEngine';

/**
 * Bulk update material pricing based on new admin settings
 */
export async function POST(request) {
  try {
    const { adminSettings } = await request.json();
    
    console.log('🔄 Bulk update materials - received adminSettings:', adminSettings);
    
    if (!adminSettings) {
      return NextResponse.json({ error: 'Admin settings required' }, { status: 400 });
    }
    
    await db.connect();
    const materialsCollection = db._instance.collection('repairMaterials');
    
    console.log('🔄 Connected to database, accessing repairMaterials collection');
    
    // Get all materials
    const materials = await materialsCollection.find({ isActive: { $ne: false } }).toArray();
    
    console.log(`🔄 Found ${materials.length} materials to update`);
    
    const materialMarkup = adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup || 1.3;
    const updateOperations = [];
    
    for (const material of materials) {
      // Use PricingEngine for consistent calculations
      console.warn('⚠️ DEPRECATED: Inline pricing calculation - Using PricingEngine');
      
      const materialCost = pricingEngine.calculateMaterialCost(material, 1, adminSettings);
      
      const updatedPricing = {
        basePrice: materialCost.baseCost,
        materialMarkup: materialCost.materialMarkup,
        finalPrice: materialCost.markedUpCost,
        calculatedAt: materialCost.calculatedAt
      };
      
      updateOperations.push({
        updateOne: {
          filter: { _id: material._id },
          update: {
            $set: {
              costPerPortion: newCostPerPortion,
              pricing: updatedPricing,
              updatedAt: new Date()
            }
          }
        }
      });
    }
    
    if (updateOperations.length > 0) {
      const result = await materialsCollection.bulkWrite(updateOperations);
      console.log(`✅ Updated ${result.modifiedCount} materials`);
      
      return NextResponse.json({
        success: true,
        updated: result.modifiedCount,
        message: `Updated ${result.modifiedCount} materials with new pricing`
      });
    }
    
    return NextResponse.json({
      success: true,
      updated: 0,
      message: 'No materials to update'
    });
    
  } catch (error) {
    console.error('❌ Error updating material pricing:', error);
    return NextResponse.json(
      { error: 'Failed to update material pricing' },
      { status: 500 }
    );
  }
}
