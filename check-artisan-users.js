// Quick script to check for users with artisan applications
const { MongoClient } = require('mongodb');

async function checkArtisanUsers() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/efd_database');
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔍 Checking for users with artisan applications...');
    
    // Check for users with artisan-applicant role
    const applicants = await db.collection('users').find({ 
      role: 'artisan-applicant' 
    }).toArray();
    
    console.log(`📋 Found ${applicants.length} artisan applicants`);
    
    // Check for users with artisan role
    const artisans = await db.collection('users').find({ 
      role: 'artisan' 
    }).toArray();
    
    console.log(`👨‍🎨 Found ${artisans.length} active artisans`);
    
    // Check for users with artisanApplication field
    const usersWithApplications = await db.collection('users').find({ 
      artisanApplication: { $exists: true } 
    }).toArray();
    
    console.log(`📄 Found ${usersWithApplications.length} users with artisan application data`);
    
    if (usersWithApplications.length > 0) {
      console.log('\n📄 Sample application data:');
      console.log(JSON.stringify(usersWithApplications[0].artisanApplication, null, 2));
    }
    
    // Check total users
    const totalUsers = await db.collection('users').countDocuments();
    console.log(`👥 Total users in database: ${totalUsers}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkArtisanUsers();