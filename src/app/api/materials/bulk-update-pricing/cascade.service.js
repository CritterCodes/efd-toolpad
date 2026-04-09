import { db } from '@/lib/database';
import { prepareProcessForSaving } from '@/utils/processes.util';
import { TasksService } from '@/app/api/tasks/service';

function normalizeSku(value) {
  return String(value || '').trim();
}

function getCostPerPortion(material) {
  const portions = Number(material.portionsPerUnit) > 0 ? Number(material.portionsPerUnit) : 1;
  if (Number(material.costPerPortion) > 0) return Number(material.costPerPortion);
  return Number(material.unitCost || material.stullerPrice || 0) / portions;
}

export async function cascadeProcessAndTaskUpdates({
  materialsCollection,
  dbSettings,
  adminSettings,
  now,
  failures,
  materialSyncUpdated,
  forceTaskRecalculation = false
}) {
  const effectiveAdminSettings =
    (adminSettings && typeof adminSettings === 'object' && Object.keys(adminSettings).length > 0)
      ? adminSettings
      : dbSettings;

  const allMaterials = await materialsCollection.find({ isActive: { $ne: false } }).toArray();
  const materialById = new Map(allMaterials.map((m) => [String(m._id), m]));
  const materialBySku = new Map(allMaterials.map((m) => [normalizeSku(m.sku).toLowerCase(), m]));

  const processesCollection = await db.dbProcesses();
  const processes = await processesCollection.find({ isActive: { $ne: false } }).toArray();
  const processOps = [];

  for (const process of processes) {
    try {
      const refreshedMaterials = Array.isArray(process.materials)
        ? process.materials.map((line) => {
            const matched =
              materialById.get(String(line.materialId || '')) ||
              materialBySku.get(normalizeSku(line.materialSku).toLowerCase());
            if (!matched) return line;

            const qty = Number(line.quantity) > 0 ? Number(line.quantity) : 0;
            const portions = Number(matched.portionsPerUnit) > 0 ? Number(matched.portionsPerUnit) : 1;
            const baseCostPerPortion = getCostPerPortion(matched);
            const estimatedCost = baseCostPerPortion * qty;

            return {
              ...line,
              materialId: matched._id,
              materialSku: matched.sku || line.materialSku,
              materialName: matched.displayName || matched.name || line.materialName,
              portionsPerUnit: portions,
              baseCostPerPortion,
              estimatedCost,
              stullerProducts: matched.stullerProducts || [],
              isMetalDependent: Boolean(matched.isMetalDependent),
              metalTypes: Array.isArray(matched.stullerProducts)
                ? [...new Set(matched.stullerProducts.map((p) => p.metalType).filter(Boolean))]
                : []
            };
          })
        : process.materials || [];

      const recalculated = prepareProcessForSaving(
        { ...process, materials: refreshedMaterials },
        effectiveAdminSettings,
        allMaterials
      );

      processOps.push({
        updateOne: {
          filter: { _id: process._id },
          update: {
            $set: {
              materials: recalculated.materials || refreshedMaterials,
              pricing: recalculated.pricing || process.pricing,
              updatedAt: now
            }
          }
        }
      });
    } catch (processError) {
      failures.push({
        processId: String(process._id),
        name: process.displayName || 'Unknown Process',
        error: `Process cascade failed: ${processError.message}`
      });
    }
  }

  let processesUpdated = 0;
  if (processOps.length > 0) {
    const processResult = await processesCollection.bulkWrite(processOps);
    processesUpdated = processResult.modifiedCount || 0;
  }

  let tasksCascade = { updated: 0, skipped: 0, errors: 0, ran: false };
  if (forceTaskRecalculation || materialSyncUpdated > 0 || processesUpdated > 0) {
    try {
      const taskResult = await TasksService.recalculateAllTaskPrices(effectiveAdminSettings);
      tasksCascade = {
        updated: taskResult?.data?.updated || 0,
        skipped: taskResult?.data?.skipped || 0,
        errors: taskResult?.data?.errors || 0,
        ran: true
      };
    } catch (taskError) {
      failures.push({
        name: 'Task cascade',
        error: `Task cascade failed: ${taskError.message}`
      });
    }
  }

  return { processesUpdated, tasksCascade };
}
