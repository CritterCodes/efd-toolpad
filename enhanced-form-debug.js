/**
 * Enhanced Form Submission Debugging
 * Add this to NewRepairForm.js handleSubmit for better debugging
 */

// Enhanced logging for form submission - ADD AFTER line 699 in NewRepairForm.js
console.log('📤 ENHANCED SUBMISSION DEBUG:');
console.log('=================================');
console.log('🔍 Form Data Validation:');
console.log('   ✓ clientName:', formData.clientName?.trim() || 'MISSING');
console.log('   ✓ userID:', formData.userID || 'MISSING');
console.log('   ✓ description:', formData.description?.trim() || 'MISSING');
console.log('   ✓ promiseDate:', formData.promiseDate || 'MISSING');

console.log('🔍 Pricing Data:');
console.log('   ✓ totalCost:', totalCost, '(calculated)');
console.log('   ✓ subtotal:', subtotal);
console.log('   ✓ rushFee:', rushFee);
console.log('   ✓ deliveryFee:', deliveryFee);
console.log('   ✓ taxAmount:', taxAmount);

console.log('🔍 Work Items:');
console.log('   ✓ tasks:', formData.tasks?.length || 0, 'items');
console.log('   ✓ processes:', formData.processes?.length || 0, 'items');
console.log('   ✓ materials:', formData.materials?.length || 0, 'items');
console.log('   ✓ customLineItems:', formData.customLineItems?.length || 0, 'items');

console.log('🔍 Submission Object Keys:');
console.log('   Keys:', Object.keys(submissionData));
console.log('   Size:', JSON.stringify(submissionData).length, 'characters');

// Check for problematic data types
Object.entries(submissionData).forEach(([key, value]) => {
    if (value === undefined) {
        console.warn(`⚠️  ${key} is undefined`);
    } else if (value === null) {
        console.warn(`⚠️  ${key} is null`);
    } else if (typeof value === 'object' && value.constructor?.name === 'Object' && Object.keys(value).length === 0) {
        console.warn(`⚠️  ${key} is empty object`);
    }
});

console.log('📡 About to call RepairsService.createRepair...');

// Enhanced error logging - WRAP EXISTING RepairsService.createRepair CALL
try {
    console.log('📡 Calling RepairsService.createRepair...');
    const result = await RepairsService.createRepair(submissionData);
    console.log('✅ RepairsService.createRepair SUCCESS:', result);
    
    if (!result || !result.repairID) {
        console.error('❌ RepairsService returned invalid result:', result);
        throw new Error('Invalid response from repair service - missing repairID');
    }
    
    onSubmit(result);
} catch (apiError) {
    console.error('❌ RepairsService.createRepair FAILED:');
    console.error('   Error message:', apiError.message);
    console.error('   Error stack:', apiError.stack);
    console.error('   Full error object:', apiError);
    
    // Check if it's a network error
    if (apiError.response) {
        console.error('   HTTP Status:', apiError.response.status);
        console.error('   HTTP Data:', apiError.response.data);
    }
    
    throw apiError;
}
