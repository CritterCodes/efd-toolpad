import { randomUUID } from 'crypto';
import { db } from '@/lib/database';

/**
 * The smart-intake log (owner, 2026-10-01, OPEN-QUESTIONS Q13): "set up a system that logged what we're doing, what
 * we're typing in, what the output was, what we changed it to ... it's better we just track where it all went wrong."
 *
 * Every smart-intake AI call records a SUGGESTION (who, where, what was typed or photographed, what the AI said).
 * When the ticket is saved, the same entries get the OUTCOME — what the ticket actually became. Admin → Smart intake
 * log shows the two side by side and counts, per field, how often people had to change what the AI said.
 *
 * Logging is best-effort: a failure here never fails an intake or a save.
 */
export const SMART_INTAKE_LOGS = 'smartIntakeLogs';

const text = (v) => String(v ?? '').trim();
const lower = (v) => text(v).toLowerCase();

/** Where it was used: a store's intake or the shop counter. */
export const surfaceOf = (session) => (session?.user?.role === 'wholesaler' ? 'store' : 'counter');

/**
 * Pure: the fields of a ticket that the AI tries to fill, from the save body. `tasks` are { id, title, quantity }.
 * Reads the form's own metal fields (before the route folds the karat into metalType).
 */
export function ticketOutcome(body = {}) {
  const lines = (list) => (Array.isArray(list) ? list : [])
    .map((l) => ({ id: text(l?._id ?? l?.taskId ?? l?.id), title: text(l?.title || l?.displayName || l?.name), quantity: Number(l?.quantity) || 1 }))
    .filter((l) => l.id || l.title);
  return {
    description: text(body.description),
    metalType: lower(body.metalType),
    karat: lower(body.karat),
    goldColor: lower(body.goldColor),
    isRing: body.isRing === true || body.isRing === 'true',
    currentRingSize: text(body.currentRingSize),
    desiredRingSize: text(body.desiredRingSize),
    promiseDate: text(body.promiseDate).slice(0, 10),
    tasks: lines(body.tasks),
  };
}

const taskKey = (tasks = []) => tasks.map((t) => `${t.id || t.title}×${t.quantity || 1}`).sort().join(', ');
const taskLabel = (tasks = []) => tasks.map((t) => `${t.title || t.id}${(t.quantity || 1) > 1 ? ` ×${t.quantity}` : ''}`).join(', ') || '—';

/**
 * Pure: where the ticket ended up different from what the AI suggested. `suggestion` is the log's `output`;
 * `outcome` is ticketOutcome(...). Only fields the AI actually filled (or got asked about) are compared, so an empty
 * suggestion the person then filled in counts as a miss — the AI should have caught it.
 * Returns [{ field, ai, final }].
 */
export function compareIntake(kind, suggestion = {}, outcome = {}) {
  const changes = [];
  const push = (field, ai, final) => changes.push({ field, ai: ai === '' || ai == null ? '—' : String(ai), final: final === '' || final == null ? '—' : String(final) });
  if (kind === 'photo') {
    if (lower(suggestion.description) !== lower(outcome.description)) push('description', suggestion.description, outcome.description);
    return changes;
  }
  for (const field of ['metalType', 'karat', 'goldColor', 'currentRingSize', 'desiredRingSize', 'promiseDate']) {
    const ai = field === 'metalType' || field === 'karat' || field === 'goldColor' ? lower(suggestion[field]) : text(suggestion[field]);
    const final = field === 'metalType' || field === 'karat' || field === 'goldColor' ? lower(outcome[field]) : text(outcome[field]);
    if (ai !== final) push(field, ai, final);
  }
  if (typeof suggestion.isRing === 'boolean' && suggestion.isRing !== outcome.isRing) push('isRing', suggestion.isRing, outcome.isRing);
  const aiTasks = Array.isArray(suggestion.tasks) ? suggestion.tasks : [];
  if (taskKey(aiTasks) !== taskKey(outcome.tasks || [])) push('tasks', taskLabel(aiTasks), taskLabel(outcome.tasks || []));
  return changes;
}

/** Record one AI suggestion. Returns its logID, or null if logging failed (never throws). */
export async function recordIntakeSuggestion({ session, kind, input, output, model = '', ms = null }) {
  try {
    const logID = `sil-${randomUUID().slice(0, 12)}`;
    const dbi = await db.connect();
    await dbi.collection(SMART_INTAKE_LOGS).insertOne({
      logID,
      kind, // 'text' (the sentence) | 'photo' (describe the item)
      surface: surfaceOf(session),
      userID: session?.user?.userID || '',
      userName: session?.user?.name || [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' '),
      role: session?.user?.role || '',
      input,
      output,
      model,
      ms,
      createdAt: new Date(),
      outcome: null,
      repairID: null,
    });
    return logID;
  } catch (error) {
    console.error('smart-intake log (suggestion) failed:', error.message);
    return null;
  }
}

/** Pure: the log ids a save carried — an array, or the JSON string a multipart save sends. Anything else is []. */
export function parseIntakeLogIDs(value) {
  let list = value;
  if (typeof value === 'string') {
    try { list = value ? JSON.parse(value) : []; } catch { list = []; }
  }
  return (Array.isArray(list) ? list : []).map(text).filter((id) => /^sil-[\w-]+$/.test(id)).slice(0, 20);
}

/** On save: write what the ticket became onto each of its suggestions. Never throws. */
export async function recordIntakeOutcomes({ logIDs, body, repairID }) {
  const ids = (Array.isArray(logIDs) ? logIDs : []).map(text).filter((id) => /^sil-[\w-]+$/.test(id)).slice(0, 20);
  if (!ids.length) return 0;
  try {
    const dbi = await db.connect();
    const res = await dbi.collection(SMART_INTAKE_LOGS).updateMany(
      { logID: { $in: ids }, outcome: null },
      { $set: { outcome: ticketOutcome(body), repairID: repairID || null, savedAt: new Date() } },
    );
    return res.modifiedCount;
  } catch (error) {
    console.error('smart-intake log (outcome) failed:', error.message);
    return 0;
  }
}

/** Pure: a log entry as the admin page shows it — the stored entry plus its field-by-field changes. */
export function withChanges(entry = {}) {
  const { _id, ...rest } = entry;
  return { ...rest, changes: rest.outcome ? compareIntake(rest.kind, rest.output || {}, rest.outcome) : null };
}

/** The newest entries (optionally one kind / surface), each with its changes, plus the miss summary over them. */
export async function listIntakeLogs({ kind = '', surface = '', limit = 200 } = {}) {
  const query = {};
  if (kind === 'text' || kind === 'photo') query.kind = kind;
  if (surface === 'store' || surface === 'counter') query.surface = surface;
  const dbi = await db.connect();
  const entries = await dbi.collection(SMART_INTAKE_LOGS).find(query)
    .sort({ createdAt: -1 }).limit(Math.min(Math.max(Number(limit) || 200, 1), 500)).toArray();
  return { entries: entries.map(withChanges), summary: summarizeMisses(entries) };
}

/** Pure: per-field miss counts across saved entries — "where it all went wrong". */
export function summarizeMisses(entries = []) {
  const saved = entries.filter((e) => e.outcome);
  const byField = {};
  let changed = 0;
  for (const e of saved) {
    const diffs = compareIntake(e.kind, e.output || {}, e.outcome);
    if (diffs.length) changed += 1;
    for (const d of diffs) byField[d.field] = (byField[d.field] || 0) + 1;
  }
  return { logged: entries.length, saved: saved.length, changed, byField };
}
