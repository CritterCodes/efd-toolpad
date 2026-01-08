/**
 * Validation Tests for Pricing Engine
 * 
 * Tests all calculation methods in PricingEngine.js
 * Run with: node test-pricing-engine.mjs
 */

// Import helper
import { loadESModule } from './test-pricing-helper.mjs';

// Load pricing engine module (using .mjs version for Node.js compatibility)
const pricingEngineModule = await import('./src/services/PricingEngine.mjs');
const pricingEngine = pricingEngineModule.default;

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`✅ PASS: ${message}`);
  } else {
    testsFailed++;
    failures.push(message);
    console.log(`❌ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message, tolerance = 0.01) {
  const isEqual = Math.abs(actual - expected) < tolerance;
  assert(isEqual, `${message} (expected: ${expected}, got: ${actual})`);
}

function assertGreaterThan(actual, minimum, message) {
  assert(actual >= minimum, `${message} (expected: >= ${minimum}, got: ${actual})`);
}

console.log('🧪 Pricing Engine Validation Tests');
console.log('==================================\n');

// Mock admin settings
const mockAdminSettings = {
  pricing: {
    wage: 50.00,
    materialMarkup: 2.0,
    administrativeFee: 0.10,
    businessFee: 0.15,
    consumablesFee: 0.05,
    wholesaleConfig: {
      type: 'formula_based',
      percentage: 0.5,
      adjustment: 0.75,
      minimumMultiplier: 1.5
    }
  },
  metalComplexityMultipliers: {
    gold: 1.0,
    silver: 0.9,
    platinum: 1.3
  }
};

// Test 1: calculateProcessCost
console.log('Test Suite 1: calculateProcessCost');
console.log('----------------------------------');

const process1 = {
  laborHours: 2.0,
  skillLevel: 'standard',
  materials: [
    { estimatedCost: 10.00 },
    { estimatedCost: 5.00 }
  ],
  metalType: 'gold',
  metalComplexityMultiplier: 1.0
};

const processCost1 = pricingEngine.calculateProcessCost(process1, mockAdminSettings);
assertEqual(processCost1.laborCost, 100.00, 'Labor cost should be 100.00 (2 hours × $50)');
assertEqual(processCost1.baseMaterialsCost, 15.00, 'Base materials cost should be 15.00');
assertEqual(processCost1.materialsCost, 30.00, 'Materials cost should be 30.00 (15 × 2.0 markup)');
assertEqual(processCost1.totalCost, 130.00, 'Total cost should be 130.00 (100 + 30)');
assertEqual(processCost1.hourlyRate, 50.00, 'Hourly rate should be 50.00');
assertEqual(processCost1.skillMultiplier, 1.0, 'Skill multiplier should be 1.0');
assertEqual(processCost1.materialMarkup, 2.0, 'Material markup should be 2.0');
assert(processCost1.calculatedAt, 'Should have calculatedAt timestamp');

// Test with different skill level
const process2 = {
  laborHours: 1.0,
  skillLevel: 'expert',
  materials: [{ estimatedCost: 20.00 }],
  metalType: 'gold'
};

const processCost2 = pricingEngine.calculateProcessCost(process2, mockAdminSettings);
assertEqual(processCost2.hourlyRate, 75.00, 'Expert hourly rate should be 75.00 (50 × 1.5)');
assertEqual(processCost2.laborCost, 75.00, 'Expert labor cost should be 75.00');
assertEqual(processCost2.skillMultiplier, 1.5, 'Expert skill multiplier should be 1.5');

// Test with metal complexity
const process3 = {
  laborHours: 1.0,
  skillLevel: 'standard',
  materials: [{ estimatedCost: 10.00 }],
  metalType: 'platinum',
  metalComplexityMultiplier: 1.3
};

const processCost3 = pricingEngine.calculateProcessCost(process3, mockAdminSettings);
assertEqual(processCost3.metalComplexityMultiplier, 1.3, 'Platinum complexity should be 1.3');
// Calculation: laborCost (50) + materialsCost (10 * 2.0 = 20) = 70, then * 1.3 = 91
assertEqual(processCost3.totalCost, 91.00, 'Total cost with complexity should be 91.00 ((50 + 20) × 1.3)');

// Test minimum material markup enforcement
const lowMarkupSettings = {
  pricing: {
    ...mockAdminSettings.pricing,
    materialMarkup: 1.0  // Below minimum of 2.0
  }
};

const processCost4 = pricingEngine.calculateProcessCost(process1, lowMarkupSettings);
assertEqual(processCost4.materialMarkup, 2.0, 'Material markup should be enforced to minimum 2.0');
assertEqual(processCost4.materialsCost, 30.00, 'Materials cost should use enforced markup');

console.log('');

// Test 2: calculateMaterialCost
console.log('Test Suite 2: calculateMaterialCost');
console.log('----------------------------------');

const material1 = { estimatedCost: 10.00 };
const materialCost1 = pricingEngine.calculateMaterialCost(material1, 1, mockAdminSettings);
assertEqual(materialCost1.baseCost, 10.00, 'Base cost should be 10.00');
assertEqual(materialCost1.markedUpCost, 20.00, 'Marked up cost should be 20.00 (10 × 2.0)');
assertEqual(materialCost1.totalCost, 20.00, 'Total cost should be 20.00');
assertEqual(materialCost1.materialMarkup, 2.0, 'Material markup should be 2.0');
assertEqual(materialCost1.quantity, 1, 'Quantity should be 1');

// Test with quantity
const materialCost2 = pricingEngine.calculateMaterialCost(material1, 3, mockAdminSettings);
assertEqual(materialCost2.totalCost, 60.00, 'Total cost with quantity 3 should be 60.00 (20 × 3)');
assertEqual(materialCost2.quantity, 3, 'Quantity should be 3');

// Test with different cost fields
const material2 = { costPerPortion: 5.00 };
const materialCost3 = pricingEngine.calculateMaterialCost(material2, 1, mockAdminSettings);
assertEqual(materialCost3.baseCost, 5.00, 'Should use costPerPortion if estimatedCost not available');

const material3 = { stullerPrice: 8.00 };
const materialCost4 = pricingEngine.calculateMaterialCost(material3, 1, mockAdminSettings);
assertEqual(materialCost4.baseCost, 8.00, 'Should use stullerPrice if other costs not available');

// Test minimum markup enforcement
const materialCost5 = pricingEngine.calculateMaterialCost(material1, 1, lowMarkupSettings);
assertEqual(materialCost5.materialMarkup, 2.0, 'Material markup should be enforced to minimum');

console.log('');

// Test 3: applyBusinessMultiplier
console.log('Test Suite 3: applyBusinessMultiplier');
console.log('--------------------------------------');

const baseCost1 = 100.00;
const retailPrice1 = pricingEngine.applyBusinessMultiplier(baseCost1, mockAdminSettings);
// Business multiplier: (0.10 + 0.15 + 0.05) + 1 = 1.30, but enforced to minimum 2.0
const expectedPrice = 100.00 * 2.0; // Minimum enforced to 2.0
assertEqual(retailPrice1, expectedPrice, `Retail price should be ${expectedPrice} (enforced minimum)`);

// Test with zero base cost
const zeroPrice = pricingEngine.applyBusinessMultiplier(0, mockAdminSettings);
assertEqual(zeroPrice, 0, 'Zero base cost should return 0');

// Test with null admin settings
const priceNoSettings = pricingEngine.applyBusinessMultiplier(100.00, null);
assertGreaterThan(priceNoSettings, 200.00, 'Should enforce minimum multiplier even without settings');

// Test minimum enforcement
const lowMultiplierSettings = {
  pricing: {
    administrativeFee: 0.05,
    businessFee: 0.05,
    consumablesFee: 0.05
  }
};
const lowMultiplierPrice = pricingEngine.applyBusinessMultiplier(100.00, lowMultiplierSettings);
assertGreaterThan(lowMultiplierPrice, 200.00, 'Should enforce minimum business multiplier of 2.0x');

console.log('');

// Test 4: calculateWholesalePrice
console.log('Test Suite 4: calculateWholesalePrice');
console.log('-------------------------------------');

const retailPrice = 260.00; // 100 base × 2.0 multiplier (enforced)
const baseCost = 100.00;

// Test formula_based wholesale
const wholesalePrice1 = pricingEngine.calculateWholesalePrice(retailPrice, baseCost, mockAdminSettings);
// Formula: ((admin + business + consumables) / 2) + 1
// admin = 100 × 0.10 = 10
// business = 100 × 0.15 = 15
// consumables = 100 × 0.05 = 5
// ((10 + 15 + 5) / 2) + 100 = 15 + 100 = 115
// But minimum is 100 × 1.5 = 150
const expectedWholesale = Math.max(115.00, 150.00);
assertEqual(wholesalePrice1, expectedWholesale, `Wholesale price should be ${expectedWholesale}`);

// Test percentage_of_retail
const percentageSettings = {
  pricing: {
    ...mockAdminSettings.pricing,
    wholesaleConfig: {
      type: 'percentage_of_retail',
      percentage: 0.5,
      minimumMultiplier: 1.5
    }
  }
};
const wholesalePrice2 = pricingEngine.calculateWholesalePrice(retailPrice, baseCost, percentageSettings);
const expectedPercentage = Math.max(retailPrice * 0.5, baseCost * 1.5);
assertEqual(wholesalePrice2, expectedPercentage, 'Percentage wholesale should calculate correctly');

// Test business_multiplier_adjustment
const adjustmentSettings = {
  pricing: {
    ...mockAdminSettings.pricing,
    wholesaleConfig: {
      type: 'business_multiplier_adjustment',
      adjustment: 0.75,
      minimumMultiplier: 1.5
    }
  }
};
const wholesalePrice3 = pricingEngine.calculateWholesalePrice(retailPrice, baseCost, adjustmentSettings);
const businessMultiplier = (0.10 + 0.15 + 0.05) + 1; // 1.30, but enforced to 2.0
const expectedAdjustment = Math.max(baseCost * (2.0 * 0.75), baseCost * 1.5);
assertEqual(wholesalePrice3, expectedAdjustment, 'Adjustment wholesale should calculate correctly');

// Test minimum enforcement
assertGreaterThan(wholesalePrice1, baseCost * 1.5, 'Wholesale should enforce minimum multiplier');

console.log('');

// Test 5: calculateTaskCost
console.log('Test Suite 5: calculateTaskCost');
console.log('------------------------------');

const taskData1 = {
  processes: [
    {
      quantity: 1,
      process: {
        laborHours: 1.0,
        skillLevel: 'standard',
        materials: [{ estimatedCost: 10.00 }],
        metalType: 'gold'
      }
    }
  ],
  materials: [
    {
      quantity: 2,
      material: { estimatedCost: 5.00 }
    }
  ]
};

const taskCost1 = pricingEngine.calculateTaskCost(taskData1, mockAdminSettings);
assertEqual(taskCost1.totalLaborHours, 1.0, 'Total labor hours should be 1.0');
assertGreaterThan(taskCost1.totalProcessCost, 0, 'Total process cost should be > 0');
assertGreaterThan(taskCost1.totalMaterialCost, 0, 'Total material cost should be > 0');
assertGreaterThan(taskCost1.baseCost, 0, 'Base cost should be > 0');
assertGreaterThan(taskCost1.retailPrice, taskCost1.baseCost, 'Retail price should be > base cost');
assertGreaterThan(taskCost1.wholesalePrice, taskCost1.baseCost * 1.5, 'Wholesale should enforce minimum');
assert(taskCost1.calculatedAt, 'Should have calculatedAt timestamp');

// Test with multiple processes
const taskData2 = {
  processes: [
    {
      quantity: 1,
      process: {
        laborHours: 1.0,
        skillLevel: 'standard',
        materials: [{ estimatedCost: 10.00 }]
      }
    },
    {
      quantity: 2,
      process: {
        laborHours: 0.5,
        skillLevel: 'basic',
        materials: [{ estimatedCost: 5.00 }]
      }
    }
  ]
};

const taskCost2 = pricingEngine.calculateTaskCost(taskData2, mockAdminSettings);
assertEqual(taskCost2.totalLaborHours, 2.0, 'Total labor hours should be 2.0 (1.0 + 0.5×2)');
assertGreaterThan(taskCost2.totalProcessCost, taskCost1.totalProcessCost, 'Multiple processes should increase cost');

console.log('');

// Test 6: getHourlyRateForSkill
console.log('Test Suite 6: getHourlyRateForSkill');
console.log('-----------------------------------');

assertEqual(pricingEngine.getHourlyRateForSkill('basic', mockAdminSettings), 37.5, 'Basic hourly rate should be 37.5');
assertEqual(pricingEngine.getHourlyRateForSkill('standard', mockAdminSettings), 50.0, 'Standard hourly rate should be 50.0');
assertEqual(pricingEngine.getHourlyRateForSkill('advanced', mockAdminSettings), 62.5, 'Advanced hourly rate should be 62.5');
assertEqual(pricingEngine.getHourlyRateForSkill('expert', mockAdminSettings), 75.0, 'Expert hourly rate should be 75.0');
// Invalid skill level should now throw TypeError with strong validation
try {
  pricingEngine.getHourlyRateForSkill('invalid', mockAdminSettings);
  console.log('❌ FAIL: Invalid skill should throw TypeError');
  testsFailed++;
} catch (error) {
  if (error instanceof TypeError && error.message.includes('Valid values')) {
    console.log('✅ PASS: Invalid skill should throw TypeError');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Invalid skill should throw TypeError (got ${error.constructor.name})`);
    testsFailed++;
  }
}

