const fs = require('fs');
const { MongoClient } = require('mongodb');
const env = fs.readFileSync('../../../../../../.env.local', 'utf8');
const uri = env.split('\n').find(l => l.startsWith('MONGODB_URI=')).substring(12).replace(/[\'\"]/g, '').split('?')[0].trim();
(async () => {
  const client = new MongoClient(uri, { directConnection: true });
  await client.connect();
  const db = client.db('efd-database-DEV');
  const p = await db.collection('processes').find().toArray();
  p.forEach(x => {
    console.log(x._id, '| Name:', x.name, '| Display:', x.displayName, '| Title:', x.title, '| Hrs:', x.laborHours);
  });
  await client.close();
})();
