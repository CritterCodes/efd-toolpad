// Simple user inspection via API endpoint
import fetch from 'node-fetch';

async function inspectUserViaAPI() {
  try {
    console.log('\n🔍 === USER INSPECTION VIA API ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📧 Checking user: jacobaengel55@gmail.com');
    console.log('🌐 Calling production API...');
    
    const response = await fetch('https://repair.engelfinedesign.com/api/auth/fix-role?email=jacobaengel55@gmail.com');
    
    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      console.log('❌ API call failed:', response.statusText);
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ User found in database');
      console.log('\n📋 === USER DATA FROM DATABASE ===');
      console.log(JSON.stringify(data.user, null, 2));
      
      console.log('\n🎯 === KEY FIELDS ===');
      console.log('📧 Email:', data.user.email);
      console.log('🎭 Role:', data.user.role);
      console.log('📋 Status:', data.user.status);
      console.log('👤 Name:', data.user.firstName, data.user.lastName);
      console.log('🆔 UserID:', data.user.userID);
      
      if (data.user.role === 'admin') {
        console.log('\n✅ === DATABASE ROLE IS CORRECT ===');
        console.log('🎭 User has admin role in database');
        console.log('🤔 The issue is NOT in the database');
        console.log('🔍 Problem must be in auth flow/session handling');
      } else {
        console.log('\n⚠️ === DATABASE ROLE IS WRONG ===');
        console.log('🚨 Database shows role:', data.user.role);
        console.log('✅ Should be: admin');
        console.log('🔧 Database needs to be updated');
      }
    } else {
      console.log('❌ Error from API:', data.error);
    }
    
    console.log('\n🔍 === INSPECTION COMPLETE ===\n');
    
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  }
}

// Run the inspection
inspectUserViaAPI();