console.log('');

// Test 7: getBusinessMultiplier
console.log('Test Suite 7: getBusinessMultiplier');
console.log('----------------------------------');

const multiplier1 = pricingEngine.getBusinessMultiplier(mockAdminSettings);
assertGreaterThan(multiplier1, 2.0, 'Business multiplier should be >= 2.0 (enforced minimum)');

const lowFeesSettings = {
  pricing: {
    administrativeFee: 0.01,
    businessFee: 0.01,
    consumablesFee: 0.01
  }
};
const multiplier2 = pricingEngine.getBusinessMultiplier(lowFeesSettings);
assertGreaterThan(multiplier2, 2.0, 'Low fees should still enforce minimum multiplier');

console.log('');

// Test 8: calculateLaborCost
console.log('Test Suite 8: calculateLaborCost');
console.log('--------------------------------');

const laborCost1 = pricingEngine.calculateLaborCost(2.0, 'standard', mockAdminSettings);
assertEqual(laborCost1, 100.00, 'Labor cost should be 100.00 (2 hours × $50)');

const laborCost2 = pricingEngine.calculateLaborCost(1.5, 'expert', mockAdminSettings);
assertEqual(laborCost2, 112.50, 'Expert labor cost should be 112.50 (1.5 hours × $75)');

const laborCost3 = pricingEngine.calculateLaborCost(0, 'standard', mockAdminSettings);
assertEqual(laborCost3, 0, 'Zero hours should return 0');

