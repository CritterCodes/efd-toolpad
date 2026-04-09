import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
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
    const processesCollection = db._instance.collection(Constants.PROCESSES_COLLECTION);
    const materialsCollection = db._instance.collection(Constants.MATERIALS_COLLECTION);
    
    // Get all processes
    const processes = await processesCollection.find({ isActive: { $ne: false } }).toArray();
    
    console.log(`🔄 Updating pricing for ${processes.length} processes`);
    
    const materials = await materialsCollection.find({ isActive: { $ne: false } }).toArray();
    const materialsById = new Map(materials.map((material) => [String(material._id), material]));
    const updateOperations = [];
    
    for (const process of processes) {
      // Use PricingEngine for consistent calculations
      console.warn('⚠️ DEPRECATED: Inline pricing calculation - Using PricingEngine');
      
      const hydratedMaterials = (process.materials || []).map((materialSelection) => {
        const materialId = materialSelection?.materialId || materialSelection?._id;
        const latestMaterial = materialId ? materialsById.get(String(materialId)) : null;

        if (!latestMaterial) {
          return materialSelection;
        }

        return {
          ...latestMaterial,
          ...materialSelection,
          _id: latestMaterial._id,
          materialId,
          quantity: parseFloat(materialSelection?.quantity || latestMaterial?.quantity || 1) || 1,
          portionsPerUnit: materialSelection?.portionsPerUnit || latestMaterial?.portionsPerUnit || 1,
          stullerProducts: latestMaterial.stullerProducts || materialSelection.stullerProducts || []
        };
      });

      const hydratedProcess = {
        ...process,
        materials: hydratedMaterials
      };

      const processPricing = pricingEngine.calculateProcessCost(hydratedProcess, adminSettings);
      
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
              materials: hydratedMaterials,
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
