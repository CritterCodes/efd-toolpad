import { db } from '@/lib/database';
import { decryptSensitiveData, isDataEncrypted } from '@/utils/encryption';

export async function getStullerConfig() {
  await db.connect();
  const adminSettings = await db._instance
    .collection('adminSettings')
    .findOne({ _id: 'repair_task_admin_settings' });

  const stuller = adminSettings?.stuller || {};
  if (!stuller.enabled) {
    const err = new Error('Stuller integration is not enabled');
    err.status = 400;
    throw err;
  }

  if (!stuller.username || !stuller.password) {
    const err = new Error('Stuller credentials not configured');
    err.status = 500;
    throw err;
  }

  let password = stuller.password;
  if (isDataEncrypted(password)) {
    try {
      password = decryptSensitiveData(password);
    } catch (error) {
      const err = new Error('Failed to decrypt Stuller credentials');
      err.status = 500;
      err.cause = error;
      throw err;
    }
  }

  return {
    enabled: true,
    username: stuller.username,
    password,
    apiUrl: stuller.apiUrl || 'https://api.stuller.com',
    updateFrequency: stuller.updateFrequency || 'daily',
  };
}

export function buildStullerAuthHeader({ username, password }) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}
