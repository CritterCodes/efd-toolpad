import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

// Encryption Config
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey() {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) return Buffer.from(envKey, 'base64');
    const appSecret = NEXTAUTH_SECRET || 'development-secret-key';
    return crypto.scryptSync(appSecret, 'encryption-salt', KEY_LENGTH);
}

function decryptSensitiveData(encryptedData) {
    if (!encryptedData) return null;
    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedData, 'base64');
        const iv = combined.subarray(0, IV_LENGTH);
        const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAAD(Buffer.from('admin-sensitive-data', 'utf8'));
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        return `DECRYPTION_FAILED: ${error.message}`;
    }
}

async function checkSettings() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI not found in .env.local');
        process.exit(1);
    }

    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(DB_NAME);
        
        const settings = await db.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' });
        
        if (!settings) {
            console.log('No admin settings found.');
            return;
        }

        console.log('--- Shopify Settings ---');
        console.log('Enabled:', settings.shopify?.enabled);
        console.log('Shop URL:', settings.shopify?.shopUrl);
        
        const rawToken = settings.shopify?.accessToken;
        console.log('Raw Token (first 20 chars):', rawToken ? rawToken.substring(0, 20) + '...' : 'None');
        
        if (rawToken) {
            const decrypted = decryptSensitiveData(rawToken);
            console.log('Decrypted Token:', decrypted);
            
            // Check if it matches env vars
            console.log('Matches .env.local?', decrypted === process.env.SHOPIFY_PRIVATE_ACCESS_TOKEN);

            // Test the token against Shopify
            console.log('Testing token against Shopify...');
            const shopUrl = settings.shopify?.shopUrl;
            if (shopUrl) {
                try {
                    const response = await fetch(`https://${shopUrl}/admin/api/2024-01/shop.json`, {
                        headers: {
                            'X-Shopify-Access-Token': decrypted,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Token is VALID. Shop name:', data.shop.name);
                    } else {
                        console.log('❌ Token is INVALID. Status:', response.status, response.statusText);
                    }
                } catch (err) {
                    console.error('Error testing token:', err.message);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

checkSettings();
