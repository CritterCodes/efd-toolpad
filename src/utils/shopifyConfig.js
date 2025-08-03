import { db } from '@/lib/database';
import { decryptSensitiveData, isDataEncrypted } from './encryption';

/**
 * Get Shopify configuration from admin settings
 * This replaces the use of environment variables for Shopify integration
 */
export async function getShopifyConfig() {
  try {
    await db.connect();
    
    const adminSettings = await db._instance
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

  } catch (error) {
    console.error('Error getting Shopify configuration:', error);
    throw error;
  }
}

/**
 * Check if Shopify integration is enabled and configured
 */
export async function isShopifyEnabled() {
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
export function getShopifyApiUrl(storeUrl, apiVersion, endpoint) {
  return `https://${storeUrl}/admin/api/${apiVersion}/${endpoint}`;
}

/**
 * Get common Shopify headers for API requests
 */
export function getShopifyHeaders(accessToken) {
  return {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}
