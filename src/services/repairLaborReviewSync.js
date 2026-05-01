import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import {
  appendLaborReviewSystemNote,
  hasLaborRelevantRepairChanges,
} from '@/app/api/repairLaborLogs/utils';

export async function syncLaborLogAfterRepairChange({ existingRepair = {}, updateData = {} } = {}) {
  if (!existingRepair?.repairID || !hasLaborRelevantRepairChanges(updateData, existingRepair)) {
    return null;
  }

  const latestLog = await RepairLaborLogsModel.findLatestByRepair(existingRepair.repairID);
  if (!latestLog) {
    return null;
  }

  return await RepairLaborLogsModel.updateById(latestLog.logID, {
    requiresAdminReview: true,
    adminReviewedAt: null,
    adminReviewedBy: '',
    creditedValue: 0,
    notes: appendLaborReviewSystemNote(latestLog.notes),
  });
}
