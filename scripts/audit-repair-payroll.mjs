import { MongoClient } from 'mongodb';

function getMondayOfWeek(value = new Date()) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DB_NAME || 'efd-database-dev';

  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const laborLogs = db.collection('repairLaborLogs');
    const repairs = db.collection('repairs');

    const weekStart = getMondayOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [countByWeek, reviewedSummary, payrollSummary, missingLogs] = await Promise.all([
      laborLogs.aggregate([
        {
          $group: {
            _id: '$weekStart',
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, weekStart: '$_id', count: 1 } },
        { $sort: { weekStart: -1 } },
      ]).toArray(),
      laborLogs.aggregate([
        {
          $group: {
            _id: '$requiresAdminReview',
            count: { $sum: 1 },
          },
        },
      ]).toArray(),
      laborLogs.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$payrollStatus', 'unbatched'] },
            count: { $sum: 1 },
          },
        },
      ]).toArray(),
      repairs.aggregate([
        {
          $match: {
            completedAt: { $gte: weekStart, $lt: weekEnd },
          },
        },
        {
          $lookup: {
            from: 'repairLaborLogs',
            localField: 'repairID',
            foreignField: 'repairID',
            as: 'laborLogs',
          },
        },
        {
          $match: {
            laborLogs: { $size: 0 },
          },
        },
        {
          $project: {
            _id: 0,
            repairID: 1,
            clientName: 1,
            businessName: 1,
            status: 1,
            completedAt: 1,
          },
        },
        { $sort: { completedAt: -1 } },
      ]).toArray(),
    ]);

    console.log(JSON.stringify({
      dbName,
      currentWeekStart: weekStart,
      currentWeekEnd: weekEnd,
      countByWeek,
      reviewedSummary,
      payrollSummary,
      repairsSentToQcWithoutLogs: missingLogs,
    }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
