console.log('🔍 Starting user role debug...');

// Load environment variables
import('dotenv').then(({ config }) => {
    config({ path: '.env.local' });
    
    return import('mongodb');
}).then(async ({ MongoClient }) => {
    const uri = process.env.MONGODB_URI;
    console.log('📡 Using MongoDB URI:', uri ? 'Set' : 'Not set');
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(process.env.MONGO_DB_NAME || 'efd-database-DEV');
        const user = await db.collection('users').findOne({ email: 'jacobaengel55@gmail.com' });
        
        if (user) {
            console.log('📋 User found:');
            console.log('  Email:', user.email);
            console.log('  Role:', user.role);
            console.log('  Status:', user.status);
            console.log('  UserID:', user.userID);
            console.log('  Auth Provider:', user.authProvider);
            console.log('  Providers:', Object.keys(user.providers || {}));
        } else {
            console.log('❌ User NOT found in database');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}).catch(console.error);