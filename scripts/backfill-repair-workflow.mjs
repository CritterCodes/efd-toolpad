import { MongoClient } from 'mongodb';
import {
  deriveCompatibilityBenchStatus,
  normalizeRepairStatus,
} from '../src/services/repairWorkflow.js';

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGO_DB_NAME || 'efd-database';

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required.');
  process.exit(1);
}

function cleanUpdate(update) {
  return Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined)
  );
}

async function backfillRepairWorkflow() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const collection = client.db(DATABASE_NAME).collection('repairs');

    const repairs = await collection.find({}, {
      projection: {
        _id: 1,
        repairID: 1,
        status: 1,
        benchStatus: 1,
        assignedTo: 1,
      },
    }).toArray();

    const bulkOps = [];
    const changedRepairs = [];

    for (const repair of repairs) {
      const normalizedStatus = normalizeRepairStatus(repair.status);
      const derivedBenchStatus = deriveCompatibilityBenchStatus(repair);

      const nextStatus = normalizedStatus || repair.status;
      const statusChanged = normalizedStatus && normalizedStatus !== repair.status;
      const benchStatusChanged = (repair.benchStatus || null) !== (derivedBenchStatus || null);

      if (!statusChanged && !benchStatusChanged) continue;

      const update = cleanUpdate({
        status: nextStatus,
        benchStatus: derivedBenchStatus || null,
        updatedAt: new Date(),
      });

      bulkOps.push({
        updateOne: {
          filter: { _id: repair._id },
          update: { $set: update },
        },
      });

      changedRepairs.push({
        repairID: repair.repairID,
        before: {
          status: repair.status || null,
          benchStatus: repair.benchStatus || null,
        },
        after: {
          status: update.status ?? repair.status ?? null,
          benchStatus: Object.prototype.hasOwnProperty.call(update, 'benchStatus')
            ? update.benchStatus
            : (repair.benchStatus || null),
        },
      });
    }

    if (bulkOps.length === 0) {
      console.log(`No repair workflow backfill needed in ${DATABASE_NAME}.`);
      return;
    }

    const result = await collection.bulkWrite(bulkOps);

    console.log(`Backfilled ${bulkOps.length} repairs in ${DATABASE_NAME}.`);
    console.log(`Modified count: ${result.modifiedCount}`);
    console.log('');

    changedRepairs.forEach((repair) => {
      console.log(
        `${repair.repairID}: `
        + `status "${repair.before.status}" -> "${repair.after.status}", `
        + `benchStatus "${repair.before.benchStatus}" -> "${repair.after.benchStatus}"`
      );
    });
  } finally {
    await client.close();
  }
}

backfillRepairWorkflow().catch((error) => {
  console.error('Repair workflow backfill failed:', error);
  process.exit(1);
});
