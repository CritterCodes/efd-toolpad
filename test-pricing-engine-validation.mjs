/**
 * Validation Tests for PricingEngine Guard Clauses and Error Handling
 * 
 * Tests that PricingEngine properly validates inputs and throws appropriate errors
 * Run with: node test-pricing-engine-validation.mjs
 */

// Import helper
import { loadESModule } from './test-pricing-helper.mjs';

// Load pricing engine module
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

function assertThrows(fn, expectedErrorType, message) {
  try {
    fn();
    testsFailed++;
    failures.push(`${message} - Expected ${expectedErrorType.name} but no error was thrown`);
    console.log(`❌ FAIL: ${message} - Expected ${expectedErrorType.name} but no error was thrown`);
  } catch (error) {
    if (error instanceof expectedErrorType) {
      testsPassed++;
      console.log(`✅ PASS: ${message} (threw ${expectedErrorType.name}: ${error.message})`);
    } else {
      testsFailed++;
      failures.push(`${message} - Expected ${expectedErrorType.name} but got ${error.constructor.name}: ${error.message}`);
      console.log(`❌ FAIL: ${message} - Expected ${expectedErrorType.name} but got ${error.constructor.name}: ${error.message}`);
    }
  }
}

console.log('🧪 Pricing Engine Validation Tests (Guard Clauses & Error Handling)');
console.log('==================================================================\n');

const mockAdminSettings = {
  pricing: {
    wage: 50.00,
    materialMarkup: 2.0,
    administrativeFee: 0.10,
    businessFee: 0.15,
    consumablesFee: 0.05
  }
};

// Test 1: calculateProcessCost validation
console.log('Test Suite 1: calculateProcessCost Guard Clauses');
console.log('------------------------------------------------');

// Test null/undefined process
assertThrows(() => pricingEngine.calculateProcessCost(null, mockAdminSettings), TypeError, 'Should throw TypeError for null process');
assertThrows(() => pricingEngine.calculateProcessCost(undefined, mockAdminSettings), TypeError, 'Should throw TypeError for undefined process');
assertThrows(() => pricingEngine.calculateProcessCost('invalid', mockAdminSettings), TypeError, 'Should throw TypeError for string process');

// Test invalid laborHours
assertThrows(() => pricingEngine.calculateProcessCost({ laborHours: 'invalid' }, mockAdminSettings), TypeError, 'Should throw TypeError for invalid laborHours');
assertThrows(() => pricingEngine.calculateProcessCost({ laborHours: -5 }, mockAdminSettings), RangeError, 'Should throw RangeError for negative laborHours');

// Test invalid materials array
assertThrows(() => pricingEngine.calculateProcessCost({ laborHours: 1, materials: 'not-array' }, mockAdminSettings), TypeError, 'Should throw TypeError for non-array materials');

// Test valid process (should not throw)
try {
  const result = pricingEngine.calculateProcessCost({ laborHours: 1, skillLevel: 'standard' }, mockAdminSettings);
  assert(result && typeof result === 'object', 'Valid process should return result object');
} catch (error) {
  testsFailed++;
  failures.push('Valid process should not throw error');
  console.log(`❌ FAIL: Valid process should not throw error - ${error.message}`);
}

console.log('');

// Test 2: calculateMaterialCost validation
console.log('Test Suite 2: calculateMaterialCost Guard Clauses');
console.log('-------------------------------------------------');

// Test null/undefined material
assertThrows(() => pricingEngine.calculateMaterialCost(null, 1, mockAdminSettings), TypeError, 'Should throw TypeError for null material');
assertThrows(() => pricingEngine.calculateMaterialCost(undefined, 1, mockAdminSettings), TypeError, 'Should throw TypeError for undefined material');

// Test invalid quantity
assertThrows(() => pricingEngine.calculateMaterialCost({ estimatedCost: 10 }, 'invalid', mockAdminSettings), TypeError, 'Should throw TypeError for invalid quantity');
assertThrows(() => pricingEngine.calculateMaterialCost({ estimatedCost: 10 }, -1, mockAdminSettings), RangeError, 'Should throw RangeError for negative quantity');
assertThrows(() => pricingEngine.calculateMaterialCost({ estimatedCost: 10 }, 0, mockAdminSettings), RangeError, 'Should throw RangeError for zero quantity');

