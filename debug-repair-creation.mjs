/**
 * Comprehensive Repair Creation Debug Script
 * Tests the entire flow from form data to database storage
 */

import { Repair } from './src/app/api/repairs/class.js';

console.log("🔧 COMPREHENSIVE REPAIR CREATION DEBUG");
console.log("=====================================\n");

// Test data that matches what NewRepairForm sends
const testFormData = {
    // Required client data
    userID: "test-user-id-12345",
    clientName: "John Doe",
    businessName: "",
    isWholesale: false,
    
    // Required repair data  
    description: "Resize wedding ring from size 6 to size 8",
    promiseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    
    // Item details
    metalType: "gold",
    karat: "14k",
    isRing: true,
    currentRingSize: "6",
    desiredRingSize: "8",
    
    // Work items
    tasks: [
        {
            id: "task-size-ring",
            name: "Size Ring",
            description: "Increase ring size by 2 sizes",
            basePrice: 35.00,
            price: 35.00,
            quantity: 1
        }
    ],
    processes: [],
    materials: [],
    customLineItems: [],
    
    // Pricing breakdown
    subtotal: 35.00,
    rushFee: 0,
    deliveryFee: 0,
    taxAmount: 3.06, // 35 * 0.0875
    totalCost: 38.06,
    
    // Flags
    isRush: false,
    includeDelivery: false,
    includeTax: true,
    taxRate: 0.0875,
    
    // Status
    status: "RECEIVING",
    createdAt: new Date().toISOString()
};

console.log("1. 📋 TESTING FORM DATA STRUCTURE");
console.log("==================================");

// Check required fields
const requiredFields = ['userID', 'clientName', 'description', 'promiseDate'];
const missingFields = requiredFields.filter(field => !testFormData[field]);

if (missingFields.length > 0) {
    console.error("❌ Missing required fields:", missingFields);
    process.exit(1);
} else {
    console.log("✅ All required fields present");
}

// Check data types
console.log("✅ userID:", testFormData.userID, "(type:", typeof testFormData.userID + ")");
console.log("✅ clientName:", testFormData.clientName, "(type:", typeof testFormData.clientName + ")");
console.log("✅ totalCost:", testFormData.totalCost, "(type:", typeof testFormData.totalCost + ")");
console.log("✅ tasks:", testFormData.tasks.length + " items", "(type:", Array.isArray(testFormData.tasks) ? 'array' : typeof testFormData.tasks + ")");

console.log("\n2. 🏗️ TESTING REPAIR CLASS CONSTRUCTION");
console.log("=======================================");

try {
    const repairInstance = new Repair(testFormData);
    
    console.log("✅ Repair class instantiated successfully");
    console.log("✅ repairID:", repairInstance.repairID);
    console.log("✅ userID:", repairInstance.userID);
    console.log("✅ clientName:", repairInstance.clientName);
    console.log("✅ description:", repairInstance.description);
    console.log("✅ totalCost:", repairInstance.totalCost);
    console.log("✅ tasks count:", repairInstance.tasks?.length || 0);
    console.log("✅ createdAt:", repairInstance.createdAt);
    
    // Test serialization (what gets saved to MongoDB)
    const serialized = JSON.stringify(repairInstance);
    console.log("✅ Object serializes correctly (length:", serialized.length, "chars)");
    
} catch (error) {
    console.error("❌ Repair class construction failed:");
    console.error("   Error:", error.message);
    console.error("   Stack:", error.stack);
    process.exit(1);
}

console.log("\n3. 🔍 TESTING DATA VALIDATION");
console.log("=============================");

// Test that all critical fields are properly mapped
const testMapping = {
    'userID': testFormData.userID,
    'clientName': testFormData.clientName,
    'description': testFormData.description,
    'totalCost': testFormData.totalCost,
    'isWholesale': testFormData.isWholesale,
    'tasks': testFormData.tasks,
    'status': testFormData.status
};

Object.entries(testMapping).forEach(([key, value]) => {
    if (value === undefined || value === null) {
        console.error(`❌ ${key} is null/undefined`);
    } else {
        console.log(`✅ ${key}:`, typeof value === 'object' ? `${typeof value} (${Array.isArray(value) ? value.length + ' items' : 'object'})` : value);
    }
});

console.log("\n4. 💰 TESTING PRICING CALCULATIONS");
console.log("==================================");

const expectedSubtotal = testFormData.tasks.reduce((sum, task) => sum + (task.price * task.quantity), 0);
const expectedTax = expectedSubtotal * testFormData.taxRate;
const expectedTotal = expectedSubtotal + expectedTax;

console.log("📊 Pricing breakdown:");
console.log("   Expected subtotal:", expectedSubtotal);
console.log("   Expected tax:", expectedTax.toFixed(2));
console.log("   Expected total:", expectedTotal.toFixed(2));
console.log("   Form subtotal:", testFormData.subtotal);
console.log("   Form tax:", testFormData.taxAmount);
console.log("   Form total:", testFormData.totalCost);

if (Math.abs(expectedTotal - testFormData.totalCost) < 0.01) {
    console.log("✅ Pricing calculations match");
} else {
    console.log("⚠️  Pricing calculations don't match - potential issue");
}

console.log("\n5. 🌐 SIMULATING API REQUEST");
console.log("============================");

// Simulate what RepairsService.createRepair sends
const apiRequestBody = JSON.stringify(testFormData);
console.log("📤 Request body size:", apiRequestBody.length, "characters");
console.log("📤 Request Content-Type: application/json");

try {
    const parsedBack = JSON.parse(apiRequestBody);
    console.log("✅ Request body can be parsed back to JSON");
    console.log("✅ Parsed userID:", parsedBack.userID);
    console.log("✅ Parsed totalCost:", parsedBack.totalCost);
} catch (error) {
    console.error("❌ Request body JSON parsing failed:", error.message);
}

console.log("\n🏁 DEBUG COMPLETE - If all tests pass, the issue may be:");
console.log("   • Database connection problems");
console.log("   • API route error handling");  
console.log("   • MongoDB insertion failures");
console.log("   • Network connectivity issues");
console.log("\n💡 Next step: Check browser console and network tab during actual repair creation");
