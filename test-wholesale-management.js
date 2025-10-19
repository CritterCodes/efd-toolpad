const { MongoClient } = require('mongodb');

async function testWholesaleManagement() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/efd_database');
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🏪 Testing Wholesale Management System...\n');
    
    // Check for users with wholesale applications
    const applicants = await db.collection('users').find({ 
      role: { $in: ['wholesale-applicant', 'wholesaler'] },
      wholesaleApplication: { $exists: true }
    }).toArray();
    
    console.log(`📋 Found ${applicants.length} users with wholesale applications`);
    
    applicants.forEach((user, index) => {
      const app = user.wholesaleApplication;
      console.log(`\n${index + 1}. ${app.businessName}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Contact: ${app.contactFirstName} ${app.contactLastName}`);
      console.log(`   Email: ${app.contactEmail}`);
      console.log(`   Phone: ${app.contactPhone}`);
      console.log(`   Location: ${app.businessCity}, ${app.businessState}`);
      console.log(`   Submitted: ${new Date(app.submittedAt).toLocaleDateString()}`);
      console.log(`   Application ID: ${app.applicationId}`);
      
      if (app.documents?.salesTaxPermit) {
        console.log(`   Document: ${app.documents.salesTaxPermit.originalName} (${app.documents.salesTaxPermit.size} bytes)`);
      }
    });
    
    // Get statistics
    const stats = await db.collection('users').aggregate([
      {
        $match: {
          wholesaleApplication: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$wholesaleApplication.status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\n📊 Statistics:');
    let total = 0;
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
      total += stat.count;
    });
    console.log(`   Total: ${total}`);
    
    // Test data structure for API endpoints
    console.log('\n🔧 API Test Data Structure:');
    if (applicants.length > 0) {
      const testUser = applicants[0];
      console.log('Sample user structure for API:');
      console.log('- userID:', testUser.userID);
      console.log('- email:', testUser.email);
      console.log('- role:', testUser.role);
      console.log('- wholesaleApplication.applicationId:', testUser.wholesaleApplication.applicationId);
      console.log('- wholesaleApplication.status:', testUser.wholesaleApplication.status);
    }
    
  } catch (error) {
    console.error('Error testing wholesale management:', error);
  } finally {
    await client.close();
  }
}

testWholesaleManagement().catch(console.error);