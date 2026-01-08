/**
 * Test script to validate task creation pricing with database data
 * Run this to verify multi-variant pricing is working correctly
 */

console.log('🧪 Testing Multi-Variant Task Pricing System');

// Test the parseMetalKey function
const parseMetalKey = (metalKey) => {
  if (!metalKey || typeof metalKey !== 'string') return null;
  
  const metalMappings = {
    'sterling silver': 'sterling_silver',
    'yellow gold': 'yellow_gold',
    'white gold': 'white_gold',
    'rose gold': 'rose_gold',
    'platinum': 'platinum'
  };
  
  const karatMatch = metalKey.match(/(\d+K?|\d{3})/i);
  const karat = karatMatch ? karatMatch[1].toUpperCase() : 'standard';
  
  for (const [displayName, metalValue] of Object.entries(metalMappings)) {
    if (metalKey.toLowerCase().includes(displayName)) {
      return {
        metalType: metalValue,
        karat: karat,
        metalLabel: metalKey
      };
    }
  }
  
  return null;
};

// Test metal key parsing
console.log('\n📋 Testing Metal Key Parsing:');
const testKeys = [
  'Sterling Silver 925',
  'Yellow Gold 14K',
  'White Gold 18K',
  'Rose Gold 14K'
];

testKeys.forEach(key => {
  const parsed = parseMetalKey(key);
  console.log(`  ${key} → ${JSON.stringify(parsed)}`);
});

// Mock material structure based on your database schema
const mockMaterial = {
  _id: "test-material-id",
  displayName: "Hard Solder Sheet",
  stullerProducts: [
    {
      metalType: "sterling_silver",
      karat: "925",
      costPerPortion: 0.137,
      stullerPrice: 4.11
    },
    {
      metalType: "yellow_gold",
      karat: "14K",
      costPerPortion: 3.714,
      stullerPrice: 111.41
    },
    {
      metalType: "white_gold",
      karat: "14K", 
      costPerPortion: 3.721,
      stullerPrice: 111.62
    }
  ]
};

// Mock process structure
const mockProcess = {
  _id: "test-process-id",
  displayName: "Solder",
  laborHours: 0.12,
  pricing: {
    totalCost: {
      "Sterling Silver 925": 6.137,
      "Yellow Gold 14K": 9.714,
      "White Gold 14K": 9.721
    },
    laborCost: 4.8
  }
};

console.log('\n🧪 Testing Metal Variant Detection:');

// Simulate the task creation logic
const taskMaterials = [{ materialId: "test-material-id", quantity: 1 }];
const taskProcesses = [{ processId: "test-process-id", quantity: 1 }];

// Extract metal variants from materials
const metalVariantsFromMaterials = new Map();
mockMaterial.stullerProducts.forEach(product => {
  if (product.metalType && product.karat) {
    const variantKey = `${product.metalType}_${product.karat}`;
    const metalLabel = `${product.metalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${product.karat}`;
    
    metalVariantsFromMaterials.set(variantKey, {
      metalType: product.metalType,
      karat: product.karat,
      metalLabel: metalLabel
    });
  }
});

// Extract metal variants from processes  
const metalVariantsFromProcesses = new Map();
Object.keys(mockProcess.pricing.totalCost).forEach(metalKey => {
  const parsed = parseMetalKey(metalKey);
  if (parsed) {
    const variantKey = `${parsed.metalType}_${parsed.karat}`;
    metalVariantsFromProcesses.set(variantKey, {
      metalType: parsed.metalType,
      karat: parsed.karat,
      metalLabel: metalKey
    });
  }
});

// Combine variants
const allVariants = new Map([...metalVariantsFromMaterials, ...metalVariantsFromProcesses]);
const metalVariants = Array.from(allVariants.values());

console.log(`  Found ${metalVariants.length} metal variants:`);
metalVariants.forEach(variant => {
  console.log(`    ${variant.metalLabel} (${variant.metalType}_${variant.karat})`);
});

console.log('\n💰 Testing Price Calculation:');

// Simulate pricing calculation for each variant
metalVariants.forEach(variant => {
  const { metalType, karat, metalLabel } = variant;
  
  // Get material cost for this variant
  const matchingProduct = mockMaterial.stullerProducts.find(p => 
    p.metalType === metalType && p.karat === karat
  );
  
  let materialCost = 0;
  if (matchingProduct && matchingProduct.costPerPortion > 0) {
    materialCost = matchingProduct.costPerPortion * 1; // quantity = 1
    console.log(`  ✅ ${metalLabel}: Material cost $${materialCost.toFixed(2)}`);
  } else {
    console.log(`  ❌ ${metalLabel}: No valid material pricing found`);
    return;
  }
  
  // Get process cost for this variant
  let processCost = 0;
  if (mockProcess.pricing.totalCost[metalLabel]) {
    processCost = mockProcess.pricing.totalCost[metalLabel] * 1; // quantity = 1
    console.log(`  ✅ ${metalLabel}: Process cost $${processCost.toFixed(2)}`);
  } else {
    console.log(`  ❌ ${metalLabel}: No process pricing found`);
    return;
  }
  
  const totalTaskCost = materialCost + processCost;
  console.log(`  💰 ${metalLabel}: Total task cost $${totalTaskCost.toFixed(2)}`);
});

console.log('\n✅ Test completed. Check the task creation page to ensure:');
console.log('   1. No fallback to example data');
console.log('   2. Proper error messages when database data is missing');
console.log('   3. Multi-variant pricing displays correctly');
console.log('   4. All metal variants from materials and processes are detected');
