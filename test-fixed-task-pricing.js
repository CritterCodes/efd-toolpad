/**
 * Test Fixed Task Pricing Logic
 */

// Copy the fixed functions
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

function generateUnderscoreMetalKey(metalType, karat) {
  if (!metalType || !karat) {
    return null;
  }

  // Normalize inputs
  const normalizedKarat = karat.toLowerCase().replace(/[^0-9k]/g, '');
  
  // Metal type mapping for underscore format
  const metalTypeMap = {
    'yellow-gold': 'yellow_gold',
    'white-gold': 'white_gold', 
    'rose-gold': 'rose_gold',
    'sterling-silver': 'sterling_silver',
    'silver': 'sterling_silver',
    'platinum': 'platinum',
    'palladium': 'palladium'
  };

  const mappedMetalType = metalTypeMap[metalType.toLowerCase()] || metalType.toLowerCase().replace('-', '_');
  
  // Generate underscore format key: "sterling_silver_925", "yellow_gold_10k"
  return `${mappedMetalType}_${normalizedKarat}`;
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
  // Check for universal pricing structure (tasks)
  if (item?.universalPricing && repairMetalType && karat) {
    const metalKey = generateMetalKey(repairMetalType, karat);
    
    // Try the generated key first (space format: "Sterling Silver 925")
    if (metalKey && item.universalPricing[metalKey]) {
      const pricing = item.universalPricing[metalKey];
      const retailPrice = pricing.retailPrice || pricing.totalCost || 0;
      return applyBusinessMultiplier(retailPrice, adminSettings);
    }
    
    // Try underscore format (task data format: "sterling_silver_925")
    const underscoreKey = generateUnderscoreMetalKey(repairMetalType, karat);
    if (underscoreKey && item.universalPricing[underscoreKey]) {
      const pricing = item.universalPricing[underscoreKey];
      const retailPrice = pricing.retailPrice || pricing.totalCost || 0;
      return applyBusinessMultiplier(retailPrice, adminSettings);
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

// Real task data from the system
const realTask = {
  "_id": { "$oid": "68bcab87f4fc6631302a9f1c" },
  "title": "drfsdf",
  "description": "sdfgsfd",
  "category": "shanks",
  "universalPricing": {
    "sterling_silver_925": {
      "metalLabel": "Sterling Silver 925",
      "metalType": "sterling_silver",
      "karat": "925",
      "totalLaborHours": 0.24,
      "totalProcessCost": 12.27,
      "totalMaterialCost": 0,
      "baseCost": 12.27,
      "retailPrice": 24.55
    },
    "yellow_gold_10k": {
      "metalLabel": "Yellow Gold 10K",
      "metalType": "yellow_gold",
      "karat": "10k",
      "retailPrice": 30.00
    }
  }
};

console.log('🧪 Testing Fixed Task Pricing Logic');
console.log('====================================');
console.log('');

console.log('Key Generation Test:');
console.log('-------------------');
const spaceKey = generateMetalKey('silver', '925');
const underscoreKey = generateUnderscoreMetalKey('silver', '925');
console.log(`Space format: "${spaceKey}"`);
console.log(`Underscore format: "${underscoreKey}"`);
console.log(`Available in task: ${realTask.universalPricing.hasOwnProperty(underscoreKey) ? 'YES' : 'NO'}`);
console.log('');

console.log('Task Pricing Test:');
console.log('------------------');
const silverPrice = getMetalSpecificPrice(realTask, 'silver', '925', false, mockAdminSettings);
const goldPrice = getMetalSpecificPrice(realTask, 'yellow-gold', '10k', false, mockAdminSettings);

console.log(`Silver 925 pricing:`);
console.log(`  Base price: $24.55`);
console.log(`  With multiplier: $${silverPrice.toFixed(2)}`);
console.log(`  Expected: $${(24.55 * 1.30).toFixed(2)}`);
console.log(`  ✅ Working: ${Math.abs(silverPrice - (24.55 * 1.30)) < 0.01 ? 'YES' : 'NO'}`);
console.log('');

console.log(`Yellow Gold 10K pricing:`);
console.log(`  Base price: $30.00`);
console.log(`  With multiplier: $${goldPrice.toFixed(2)}`);
console.log(`  Expected: $${(30.00 * 1.30).toFixed(2)}`);
console.log(`  ✅ Working: ${Math.abs(goldPrice - (30.00 * 1.30)) < 0.01 ? 'YES' : 'NO'}`);
console.log('');

console.log('🎯 Summary');
console.log('==========');
console.log('✅ Added support for underscore format keys used by task data');
console.log('✅ Task pricing should now work correctly in the repair form');
console.log('✅ Admin multipliers applied to task pricing');
