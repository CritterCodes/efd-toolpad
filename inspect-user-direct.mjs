import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-connection-string';

async function inspectUser() {
  let client;
  
  try {
    console.log('\n🔍 === DIRECT DATABASE USER INSPECTION ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📧 Searching for user: jacobaengel55@gmail.com');
    console.log('🌐 MongoDB URI:', MONGODB_URI ? 'Connected' : 'Not configured');
    
    // Connect directly to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(); // Use default database from connection string
    const user = await db.collection("users").findOne({ email: 'jacobaengel55@gmail.com' });
    
    if (!user) {
      console.log('❌ User NOT found in database');
      console.log('🔍 Checking if users collection exists...');
      
      const collections = await db.listCollections().toArray();
      console.log('📋 Available collections:', collections.map(c => c.name));
      
      const userCount = await db.collection("users").countDocuments();
      console.log('👥 Total users in collection:', userCount);
      
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
      console.log('❌ Expected role should be: admin');
      console.log('🔧 User needs role update in database');
    } else {
      console.log('\n✅ === ROLE IS CORRECT ===');
      console.log('🎭 Database role is admin (as expected)');
      console.log('🤔 Issue must be elsewhere in the auth flow');
      console.log('🔍 Need to check JWT/session callback logic');
    }
    
    console.log('\n🔍 === DATABASE INSPECTION COMPLETE ===\n');
    
  } catch (error) {
    console.error('❌ Error inspecting user:', error.message);
    console.error('🔗 Stack:', error.stack);
    
    if (error.message.includes('MONGODB_URI')) {
      console.log('\n💡 Make sure MONGODB_URI environment variable is set');
      console.log('🔧 Check your .env.local file');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('🔐 MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Run the inspection
inspectUser();