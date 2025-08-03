import { generateShortCode, parseShortCode, generateTaskSku } from './src/utils/skuGenerator.js';

console.log('Testing shortCode generation:');
console.log('='.repeat(50));

// Test the examples from your specification
const tests = [
  { category: 'shank', metalType: 'yellow_gold', karat: '14k', taskNumber: 1, expected: '02201' },
  { category: 'prongs', metalType: 'white_gold', karat: '18k', taskNumber: 11, expected: '13311' },
  { category: 'stone_setting', metalType: 'silver', karat: '925_silver', taskNumber: 21, expected: '21121' },
  { category: 'chains', metalType: 'not_applicable', karat: 'not_applicable', taskNumber: 41, expected: '40041' },
  { category: 'misc', metalType: 'not_applicable', karat: 'not_applicable', taskNumber: 70, expected: '70070' }
];

tests.forEach(test => {
  const generated = generateShortCode(test.category, test.metalType, test.karat, test.taskNumber);
  const parsed = parseShortCode(generated);
  const sku = generateTaskSku(test.category, generated);
  
  console.log(`Category: ${test.category}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Generated: ${generated}`);
  console.log(`Match: ${generated === test.expected ? '✅' : '❌'}`);
  console.log(`SKU: ${sku}`);
  console.log(`Parsed:`, parsed);
  console.log('-'.repeat(30));
});

console.log('\nTesting default behavior (no task number specified):');
console.log('-'.repeat(50));

const defaultTests = [
  { category: 'shank', metalType: 'not_applicable', karat: 'not_applicable' },
  { category: 'prongs', metalType: 'not_applicable', karat: 'not_applicable' },
  { category: 'stone_setting', metalType: 'not_applicable', karat: 'not_applicable' }
];

defaultTests.forEach(test => {
  const generated = generateShortCode(test.category, test.metalType, test.karat);
  const sku = generateTaskSku(test.category, generated);
  
  console.log(`Category: ${test.category}`);
  console.log(`Generated: ${generated}`);
  console.log(`SKU: ${sku}`);
  console.log('-'.repeat(20));
});
