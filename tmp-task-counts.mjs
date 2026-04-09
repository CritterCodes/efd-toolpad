import dbModule from './src/lib/database.js';

const { db } = dbModule;

async function run() {
  await db.connect();
  const database = db._instance;

  const tasksCol = database.collection('tasks');
  const repairTasksCol = database.collection('repairTasks');

  const [
    tasksTotal,
    tasksActive,
    tasksWithProcesses,
    tasksWithNonEmptyProcesses,
    tasksWithPricing,
    repairTasksTotal,
    repairTasksWithProcesses,
    repairTasksWithPricing
  ] = await Promise.all([
    tasksCol.countDocuments({}),
    tasksCol.countDocuments({ isActive: { $ne: false } }),
    tasksCol.countDocuments({ processes: { $exists: true } }),
    tasksCol.countDocuments({ processes: { $type: 'array', $ne: [] } }),
    tasksCol.countDocuments({ 'pricing.totalCosts': { $exists: true } }),
    repairTasksCol.countDocuments({}),
    repairTasksCol.countDocuments({ processes: { $type: 'array', $ne: [] } }),
    repairTasksCol.countDocuments({ 'pricing.totalCosts': { $exists: true } })
  ]);

  const sampleTasks = await tasksCol.find({}, { projection: { title: 1, isActive: 1, processes: 1, pricing: 1, universalPricing: 1 } }).limit(10).toArray();

  console.log(JSON.stringify({
    tasks: {
      total: tasksTotal,
      active: tasksActive,
      withProcessesField: tasksWithProcesses,
      withNonEmptyProcesses: tasksWithNonEmptyProcesses,
      withPricingTotalCosts: tasksWithPricing
    },
    repairTasks: {
      total: repairTasksTotal,
      withNonEmptyProcesses: repairTasksWithProcesses,
      withPricingTotalCosts: repairTasksWithPricing
    },
    sampleTasks: sampleTasks.map((t) => ({
      id: String(t._id),
      title: t.title,
      isActive: t.isActive,
      processCount: Array.isArray(t.processes) ? t.processes.length : null,
      hasPricingTotalCosts: !!t?.pricing?.totalCosts,
      hasPricing: !!t?.pricing,
      hasUniversalPricing: !!t?.universalPricing
    }))
  }, null, 2));

  await db.client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
