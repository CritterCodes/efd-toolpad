import { MongoClient } from 'mongodb';
import {
  deriveCompatibilityBenchStatus,
  deriveBenchQueue,
  normalizeBenchStatus,
  normalizeRepairStatus,
} from '../src/services/repairWorkflow.js';

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGO_DB_NAME || 'efd-database';

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required.');
  process.exit(1);
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sortEntries(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

async function auditRepairWorkflow() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const collection = client.db(DATABASE_NAME).collection('repairs');
    const repairs = await collection.find({}, {
      projection: {
        _id: 0,
        repairID: 1,
        status: 1,
        benchStatus: 1,
        assignedTo: 1,
        clientName: 1,
        businessName: 1,
        isWholesale: 1,
      },
    }).toArray();

    const rawStatuses = new Map();
    const normalizedStatuses = new Map();
    const rawBenchStatuses = new Map();
    const derivedQueues = new Map();
    const legacyVariants = [];
    const disagreements = [];

    for (const repair of repairs) {
      const rawStatus = repair.status || '(missing)';
      const rawBenchStatus = repair.benchStatus || '(missing)';
      const normalizedStatus = normalizeRepairStatus(repair.status) || '(unknown)';
      const normalizedBenchStatus = normalizeBenchStatus(repair.benchStatus) || '(none)';
      const derivedBenchStatus = deriveCompatibilityBenchStatus(repair) || '(none)';
      const derivedQueue = deriveBenchQueue(repair) || '(none)';

      increment(rawStatuses, rawStatus);
      increment(normalizedStatuses, normalizedStatus);
      increment(rawBenchStatuses, rawBenchStatus);
      increment(derivedQueues, derivedQueue);

      if (repair.status && normalizeRepairStatus(repair.status) !== repair.status) {
        legacyVariants.push({
          repairID: repair.repairID,
          rawStatus: repair.status,
          normalizedStatus,
        });
      }

      if (normalizedBenchStatus !== derivedBenchStatus) {
        disagreements.push({
          repairID: repair.repairID,
          rawStatus,
          normalizedStatus,
          rawBenchStatus,
          normalizedBenchStatus,
          derivedBenchStatus,
          derivedQueue,
          assignedTo: repair.assignedTo || '',
          client: repair.clientName || repair.businessName || '',
          isWholesale: repair.isWholesale === true,
        });
      }
    }

    console.log(`Audited ${repairs.length} repairs in ${DATABASE_NAME}`);

    console.log('\nRaw status counts');
    for (const [status, count] of sortEntries(rawStatuses)) {
      console.log(`  ${status}: ${count}`);
    }

    console.log('\nCanonical status counts');
    for (const [status, count] of sortEntries(normalizedStatuses)) {
      console.log(`  ${status}: ${count}`);
    }

    console.log('\nRaw benchStatus counts');
    for (const [status, count] of sortEntries(rawBenchStatuses)) {
      console.log(`  ${status}: ${count}`);
    }

    console.log('\nDerived bench queue counts');
    for (const [queue, count] of sortEntries(derivedQueues)) {
      console.log(`  ${queue}: ${count}`);
    }

    console.log(`\nLegacy status variants: ${legacyVariants.length}`);
    legacyVariants.slice(0, 25).forEach((item) => {
      console.log(`  ${item.repairID}: "${item.rawStatus}" -> ${item.normalizedStatus}`);
    });
    if (legacyVariants.length > 25) {
      console.log(`  ... ${legacyVariants.length - 25} more`);
    }

    console.log(`\nbenchStatus disagreements: ${disagreements.length}`);
    disagreements.slice(0, 50).forEach((item) => {
      console.log(
        `  ${item.repairID}: status="${item.rawStatus}" (${item.normalizedStatus}) `
        + `benchStatus="${item.rawBenchStatus}" normalizedBench="${item.normalizedBenchStatus}" `
        + `derivedBench="${item.derivedBenchStatus}" queue="${item.derivedQueue}" assignedTo="${item.assignedTo}"`
      );
    });
    if (disagreements.length > 50) {
      console.log(`  ... ${disagreements.length - 50} more`);
    }
  } finally {
    await client.close();
  }
}

auditRepairWorkflow().catch((error) => {
  console.error('Repair workflow audit failed:', error);
  process.exit(1);
});