// Test invalid cost
assertThrows(() => pricingEngine.calculateMaterialCost({ estimatedCost: 'invalid' }, 1, mockAdminSettings), TypeError, 'Should throw TypeError for invalid cost');
assertThrows(() => pricingEngine.calculateMaterialCost({ estimatedCost: -10 }, 1, mockAdminSettings), RangeError, 'Should throw RangeError for negative cost');

// Test valid material (should not throw)
try {
  const result = pricingEngine.calculateMaterialCost({ estimatedCost: 10 }, 1, mockAdminSettings);
  assert(result && typeof result === 'object', 'Valid material should return result object');
} catch (error) {
  testsFailed++;
  failures.push('Valid material should not throw error');
  console.log(`❌ FAIL: Valid material should not throw error - ${error.message}`);
}

console.log('');

// Test 3: applyBusinessMultiplier validation
console.log('Test Suite 3: applyBusinessMultiplier Guard Clauses');
console.log('---------------------------------------------------');

// Test invalid baseCost
assertThrows(() => pricingEngine.applyBusinessMultiplier('invalid', mockAdminSettings), TypeError, 'Should throw TypeError for invalid baseCost');
assertThrows(() => pricingEngine.applyBusinessMultiplier(null, mockAdminSettings), TypeError, 'Should throw TypeError for null baseCost');
assertThrows(() => pricingEngine.applyBusinessMultiplier(-100, mockAdminSettings), RangeError, 'Should throw RangeError for negative baseCost');

// Test zero baseCost (should return 0, not throw)
try {
  const result = pricingEngine.applyBusinessMultiplier(0, mockAdminSettings);
  assert(result === 0, 'Zero baseCost should return 0');
} catch (error) {
  testsFailed++;
  failures.push('Zero baseCost should return 0, not throw');
  console.log(`❌ FAIL: Zero baseCost should return 0, not throw - ${error.message}`);
}

// Test valid baseCost (should not throw)
try {
  const result = pricingEngine.applyBusinessMultiplier(100, mockAdminSettings);
  assert(typeof result === 'number' && result > 0, 'Valid baseCost should return positive number');
} catch (error) {
  testsFailed++;
  failures.push('Valid baseCost should not throw error');
  console.log(`❌ FAIL: Valid baseCost should not throw error - ${error.message}`);
}

console.log('');

// Test 4: calculateWholesalePrice validation
console.log('Test Suite 4: calculateWholesalePrice Guard Clauses');
console.log('--------------------------------------------------');

// Test invalid retailPrice
assertThrows(() => pricingEngine.calculateWholesalePrice('invalid', 100, mockAdminSettings), TypeError, 'Should throw TypeError for invalid retailPrice');
assertThrows(() => pricingEngine.calculateWholesalePrice(-100, 100, mockAdminSettings), RangeError, 'Should throw RangeError for negative retailPrice');

// Test invalid baseCost
assertThrows(() => pricingEngine.calculateWholesalePrice(100, 'invalid', mockAdminSettings), TypeError, 'Should throw TypeError for invalid baseCost');
assertThrows(() => pricingEngine.calculateWholesalePrice(100, -50, mockAdminSettings), RangeError, 'Should throw RangeError for negative baseCost');

// Test invalid pricing relationship
assertThrows(() => pricingEngine.calculateWholesalePrice(50, 100, mockAdminSettings), RangeError, 'Should throw RangeError when retailPrice < baseCost');

// Test valid prices (should not throw)
try {
  const result = pricingEngine.calculateWholesalePrice(200, 100, mockAdminSettings);
  assert(typeof result === 'number' && result > 0, 'Valid prices should return positive number');
} catch (error) {
  testsFailed++;
  failures.push('Valid prices should not throw error');
  console.log(`❌ FAIL: Valid prices should not throw error - ${error.message}`);
}

console.log('');

// Test 5: calculateTaskCost validation
console.log('Test Suite 5: calculateTaskCost Guard Clauses');
console.log('---------------------------------------------');

// Test null/undefined taskData
assertThrows(() => pricingEngine.calculateTaskCost(null, mockAdminSettings), TypeError, 'Should throw TypeError for null taskData');
assertThrows(() => pricingEngine.calculateTaskCost(undefined, mockAdminSettings), TypeError, 'Should throw TypeError for undefined taskData');

// Test invalid availableProcesses
assertThrows(() => pricingEngine.calculateTaskCost({}, mockAdminSettings, 'not-array'), TypeError, 'Should throw TypeError for non-array availableProcesses');

