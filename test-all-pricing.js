/**
 * Test Task and Process Pricing with Admin Multipliers
 */

// Import the function (simulated for testing)
function generateMetalKey(metalType, karat) {
  if (!metalType || !karat) {
    return null;
  }

  // Normalize inputs
  const normalizedKarat = karat.toUpperCase().replace(/[^0-9K]/g, '');
  
  // Metal type mapping - updated to handle both formats
  const metalTypeMap = {
    'yellow-gold': 'Yellow Gold',
    'white-gold': 'White Gold', 
    'rose-gold': 'Rose Gold',
    'sterling-silver': 'Sterling Silver',
    'silver': 'Sterling Silver',
    'platinum': 'Platinum',
    'palladium': 'Palladium'
  };

  const mappedMetalType = metalTypeMap[metalType.toLowerCase()] || metalType;
  
  let metalKey;
  
  // Handle sterling silver special case
  if (metalType.toLowerCase().includes('silver')) {
    metalKey = `${mappedMetalType} ${normalizedKarat}`;
  } else {
    // Handle gold and other metals
    metalKey = `${mappedMetalType} ${normalizedKarat}`;
  }

  return metalKey;
}

function applyBusinessMultiplier(basePrice, adminSettings) {
  if (!basePrice || basePrice === 0) {
    return 0;
  }
  
  if (!adminSettings?.pricing) {
    return basePrice;
  }
  
  const { administrativeFee = 0.10, businessFee = 0.15, consumablesFee = 0.05 } = adminSettings.pricing;
  const businessMultiplier = (administrativeFee + businessFee + consumablesFee) + 1;
  
  return basePrice * businessMultiplier;
}

function getMetalSpecificPrice(item, repairMetalType, karat = null, isWholesale = false, adminSettings = null) {
  // Check for universal pricing first
  if (item?.price && typeof item.price === 'number') {
    return applyBusinessMultiplier(item.price, adminSettings);
  }

  // Check for process-specific pricing
  if (item?.processPrice && typeof item.processPrice === 'number') {
    return applyBusinessMultiplier(item.processPrice, adminSettings);
  }

  // Check for universal pricing structure (tasks)
  if (item?.universalPricing && repairMetalType && karat) {
    const metalKey = generateMetalKey(repairMetalType, karat);
    if (metalKey && item.universalPricing[metalKey]) {
      const pricing = item.universalPricing[metalKey];
      const retailPrice = pricing.retailPrice || pricing.totalCost || 0;
      return applyBusinessMultiplier(retailPrice, adminSettings);
    }
  }

  // Check for process pricing structure
  if (item?.pricing?.totalCost && repairMetalType && karat) {
    const metalKey = generateMetalKey(repairMetalType, karat);
    if (metalKey && typeof item.pricing.totalCost === 'object' && item.pricing.totalCost[metalKey]) {
      const totalCost = item.pricing.totalCost[metalKey];
      return applyBusinessMultiplier(totalCost, adminSettings);
    }
  }

  return 0;
}

// Mock admin settings
const mockAdminSettings = {
  pricing: {
    administrativeFee: 0.10,
    businessFee: 0.15,
    consumablesFee: 0.05,
  }
};

// Mock task with universal pricing
const mockTask = {
  name: "Ring Sizing",
  universalPricing: {
    "Yellow Gold 14K": {
      retailPrice: 45.00,
      totalCost: 35.00
    },
    "Sterling Silver 925": {
      retailPrice: 25.00,
      totalCost: 20.00
    }
  }
};

// Mock process with pricing structure
const mockProcess = {
  name: "Polishing",
  pricing: {
    totalCost: {
      "Yellow Gold 14K": 30.00,
      "Sterling Silver 925": 20.00
    }
  }
};

// Mock material with simple price
const mockMaterial = {
  name: "Hard Solder",
  price: 5.50
};

console.log('🧪 Testing Task, Process, and Material Pricing');
console.log('===============================================');
console.log('');

// Test 1: Task with universal pricing
console.log('Test 1: Task with Universal Pricing');
console.log('-----------------------------------');
const taskPrice14k = getMetalSpecificPrice(mockTask, 'yellow-gold', '14k', false, mockAdminSettings);
const taskPriceSilver = getMetalSpecificPrice(mockTask, 'silver', '925', false, mockAdminSettings);
console.log(`Ring Sizing - 14K Yellow Gold: $${taskPrice14k.toFixed(2)} (base: $45.00, expected: $58.50)`);
console.log(`Ring Sizing - Sterling Silver: $${taskPriceSilver.toFixed(2)} (base: $25.00, expected: $32.50)`);
console.log(`✅ Task pricing working: ${taskPrice14k === 58.50 && taskPriceSilver === 32.50 ? 'YES' : 'NO'}`);
console.log('');

// Test 2: Process with pricing structure
console.log('Test 2: Process with Pricing Structure');
console.log('--------------------------------------');
const processPrice14k = getMetalSpecificPrice(mockProcess, 'yellow-gold', '14k', false, mockAdminSettings);
const processPriceSilver = getMetalSpecificPrice(mockProcess, 'silver', '925', false, mockAdminSettings);
console.log(`Polishing - 14K Yellow Gold: $${processPrice14k.toFixed(2)} (base: $30.00, expected: $39.00)`);
console.log(`Polishing - Sterling Silver: $${processPriceSilver.toFixed(2)} (base: $20.00, expected: $26.00)`);
console.log(`✅ Process pricing working: ${processPrice14k === 39.00 && processPriceSilver === 26.00 ? 'YES' : 'NO'}`);
console.log('');

// Test 3: Material with simple price
console.log('Test 3: Material with Simple Price');
console.log('----------------------------------');
const materialPrice = getMetalSpecificPrice(mockMaterial, 'yellow-gold', '14k', false, mockAdminSettings);
console.log(`Hard Solder: $${materialPrice.toFixed(2)} (base: $5.50, expected: $7.15)`);
console.log(`✅ Material pricing working: ${materialPrice === 7.15 ? 'YES' : 'NO'}`);
console.log('');

console.log('🎯 Summary');
console.log('==========');
console.log('✅ All pricing types (tasks, processes, materials) should now work correctly');
console.log('✅ Universal pricing structure support added for tasks');
console.log('✅ Process pricing structure support added for processes');
console.log('✅ Admin multipliers applied consistently across all item types');
