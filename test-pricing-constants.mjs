/**
 * Validation Tests for Pricing Constants
 * 
 * Tests all constants, helper functions, and validation logic in pricing.constants.js
 * Run with: node test-pricing-constants.mjs
 */

// Import helper
import { loadESModule } from './test-pricing-helper.mjs';

// Load constants module (using .mjs version for Node.js compatibility)
const constantsModule = await import('./src/constants/pricing.constants.mjs');

const {
  SKILL_LEVEL_MULTIPLIERS,
  DEFAULT_MATERIAL_MARKUP,
  MINIMUM_MATERIAL_MARKUP,
  DEFAULT_BUSINESS_FEES,
  DEFAULT_BUSINESS_MULTIPLIER,
  MINIMUM_BUSINESS_MULTIPLIER,
  DEFAULT_METAL_COMPLEXITY_MULTIPLIERS,
  DEFAULT_BASE_WAGE,
  WHOLESALE_FORMULA_TYPE,
  DEFAULT_WHOLESALE_CONFIG,
  calculateBusinessMultiplier,
  getSkillLevelMultiplier,
  getMetalComplexityMultiplier,
  enforceMinimumMaterialMarkup,
  enforceMinimumBusinessMultiplier,
  enforceMinimumWholesaleMultiplier,
  calculateHourlyRateForSkill,
  validatePricingConstants
} = constantsModule;

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

function assertEqual(actual, expected, message) {
  const tolerance = 0.001;
  const isEqual = Math.abs(actual - expected) < tolerance;
  assert(isEqual, `${message} (expected: ${expected}, got: ${actual})`);
}

console.log('🧪 Pricing Constants Validation Tests');
console.log('=====================================\n');

// Test 1: Skill Level Multipliers
console.log('Test Suite 1: Skill Level Multipliers');
console.log('--------------------------------------');
assertEqual(SKILL_LEVEL_MULTIPLIERS.basic, 0.75, 'Basic skill multiplier should be 0.75');
assertEqual(SKILL_LEVEL_MULTIPLIERS.standard, 1.0, 'Standard skill multiplier should be 1.0');
assertEqual(SKILL_LEVEL_MULTIPLIERS.advanced, 1.25, 'Advanced skill multiplier should be 1.25');
assertEqual(SKILL_LEVEL_MULTIPLIERS.expert, 1.5, 'Expert skill multiplier should be 1.5');
assert(SKILL_LEVEL_MULTIPLIERS.basic < SKILL_LEVEL_MULTIPLIERS.standard, 'Basic should be less than standard');
assert(SKILL_LEVEL_MULTIPLIERS.standard < SKILL_LEVEL_MULTIPLIERS.advanced, 'Standard should be less than advanced');
assert(SKILL_LEVEL_MULTIPLIERS.advanced < SKILL_LEVEL_MULTIPLIERS.expert, 'Advanced should be less than expert');
console.log('');

// Test 2: Material Markup
console.log('Test Suite 2: Material Markup');
console.log('------------------------------');
assertEqual(DEFAULT_MATERIAL_MARKUP, 2.0, 'Default material markup should be 2.0');
assertEqual(MINIMUM_MATERIAL_MARKUP, 2.0, 'Minimum material markup should be 2.0');
assert(DEFAULT_MATERIAL_MARKUP >= MINIMUM_MATERIAL_MARKUP, 'Default should be >= minimum');
assert(DEFAULT_MATERIAL_MARKUP >= 1.0, 'Default material markup should be >= 1.0');
console.log('');

