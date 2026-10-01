import { adminBase } from '@/lib/appUrls';
import PiecesModel from '@/app/api/pieces/model';
import { getSTLVolume } from '@/lib/stlParser';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';
import WorkOrdersModel from '@/app/api/workOrders/model';
export const BENCH_ACTION_URL = `${adminBase()}/dashboard/bench`;
export const customLink = (customID) => `${adminBase()}/dashboard/customs/${customID}`;

/** Resolve the linked customID (if any) for a piece work order, for notification links. */
export async function customIDForWorkOrder(wo) {
  try {
    const piece = await PiecesModel.findById(wo.sourceID);
    return piece?.customOrderID || null;
  } catch {
    return null;
  }
}

/** Short human label for a work order used in notification copy. */
export function woLabel(wo) {
  return wo?.title || wo?.discipline || `Work order ${wo?.workOrderID || ''}`.trim();
}

/** STL files are authored in mm; the cost estimator works in cm³ (1 cm³ = 1000 mm³). */
export async function stlVolumeCm3(arrayBuffer) {
  try {
    const mm3 = await getSTLVolume(arrayBuffer);
    if (!Number.isFinite(mm3) || mm3 <= 0) return null;
    return Math.round((mm3 / 1000) * 1000) / 1000; // cm³, 3dp
  } catch {
    return null; // a parse failure must never block the upload
  }
}

export const DEFAULT_QC_REVIEW_FEE = 25;
export async function getQcReviewFee() {
  try {
    const s = await SettingsManagerService.getSettings();
    const fee = Number(s?.financial?.qcReviewFee);
    return fee > 0 ? fee : DEFAULT_QC_REVIEW_FEE;
  } catch {
    return DEFAULT_QC_REVIEW_FEE;
  }
}

export const ADMIN_ROLES = ['admin', 'dev'];
export const PIECE_SOURCES = ['production_piece', 'custom_piece'];

export function isAdminRole(session) {
  return ADMIN_ROLES.includes(session?.user?.role);
}
// Untagged users fall back to the jeweler lane (matches the bench read fallback).
export function effectiveArtisanTypes(session) {
  const types = session?.user?.artisanTypes || [];
  return types.length ? types : ['Jeweler'];
}

export async function loadPieceWorkOrder(workOrderID) {
  const wo = await WorkOrdersModel.findByID(workOrderID);
  if (!wo) throw new Error('Work order not found.');
  if (!PIECE_SOURCES.includes(wo.sourceType)) {
    throw new Error('Not a piece work order.');
  }
  return wo;
}