console.log('');

// Test 9: calculateTaskCost with legacy format
console.log('Test Suite 9: calculateTaskCost (Legacy Format)');
console.log('----------------------------------------------');

const legacyTaskData = {
  processes: [
    {
      processId: 'process1',
      quantity: 1
    }
  ],
  materials: [
    {
      materialId: 'material1',
      quantity: 2
    }
  ]
};

const availableProcesses = [
  {
    _id: 'process1',
    laborHours: 1.0,
    skillLevel: 'standard',
    materials: [{ estimatedCost: 10.00 }]
  }
];

const availableMaterials = [
  {
    _id: 'material1',
    estimatedCost: 5.00
  }
];

const legacyTaskCost = pricingEngine.calculateTaskCost(legacyTaskData, mockAdminSettings, availableProcesses, availableMaterials);
assertGreaterThan(legacyTaskCost.totalProcessCost, 0, 'Legacy format should calculate process cost');
assertGreaterThan(legacyTaskCost.totalMaterialCost, 0, 'Legacy format should calculate material cost');
assertGreaterThan(legacyTaskCost.retailPrice, 0, 'Legacy format should calculate retail price');

console.log('');

// Test 10: Edge Cases
console.log('Test Suite 10: Edge Cases');
console.log('------------------------');

// Empty process
const emptyProcess = {
  laborHours: 0,
  skillLevel: 'standard',
  materials: []
};
const emptyCost = pricingEngine.calculateProcessCost(emptyProcess, mockAdminSettings);
assertEqual(emptyCost.totalCost, 0, 'Empty process should have zero cost');

// Missing admin settings
const noSettingsCost = pricingEngine.calculateProcessCost(process1, null);
assertGreaterThan(noSettingsCost.totalCost, 0, 'Should work with null settings using defaults');

// Negative values (should throw RangeError with guard clauses)
const negativeProcess = {
  laborHours: -1,
  skillLevel: 'standard',
  materials: [{ estimatedCost: -10 }]
};
// Guard clauses should catch negative values and throw RangeError
try {
  pricingEngine.calculateProcessCost(negativeProcess, mockAdminSettings);
  assert(false, 'Should throw RangeError for negative laborHours');
} catch (error) {
  assert(error instanceof RangeError, 'Should throw RangeError for negative laborHours');
}

console.log('');

// Summary
console.log('\n📊 Test Summary');
console.log('===============');
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (failures.length > 0) {
  console.log('\n❌ Failed Tests:');
  failures.forEach((failure, index) => {
    console.log(`  ${index + 1}. ${failure}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}

