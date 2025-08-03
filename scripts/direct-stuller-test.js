/**
 * Direct Stuller API Test Script
 * Tests the Stuller API integration directly without going through our API
 */

require('dotenv/config');
const { MongoClient } = require('mongodb');
const { decryptSensitiveData, isDataEncrypted } = require('../src/utils/encryption.js');

const client = new MongoClient(process.env.MONGODB_URI);

async function testStullerDirect() {
    console.log('🔄 Testing Stuller API directly...\n');
    
    try {
        // Connect to MongoDB
        await client.connect();
        console.log('✅ MongoDB Connected');
        
        const db = client.db(process.env.MONGODB_DB);
        const adminSettings = await db
            .collection('adminSettings')
            .findOne({ _id: 'repair_task_admin_settings' });
        
        if (!adminSettings?.integrations?.stuller?.enabled) {
            console.log('❌ Stuller integration is not enabled');
            return;
        }
        
        const stullerConfig = adminSettings.integrations.stuller;
        console.log('📋 Stuller Configuration:');
        console.log(`- Enabled: ${stullerConfig.enabled}`);
        console.log(`- API URL: ${stullerConfig.apiUrl}`);
        console.log(`- Has Username: ${!!stullerConfig.username}`);
        console.log(`- Has Password: ${!!stullerConfig.password}`);
        
        // Decrypt credentials
        let username, password;
        
        if (isDataEncrypted(stullerConfig.username)) {
            username = decryptSensitiveData(stullerConfig.username);
            console.log('✅ Username decrypted successfully');
        } else {
            username = stullerConfig.username;
            console.log('⚠️  Username is not encrypted');
        }
        
        if (isDataEncrypted(stullerConfig.password)) {
            password = decryptSensitiveData(stullerConfig.password);
            console.log('✅ Password decrypted successfully');
        } else {
            password = stullerConfig.password;
            console.log('⚠️  Password is not encrypted');
        }
        
        console.log(`\n🔑 Credentials:`) ;
        console.log(`- Username: ${username ? username.substring(0, 3) + '***' : 'N/A'}`);
        console.log(`- Password: ${password ? '***' + password.substring(password.length - 3) : 'N/A'}`);
        
        // Test Stuller API directly
        console.log('\n🔄 Testing direct Stuller API call...');
        
        const authString = Buffer.from(`${username}:${password}`).toString('base64');
        
        const response = await fetch(`${stullerConfig.apiUrl}/v2/products/SKU123`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
                'User-Agent': 'EFD-CRM/1.0'
            }
        });
        
        console.log(`📊 API Response Status: ${response.status}`);
        console.log(`📊 API Response Headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log(`📊 API Response Body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
        
        if (response.ok) {
            console.log('✅ Stuller API call successful!');
        } else {
            console.log('❌ Stuller API call failed');
            if (response.status === 401) {
                console.log('🔍 This indicates invalid credentials');
            } else if (response.status === 400) {
                console.log('🔍 This indicates a bad request - check the API endpoint or parameters');
            }
        }
        
    } catch (error) {
        console.error('❌ Error testing Stuller integration:', error);
    } finally {
        await client.close();
    }
}

testStullerDirect();
