import { UnifiedUserService } from './src/lib/unifiedUserService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testHybridAuth() {
    console.log("🧪 Testing Hybrid Authentication System\n");

    // Test credentials - replace with real test data
    const testEmail = "test@engelfd.com";
    const testPassword = "testpass123";

    console.log("1. Testing Shopify Authentication...");
    try {
        const shopifyResult = await UnifiedUserService.authenticateWithShopify(testEmail, testPassword);
        console.log("✅ Shopify Auth Success:", {
            userID: shopifyResult.user.userID,
            email: shopifyResult.user.email,
            role: shopifyResult.user.role,
            hasShopifyToken: !!shopifyResult.shopifyAuth.accessToken
        });
    } catch (error) {
        console.log("❌ Shopify Auth Failed:", error.message);
    }

    console.log("\n2. Testing Google User Creation...");
    try {
        const googleUser = {
            id: "google_test_123",
            email: "googletest@engelfd.com",
            name: "Google Test User",
            image: "https://example.com/avatar.jpg"
        };

        const result = await UnifiedUserService.authenticateWithGoogle(googleUser);
        console.log("✅ Google Auth Success:", {
            userID: result.user.userID,
            email: result.user.email,
            role: result.user.role,
            hasShopifyCustomer: !!result.shopifyCustomer
        });
    } catch (error) {
        console.log("❌ Google Auth Failed:", error.message);
    }

    console.log("\n3. Testing Environment Configuration...");
    const requiredEnvVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'SHOPIFY_STORE_DOMAIN',
        'SHOPIFY_PRIVATE_ACCESS_TOKEN',
        'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
        'MONGODB_URI',
        'NEXTAUTH_SECRET'
    ];

    requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        console.log(`${envVar}: ${value ? '✅ Set' : '❌ Missing'}`);
    });

    console.log("\n🏁 Hybrid Authentication Test Complete!");
}

// Run the test
testHybridAuth().catch(console.error);