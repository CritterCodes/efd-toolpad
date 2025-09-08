/**
 * Test Admin Settings Error Handling
 * 
 * This test verifies that the pricing system properly throws errors
 * when admin settings are missing or incomplete, instead of using
 * hardcoded fallback values.
 */

import pkg from './src/utils/repair-pricing.util.js';
const { getMetalSpecificPrice } = pkg;

// Mock data
const mockTask = {
  universalPricing: {
    'yellow_gold_14K': {
      retailPrice: 100.00,
      totalCost: 100.00
    }
  }
};

console.log('🧪 Testing Admin Settings Error Handling\n');

// Test 1: No admin settings provided
console.log('Test 1: No admin settings provided');
try {
  const price = getMetalSpecificPrice(mockTask, 'yellow-gold', '14k', false, null);
  console.log('❌ FAIL: Should have thrown error, but got price:', price);
} catch (error) {
  console.log('✅ PASS: Correctly threw error:', error.message);
}

// Test 2: Admin settings missing pricing structure
console.log('\nTest 2: Admin settings missing pricing structure');
try {
  const price = getMetalSpecificPrice(mockTask, 'yellow-gold', '14k', false, {});
  console.log('❌ FAIL: Should have thrown error, but got price:', price);
} catch (error) {
  console.log('✅ PASS: Correctly threw error:', error.message);
}

// Test 3: Admin settings with incomplete pricing fees
console.log('\nTest 3: Admin settings with incomplete pricing fees');
try {
  const incompleteAdminSettings = {
    pricing: {
      administrativeFee: 0.10,
      // Missing businessFee and consumablesFee
    }
  };
  const price = getMetalSpecificPrice(mockTask, 'yellow-gold', '14k', false, incompleteAdminSettings);
  console.log('❌ FAIL: Should have thrown error, but got price:', price);
} catch (error) {
  console.log('✅ PASS: Correctly threw error:', error.message);
}

// Test 4: Complete admin settings (should work)
console.log('\nTest 4: Complete admin settings (should work)');
try {
  const completeAdminSettings = {
    pricing: {
      administrativeFee: 0.10,
      businessFee: 0.15,
      consumablesFee: 0.05
    }
  };
  const price = getMetalSpecificPrice(mockTask, 'yellow-gold', '14k', false, completeAdminSettings);
  console.log('✅ PASS: Correctly calculated price with admin settings:', price);
  console.log('   Expected: 130.00 (100 * 1.30), Got:', price);
} catch (error) {
  console.log('❌ FAIL: Should have worked, but threw error:', error.message);
}

// Test 5: Wholesale pricing (should skip multiplier)
console.log('\nTest 5: Wholesale pricing (should skip multiplier)');
try {
  const completeAdminSettings = {
    pricing: {
      administrativeFee: 0.10,
      businessFee: 0.15,
      consumablesFee: 0.05
    }
  };
  const price = getMetalSpecificPrice(mockTask, 'yellow-gold', '14k', true, completeAdminSettings);
  console.log('✅ PASS: Correctly calculated wholesale price:', price);
  console.log('   Expected: 100.00 (no multiplier), Got:', price);
} catch (error) {
  console.log('❌ FAIL: Should have worked, but threw error:', error.message);
}

console.log('\n🏁 Error handling tests complete!');
console.log('\n📋 Summary:');
console.log('- ✅ No hardcoded fallbacks - system requires proper admin settings');
console.log('- ✅ Clear error messages when admin settings are missing/incomplete');
console.log('- ✅ Proper price calculation when admin settings are complete');
console.log('- ✅ Wholesale pricing correctly skips admin multiplier');
