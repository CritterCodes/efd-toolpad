// Simple Stuller Integration Test
// Run this to check if Stuller integration is properly configured

const { MongoClient } = require('mongodb');

async function testStullerIntegration() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://critter:Zapatas2024@23.94.251.158:27017/?directConnection=true&serverSelectionTimeoutMS=2000&authSource=admin&appName=mongosh+2.3.3');
  
  try {
    await client.connect();
    console.log('✅ MongoDB Connected');
    
    const db = client.db(process.env.MONGO_DB_NAME || 'efd-database-DEV');
    const adminSettings = await db.collection('adminSettings')
      .findOne({ _id: 'repair_task_admin_settings' });
    
    if (!adminSettings) {
      console.log('❌ Admin settings not found - run initialize-admin-settings.js first');
      return;
    }
    
    const stuller = adminSettings.stuller;
    console.log('\n📊 Stuller Integration Status:');
    console.log('- Enabled:', stuller?.enabled || false);
    console.log('- Has Username:', !!stuller?.username);
    console.log('- Has Password:', !!stuller?.password);
    console.log('- API URL:', stuller?.apiUrl || 'Not set');
    console.log('- Update Frequency:', stuller?.updateFrequency || 'Not set');
    console.log('- Last Update:', stuller?.lastUpdate || 'Never');
    
    if (!stuller?.enabled) {
      console.log('\n⚠️  Stuller integration is DISABLED');
      console.log('   To enable: Go to Admin Settings → Integrations → Stuller');
    } else if (!stuller?.username || !stuller?.password) {
      console.log('\n⚠️  Stuller credentials are MISSING');
      console.log('   Configure credentials in Admin Settings → Integrations → Stuller');
    } else {
      console.log('\n✅ Stuller integration appears to be configured');
      console.log('   If you\'re still getting 400 errors, check the credentials validity');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await client.close();
  }
}

testStullerIntegration();
