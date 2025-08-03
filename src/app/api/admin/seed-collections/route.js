import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * POST /api/admin/seed-collections
 * Simple collection seeding without auth (for initialization only)
 */
export async function POST(request) {
  try {
    await db.connect();

    // Initial repair processes
    const repairProcesses = [
      {
        name: 'soldering',
        displayName: 'Soldering/Joining',
        category: 'metalwork',
        laborMinutes: 15,
        skillLevel: 'standard',
        equipmentCost: 2.50,
        metalComplexity: {
          silver: 1.0,
          gold: 1.2,
          platinum: 1.8,
          mixed: 1.1
        },
        riskLevel: 'medium',
        description: 'Joining metal components using solder',
        safetyRequirements: ['ventilation', 'eye_protection'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'cleanup',
        displayName: 'Cleanup/Finishing',
        category: 'finishing',
        laborMinutes: 10,
        skillLevel: 'basic',
        equipmentCost: 1.00,
        metalComplexity: {
          silver: 1.0,
          gold: 1.0,
          platinum: 1.1,
          mixed: 1.0
        },
        riskLevel: 'low',
        description: 'General cleanup and finishing work',
        safetyRequirements: ['safety_glasses'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'polishing',
        displayName: 'Polishing',
        category: 'finishing',
        laborMinutes: 12,
        skillLevel: 'standard',
        equipmentCost: 1.50,
        metalComplexity: {
          silver: 1.0,
          gold: 1.1,
          platinum: 1.3,
          mixed: 1.2
        },
        riskLevel: 'low',
        description: 'Professional polishing to restore shine',
        safetyRequirements: ['safety_glasses', 'dust_mask'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'stone_setting',
        displayName: 'Stone Setting',
        category: 'stone_work',
        laborMinutes: 30,
        skillLevel: 'advanced',
        equipmentCost: 3.00,
        metalComplexity: {
          silver: 1.2,
          gold: 1.3,
          platinum: 1.6,
          mixed: 1.4
        },
        riskLevel: 'high',
        description: 'Setting or resetting gemstones',
        safetyRequirements: ['magnification', 'steady_surface'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'sizing',
        displayName: 'Ring Sizing',
        category: 'sizing',
        laborMinutes: 20,
        skillLevel: 'standard',
        equipmentCost: 2.00,
        metalComplexity: {
          silver: 1.0,
          gold: 1.3,
          platinum: 1.8,
          mixed: 1.5
        },
        riskLevel: 'medium',
        description: 'Resizing rings up or down',
        safetyRequirements: ['ventilation', 'safety_glasses'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'prong_repair',
        displayName: 'Prong Repair/Retipping',
        category: 'prong_work',
        laborMinutes: 25,
        skillLevel: 'advanced',
        equipmentCost: 2.75,
        metalComplexity: {
          silver: 1.1,
          gold: 1.3,
          platinum: 1.7,
          mixed: 1.4
        },
        riskLevel: 'high',
        description: 'Repairing or building up worn prongs',
        safetyRequirements: ['magnification', 'ventilation', 'steady_surface'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    ];

    // Initial repair materials
    const repairMaterials = [
      {
        name: 'silver_solder',
        displayName: 'Silver Solder',
        category: 'solder',
        unitCost: 0.25,
        unitType: 'application',
        compatibleMetals: ['silver', 'gold'],
        supplier: 'Rio Grande',
        sku: 'SOL-SIL-001',
        description: 'Easy-flow silver solder for general repairs',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'gold_solder_14k',
        displayName: '14K Gold Solder',
        category: 'solder',
        unitCost: 1.50,
        unitType: 'application',
        compatibleMetals: ['gold'],
        supplier: 'Rio Grande',
        sku: 'SOL-14K-001',
        description: '14K yellow gold solder for gold repairs',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'platinum_solder',
        displayName: 'Platinum Solder',
        category: 'solder',
        unitCost: 3.00,
        unitType: 'application',
        compatibleMetals: ['platinum'],
        supplier: 'Stuller',
        sku: 'SOL-PLAT-001',
        description: '950 Platinum solder for platinum repairs',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'polishing_compound',
        displayName: 'Polishing Compound',
        category: 'consumable',
        unitCost: 0.10,
        unitType: 'application',
        compatibleMetals: ['silver', 'gold', 'platinum', 'mixed'],
        supplier: 'Gesswein',
        sku: 'POL-COMP-001',
        description: 'Red rouge polishing compound',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'sizing_stock_silver',
        displayName: 'Silver Sizing Stock',
        category: 'sizing_material',
        unitCost: 2.50,
        unitType: 'application',
        compatibleMetals: ['silver'],
        supplier: 'Rio Grande',
        sku: 'SIZE-SIL-001',
        description: 'Sterling silver wire for ring sizing',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'sizing_stock_14k',
        displayName: '14K Gold Sizing Stock',
        category: 'sizing_material',
        unitCost: 8.50,
        unitType: 'application',
        compatibleMetals: ['gold'],
        supplier: 'Rio Grande',
        sku: 'SIZE-14K-001',
        description: '14K yellow gold wire for ring sizing',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'prong_wire_silver',
        displayName: 'Silver Prong Wire',
        category: 'prong_material',
        unitCost: 1.25,
        unitType: 'application',
        compatibleMetals: ['silver'],
        supplier: 'Stuller',
        sku: 'PRONG-SIL-001',
        description: 'Sterling silver wire for prong repairs',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'prong_wire_14k',
        displayName: '14K Gold Prong Wire',
        category: 'prong_material',
        unitCost: 4.50,
        unitType: 'application',
        compatibleMetals: ['gold'],
        supplier: 'Stuller',
        sku: 'PRONG-14K-001',
        description: '14K yellow gold wire for prong repairs',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      }
    ];

    // Check if collections already exist and have data
    const existingProcesses = await db._instance.collection('repairProcesses').countDocuments();
    const existingMaterials = await db._instance.collection('repairMaterials').countDocuments();

    let processResult = null;
    let materialResult = null;

    // Insert processes if collection is empty
    if (existingProcesses === 0) {
      processResult = await db._instance
        .collection('repairProcesses')
        .insertMany(repairProcesses);
    }

    // Insert materials if collection is empty
    if (existingMaterials === 0) {
      materialResult = await db._instance
        .collection('repairMaterials')
        .insertMany(repairMaterials);
    }

    // Get final counts
    const finalProcessCount = await db._instance.collection('repairProcesses').countDocuments();
    const finalMaterialCount = await db._instance.collection('repairMaterials').countDocuments();

    return NextResponse.json({
      success: true,
      message: 'Collections seeded successfully!',
      summary: {
        processes: {
          existing: existingProcesses,
          inserted: processResult ? processResult.insertedCount : 0,
          total: finalProcessCount
        },
        materials: {
          existing: existingMaterials,
          inserted: materialResult ? materialResult.insertedCount : 0,
          total: finalMaterialCount
        }
      }
    });

  } catch (error) {
    console.error('Seed collections error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
