import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Get or generate encryption key from environment
 * In production, this should be stored securely (e.g., in environment variables, key vault)
 */
function getEncryptionKey() {
    const envKey = process.env.ENCRYPTION_KEY;
    
    if (envKey) {
        // Use key from environment (base64 encoded)
        return Buffer.from(envKey, 'base64');
    }
    
    // For development/testing - generate a consistent key based on app secret
    const appSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key';
    return crypto.scryptSync(appSecret, 'encryption-salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data
 * @param {string} plaintext - Data to encrypt
 * @returns {string} - Base64 encoded encrypted data
 */
export function encryptSensitiveData(plaintext) {
    if (!plaintext) return null;
    
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        cipher.setAAD(Buffer.from('admin-sensitive-data', 'utf8'));
        
        let encrypted = cipher.update(plaintext, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        const tag = cipher.getAuthTag();
        
        // Combine IV + tag + encrypted data
        const combined = Buffer.concat([iv, tag, encrypted]);
        
        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt sensitive data');
    }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {string} - Decrypted plaintext
 */
export function decryptSensitiveData(encryptedData) {
    if (!encryptedData) return null;
    
    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedData, 'base64');
        
        // Extract components
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
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt sensitive data');
    }
}

/**
 * Hash security codes (one-way)
 * @param {string} code - The security code to hash
 * @returns {string} - Hashed code
 */
export function hashSecurityCode(code) {
    if (!code) return null;
    
    try {
        const salt = process.env.NEXTAUTH_SECRET || 'development-secret-key';
        return crypto.scryptSync(code, salt, 32).toString('hex');
    } catch (error) {
        console.error('Hashing error:', error);
        throw new Error('Failed to hash security code');
    }
}

/**
 * Verify security code against hash
 * @param {string} code - The code to verify
 * @param {string} hash - The stored hash
 * @returns {boolean} - True if code matches hash
 */
export function verifySecurityCode(code, hash) {
    if (!code || !hash) return false;
    
    try {
        const hashedInput = hashSecurityCode(code);
        return hashedInput === hash;
    } catch (error) {
        console.error('Verification error:', error);
        return false;
    }
}

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Base64 encoded token
 */
export function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('base64');
}

/**
 * Sanitize sensitive data for logging/display
 * @param {string} data - The sensitive data
 * @param {number} visibleChars - Number of characters to show (default: 4)
 * @returns {string} - Masked data
 */
export function maskSensitiveData(data, visibleChars = 4) {
    if (!data) return '';
    if (data.length <= visibleChars) return '••••';
    
    const visible = data.substring(0, visibleChars);
    const masked = '•'.repeat(Math.max(4, data.length - visibleChars));
    
    return visible + masked;
}

/**
 * Check if data appears to be encrypted (base64 format with sufficient length)
 * @param {string} data - The data to check
 * @returns {boolean} - True if data appears encrypted
 */
export function isDataEncrypted(data) {
    if (!data || typeof data !== 'string') return false;
    
    // Check if it's base64 and sufficiently long for encrypted data
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Pattern.test(data) && data.length > 50;
}

/**
 * Audit log entry for sensitive data operations
 * @param {string} operation - The operation performed
 * @param {string} dataType - Type of sensitive data
 * @param {string} userEmail - User performing the operation
 * @returns {Object} - Audit log entry
 */
export function createAuditLogEntry(operation, dataType, userEmail) {
    return {
        timestamp: new Date(),
        operation,
        dataType,
        userEmail,
        ip: null, // Should be populated by the calling function
        userAgent: null, // Should be populated by the calling function
        success: true
    };
}
