/**
 * Simple seed script using fetch to populate processes and materials
 * This avoids module import issues by using the API endpoints
 */

const seedData = async () => {
  console.log('🌱 Starting processes and materials seed via API...');

  const baseUrl = 'http://localhost:3000'; // Adjust if needed
  
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
      safetyRequirements: ['ventilation', 'eye_protection']
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
      safetyRequirements: ['safety_glasses']
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
      safetyRequirements: ['safety_glasses', 'dust_mask']
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
      safetyRequirements: ['magnification', 'steady_surface']
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
      safetyRequirements: ['ventilation', 'safety_glasses']
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
      safetyRequirements: ['magnification', 'ventilation', 'steady_surface']
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
      description: 'Easy-flow silver solder for general repairs'
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
      description: '14K yellow gold solder for gold repairs'
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
      description: '950 Platinum solder for platinum repairs'
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
      description: 'Red rouge polishing compound'
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
      description: 'Sterling silver wire for ring sizing'
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
      description: '14K yellow gold wire for ring sizing'
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
      description: 'Sterling silver wire for prong repairs'
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
      description: '14K yellow gold wire for prong repairs'
    }
  ];

  try {
    // You'll need to manually create these via the API or through the database
    console.log('📋 Ready to seed:');
    console.log(`- ${repairProcesses.length} repair processes`);
    console.log(`- ${repairMaterials.length} repair materials`);
    
    console.log('\n🔧 To complete seeding:');
    console.log('1. Start your Next.js dev server: npm run dev');
    console.log('2. Visit /dashboard/admin to use the process builder');
    console.log('3. Or manually insert this data into MongoDB');
    
    // Export the data for manual insertion
    const fs = require('fs');
    const seedDataFile = {
      processes: repairProcesses,
      materials: repairMaterials,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('seed-data.json', JSON.stringify(seedDataFile, null, 2));
    console.log('\n💾 Seed data exported to seed-data.json');
    
  } catch (error) {
    console.error('❌ Seed preparation failed:', error);
  }
};

seedData();
