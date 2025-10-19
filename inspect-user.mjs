// Direct MongoDB User Inspection Script
import UserModel from './src/app/api/auth/[...nextauth]/model.js';

async function inspectUser() {
  try {
    console.log('\n🔍 === DIRECT DATABASE USER INSPECTION ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📧 Searching for user: jacobaengel55@gmail.com');
    
    const user = await UserModel.findByEmail('jacobaengel55@gmail.com');
    
    if (!user) {
      console.log('❌ User NOT found in database');
      return;
    }
    
    console.log('✅ User FOUND in database');
    console.log('\n📋 === COMPLETE USER OBJECT ===');
    console.log(JSON.stringify(user, null, 2));
    
    console.log('\n🎯 === KEY USER FIELDS ===');
    console.log('📧 Email:', user.email);
    console.log('🎭 Role:', user.role);
    console.log('📋 Status:', user.status);
    console.log('👤 First Name:', user.firstName);
    console.log('👤 Last Name:', user.lastName);
    console.log('🆔 User ID:', user.userID);
    console.log('🏪 Store ID:', user.storeID);
    console.log('📅 Created At:', user.createdAt);
    console.log('📅 Updated At:', user.updatedAt);
    
    if (user.role !== 'admin') {
      console.log('\n⚠️ === ROLE ISSUE CONFIRMED ===');
      console.log('🚨 Database role is:', user.role);
      console.log('✅ Expected role should be: admin');
    } else {
      console.log('\n✅ === ROLE IS CORRECT ===');
      console.log('🎭 Database role is admin (as expected)');
      console.log('🤔 Issue must be elsewhere in the auth flow');
    }
    
    console.log('\n🔍 === DATABASE INSPECTION COMPLETE ===\n');
    
  } catch (error) {
    console.error('❌ Error inspecting user:', error);
    console.error('Stack:', error.stack);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the inspection
inspectUser();