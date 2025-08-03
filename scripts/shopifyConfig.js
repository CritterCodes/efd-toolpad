#!/usr/bin/env node

/**
 * Node.js utility for getting Shopify configuration from database
 * This replaces environment variables with database admin settings
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Encryption utilities (Node.js version)
function isDataEncrypted(data) {
    if (!data || typeof data !== 'string') return false;
    return data.startsWith('enc:');
}

function decryptSensitiveData(encryptedData) {
    if (!isDataEncrypted(encryptedData)) {
        return encryptedData;
    }

    try {
        const encKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
        if (!encKey) {
            throw new Error('Encryption key not found');
        }

        const key = crypto.createHash('sha256').update(encKey).digest();
        const encryptedString = encryptedData.replace('enc:', '');
        const [ivHex, encryptedHex, tagHex] = encryptedString.split(':');
        
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt sensitive data');
    }
}

/**
 * Get Shopify configuration from admin settings database
 */
async function getShopifyConfig() {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGO_DB_NAME || 'efd-database';

    if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is required');
    }

    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        const db = client.db(dbName);
        
        const adminSettings = await db
            .collection('adminSettings')
            .findOne({ _id: 'repair_task_admin_settings' });

        if (!adminSettings?.shopify) {
            throw new Error('Shopify settings not found in admin configuration');
        }

        const shopifySettings = adminSettings.shopify;

        if (!shopifySettings.enabled) {
            throw new Error('Shopify integration is disabled');
        }

        if (!shopifySettings.shopUrl || !shopifySettings.accessToken) {
            throw new Error('Shopify configuration incomplete - missing shop URL or access token');
        }

        // Decrypt access token if encrypted
        let accessToken = shopifySettings.accessToken;
        if (isDataEncrypted(accessToken)) {
            accessToken = decryptSensitiveData(accessToken);
        }

        return {
            storeUrl: shopifySettings.shopUrl,
            accessToken: accessToken,
            apiVersion: shopifySettings.apiVersion || '2025-07',
            webhooksEnabled: shopifySettings.webhooksEnabled || false,
            enabled: shopifySettings.enabled
        };

    } finally {
        await client.close();
    }
}

/**
 * Check if Shopify integration is enabled and configured
 */
async function isShopifyEnabled() {
    try {
        const config = await getShopifyConfig();
        return config.enabled && config.storeUrl && config.accessToken;
    } catch (error) {
        return false;
    }
}

/**
 * Get Shopify API URL for a given endpoint
 */
function getShopifyApiUrl(storeUrl, apiVersion, endpoint) {
    return `https://${storeUrl}/admin/api/${apiVersion}/${endpoint}`;
}

/**
 * Get Shopify GraphQL API URL
 */
function getShopifyGraphQLUrl(storeUrl, apiVersion) {
    return `https://${storeUrl}/admin/api/${apiVersion}/graphql.json`;
}

/**
 * Get common Shopify headers for API requests
 */
function getShopifyHeaders(accessToken) {
    return {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

module.exports = {
    getShopifyConfig,
    isShopifyEnabled,
    getShopifyApiUrl,
    getShopifyGraphQLUrl,
    getShopifyHeaders
};
