/**
 * Test Admin Multiplier Application to Materials
 * 
 * This test verifies that business multipliers (administrativeFee + businessFee + consumablesFee + 1)
 * are being properly applied to material pricing just like they are for tasks.
 */

import { getMetalSpecificPrice } from './src/utils/repair-pricing.util.js';

// Mock admin settings with the pricing structure
const mockAdminSettings = {
  pricing: {
    administrativeFee: 0.10,  // 10%
    businessFee: 0.15,        // 15%
    consumablesFee: 0.05,     // 5%
    materialMarkup: 1.5
  }
};

// Calculate expected business multiplier: (0.10 + 0.15 + 0.05) + 1 = 1.30
const expectedBusinessMultiplier = 1.30;

// Mock materials for testing
const mockUniversalMaterial = {
  name: "Hard Solder Sheet",
  displayName: "Hard Solder Sheet",
  price: 5.50, // Universal price
  isMetalDependent: false
};

const mockStullerMaterial = {
  name: "Rhodium Bath",
  displayName: "Rhodium Bath", 
  stullerProducts: [
    {
      metalType: null, // Universal product
      karat: null,
      pricePerPortion: 3.25,
      markedUpPrice: 4.00
    }
  ]
};

const mockMetalSpecificMaterial = {
  name: "14K Gold Wire",
  displayName: "14K Gold Wire",
  stullerProducts: [
    {
      metalType: "yellow_gold",
      karat: "14K",
      pricePerPortion: 15.75,
      markedUpPrice: 18.25
    }
  ]
};

console.log('🧪 Testing Admin Multiplier Application to Materials');
console.log('================================================');
console.log(`Expected Business Multiplier: ${expectedBusinessMultiplier}x`);
console.log('');

// Test 1: Universal pricing with admin multiplier
console.log('Test 1: Universal Pricing Material');
console.log('----------------------------------');
const universalBasePrice = mockUniversalMaterial.price;
const universalWithMultiplier = getMetalSpecificPrice(
  mockUniversalMaterial, 
  'yellow-gold', 
  '14k', 
  false, 
  mockAdminSettings
);
const universalWithoutMultiplier = getMetalSpecificPrice(
  mockUniversalMaterial, 
  'yellow-gold', 
  '14k', 
  false, 
  null // No admin settings
);
console.log(`Base Price: $${universalBasePrice.toFixed(2)}`);
console.log(`Without Multiplier: $${universalWithoutMultiplier.toFixed(2)}`);
console.log(`With Multiplier: $${universalWithMultiplier.toFixed(2)}`);
console.log(`Expected With Multiplier: $${(universalBasePrice * expectedBusinessMultiplier).toFixed(2)}`);
console.log(`✅ Multiplier Applied: ${universalWithMultiplier === (universalBasePrice * expectedBusinessMultiplier) ? 'YES' : 'NO'}`);
console.log('');

// Test 2: Stuller universal product with admin multiplier
console.log('Test 2: Stuller Universal Product');
console.log('----------------------------------');
const stullerBasePrice = mockStullerMaterial.stullerProducts[0].pricePerPortion;
const stullerWithMultiplier = getMetalSpecificPrice(
  mockStullerMaterial, 
  'yellow-gold', 
  '14k', 
  false, 
  mockAdminSettings
);
const stullerWithoutMultiplier = getMetalSpecificPrice(
  mockStullerMaterial, 
  'yellow-gold', 
  '14k', 
  false, 
  null
);
console.log(`Base Price: $${stullerBasePrice.toFixed(2)}`);
console.log(`Without Multiplier: $${stullerWithoutMultiplier.toFixed(2)}`);
console.log(`With Multiplier: $${stullerWithMultiplier.toFixed(2)}`);
console.log(`Expected With Multiplier: $${(stullerBasePrice * expectedBusinessMultiplier).toFixed(2)}`);
console.log(`✅ Multiplier Applied: ${stullerWithMultiplier === (stullerBasePrice * expectedBusinessMultiplier) ? 'YES' : 'NO'}`);
console.log('');

// Test 3: Metal-specific Stuller product with admin multiplier
console.log('Test 3: Metal-Specific Stuller Product');
console.log('---------------------------------------');
const metalSpecificBasePrice = mockMetalSpecificMaterial.stullerProducts[0].pricePerPortion;
const metalSpecificWithMultiplier = getMetalSpecificPrice(
  mockMetalSpecificMaterial, 
  'yellow-gold', 
  '14k', 
  false, 
  mockAdminSettings
);
const metalSpecificWithoutMultiplier = getMetalSpecificPrice(
  mockMetalSpecificMaterial, 
  'yellow-gold', 
  '14k', 
  false, 
  null
);
console.log(`Base Price: $${metalSpecificBasePrice.toFixed(2)}`);
console.log(`Without Multiplier: $${metalSpecificWithoutMultiplier.toFixed(2)}`);
console.log(`With Multiplier: $${metalSpecificWithMultiplier.toFixed(2)}`);
console.log(`Expected With Multiplier: $${(metalSpecificBasePrice * expectedBusinessMultiplier).toFixed(2)}`);
console.log(`✅ Multiplier Applied: ${metalSpecificWithMultiplier === (metalSpecificBasePrice * expectedBusinessMultiplier) ? 'YES' : 'NO'}`);
console.log('');

// Test 4: Zero price handling
console.log('Test 4: Zero Price Handling');
console.log('---------------------------');
const zeroPrice = getMetalSpecificPrice(
  { name: "Non-existent item" }, 
  'yellow-gold', 
  '14k', 
  false, 
  mockAdminSettings
);
console.log(`Zero Price Result: $${zeroPrice.toFixed(2)}`);
console.log(`✅ Zero Handled Correctly: ${zeroPrice === 0 ? 'YES' : 'NO'}`);
console.log('');

// Test 5: Missing admin settings handling
console.log('Test 5: Missing Admin Settings');
console.log('-------------------------------');
const noAdminSettings = getMetalSpecificPrice(
  mockUniversalMaterial, 
  'yellow-gold', 
  '14k', 
  false, 
  null
);
console.log(`Base Price: $${universalBasePrice.toFixed(2)}`);
console.log(`Without Admin Settings: $${noAdminSettings.toFixed(2)}`);
console.log(`✅ No Multiplier When Missing Settings: ${noAdminSettings === universalBasePrice ? 'YES' : 'NO'}`);
console.log('');

console.log('🎯 Summary');
console.log('==========');
console.log('Admin business multipliers should now be applied to materials just like tasks.');
console.log(`Business Multiplier Formula: (administrativeFee + businessFee + consumablesFee) + 1`);
console.log(`Current Multiplier: ${expectedBusinessMultiplier}x`);
console.log('This ensures materials receive the same markup structure as tasks for consistent pricing.');
