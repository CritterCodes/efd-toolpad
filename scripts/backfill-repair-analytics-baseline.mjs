import { MongoClient } from 'mongodb';
import {
  buildAnalyticsBaselineSettingsUpdate,
  buildRepairAnalyticsFields,
} from '../src/services/analyticsBaseline.js';

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGO_DB_NAME || 'efd-database';

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required.');
  process.exit(1);
}

async function backfillRepairAnalyticsBaseline() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const database = client.db(DATABASE_NAME);
    const repairsCollection = database.collection('repairs');
    const settingsCollection = database.collection('adminSettings');

    const adminSettings = await settingsCollection.findOne({ _id: 'repair_task_admin_settings' });
    const nextAnalyticsSettings = buildAnalyticsBaselineSettingsUpdate(adminSettings || {});

    await settingsCollection.updateOne(
      { _id: 'repair_task_admin_settings' },
      {
        $set: {
          analytics: nextAnalyticsSettings,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const repairs = await repairsCollection.find({}, {
      projection: {
        _id: 1,
        repairID: 1,
        createdAt: 1,
        analyticsOrigin: 1,
        analyticsOriginAssignedAt: 1,
      },
    }).toArray();

    const bulkOps = [];
    const changedRepairs = [];

    for (const repair of repairs) {
      const nextFields = buildRepairAnalyticsFields(repair, new Date());
      const needsOriginUpdate = repair.analyticsOrigin !== nextFields.analyticsOrigin;
      const needsAssignedAtUpdate = !repair.analyticsOriginAssignedAt;

      if (!needsOriginUpdate && !needsAssignedAtUpdate) {
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: repair._id },
          update: {
            $set: {
              analyticsOrigin: nextFields.analyticsOrigin,
              analyticsOriginAssignedAt: nextFields.analyticsOriginAssignedAt,
              updatedAt: new Date(),
            },
          },
        },
      });

      changedRepairs.push({
        repairID: repair.repairID,
        before: repair.analyticsOrigin || null,
        after: nextFields.analyticsOrigin,
      });
    }

    if (bulkOps.length === 0) {
      console.log(`No repair analytics backfill needed in ${DATABASE_NAME}.`);
      console.log('Admin settings analytics baseline has been normalized.');
      return;
    }

    const result = await repairsCollection.bulkWrite(bulkOps);
    console.log(`Backfilled ${bulkOps.length} repairs in ${DATABASE_NAME}.`);
    console.log(`Modified count: ${result.modifiedCount}`);
    console.log('');

    changedRepairs.forEach((repair) => {
      console.log(`${repair.repairID}: analyticsOrigin "${repair.before}" -> "${repair.after}"`);
    });
  } finally {
    await client.close();
  }
}

backfillRepairAnalyticsBaseline().catch((error) => {
  console.error('Repair analytics backfill failed:', error);
  process.exit(1);
});
