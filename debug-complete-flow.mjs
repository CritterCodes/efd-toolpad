#!/usr/bin/env node

/**
 * COMPREHENSIVE DEBUGGING SCRIPT
 * This will test every possible redirect source
 */

import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://repair.engelfinedesign.com';
const SHOP_URL = 'https://shop.engelfinedesign.com';

async function debugCompleteFlow() {
    console.log('🚀 COMPREHENSIVE REDIRECT DEBUGGING\n');
    
    // 1. Test DNS resolution
    console.log('--- STEP 1: DNS RESOLUTION ---');
    try {
        const response = await fetch(PRODUCTION_URL, { 
            method: 'HEAD',
            redirect: 'manual' // Don't follow redirects
        });
        console.log(`Status: ${response.status}`);
        console.log('Headers:', Object.fromEntries(response.headers));
        
        if (response.status >= 300 && response.status < 400) {
            console.log('🚨 FOUND REDIRECT!');
            console.log(`Location: ${response.headers.get('location')}`);
        }
    } catch (error) {
        console.log('DNS/Connection error:', error.message);
    }
    
    // 2. Test root path
    console.log('\n--- STEP 2: ROOT PATH TEST ---');
    try {
        const response = await fetch(`${PRODUCTION_URL}/`, { 
            method: 'GET',
            redirect: 'manual'
        });
        console.log(`Status: ${response.status}`);
        if (response.status >= 300 && response.status < 400) {
            console.log('🚨 ROOT REDIRECT!');
            console.log(`Location: ${response.headers.get('location')}`);
        }
    } catch (error) {
        console.log('Root path error:', error.message);
    }
    
    // 3. Test auth signin path
    console.log('\n--- STEP 3: AUTH SIGNIN PATH TEST ---');
    try {
        const response = await fetch(`${PRODUCTION_URL}/auth/signin`, { 
            method: 'GET',
            redirect: 'manual'
        });
        console.log(`Status: ${response.status}`);
        if (response.status >= 300 && response.status < 400) {
            console.log('🚨 AUTH SIGNIN REDIRECT!');
            console.log(`Location: ${response.headers.get('location')}`);
        }
    } catch (error) {
        console.log('Auth signin error:', error.message);
    }
    
    // 4. Test dashboard path
    console.log('\n--- STEP 4: DASHBOARD PATH TEST ---');
    try {
        const response = await fetch(`${PRODUCTION_URL}/dashboard`, { 
            method: 'GET',
            redirect: 'manual'
        });
        console.log(`Status: ${response.status}`);
        if (response.status >= 300 && response.status < 400) {
            console.log('🚨 DASHBOARD REDIRECT!');
            console.log(`Location: ${response.headers.get('location')}`);
        }
    } catch (error) {
        console.log('Dashboard error:', error.message);
    }
    
    // 5. Test API health
    console.log('\n--- STEP 5: API HEALTH CHECK ---');
    try {
        const response = await fetch(`${PRODUCTION_URL}/api/health`, { 
            method: 'GET',
            redirect: 'manual'
        });
        console.log(`Status: ${response.status}`);
        console.log('Response text:', await response.text().catch(() => 'No text'));
    } catch (error) {
        console.log('API health error:', error.message);
    }
    
    // 6. Check if shop domain is responding
    console.log('\n--- STEP 6: SHOP DOMAIN CHECK ---');
    try {
        const response = await fetch(`${SHOP_URL}/`, { 
            method: 'HEAD',
            redirect: 'manual'
        });
        console.log(`Shop domain status: ${response.status}`);
        console.log('Shop headers:', Object.fromEntries(response.headers));
    } catch (error) {
        console.log('Shop domain error:', error.message);
    }
    
    console.log('\n🔍 DEBUGGING COMPLETE');
    console.log('Look for any 3xx status codes above - they indicate redirects!');
}

debugCompleteFlow().catch(console.error);