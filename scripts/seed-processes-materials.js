/**
 * Seed Script: Initialize Repair Processes and Materials Databases
 * Run this script to populate the databases with initial data
 */

const db = require('../src/lib/database.js').default;

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

async function seedProcessesAndMaterials() {
  try {
    console.log('🌱 Starting processes and materials seed...');
    
    await db.connect();
    console.log('✅ Connected to database');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await db._instance.collection('repairProcesses').deleteMany({});
    await db._instance.collection('repairMaterials').deleteMany({});
    console.log('🗑️ Cleared existing processes and materials');

    // Insert repair processes
    const processResult = await db._instance
      .collection('repairProcesses')
      .insertMany(repairProcesses);
    
    console.log(`✅ Inserted ${processResult.insertedCount} repair processes`);

    // Insert repair materials
    const materialResult = await db._instance
      .collection('repairMaterials')
      .insertMany(repairMaterials);
    
    console.log(`✅ Inserted ${materialResult.insertedCount} repair materials`);

    // Display summary
    console.log('\n📊 Seed Summary:');
    console.log(`- Repair Processes: ${processResult.insertedCount}`);
    console.log(`- Repair Materials: ${materialResult.insertedCount}`);
    
    // Show process categories
    const processCategories = [...new Set(repairProcesses.map(p => p.category))];
    console.log(`- Process Categories: ${processCategories.join(', ')}`);
    
    // Show material categories
    const materialCategories = [...new Set(repairMaterials.map(m => m.category))];
    console.log(`- Material Categories: ${materialCategories.join(', ')}`);

    console.log('\n🎉 Seed completed successfully!');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// Export for use as module or run directly
module.exports = { seedProcessesAndMaterials, repairProcesses, repairMaterials };

// Run if called directly
if (require.main === module) {
  seedProcessesAndMaterials()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