// Test 3: Business Fees
console.log('Test Suite 3: Business Fees');
console.log('----------------------------');
assertEqual(DEFAULT_BUSINESS_FEES.administrativeFee, 0.10, 'Administrative fee should be 0.10');
assertEqual(DEFAULT_BUSINESS_FEES.businessFee, 0.15, 'Business fee should be 0.15');
assertEqual(DEFAULT_BUSINESS_FEES.consumablesFee, 0.05, 'Consumables fee should be 0.05');
assert(DEFAULT_BUSINESS_FEES.administrativeFee >= 0 && DEFAULT_BUSINESS_FEES.administrativeFee <= 1, 'Administrative fee should be 0-1');
assert(DEFAULT_BUSINESS_FEES.businessFee >= 0 && DEFAULT_BUSINESS_FEES.businessFee <= 1, 'Business fee should be 0-1');
assert(DEFAULT_BUSINESS_FEES.consumablesFee >= 0 && DEFAULT_BUSINESS_FEES.consumablesFee <= 1, 'Consumables fee should be 0-1');
console.log('');

// Test 4: Business Multiplier
console.log('Test Suite 4: Business Multiplier');
console.log('----------------------------------');
const expectedBusinessMultiplier = (0.10 + 0.15 + 0.05) + 1; // 1.30
assertEqual(DEFAULT_BUSINESS_MULTIPLIER, expectedBusinessMultiplier, `Business multiplier should be ${expectedBusinessMultiplier}`);
assertEqual(MINIMUM_BUSINESS_MULTIPLIER, 2.0, 'Minimum business multiplier should be 2.0');
assert(DEFAULT_BUSINESS_MULTIPLIER >= 1.0, 'Business multiplier should be >= 1.0');
assert(MINIMUM_BUSINESS_MULTIPLIER >= 1.0, 'Minimum business multiplier should be >= 1.0');
console.log('');

// Test 5: Metal Complexity Multipliers
console.log('Test Suite 5: Metal Complexity Multipliers');
console.log('-------------------------------------------');
assert(DEFAULT_METAL_COMPLEXITY_MULTIPLIERS.gold === 1.0, 'Gold complexity should be 1.0');
assert(DEFAULT_METAL_COMPLEXITY_MULTIPLIERS.silver === 0.9, 'Silver complexity should be 0.9');
assert(DEFAULT_METAL_COMPLEXITY_MULTIPLIERS.platinum === 1.3, 'Platinum complexity should be 1.3');
assert(DEFAULT_METAL_COMPLEXITY_MULTIPLIERS.other === 1.0, 'Other metal complexity should be 1.0');
Object.values(DEFAULT_METAL_COMPLEXITY_MULTIPLIERS).forEach((multiplier, index) => {
  assert(multiplier > 0, `Metal complexity multiplier ${index} should be > 0`);
});
console.log('');

// Test 6: Base Wage
console.log('Test Suite 6: Base Wage');
console.log('-----------------------');
assertEqual(DEFAULT_BASE_WAGE, 50.00, 'Default base wage should be 50.00');
assert(DEFAULT_BASE_WAGE > 0, 'Base wage should be > 0');
assert(DEFAULT_BASE_WAGE < 1000, 'Base wage should be reasonable (< 1000)');
console.log('');

// Test 7: Wholesale Configuration
console.log('Test Suite 7: Wholesale Configuration');
console.log('--------------------------------------');
assert(WHOLESALE_FORMULA_TYPE.PERCENTAGE_OF_RETAIL === 'percentage_of_retail', 'Percentage type should be correct');
assert(WHOLESALE_FORMULA_TYPE.BUSINESS_MULTIPLIER_ADJUSTMENT === 'business_multiplier_adjustment', 'Adjustment type should be correct');
assert(WHOLESALE_FORMULA_TYPE.FORMULA_BASED === 'formula_based', 'Formula type should be correct');
assert(DEFAULT_WHOLESALE_CONFIG.type === WHOLESALE_FORMULA_TYPE.FORMULA_BASED, 'Default wholesale type should be formula_based');
assertEqual(DEFAULT_WHOLESALE_CONFIG.percentage, 0.5, 'Default wholesale percentage should be 0.5');
assertEqual(DEFAULT_WHOLESALE_CONFIG.adjustment, 0.75, 'Default wholesale adjustment should be 0.75');
assertEqual(DEFAULT_WHOLESALE_CONFIG.minimumMultiplier, 1.5, 'Default wholesale minimum multiplier should be 1.5');
console.log('');

