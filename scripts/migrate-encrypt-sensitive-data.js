/**
 * Database Migration Script: Encrypt Existing Sensitive Data
 * 
 * This script will:
 * 1. Find all existing admin settings with unencrypted sensitive data
 * 2. Encrypt passwords and API keys
 * 3. Hash security codes
 * 4. Create audit trail for the migration
 * 
 * Run this script after deploying the encryption utilities.
 */

import { db } from '../lib/database.js';
import { 
  encryptSensitiveData, 
  hashSecurityCode, 
  isDataEncrypted,
  createAuditLogEntry 
} from '../utils/encryption.js';

async function migrateAdminSettings() {
  console.log('🔐 Starting admin settings encryption migration...');
  
  try {
    await db.connect();
    
    // Find admin settings document
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });

    if (!adminSettings) {
      console.log('ℹ️  No admin settings found - nothing to migrate');
      return;
    }

    let updateNeeded = false;
    const updates = {};

    // Migrate Stuller password
    if (adminSettings.stuller?.password && !isDataEncrypted(adminSettings.stuller.password)) {
      console.log('🔒 Encrypting Stuller password...');
      updates['stuller.password'] = encryptSensitiveData(adminSettings.stuller.password);
      updateNeeded = true;
    }

    // Migrate security code (hash it instead of encrypting)
    if (adminSettings.security?.securityCode && adminSettings.security.securityCode.length === 4) {
      console.log('🔒 Hashing security code...');
      updates['security.securityCode'] = hashSecurityCode(adminSettings.security.securityCode);
      updateNeeded = true;
    }

    // Apply updates if needed
    if (updateNeeded) {
      updates.migratedAt = new Date();
      updates.migrationVersion = '1.0.0';

      await db._instance
        .collection('adminSettings')
        .updateOne(
          { _id: 'repair_task_admin_settings' },
          { $set: updates }
        );

      // Create audit log
      const auditEntry = createAuditLogEntry(
        'data_encryption_migration',
        'admin_settings_security',
        'system_migration'
      );
      auditEntry.details = {
        stullerPasswordEncrypted: !!updates['stuller.password'],
        securityCodeHashed: !!updates['security.securityCode']
      };

      await db._instance
        .collection('adminSettingsAudit')
        .insertOne(auditEntry);

      console.log('✅ Admin settings migration completed successfully');
    } else {
      console.log('ℹ️  Admin settings already encrypted - no migration needed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function migrateUserPasswords() {
  console.log('🔐 Starting user password migration...');
  
  try {
    // Find users with plaintext passwords (if any exist)
    const users = await db._instance
      .collection('users')
      .find({ password: { $exists: true, $ne: null } })
      .toArray();

    if (users.length === 0) {
      console.log('ℹ️  No user passwords found - nothing to migrate');
      return;
    }

    let migratedCount = 0;

    for (const user of users) {
      if (user.password && !isDataEncrypted(user.password)) {
        // Note: For user passwords, you might want to use bcrypt instead
        // This is just for demonstration - adjust based on your auth strategy
        const encryptedPassword = encryptSensitiveData(user.password);
        
        await db._instance
          .collection('users')
          .updateOne(
            { _id: user._id },
            { 
              $set: { 
                password: encryptedPassword,
                passwordMigratedAt: new Date()
              }
            }
          );

        migratedCount++;
      }
    }

    console.log(`✅ Migrated ${migratedCount} user passwords`);

  } catch (error) {
    console.error('❌ User password migration failed:', error);
    throw error;
  }
}

async function createSecurityIndexes() {
  console.log('📚 Creating security audit indexes...');
  
  try {
    // Create indexes for audit collection
    await db._instance
      .collection('adminSettingsAudit')
      .createIndexes([
        { key: { timestamp: -1 } },
        { key: { userEmail: 1, timestamp: -1 } },
        { key: { operation: 1, timestamp: -1 } },
        { key: { success: 1, timestamp: -1 } }
      ]);

    console.log('✅ Security audit indexes created');

  } catch (error) {
    console.error('❌ Index creation failed:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting security encryption migration...');
  console.log('📋 This will encrypt sensitive data in your database');
  
  try {
    await migrateAdminSettings();
    await migrateUserPasswords();
    await createSecurityIndexes();
    
    console.log('🎉 Migration completed successfully!');
    console.log('⚠️  Make sure to:');
    console.log('   1. Set ENCRYPTION_KEY in your environment variables');
    console.log('   2. Backup your database before deploying to production');
    console.log('   3. Test all admin functions after deployment');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration };
