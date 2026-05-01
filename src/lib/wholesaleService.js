// lib/wholesaleService.js
// Service functions for wholesale application management

import { db } from './database.js';
import {
  APPLICATION_STATUSES,
  backfillLegacyWholesalerProfile,
  dismissWholesaleMatchSuggestions,
  getActiveWholesalers,
  getAllWholesaleApplications,
  getWholesaleApplicationById,
  getWholesaleReconciliationAuditReport,
  getWholesaleReconciliationReport,
  mergeWholesaleApplicationIntoAccount,
  updateWholesaleApplicationStatus,
} from './wholesaleReconciliationService.js';

export {
  getAllWholesaleApplications,
  getWholesaleApplicationById,
  updateWholesaleApplicationStatus,
  getActiveWholesalers,
  getWholesaleReconciliationAuditReport,
  getWholesaleReconciliationReport,
  mergeWholesaleApplicationIntoAccount,
  backfillLegacyWholesalerProfile,
  dismissWholesaleMatchSuggestions,
  APPLICATION_STATUSES,
};

/**
 * Get wholesale application statistics and reconciliation state.
 */
export async function getWholesaleApplicationStats() {
  const applications = await getAllWholesaleApplications();
  const reconciliation = await getWholesaleReconciliationReport();

  return {
    total: applications.length,
    pending: applications.filter((application) => application.status === APPLICATION_STATUSES.PENDING).length,
    approved: applications.filter((application) => application.status === APPLICATION_STATUSES.APPROVED).length,
    rejected: applications.filter((application) => application.status === APPLICATION_STATUSES.REJECTED).length,
    merged: applications.filter((application) => application.status === APPLICATION_STATUSES.MERGED).length,
    activeWholesalers: reconciliation.stats.activeWholesalers,
    canonicalWholesalers: reconciliation.stats.canonicalWholesalers,
    legacyRepairNeeded: reconciliation.stats.legacyWholesalersRequiringRepair,
    safeMatches: reconciliation.stats.safeMatches,
    ambiguousMatches: reconciliation.stats.ambiguousMatches,
    reconciledAccounts: reconciliation.stats.reconciledAccounts,
  };
}

/**
 * Delete wholesale application
 */
export async function deleteWholesaleApplication(applicationId) {
  try {
    const usersCollection = await db.dbUsers();
    const result = await usersCollection.updateOne(
      { 'wholesaleApplication.applicationId': applicationId },
      {
        $unset: { wholesaleApplication: '' },
        $set: { role: 'customer' },
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error deleting wholesale application:', error);
    throw error;
  }
}