// Test 8: calculateBusinessMultiplier
console.log('Test Suite 8: calculateBusinessMultiplier Function');
console.log('--------------------------------------------------');
const testFees1 = { administrativeFee: 0.10, businessFee: 0.15, consumablesFee: 0.05 };
const result1 = calculateBusinessMultiplier(testFees1);
assertEqual(result1, 1.30, 'Business multiplier calculation should be correct');

const testFees2 = { administrativeFee: 0.20, businessFee: 0.20, consumablesFee: 0.10 };
const result2 = calculateBusinessMultiplier(testFees2);
assertEqual(result2, 1.50, 'Business multiplier with different fees should be correct');

const testFees3 = {};
const result3 = calculateBusinessMultiplier(testFees3);
assertEqual(result3, DEFAULT_BUSINESS_MULTIPLIER, 'Business multiplier with empty fees should use defaults');
console.log('');

// Test 9: getSkillLevelMultiplier
console.log('Test Suite 9: getSkillLevelMultiplier Function');
console.log('---------------------------------------------');
assertEqual(getSkillLevelMultiplier('basic'), 0.75, 'Basic skill level should return 0.75');
assertEqual(getSkillLevelMultiplier('standard'), 1.0, 'Standard skill level should return 1.0');
assertEqual(getSkillLevelMultiplier('advanced'), 1.25, 'Advanced skill level should return 1.25');
assertEqual(getSkillLevelMultiplier('expert'), 1.5, 'Expert skill level should return 1.5');
assertEqual(getSkillLevelMultiplier('invalid'), 1.0, 'Invalid skill level should return standard (1.0)');
assertEqual(getSkillLevelMultiplier('BASIC'), 0.75, 'Case-insensitive should work');
assertEqual(getSkillLevelMultiplier(null), 1.0, 'Null skill level should return standard');
assertEqual(getSkillLevelMultiplier(undefined), 1.0, 'Undefined skill level should return standard');
console.log('');

// Test 10: getMetalComplexityMultiplier
console.log('Test Suite 10: getMetalComplexityMultiplier Function');
console.log('----------------------------------------------------');
assertEqual(getMetalComplexityMultiplier('gold'), 1.0, 'Gold metal should return 1.0');
assertEqual(getMetalComplexityMultiplier('silver'), 0.9, 'Silver metal should return 0.9');
assertEqual(getMetalComplexityMultiplier('platinum'), 1.3, 'Platinum metal should return 1.3');
assertEqual(getMetalComplexityMultiplier('unknown'), 1.0, 'Unknown metal should return other (1.0)');

const customMultipliers = { gold: 1.5, silver: 1.2 };
assertEqual(getMetalComplexityMultiplier('gold', customMultipliers), 1.5, 'Custom multipliers should override defaults');
assertEqual(getMetalComplexityMultiplier('silver', customMultipliers), 1.2, 'Custom multipliers should override defaults');
assertEqual(getMetalComplexityMultiplier('platinum', customMultipliers), 1.3, 'Non-custom metals should use defaults');
console.log('');

// Test 11: enforceMinimumMaterialMarkup
console.log('Test Suite 11: enforceMinimumMaterialMarkup Function');
console.log('-----------------------------------------------------');
assertEqual(enforceMinimumMaterialMarkup(2.5), 2.5, 'Markup above minimum should remain unchanged');
assertEqual(enforceMinimumMaterialMarkup(1.5), MINIMUM_MATERIAL_MARKUP, 'Markup below minimum should be enforced');
assertEqual(enforceMinimumMaterialMarkup(2.0), 2.0, 'Markup at minimum should remain unchanged');
assertEqual(enforceMinimumMaterialMarkup(0.5), MINIMUM_MATERIAL_MARKUP, 'Very low markup should be enforced');
assertEqual(enforceMinimumMaterialMarkup(3.0, 2.5), 3.0, 'Custom minimum should work');
assertEqual(enforceMinimumMaterialMarkup(1.0, 2.5), 2.5, 'Custom minimum should be enforced');
console.log('');

