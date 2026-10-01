import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import {
  appendLaborReviewSystemNote,
  hasLaborRelevantRepairChanges,
} from '@/app/api/repairLaborLogs/utils';
import { isLaborLogLocked } from '@/services/payrollUtils';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';

export async function syncLaborLogAfterRepairChange({ existingRepair = {}, updateData = {} } = {}) {
  if (!existingRepair?.repairID || !hasLaborRelevantRepairChanges(updateData, existingRepair)) {
    return null;
  }

  const latestLog = await RepairLaborLogsModel.findLatestByRepair(existingRepair.repairID);
  if (!latestLog) {
    return null;
  }

  // A credit already in a payroll batch (or paid) is never reopened (EFD-DEFECTS P1): tell an admin
  // instead, so a real correction is made in payroll by a person, once.
  if (isLaborLogLocked(latestLog)) {
    await notifyAllAdmins({
      type: 'labor-review-locked',
      title: 'A paid repair changed',
      message: `Repair ${existingRepair.repairID} changed after its labor credit (${latestLog.logID}) went into payroll batch ${latestLog.payrollBatchID || '(unknown)'}. The credit was left as paid. If the change matters, adjust it in payroll.`,
      actionUrl: `${adminBase()}/dashboard/repairs/payroll`,
      actionLabel: 'Open payroll',
      priority: 'normal',
      channels: ['inApp'],
      relatedType: 'repair',
      relatedData: { repairID: existingRepair.repairID, logID: latestLog.logID, payrollBatchID: latestLog.payrollBatchID || '' },
    }).catch(() => {});
    return { skipped: 'locked', logID: latestLog.logID };
  }

  return await RepairLaborLogsModel.updateById(latestLog.logID, {
    requiresAdminReview: true,
    adminReviewedAt: null,
    adminReviewedBy: '',
    creditedValue: 0,
    notes: appendLaborReviewSystemNote(latestLog.notes),
  });
}