// Test invalid availableMaterials
assertThrows(() => pricingEngine.calculateTaskCost({}, mockAdminSettings, [], 'not-array'), TypeError, 'Should throw TypeError for non-array availableMaterials');

// Test invalid process selection
assertThrows(() => pricingEngine.calculateTaskCost({ processes: ['invalid'] }, mockAdminSettings), TypeError, 'Should throw TypeError for invalid process selection');
assertThrows(() => pricingEngine.calculateTaskCost({ processes: [{ quantity: -1 }] }, mockAdminSettings), RangeError, 'Should throw RangeError for negative process quantity');
// Note: quantity 0 defaults to 1, so we test with explicit 0 that should fail
assertThrows(() => pricingEngine.calculateTaskCost({ processes: [{ quantity: 0, process: { laborHours: 1 } }] }, mockAdminSettings), RangeError, 'Should throw RangeError for zero process quantity');

// Test invalid material selection
assertThrows(() => pricingEngine.calculateTaskCost({ materials: ['invalid'] }, mockAdminSettings), TypeError, 'Should throw TypeError for invalid material selection');
assertThrows(() => pricingEngine.calculateTaskCost({ materials: [{ quantity: -1 }] }, mockAdminSettings), RangeError, 'Should throw RangeError for negative material quantity');
// Note: quantity 0 defaults to 1, so we test with explicit 0 that should fail
assertThrows(() => pricingEngine.calculateTaskCost({ materials: [{ quantity: 0, material: { estimatedCost: 10 } }] }, mockAdminSettings), RangeError, 'Should throw RangeError for zero material quantity');

// Test valid taskData (should not throw)
try {
  const result = pricingEngine.calculateTaskCost({ processes: [], materials: [] }, mockAdminSettings);
  assert(result && typeof result === 'object', 'Valid taskData should return result object');
} catch (error) {
  testsFailed++;
  failures.push('Valid taskData should not throw error');
  console.log(`❌ FAIL: Valid taskData should not throw error - ${error.message}`);
}

console.log('');

// Test 6: calculateLaborCost validation
console.log('Test Suite 6: calculateLaborCost Guard Clauses');
console.log('---------------------------------------------');

// Test invalid laborHours
assertThrows(() => pricingEngine.calculateLaborCost('invalid', 'standard', mockAdminSettings), TypeError, 'Should throw TypeError for invalid laborHours');
assertThrows(() => pricingEngine.calculateLaborCost(null, 'standard', mockAdminSettings), TypeError, 'Should throw TypeError for null laborHours');
assertThrows(() => pricingEngine.calculateLaborCost(-5, 'standard', mockAdminSettings), RangeError, 'Should throw RangeError for negative laborHours');

// Test invalid skillLevel
assertThrows(() => pricingEngine.calculateLaborCost(1, 123, mockAdminSettings), TypeError, 'Should throw TypeError for non-string skillLevel');

// Test valid inputs (should not throw)
try {
  const result = pricingEngine.calculateLaborCost(2, 'standard', mockAdminSettings);
  assert(typeof result === 'number' && result >= 0, 'Valid inputs should return number');
} catch (error) {
  testsFailed++;
  failures.push('Valid inputs should not throw error');
  console.log(`❌ FAIL: Valid inputs should not throw error - ${error.message}`);
}

console.log('');

// Test 7: getHourlyRateForSkill validation
console.log('Test Suite 7: getHourlyRateForSkill Guard Clauses');
console.log('------------------------------------------------');

// Test invalid skillLevel
assertThrows(() => pricingEngine.getHourlyRateForSkill(123, mockAdminSettings), TypeError, 'Should throw TypeError for non-string skillLevel');
assertThrows(() => pricingEngine.getHourlyRateForSkill(null, mockAdminSettings), TypeError, 'Should throw TypeError for null skillLevel');

// Test valid skillLevel (should not throw)
try {
  const result = pricingEngine.getHourlyRateForSkill('standard', mockAdminSettings);
  assert(typeof result === 'number' && result > 0, 'Valid skillLevel should return positive number');
} catch (error) {
  testsFailed++;
  failures.push('Valid skillLevel should not throw error');
  console.log(`❌ FAIL: Valid skillLevel should not throw error - ${error.message}`);
}

console.log('');

// Summary
console.log('\n📊 Validation Test Summary');
console.log('==========================');
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
  console.log('\n🎉 All validation tests passed!');
  process.exit(0);
}

