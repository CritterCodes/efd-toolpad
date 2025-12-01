import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://crittercodes:Q8kLKdQPLZ0NJMfk@cluster0.zfcjj.mongodb.net/';
const DB_NAME = process.env.MONGO_DB_NAME || 'efd-database-DEV';

async function debugCADRequestStructure() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(DB_NAME);
        
        // Find the specific gemstone
        const gemstone = await db.collection('products').findOne({
            productId: 'gem_mi0vjq5n_s3n7as'
        });
        
        if (gemstone) {
            console.log('\n🔍 Gemstone found:');
            console.log('ProductId:', gemstone.productId);
            console.log('Title:', gemstone.title);
            
            if (gemstone.cadRequests) {
                console.log('\n📋 CAD Requests:');
                console.log('Number of requests:', gemstone.cadRequests.length);
                
                gemstone.cadRequests.forEach((request, index) => {
                    console.log(`\nRequest ${index + 1}:`);
                    console.log('  _id:', request._id);
                    console.log('  Type of _id:', typeof request._id);
                    console.log('  Status:', request.status);
                    console.log('  Created:', request.createdAt);
                    console.log('  Full request object keys:', Object.keys(request));
                });
                
                // Look specifically for our target CAD request
                const targetRequest = gemstone.cadRequests.find(req => {
                    const reqId = req._id;
                    if (typeof reqId === 'object' && reqId.toString) {
                        return reqId.toString() === 'cad_1763264886773_4odnkq';
                    }
                    return reqId === 'cad_1763264886773_4odnkq';
                });
                
                if (targetRequest) {
                    console.log('\n🎯 Target CAD Request Found:');
                    console.log(JSON.stringify(targetRequest, null, 2));
                } else {
                    console.log('\n❌ Target CAD Request NOT Found');
                    console.log('Looking for: cad_1763264886773_4odnkq');
                    console.log('Available IDs:');
                    gemstone.cadRequests.forEach(req => {
                        console.log('  -', req._id, `(${typeof req._id})`);
                    });
                }
            } else {
                console.log('\n❌ No CAD requests found on gemstone');
            }
            
        } else {
            console.log('❌ Gemstone not found with productId: gem_mi0vjq5n_s3n7as');
            
            // Let's see what gemstones exist
            const allGemstones = await db.collection('products').find({
                productType: 'gemstone'
            }).limit(5).toArray();
            
            console.log('\n📋 Available gemstones:');
            allGemstones.forEach(gem => {
                console.log(`  - ${gem.productId}: ${gem.title}`);
                if (gem.cadRequests) {
                    console.log(`    CAD Requests: ${gem.cadRequests.length}`);
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

debugCADRequestStructure();