import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'crypto';
import { encryptSensitiveData, decryptSensitiveData, hashSecurityCode } from './encryption';

/**
 * EFD-DEFECTS S4: the key used to fall back to the literal 'development-secret-key' whenever
 * NEXTAUTH_SECRET was missing. What must hold now:
 *   1. production with no secret refuses, instead of encrypting with a key anyone can read here
 *   2. with the secret set, the derivation is exactly what it was — already-encrypted data decrypts
 */
const ORIGINAL = { secret: process.env.NEXTAUTH_SECRET, key: process.env.ENCRYPTION_KEY, env: process.env.NODE_ENV };

afterEach(() => {
  for (const [name, value] of [['NEXTAUTH_SECRET', ORIGINAL.secret], ['ENCRYPTION_KEY', ORIGINAL.key], ['NODE_ENV', ORIGINAL.env]]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('the app secret', () => {
  it('refuses in production when NEXTAUTH_SECRET is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.NEXTAUTH_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => encryptSensitiveData('stuller-password')).toThrow();
    expect(() => hashSecurityCode('1234')).toThrow();
  });

  it('derives exactly the key it always did when the secret is set', () => {
    delete process.env.ENCRYPTION_KEY;
    process.env.NEXTAUTH_SECRET = 'prod-like-secret';
    process.env.NODE_ENV = 'production';

    // Encrypt the old way, by hand, and prove the module still reads it.
    const key = crypto.scryptSync('prod-like-secret', 'encryption-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('admin-sensitive-data', 'utf8'));
    const body = Buffer.concat([cipher.update('stuller-password', 'utf8'), cipher.final()]);
    const legacy = Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');

    expect(decryptSensitiveData(legacy)).toBe('stuller-password');
    expect(decryptSensitiveData(encryptSensitiveData('round trip'))).toBe('round trip');
    expect(hashSecurityCode('1234')).toBe(crypto.scryptSync('1234', 'prod-like-secret', 32).toString('hex'));
  });

  it('still works in development without a secret', () => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.NEXTAUTH_SECRET;
    process.env.NODE_ENV = 'development';
    expect(decryptSensitiveData(encryptSensitiveData('dev'))).toBe('dev');
  });
});
