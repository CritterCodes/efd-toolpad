/**
 * QC mode (owner, 2026-09-21: "QC kinda sucks" — with one jeweler, sending your own work to a QC
 * queue and then passing it from a second screen is ceremony).
 *
 *   separate      — the default and the multi-jeweler rule: bench → Move to QC → someone holding the
 *                   qualityControl capability passes it (labor credit + auto-invoice fire there).
 *   self-certify  — one tap on the bench, "Done · passed QC", runs both steps for the jeweler who
 *                   did the work. The pass is stamped `qcSelfCertified: true` so it stays auditable
 *                   and the gate can be switched back on the day there is a second jeweler.
 *
 * Stored at adminSettings.business.qc.mode. It is an explicit switch, not auto-detected from the
 * roster: prod still lists two on-site artisan accounts with QC capability besides the owner, so a
 * head-count rule would guess wrong.
 */
import { db } from '@/lib/database';

export const QC_MODES = Object.freeze({ SEPARATE: 'separate', SELF_CERTIFY: 'self-certify' });
export const SETTINGS_ID = 'repair_task_admin_settings';

export function normalizeQcMode(value) {
  return value === QC_MODES.SELF_CERTIFY ? QC_MODES.SELF_CERTIFY : QC_MODES.SEPARATE;
}

/** Pure: the mode a settings document (or its `business` block) declares. */
export function qcModeFromSettings(settings) {
  const business = settings?.business ?? settings;
  return normalizeQcMode(business?.qc?.mode);
}

export async function readQcMode() {
  const dbi = await db.connect();
  const doc = await dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { 'business.qc': 1 } });
  return qcModeFromSettings(doc);
}

export async function writeQcMode(mode, { actor = '' } = {}) {
  const next = normalizeQcMode(mode);
  const dbi = await db.connect();
  // Dot-path $set: the rest of `business` is untouched (subdoc writes replace, not merge).
  await dbi.collection('adminSettings').updateOne(
    { _id: SETTINGS_ID },
    { $set: { 'business.qc.mode': next, 'business.qc.updatedAt': new Date(), 'business.qc.updatedBy': actor, updatedAt: new Date() } },
  );
  return next;
}

/**
 * Pure: may this session self-certify under this mode? Admins always; otherwise the caller must
 * hold BOTH benchWork (they did the work) and qualityControl (they may pass it).
 */
export function canSelfCertify({ session, mode }) {
  if (normalizeQcMode(mode) !== QC_MODES.SELF_CERTIFY) return false;
  const role = session?.user?.role;
  if (role === 'admin' || role === 'dev' || role === 'superadmin') return true;
  const caps = session?.user?.staffCapabilities || {};
  return session?.user?.employment?.isOnsite === true && caps.repairOps === true && caps.benchWork === true && caps.qualityControl === true;
}
