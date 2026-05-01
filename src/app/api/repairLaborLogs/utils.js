import { db } from '@/lib/database';
import { UserQueryService } from '@/lib/user/user.query.service.js';

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