// Test 12: enforceMinimumBusinessMultiplier
console.log('Test Suite 12: enforceMinimumBusinessMultiplier Function');
console.log('---------------------------------------------------------');
assertEqual(enforceMinimumBusinessMultiplier(2.5), 2.5, 'Multiplier above minimum should remain unchanged');
assertEqual(enforceMinimumBusinessMultiplier(1.5), MINIMUM_BUSINESS_MULTIPLIER, 'Multiplier below minimum should be enforced');
assertEqual(enforceMinimumBusinessMultiplier(2.0), 2.0, 'Multiplier at minimum should remain unchanged');
assertEqual(enforceMinimumBusinessMultiplier(1.3), MINIMUM_BUSINESS_MULTIPLIER, 'Default multiplier should be enforced');
assertEqual(enforceMinimumBusinessMultiplier(3.0, 2.5), 3.0, 'Custom minimum should work');
assertEqual(enforceMinimumBusinessMultiplier(1.0, 2.5), 2.5, 'Custom minimum should be enforced');
console.log('');

// Test 13: enforceMinimumWholesaleMultiplier
console.log('Test Suite 13: enforceMinimumWholesaleMultiplier Function');
console.log('----------------------------------------------------------');
assertEqual(enforceMinimumWholesaleMultiplier(2.0), 2.0, 'Multiplier above minimum should remain unchanged');
assertEqual(enforceMinimumWholesaleMultiplier(1.0), DEFAULT_WHOLESALE_CONFIG.minimumMultiplier, 'Multiplier below minimum should be enforced');
assertEqual(enforceMinimumWholesaleMultiplier(1.5), 1.5, 'Multiplier at minimum should remain unchanged');
assertEqual(enforceMinimumWholesaleMultiplier(0.5), DEFAULT_WHOLESALE_CONFIG.minimumMultiplier, 'Very low multiplier should be enforced');
assertEqual(enforceMinimumWholesaleMultiplier(2.0, 1.8), 2.0, 'Custom minimum should work');
assertEqual(enforceMinimumWholesaleMultiplier(1.0, 1.8), 1.8, 'Custom minimum should be enforced');
console.log('');

// Test 14: calculateHourlyRateForSkill
console.log('Test Suite 14: calculateHourlyRateForSkill Function');
console.log('----------------------------------------------------');
const baseWage = 50.00;
assertEqual(calculateHourlyRateForSkill(baseWage, 'basic'), 37.5, 'Basic hourly rate should be 37.5');
assertEqual(calculateHourlyRateForSkill(baseWage, 'standard'), 50.0, 'Standard hourly rate should be 50.0');
assertEqual(calculateHourlyRateForSkill(baseWage, 'advanced'), 62.5, 'Advanced hourly rate should be 62.5');
assertEqual(calculateHourlyRateForSkill(baseWage, 'expert'), 75.0, 'Expert hourly rate should be 75.0');
assertEqual(calculateHourlyRateForSkill(baseWage, 'invalid'), 50.0, 'Invalid skill should use standard rate');
assertEqual(calculateHourlyRateForSkill(40.0, 'expert'), 60.0, 'Different base wage should calculate correctly');
console.log('');

// Test 15: validatePricingConstants
console.log('Test Suite 15: validatePricingConstants Function');
console.log('------------------------------------------------');
const validation = validatePricingConstants();
assert(validation.valid === true, 'Constants validation should pass');
assert(Array.isArray(validation.errors), 'Errors should be an array');
assert(validation.errors.length === 0, 'Should have no validation errors');
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

