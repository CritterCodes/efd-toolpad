export function calculateRepairLaborHours(repair = {}) {
  return (repair.tasks || []).reduce((sum, task) => {
    const quantity = Math.max(Number(task?.quantity) || 1, 1);
    const taskHours =
      Number(task?.pricing?.totalLaborHours)
      || Number(task?.laborHours)
      || 0;

    return sum + (taskHours * quantity);
  }, 0);
}

export function getLaborRateSnapshot(session) {
  return Number(session?.user?.employment?.hourlyRate) || 0;
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
