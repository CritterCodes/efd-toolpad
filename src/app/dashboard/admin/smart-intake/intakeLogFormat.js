/** Display helpers for Admin → Smart intake log. Pure; tested in intakeLogFormat.test.js. */

export const FIELD_LABELS = {
  description: 'Description',
  metalType: 'Metal',
  karat: 'Karat',
  goldColor: 'Gold color',
  isRing: 'Is a ring',
  currentRingSize: 'Current size',
  desiredRingSize: 'Desired size',
  promiseDate: 'Promise date',
  tasks: 'Tasks',
};

const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';

/** What the AI suggested, as [{ field, value }] lines, skipping what it left blank. */
export function suggestionLines(entry = {}) {
  const out = entry.output || {};
  if (entry.kind === 'photo') return filled(out.description) ? [{ field: 'description', value: String(out.description) }] : [];
  const lines = [];
  for (const field of ['metalType', 'karat', 'goldColor', 'currentRingSize', 'desiredRingSize', 'promiseDate']) {
    if (filled(out[field])) lines.push({ field, value: String(out[field]) });
  }
  if (typeof out.isRing === 'boolean') lines.push({ field: 'isRing', value: out.isRing ? 'Yes' : 'No' });
  const tasks = Array.isArray(out.tasks) ? out.tasks : [];
  if (tasks.length) {
    lines.push({ field: 'tasks', value: tasks.map((t) => `${t.title || t.id}${(t.quantity || 1) > 1 ? ` ×${t.quantity}` : ''}`).join(', ') });
  }
  return lines;
}

/** The per-field miss counts, most-missed first, as [{ field, label, count }]. */
export function missRanking(byField = {}) {
  return Object.entries(byField)
    .map(([field, count]) => ({ field, label: FIELD_LABELS[field] || field, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function formatWhen(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
