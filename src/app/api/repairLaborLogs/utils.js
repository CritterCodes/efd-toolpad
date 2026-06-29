import { db } from '@/lib/database';
import { UserQueryService } from '@/lib/user/user.query.service.js';
import { isCustomerCharged, resolveBillingMode } from '@/services/billing/modes';

async function getShopLaborWage() {
  try {
    const dbInstance = await db.connect();
    const settings = await dbInstance.collection('adminSettings').findOne(
      { _id: 'repair_task_admin_settings' },
      { projection: { _id: 0, pricing: 1 } }
    );
    const baseWage = Number(settings?.pricing?.wage);
    return baseWage > 0 ? baseWage : 0;
  } catch (error) {
    console.error('Error resolving shop labor wage:', error);
    return 0;
  }
}

export function calculateRepairLaborHours(repair = {}) {
  const taskHours = (repair.tasks || []).reduce((sum, task) => {
    const quantity = Math.max(Number(task?.quantity) || 1, 1);
    const taskHours =
      Number(task?.pricing?.totalLaborHours)
      || Number(task?.laborHours)
      || 0;

    return sum + (taskHours * quantity);
  }, 0);

  const customLineItemHours = (repair.customLineItems || []).reduce((sum, item) => {
    const quantity = Math.max(Number(item?.quantity) || 1, 1);
    const lineHours = Number(item?.laborHours) || 0;
    return sum + (lineHours * quantity);
  }, 0);

  return Math.round((taskHours + customLineItemHours) * 100) / 100;
}

/** Hours for a single repair task (per-task form of calculateRepairLaborHours). */
export function taskLaborHours(task = {}) {
  const quantity = Math.max(Number(task?.quantity) || 1, 1);
  const hours = Number(task?.pricing?.totalLaborHours) || Number(task?.laborHours) || 0;
  return hours * quantity;
}

/** Indexes of repair tasks not yet signed off (no `completedByUserID` stamp). */
export function getUncreditedTaskIndexes(repair = {}) {
  return (repair.tasks || []).reduce((acc, task, i) => {
    if (!task?.completedByUserID) acc.push(i);
    return acc;
  }, []);
}

/** Sum labor hours across the given task indexes (rounded to cents of an hour). */
export function sumTaskLaborHours(repair = {}, indexes = []) {
  const tasks = repair.tasks || [];
  const total = (indexes || []).reduce((sum, i) => sum + taskLaborHours(tasks[i] || {}), 0);
  return Math.round(total * 100) / 100;
}

function sumCustomLineItemHours(repair = {}) {
  const h = (repair.customLineItems || []).reduce((sum, item) => {
    const quantity = Math.max(Number(item?.quantity) || 1, 1);
    return sum + (Number(item?.laborHours) || 0) * quantity;
  }, 0);
  return Math.round(h * 100) / 100;
}

/**
 * Group signed-off tasks by the jeweler who did them → one entry per jeweler with summed
 * hours and the rate snapshot captured at sign-off. customLineItem hours (no per-task
 * stamp) fold into `finalMoverUserID`'s bucket — the jeweler who did the final move-to-QC.
 * `rate` may be 0 if it wasn't captured; the caller backfills it before paying.
 * @returns {Array<{ userID, name, hours, rate }>}
 */
export function groupCompletedTasksByJeweler(repair = {}, { finalMoverUserID = null } = {}) {
  const byUser = new Map();
  for (const task of repair.tasks || []) {
    const userID = task?.completedByUserID;
    if (!userID) continue;
    const cur = byUser.get(userID) || { userID, name: task.completedByName || '', hours: 0, rate: Number(task.laborRateSnapshot) || 0 };
    cur.hours += taskLaborHours(task);
    if (!cur.name && task.completedByName) cur.name = task.completedByName;
    if (!cur.rate && Number(task.laborRateSnapshot) > 0) cur.rate = Number(task.laborRateSnapshot);
    byUser.set(userID, cur);
  }
  const extra = sumCustomLineItemHours(repair);
  if (extra > 0 && byUser.size) {
    const targetID = finalMoverUserID && byUser.has(finalMoverUserID)
      ? finalMoverUserID
      : [...byUser.keys()][byUser.size - 1];
    byUser.get(targetID).hours += extra;
  }
  return [...byUser.values()].map((e) => ({ ...e, hours: Math.round(e.hours * 100) / 100 }));
}

export async function getLaborRateSnapshotForUser({ userID = '', email = '', session = null } = {}) {
  const shopWage = await getShopLaborWage();
  if (shopWage > 0) {
    return shopWage;
  }

  const sessionRate = Number(session?.user?.employment?.hourlyRate);
  if (sessionRate > 0 && (!userID || session?.user?.userID === userID)) {
    return sessionRate;
  }

  const user = userID
    ? await UserQueryService.findUserByUserID(userID)
    : (email ? await UserQueryService.findUserByEmail(email) : null);

  const storedRate = Number(user?.employment?.hourlyRate ?? user?.hourlyRate);
  if (storedRate > 0) {
    return storedRate;
  }

  return 0;
}

export async function getLaborRateSnapshot(session) {
  return getLaborRateSnapshotForUser({
    userID: session?.user?.userID,
    email: session?.user?.email,
    session,
  });
}

export function calculateRepairChargeTotal(repair = {}) {
  // internal/comped → customer owes nothing (labor is still paid separately)
  if (!isCustomerCharged(resolveBillingMode(repair))) {
    return 0;
  }

  const taskTotal = (repair.tasks || []).reduce((sum, item) => (
    sum + ((Number(item?.price ?? item?.retailPrice) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);

  const materialTotal = (repair.materials || []).reduce((sum, item) => (
    sum + ((Number(item?.price ?? item?.unitCost ?? item?.costPerPortion) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);

  const customTotal = (repair.customLineItems || []).reduce((sum, item) => (
    sum + ((Number(item?.price) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);

  const computedTotal = Math.round((taskTotal + materialTotal + customTotal) * 100) / 100;
  const storedTotal = Number(repair?.totalCost) || 0;

  return storedTotal > 0 ? storedTotal : computedTotal;
}

const LABOR_RELEVANT_REPAIR_FIELDS = [
  'tasks',
  'materials',
  'customLineItems',
  'subtotal',
  'rushFee',
  'deliveryFee',
  'taxAmount',
  'taxRate',
  'includeTax',
  'includeDelivery',
  'totalCost',
];

const LABOR_REVIEW_SYSTEM_NOTE = 'System flag: repair pricing or work items changed after the labor snapshot. Re-review before payout.';

function stableSerialize(value) {
  if (value == null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
}

export function hasLaborRelevantRepairChanges(updateData = {}, existingRepair = {}) {
  return LABOR_RELEVANT_REPAIR_FIELDS.some((field) => (
    Object.prototype.hasOwnProperty.call(updateData, field)
    && stableSerialize(updateData[field]) !== stableSerialize(existingRepair[field])
  ));
}

export function appendLaborReviewSystemNote(existingNotes = '') {
  const trimmed = String(existingNotes || '').trim();
  if (trimmed.includes(LABOR_REVIEW_SYSTEM_NOTE)) {
    return trimmed;
  }

  return trimmed ? `${trimmed}\n${LABOR_REVIEW_SYSTEM_NOTE}` : LABOR_REVIEW_SYSTEM_NOTE;
}
