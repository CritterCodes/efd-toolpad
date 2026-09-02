/**
 * One-time normalization: gemstone products written by the legacy create path carry a
 * BOOLEAN inventory ({ available: true/false, reserved: true/false }); the canonical
 * shape is numeric ({ quantity, reserved, available }) — the shop's reserve-on-paid
 * guard decrements numbers. Converts every productType:'gemstone' doc still on the
 * boolean shape. Idempotent; pass --dry-run to report without writing.
 *
 *   MONGODB_URI=... MONGO_DB_NAME=efd-database-DEV node scripts/normalize-gemstone-inventory.mjs [--dry-run]
 */
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DB_NAME || 'efd-database-dev';
  const dryRun = process.argv.includes('--dry-run');

  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const products = db.collection('products');

    const boolShaped = await products
      .find(
        { productType: 'gemstone', 'inventory.available': { $type: 'bool' } },
        { projection: { productId: 1, title: 1, inventory: 1 } },
      )
      .toArray();

    console.log(`${boolShaped.length} gemstone product(s) on the boolean inventory shape in ${dbName}`);

    for (const doc of boolShaped) {
      const sellable = doc.inventory.available === true && doc.inventory.reserved !== true ? 1 : 0;
      const inventory = {
        quantity: sellable,
        reserved: 0,
        available: sellable,
        usedInProductId: doc.inventory.usedInProductId ?? null,
      };
      console.log(`  ${doc.productId} "${doc.title}": available=${doc.inventory.available}, reserved=${doc.inventory.reserved} -> qty ${sellable}`);
      if (!dryRun) {
        await products.updateOne(
          { _id: doc._id, 'inventory.available': { $type: 'bool' } },
          { $set: { inventory, updatedAt: new Date() } },
        );
      }
    }

    console.log(dryRun ? 'Dry run — nothing written.' : 'Done.');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
