import { db } from '@/lib/database';
import { decryptSensitiveData, isDataEncrypted } from './encryption';

/**
 * Get Shopify configuration from admin settings
 * This replaces the use of environment variables for Shopify integration
 */
export async function getShopifyConfig() {
  try {
    console.log('🔧 Getting Shopify configuration from database...');
    await db.connect();
    
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    console.log('📊 Admin settings found:', {
      hasShopify: !!adminSettings?.shopify,
      shopifyEnabled: adminSettings?.shopify?.enabled
    });

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

    console.log('🔍 Shopify settings validation:', {
      hasShopUrl: !!shopifySettings.shopUrl,
      shopUrl: shopifySettings.shopUrl,
      hasAccessToken: !!shopifySettings.accessToken,
      isAccessTokenEncrypted: isDataEncrypted(shopifySettings.accessToken),
      apiVersion: shopifySettings.apiVersion
    });

    // Decrypt access token if encrypted
    let accessToken = shopifySettings.accessToken;
    if (isDataEncrypted(accessToken)) {
      console.log('🔐 Attempting to decrypt access token...');
      try {
        accessToken = decryptSensitiveData(accessToken);
        console.log('✅ Access token decrypted successfully, length:', accessToken?.length);
      } catch (decryptError) {
        console.error('❌ Failed to decrypt access token:', {
          error: decryptError.message,
          encryptedTokenLength: shopifySettings.accessToken?.length
        });
        throw new Error(`Failed to decrypt Shopify access token: ${decryptError.message}`);
      }
    } else {
      console.log('ℹ️ Access token is not encrypted, using as-is');
    }

    const config = {
      storeUrl: shopifySettings.shopUrl,
      accessToken: accessToken,
      apiVersion: shopifySettings.apiVersion || '2025-07',
      webhooksEnabled: shopifySettings.webhooksEnabled || false,
      enabled: shopifySettings.enabled
    };

    console.log('✅ Final Shopify config prepared:', {
      storeUrl: config.storeUrl,
      hasAccessToken: !!config.accessToken,
      accessTokenLength: config.accessToken?.length,
      apiVersion: config.apiVersion,
      enabled: config.enabled
    });

    return config;

  } catch (error) {
    console.error('❌ Error getting Shopify configuration:', {
      message: error.message,
      stack: error.stack
    });
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

/**
 * Register webhook with Shopify
 */
export async function registerShopifyWebhook(topic, address) {
  try {
    console.log('📡 Registering Shopify webhook:', { topic, address });
    
    const config = await getShopifyConfig();
    
    const webhookData = {
      webhook: {
        topic: topic,
        address: address,
        format: 'json'
      }
    };

    const response = await fetch(
      getShopifyApiUrl(config.storeUrl, config.apiVersion, 'webhooks.json'),
      {
        method: 'POST',
        headers: getShopifyHeaders(config.accessToken),
        body: JSON.stringify(webhookData)
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook registered successfully:', result.webhook);
      return result.webhook;
    } else {
      const error = await response.json();
      console.error('❌ Failed to register webhook:', error);
      throw new Error(`Failed to register webhook: ${JSON.stringify(error)}`);
    }
  } catch (error) {
    console.error('❌ Error registering webhook:', error);
    throw error;
  }
}

/**
 * Setup required webhooks for the application
 */
export async function setupShopifyWebhooks(baseUrl) {
  try {
    console.log('🔧 Setting up Shopify webhooks...');
    
    const webhooks = [
      {
        topic: 'orders/updated',
        address: `${baseUrl}/api/webhooks/shopify/orders`
      },
      {
        topic: 'orders/paid',
        address: `${baseUrl}/api/webhooks/shopify/orders`
      }
    ];

    const results = [];
    for (const webhook of webhooks) {
      try {
        const result = await registerShopifyWebhook(webhook.topic, webhook.address);
        results.push(result);
      } catch (error) {
        console.error(`⚠️ Failed to register ${webhook.topic} webhook:`, error.message);
        // Continue with other webhooks even if one fails
      }
    }

    console.log(`✅ Successfully registered ${results.length}/${webhooks.length} webhooks`);
    return results;
  } catch (error) {
    console.error('❌ Error setting up webhooks:', error);
    throw error;
  }
}
