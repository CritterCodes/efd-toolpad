/**
 * Smart intake: everything between the model's answer and what the form is told. Pure — no network, no database.
 *
 * The model SUGGESTS (which catalog tasks, how many, the metal, the sizes). This file DECIDES: it normalizes the
 * answer to the form's vocabulary and then applies the owner's rulings in code, so a ruling never depends on the model
 * remembering a sentence in a prompt. `decideIntake` is the one entry point; the route and the replay
 * (`npm run intake:replay`, docs/goals/SMART_INTAKE.md) both go through it, so what is measured is what ships.
 *
 * Until tasks carry a role field (goal file, C1) the rulings find their tasks by TITLE. `taskRoles` is the only place
 * that reads a title; `test/smart-intake/catalog.test.js` fails when the committed catalog stops resolving.
 */

import { TASK_CAP, MAX_PIECES } from './smartIntakeLimits';

export { INTAKE_MODEL, TASK_CAP, MAX_PIECES } from './smartIntakeLimits';

const str = (v) => String(v ?? '').trim();
const titleOf = (t) => str(t?.title).toLowerCase();

/* ------------------------------------------------------------------ sizes */

const FRACTIONS = [
  [/\s*(?:and\s*)?(?:a\s*)?(?:three[\s-]*quarters?|3\/4|¾)/, 0.75],
  [/\s*(?:and\s*)?(?:a\s*)?(?:half|1\/2|½)/, 0.5],
  [/\s*(?:and\s*)?(?:a\s*)?(?:quarter|1\/4|¼)/, 0.25],
];

/**
 * A ring size as a number, or null. "7", "7.25", "7 1/2", "7½", "7 and a half", "size 7", "sz 6.5". Anything else is
 * null — never 0: a blank size read as size 0 once made "resize to 8" an eight-size jump (owner, 2026-10-01, Q12).
 */
export function parseRingSize(value) {
  const raw = str(value).toLowerCase().replace(/^(?:size|sz)\.?\s*/, '');
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  let n = Number(m[1]);
  const rest = m[2];
  if (rest.trim()) {
    const frac = FRACTIONS.find(([re]) => new RegExp(`^${re.source}\\s*$`).test(rest));
    if (!frac || !Number.isInteger(n)) return null;
    n += frac[1];
  }
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : null;
}

const sizeText = (value) => { const n = parseRingSize(value); return n === null ? '' : String(n); };

/* ------------------------------------------------------- metal vocabulary */

/**
 * Karat/purity → the exact vocabulary the form's Select uses ('14k', '925', '950'…). The model answers in free text
 * ("14K", "14 kt"); anything that doesn't normalize cleanly becomes '' rather than a value the Select can't render —
 * a silently blank field is how a 14k price gets charged on an 18k ring.
 */
export const normalizeKaratValue = (value) => {
  const raw = str(value).toLowerCase().replace(/\s+/g, '');
  if (!raw) return '';
  // Only the purities the form's Select has. "585" and "750" are karats in another notation; passing them through
  // gave the form a value it cannot show (review, 2026-11-09).
  if (/^\d{3}$/.test(raw)) return ['925', '950', '999', '900'].includes(raw) ? raw : '';
  const m = raw.match(/^(\d{1,2})k?t?$/);          // 14, 14k, 14kt
  return m ? `${m[1]}k` : '';
};

/**
 * Silver and platinum carry their purity in the NAME, so nobody says it out loud. "Sterling silver ring" states no
 * karat, an empty karat cannot be priced, and every silver job said "Choose a metal to price this" with the metal
 * already filled in (owner, 2026-10-12). Silver means 925 and platinum means 950 — ONLY when the field came back
 * empty. A stated 999 or 900 is left exactly as stated.
 */
const DEFAULT_PURITY = Object.freeze({ silver: '925', platinum: '950' });
export const applyDefaultPurity = (metalType, karat) => (karat ? karat : (DEFAULT_PURITY[metalType] || karat));

/**
 * The model's colour in the form's vocabulary. It answers "White Gold" or "wg" as readily as "white"; reading those as
 * unknown and then defaulting to yellow turned a white gold ring yellow (review, 2026-11-09). The yellow default is
 * for a BLANK answer only; a colour said in words we don't know stays blank, where a person sees it.
 */
export const normalizeGoldColor = (value) => {
  const raw = str(value).toLowerCase();
  // The FIRST colour named: "yellow gold with white gold head" is a yellow ring (review, 2026-11-09).
  const found = [['white', /\bwhite\b|^wg$/], ['rose', /\brose\b|\bpink\b|^rg$/], ['yellow', /\byellow\b|^yg$/]]
    .map(([colour, re]) => [colour, raw.search(re)]).filter(([, at]) => at >= 0).sort((a, b) => a[1] - b[1]);
  return found.length ? found[0][0] : '';
};

/** The model's metal in the form's vocabulary. It answers "white gold" or "sterling" as readily as "gold" or "silver". */
export const normalizeMetalType = (value) => {
  const raw = str(value).toLowerCase();
  if (/\bplat/.test(raw) || raw === 'pt') return 'platinum';
  if (/\bgold\b|^[ywr]g$/.test(raw)) return 'gold';
  if (/\bsilver\b|\bsterling\b|^ss$/.test(raw)) return 'silver';
  if (/\bcostume\b/.test(raw)) return 'costume';
  return '';
};

const QUANTITY_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1 };

/* -------------------------------------------------------------- normalize */

const toBool = (value) => {
  if (typeof value === 'boolean') return value;
  const v = str(value).toLowerCase();
  if (['true', 'yes', '1'].includes(v)) return true;
  if (['false', 'no', '0'].includes(v)) return false;
  return null;
};

const isoDate = (value) => {
  const raw = str(value);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // "2026-13-45" is date-shaped and not a date.
  return d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? raw : '';
};

const wholeNumber = (value, min, max, fallback) => {
  // "four" is 4, not the fallback: a word for a count silently became 1 (review, 2026-11-09).
  const word = QUANTITY_WORDS[str(value).toLowerCase()];
  // "4 prongs" is 4: a number with its unit after it silently became 1 (review, 2026-11-09).
  const leading = str(value).match(/^(\d{1,3})(?![\d.])/);
  const n = Math.round(word ?? (Number.isFinite(Number(value)) ? Number(value) : Number(leading?.[1] ?? NaN)));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * The model's answer in the form's vocabulary. No rulings here — only shape: enums, karat, sizes as numbers, task
 * lines as { id, quantity }, duplicates merged, at most TASK_CAP lines. `overCap` says how many were cut.
 */
export const normalizeParsedPayload = (payload = {}) => {
  const lines = Array.isArray(payload.matchedTasks) && payload.matchedTasks.length
    ? payload.matchedTasks.map((item) => ({ id: str(item?.id ?? item?.taskId), quantity: wholeNumber(item?.quantity ?? item?.qty, 1, 99, 1) }))
    : (Array.isArray(payload.matchedTaskIds) ? payload.matchedTaskIds : []).map((id) => ({ id: str(id), quantity: 1 }));
  // One line per task. A task the model names twice is two of it — "laser weld the clasp, laser weld the link" — so
  // the quantities ADD (review, 2026-11-09: keeping the larger made two welds one). A sizing task is set to one per
  // piece later, whatever arrives here.
  const merged = new Map();
  for (const line of lines) {
    if (!line.id) continue;
    merged.set(line.id, Math.min(99, (merged.get(line.id) || 0) + line.quantity));
  }
  const all = [...merged].map(([id, quantity]) => ({ id, quantity }));
  const matchedTasks = all.slice(0, TASK_CAP);

  const metalType = normalizeMetalType(payload.metalType);
  const sizeChange = Number(payload.sizeChange);

  return {
    metalType,
    karat: applyDefaultPurity(metalType, normalizeKaratValue(payload.karat)),
    // Gold with no colour said is yellow (owner, 2026-11-09; 5 of 5 logged intakes were corrected to yellow).
    // The colour may arrive inside the metal ("white gold") rather than in its own field.
    goldColor: metalType !== 'gold' ? ''
      : (normalizeGoldColor(payload.goldColor) || normalizeGoldColor(payload.metalType) || (!str(payload.goldColor) ? 'yellow' : '')),
    isRing: toBool(payload.isRing),
    currentRingSize: sizeText(payload.currentRingSize),
    desiredRingSize: sizeText(payload.desiredRingSize),
    // Sizes moved when only the change was said ("size up 2 sizes"): signed, 0 when unknown.
    sizeChange: Number.isFinite(sizeChange) && Math.abs(sizeChange) <= 15 ? sizeChange : 0,
    pieceCount: wholeNumber(payload.pieceCount, 1, MAX_PIECES, 1),
    promiseDate: isoDate(payload.promiseDate),
    normalizedSummary: str(payload.normalizedSummary),
    matchedTasks,
    matchedTaskIds: matchedTasks.map((t) => t.id),
    materialHints: [],
    overCap: all.length - matchedTasks.length,
  };
};

/* ------------------------------------------------------------- task roles */

const restricted = (t) => Array.isArray(t?.metals) && t.metals.length > 0;
const WIDE_BAND = /3\s*(?:mm)?\s*(?:to|-|–)\s*5\s*mm/;
const NARROW_BAND = /up to 3\s*mm/;
const isSizeUp = (t) => /\bsize up\b/.test(titleOf(t));
const isSizeDown = (t) => /\bsize down\b/.test(titleOf(t));
/** For the form, which holds task lines rather than catalog entries: the same title rules, in the one place they live. */
export const isSizeUpTask = (task) => /\bsize up\b/.test(titleOf(task));
export const isSizeDownTask = (task) => /\bsize down\b/.test(titleOf(task));
export const isCustomerGoldTask = (task) => /customer/.test(titleOf(task));
const isSizing = (t) => isSizeUp(t) || isSizeDown(t);
const isCustomerGold = (t) => /customer/.test(titleOf(t));
const isSolderTogether = (t) => /solder together/.test(titleOf(t));
/** A title with its width band and filler removed: "Size Up - 3mm to 5mm shanks" and "Size up (1 size) - up to 3mm x 2 mm shank" compare equal. */
const familyOf = (t) => titleOf(t)
  .replace(WIDE_BAND, '').replace(NARROW_BAND, '').replace(/\(1 size\)|x\s*2\s*mm|shanks?/g, '')
  .replace(/[^a-z]+/g, ' ').trim();

/**
 * The tasks the rulings need, found in the catalog. THE ONLY PLACE A TITLE IS READ. Each is null when the catalog has
 * no such task — the ruling then does nothing, and `problems` says why, so a rename shows up instead of silently
 * changing a price (review, 2026-11-09).
 */
export function taskRoles(tasks = []) {
  const generic = tasks.filter((t) => !restricted(t));
  const one = (list) => (list.length === 1 ? list[0] : null);
  const rhodiumAll = generic.filter((t) => /rhodium/.test(titleOf(t)));
  const plainRhodium = rhodiumAll.filter((t) => /^rhodium plating$/.test(titleOf(t)));
  const roles = {
    rhodium: plainRhodium.length === 1 ? plainRhodium[0] : one(rhodiumAll),
    sizeDown: one(generic.filter((t) => isSizeDown(t))),
    sizeUp: one(generic.filter((t) => isSizeUp(t) && NARROW_BAND.test(titleOf(t)) && !isCustomerGold(t))),
    solderTogether: one(generic.filter(isSolderTogether)),
  };
  const problems = Object.entries(roles).filter(([, t]) => !t).map(([role]) => role);
  if (unpairedWidthTasks(tasks).length) problems.push('shankWidth');
  return { ...roles, problems };
}

const isHalfShank = (t) => /half[\s-]*shank/.test(titleOf(t));
/**
 * Tasks that should come as an up-to-3mm / 3-to-5mm pair and do not. Two size-ups (or two half-shanks) for the same
 * metal are a pair by intent; when their names no longer say which is which ("Size Up — wide shank"), the width rule
 * cannot find them and stops — silently, until this (reviews, 2026-11-09, twice).
 */
export function unpairedWidthTasks(tasks = []) {
  const out = [];
  for (const kind of [(t) => isSizeUp(t) && !isCustomerGold(t), isHalfShank]) {
    const groups = new Map();
    for (const t of tasks.filter(kind)) {
      const key = String(restricted(t) ? t.metals : '');
      groups.set(key, [...(groups.get(key) || []), t]);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      out.push(...group.filter((t) => !narrowSiblingOf(t, tasks) && !wideSiblingOf(t, tasks)));
    }
  }
  return out;
}

/** The up-to-3mm sibling of a 3-to-5mm task, or null. */
export function narrowSiblingOf(task, tasks = []) {
  if (!task || !WIDE_BAND.test(titleOf(task))) return null;
  const siblings = tasks.filter((t) => NARROW_BAND.test(titleOf(t)) && familyOf(t) === familyOf(task)
    && String(restricted(t) ? t.metals : '') === String(restricted(task) ? task.metals : ''));
  return siblings.length === 1 ? siblings[0] : null;
}

/** The 3-to-5mm sibling of an up-to-3mm task, or null. */
export function wideSiblingOf(task, tasks = []) {
  if (!task || !NARROW_BAND.test(titleOf(task))) return null;
  const siblings = tasks.filter((t) => WIDE_BAND.test(titleOf(t)) && familyOf(t) === familyOf(task)
    && String(restricted(t) ? t.metals : '') === String(restricted(task) ? task.metals : ''));
  return siblings.length === 1 ? siblings[0] : null;
}

import { shankWidthSaid, statedPieceCount, describesDifferentWorkPerPiece, saysEach, karatsSaid, saidAsSize, noteNames } from './smartIntakeSaid';

export { shankWidthSaid, statesWideShank, statedPieceCount, describesDifferentWorkPerPiece, sizePairsSaid, noteNames } from './smartIntakeSaid';

/* ----------------------------------------------------------------- rulings */

const byIdOf = (tasks) => new Map(tasks.map((t) => [String(t.id), t]));
const withLines = (parsed, matchedTasks) => ({ ...parsed, matchedTasks, matchedTaskIds: matchedTasks.map((m) => m.id) });
const warn = (parsed, message) => ({ ...parsed, warnings: [...(parsed.warnings || []), message] });
/** Mark a line the rulings added or changed, so the form can say so instead of "from your sentence". */
const ruled = (line, why) => ({ ...line, ruled: why });
const mergeLines = (lines) => {
  const merged = new Map();
  for (const l of lines) {
    const prev = merged.get(l.id);
    merged.set(l.id, prev ? { ...prev, ...l, quantity: Math.max(prev.quantity, l.quantity) } : l);
  }
  return [...merged.values()];
};
const ROLE_NAMES = { rhodium: 'rhodium plating', sizeDown: 'size down', sizeUp: 'size up (up to 3mm)', solderTogether: 'solder together' };
const missingRole = (role) => `The task list has no single "${ROLE_NAMES[role]}" task, so that rule was not applied. Check the tasks by hand, and fix the task names in Admin → Tasks.`;

// A real ring moves a few sizes (the largest real job on file is 8.5 → 12.25). More than this is a misread, not a job.
export const MAX_SIZES_MOVED = 5;

/** Sizes moved, signed: from the two sizes when both are known, else the stated change, else 0. */
export const sizesMoved = (parsed = {}) => {
  const from = parseRingSize(parsed.currentRingSize);
  const to = parseRingSize(parsed.desiredRingSize);
  if (from !== null && to !== null) return Math.round((to - from) * 100) / 100;
  return Number(parsed.sizeChange) || 0;
};

/** Task ids the catalog doesn't have are dropped — the model can only choose, never invent. */
export const withKnownTasksOnly = (parsed, tasks = []) => {
  if (!tasks.length) return parsed;
  const byId = byIdOf(tasks);
  const known = (parsed.matchedTasks || []).filter((m) => byId.has(m.id));
  const dropped = (parsed.matchedTasks || []).length - known.length;
  return dropped ? warn(withLines(parsed, known), `Dropped ${dropped} task${dropped > 1 ? 's' : ''} the task list does not have.`) : parsed;
};

/**
 * What the FORM already knows beats a guess. The route is sent the metal chosen on the form; when the note names no
 * metal or no colour, the form's is used — so white gold picked on the form still gets its rhodium, instead of the
 * yellow default (review, 2026-11-09).
 */
export const withFormMetal = (parsed, raw = {}, formMetal = {}, inputText = '') => {
  const form = {
    metalType: str(formMetal.metalType).toLowerCase(),
    karat: normalizeKaratValue(formMetal.karat),
    goldColor: normalizeGoldColor(formMetal.goldColor),
  };
  if (!['gold', 'silver', 'platinum', 'costume'].includes(form.metalType)) return parsed;
  const out = { ...parsed };
  const named = noteNames(inputText);
  // The note names no metal: the form's metal stands, whatever the model inferred (from the photo's description, say).
  if (!str(raw.metalType) || !named.metal) {
    out.metalType = form.metalType;
    out.karat = applyDefaultPurity(form.metalType, form.karat || '');
    out.goldColor = form.metalType === 'gold' ? (form.goldColor || 'yellow') : '';
    return out;
  }
  if (out.metalType === form.metalType) {
    if (!str(raw.karat) && form.karat) out.karat = form.karat;
    if (out.metalType === 'gold' && (!str(raw.goldColor) || !named.color) && form.goldColor) out.goldColor = form.goldColor;
  }
  return out;
};

/**
 * Sizes are checked before anything is built on them.
 *  - Not a ring: no ring sizes. A bracelet going "7 inch to 8 inch" is not a size-up (review, 2026-11-09).
 *  - A move of more than MAX_SIZES_MOVED sizes is a misread — a karat in a size field made 6 → 18 and eleven pieces
 *    of sizing stock. The sizes are blanked and the jeweler is told.
 */
export const withCheckedSizes = (parsed, inputText = '') => {
  const has = parsed.currentRingSize || parsed.desiredRingSize || parsed.sizeChange;
  if (!has) return parsed;
  // "Size all 3 to a 6": three rings going to a 6. The 3 is a count, and the current sizes were never said.
  const allTo = str(inputText).toLowerCase().match(/\ball\s+(\d{1,2})\s+to\s+(?:an?\s+)?(?:size\s+)?(\d{1,2}(?:\.\d+)?)(?![\d.])/);
  // Whatever the model made of it: the current sizes were never said, so neither was the direction. No sizing task
  // is guessed — a Size Down on rings that needed to go up is a wrong ticket for three rings at once.
  if (allTo) {
    return warn({ ...parsed, currentRingSize: '', desiredRingSize: String(Number(allTo[2])), sizeChange: 0, sizingUnknown: true },
      `"all ${allTo[1]}" is a count of pieces, and the current sizes were not said, so no sizing task was added. Enter the sizes and add the sizing by hand.`);
  }
  if (parsed.isRing === false) {
    return warn({ ...parsed, currentRingSize: '', desiredRingSize: '', sizeChange: 0 }, 'Ring sizes were ignored: the piece was not read as a ring. If it is a ring, set the sizes by hand.');
  }
  // The karat read as a size: "resize 14k wg ring" → size 14. Blank that one size (review, 2026-11-09: 6 → 14 passed
  // the old limit and put seven pieces of stock on the ticket).
  for (const field of ['currentRingSize', 'desiredRingSize']) {
    const n = parseRingSize(parsed[field]);
    if (n !== null && karatsSaid(inputText).includes(n) && !saidAsSize(inputText, n)) {
      return warn({ ...parsed, [field]: '', sizeChange: 0 }, `Size ${n} looks like the karat, not a ring size, so it was left blank. Enter the size by hand.`);
    }
  }
  const moved = sizesMoved(parsed);
  if (Math.abs(moved) > MAX_SIZES_MOVED) {
    return warn({ ...parsed, currentRingSize: '', desiredRingSize: '', sizeChange: 0 }, `A move of ${Math.abs(moved)} sizes looks like a misread, so the sizes were left blank. Enter them by hand.`);
  }
  return parsed;
};

/**
 * The sizing job, decided from the sizes (owner's screenshot, 2026-11-09: "going up two sizes from 5 to a 7" came back
 * with sizing stock and no task).
 *  - Sizes move and no sizing task was matched: add the standard one — Size Down, or the up-to-3mm Size Up.
 *  - The matched sizing task goes the wrong way for the sizes (Size Down on 5 → 7): swap it. The sizes are what was
 *    said; the task was the model's pick.
 *  - Two sizing tasks on one ring: keep the first.
 * The form's metal alignment swaps in the platinum task afterwards.
 */
export const withSizingTaskForSizes = (parsed, tasks = []) => {
  const byId = byIdOf(tasks);
  let matched = parsed.matchedTasks || [];
  let out = parsed;
  const sizing = matched.filter((m) => isSizing(byId.get(m.id)));
  if (sizing.length > 1) {
    matched = matched.filter((m) => !isSizing(byId.get(m.id)) || m === sizing[0]);
    out = warn(withLines(out, matched), `Two sizing tasks were suggested for one job: kept "${byId.get(sizing[0].id).title}".`);
  }
  // The direction was never said ("size all 3 to a 6"): no sizing task, whatever the model picked.
  if (out.sizingUnknown) return withLines(out, matched.filter((m) => !isSizing(byId.get(m.id))));
  const moved = sizesMoved(out);
  if (!moved || !tasks.length) return out;
  const roles = taskRoles(tasks);
  const wanted = moved < 0 ? 'sizeDown' : 'sizeUp';
  const have = matched.find((m) => isSizing(byId.get(m.id)));
  if (!have) {
    if (!roles[wanted]) return warn(out, missingRole(wanted));
    return warn(withLines(out, [ruled({ id: String(roles[wanted].id), quantity: 1 }, 'the ring changes size'), ...matched]),
      `Added "${roles[wanted].title}": the ring changes size.`);
  }
  const task = byId.get(have.id);
  const wrongWay = moved < 0 ? isSizeUp(task) : isSizeDown(task);
  if (!wrongWay) return out;
  if (!roles[wanted]) return warn(out, missingRole(wanted));
  const fixed = matched.map((m) => (m === have ? ruled({ ...m, id: String(roles[wanted].id) }, 'the sizes go the other way') : m));
  return warn(withLines(out, mergeLines(fixed)), `Changed "${task.title}" to "${roles[wanted].title}": the sizes go ${moved < 0 ? 'down' : 'up'}.`);
};

/**
 * A sizing task with no sizes to hold it against is the model's guess at the direction: "ring size to a 7" came back
 * as Size Down. Unless the note says which way, say so (review, 2026-11-09). The task stays — it is usually right —
 * and the form's own check takes over once both sizes are entered.
 */
export const withUnknownDirection = (parsed, tasks = [], inputText = '') => {
  if (parsed.sizingUnknown || sizesMoved(parsed)) return parsed;
  const byId = byIdOf(tasks);
  const sizing = (parsed.matchedTasks || []).map((m) => byId.get(m.id)).find((t) => t && isSizing(t));
  if (!sizing || /\b(?:up|down|larger|smaller|bigger|tighter|looser)\b/.test(str(inputText).toLowerCase())) return parsed;
  return warn(parsed, `The note does not say both sizes or which way the ring goes, so "${sizing.title}" is a guess. Check it, and enter the sizes.`);
};

// A task priced for the whole piece, whatever the count: "Check & Tighten < 20 stones", "Straighten Prongs — up to 20 stones".
const isFlatTask = (t) => /(?:<|up to|over|less than)\s*\d+\s*stones/.test(titleOf(t));
/**
 * Two things said out loud rather than left for him to notice (review, 2026-11-09):
 *  - nothing was matched — an empty ticket after a note that named work looked the same as a note with no work;
 *  - a count on a task that is priced for the whole piece ("check and tighten 5 stones" ×5).
 */
export const withPlainSpeaking = (parsed, tasks = []) => {
  const matched = parsed.matchedTasks || [];
  if (!matched.length) return tasks.length ? warn(parsed, 'No work was matched from this note. Add the work by hand.') : parsed;
  const byId = byIdOf(tasks);
  let out = parsed;
  for (const m of matched) {
    const task = byId.get(m.id);
    if (task && isFlatTask(task) && m.quantity > (parsed.pieces || 1)) {
      out = warn(out, `"${task.title}" is priced for the whole piece, and ${m.quantity} were suggested. Check the quantity.`);
    }
  }
  return out;
};

/**
 * The shank width (owner, 2026-11-09: "Default ring mm is always 3x2 unless specified 3-5"). Both ways:
 *  - no wide shank said: a matched 3-to-5mm task becomes its up-to-3mm sibling;
 *  - a wide shank said: a matched up-to-3mm task becomes its 3-to-5mm sibling (a narrow pick on a stated 5mm band was a
 *    silent under-charge — review, 2026-11-09).
 */
export const withShankWidth = (parsed, tasks = [], inputText = '') => {
  const said = shankWidthSaid(inputText);
  const wide = said === 'wide';
  const byId = byIdOf(tasks);
  const matchedTasks = (parsed.matchedTasks || []).map((m) => byId.get(m.id)).filter(Boolean);
  // The pair cannot be told apart by name: say so rather than quietly charging whichever the model picked.
  const unpaired = unpairedWidthTasks(tasks);
  if (matchedTasks.some((t) => unpaired.includes(t))) {
    return warn(parsed, 'The task list\'s "up to 3mm" and "3mm to 5mm" tasks could not be told apart by name, so the shank width rule was not applied. Check the task, and fix the task names in Admin → Tasks.');
  }
  if (said === 'unclear') {
    const banded = matchedTasks.find((t) => narrowSiblingOf(t, tasks) || wideSiblingOf(t, tasks));
    return banded
      ? warn(parsed, `The note mentions a width, but not plainly as this shank's: kept "${banded.title}". Check the width.`)
      : parsed;
  }
  let swapped = '';
  const lines = (parsed.matchedTasks || []).map((m) => {
    const task = byId.get(m.id);
    const sibling = wide ? wideSiblingOf(task, tasks) : narrowSiblingOf(task, tasks);
    if (!sibling) return m;
    swapped = sibling.title;
    return ruled({ ...m, id: String(sibling.id) }, wide ? 'a wide shank was stated' : 'no wide shank was stated');
  });
  // A wide platinum shank: the catalog has no 3-to-5mm platinum size-up, and the form swaps in the platinum task
  // afterwards — the width was detected and then dropped without a word (review, 2026-11-09).
  const noWidePlatinum = wide && parsed.metalType === 'platinum' && matchedTasks.some(isSizeUp)
    && !tasks.some((t) => restricted(t) && isSizeUp(t) && WIDE_BAND.test(titleOf(t)));
  const out = swapped
    ? warn(withLines(parsed, mergeLines(lines)), `Used "${swapped}": ${wide ? 'a wide shank was stated' : 'no wide shank was stated'}.`)
    : parsed;
  return noWidePlatinum
    ? warn(out, 'A wide shank was stated, and there is no 3mm-to-5mm platinum size-up task: the platinum task is priced for a narrow shank. Check the price by hand.')
    : out;
};
/** @deprecated the old name; width now goes both ways. */
export const withDefaultShankWidth = withShankWidth;

/**
 * Several pieces on one job (owner, 2026-11-09: "If there are 2 rings then there are 2x task and 2x materials. Each
 * ring gets a task and a material.").
 *
 * The ticket is multiplied ONLY when the model's count and the sentence AGREE. Either one alone has been wrong in
 * every review — the sentence regex read "retip all 4" as four rings, the model read "2 times" as two pieces — and a
 * wrong count multiplies the whole ticket. When they disagree nothing is multiplied and the jeweler is told, which
 * costs one tap; a silent ×4 costs the customer.
 *  - A sizing task is exactly one per piece — never the number of sizes ("2 sizes" is not ×2).
 *  - Every other task is done at least once per piece: a quantity below the piece count is raised to it; a per-unit
 *    count above it ("retip 4 prongs each" = 8) is left alone.
 *  - When the note gives the pieces different work ("size one down, retip the other") no one count fits, so nothing is
 *    multiplied.
 *
 * Solder Together is the exception (owner, 2026-11-09: "2 rings is 1x task. 3 rings is 2x tasks"): its quantity is
 * the number of joins, rings − 1, and the joined rings are then ONE piece for everything else on the ticket.
 */
export const withPieceCount = (parsed, tasks = [], inputText = '') => {
  const modelSays = Number(parsed.pieceCount) || 1;
  const sentenceSays = statedPieceCount(inputText);
  const agreed = modelSays === sentenceSays ? modelSays : 1;
  const claimed = Math.max(modelSays, sentenceSays);
  const byId = byIdOf(tasks);
  const matched = parsed.matchedTasks || [];
  const each = saysEach(inputText);
  const onePerPiece = (pieces) => matched.map((m) => (isSizing(byId.get(m.id)) ? { ...m, quantity: pieces } : { ...m, quantity: Math.max(m.quantity, pieces) }));

  const solder = matched.find((m) => isSolderTogether(byId.get(m.id)));
  if (solder) {
    // Rings joined: the count is how many rings, said by either the model or the sentence ("solder together two rings").
    const joins = claimed >= 2 ? claimed - 1 : solder.quantity;
    const changed = joins !== solder.quantity;
    const lines = matched.map((m) => {
      if (m === solder) return changed ? ruled({ ...m, quantity: joins }, `${claimed} rings are ${joins} join${joins === 1 ? '' : 's'}`) : m;
      return isSizing(byId.get(m.id)) ? { ...m, quantity: 1 } : m;
    });
    const out = { ...withLines(parsed, lines), pieceCount: claimed, pieces: 1 };
    return changed ? warn(out, `"${byId.get(solder.id).title}" set to ${joins}: ${claimed} rings are ${joins} join${joins === 1 ? '' : 's'}.`) : out;
  }
  if (claimed > 1 && (agreed === 1 || describesDifferentWorkPerPiece(inputText))) {
    const why = agreed > 1 ? 'with different work on each' : 'but that is not certain from the note';
    return warn({ ...withLines(parsed, onePerPiece(1)), pieceCount: 1, pieces: 1 },
      `This may be ${claimed} pieces, ${why}: quantities were NOT multiplied. Check each line, and the sizes, by hand.`);
  }
  if (agreed <= 1) return { ...withLines(parsed, onePerPiece(1)), pieceCount: 1, pieces: 1 };
  // Say what happened to every line with a count of its own, instead of one sentence that is untrue for some of them.
  const counted = matched.filter((m) => !isSizing(byId.get(m.id)) && m.quantity > 1).map((m) => {
    const title = byId.get(m.id)?.title || 'A task';
    if (m.quantity <= agreed) return '';
    return each
      ? ` "${title}" was left at ${m.quantity}, and the note says "each" — if that is ${m.quantity} on each piece, make it ${Math.min(99, m.quantity * agreed)}.`
      : ` "${title}" was left at ${m.quantity} — check that is the total for all ${agreed}.`;
  }).join('');
  return warn({ ...withLines(parsed, onePerPiece(agreed)), pieceCount: agreed, pieces: agreed }, `${agreed} pieces: each task and material is counted ${agreed} times.${counted}`);
};

/**
 * Every white gold job gets rhodium (owner, 2026-11-09: "yes all white gold get rhodium"). The Rhodium Plating task's
 * own aiMeta only says "turned yellow or dull, or the customer asks", so the model left it off. One per piece: 14
 * prongs retipped on one ring is one rhodium, not fourteen (review, 2026-11-09).
 */
export const withRhodiumForWhiteGold = (parsed, tasks = []) => {
  if (parsed?.metalType !== 'gold' || parsed?.goldColor !== 'white') return parsed;
  const matched = parsed.matchedTasks || [];
  if (!matched.length) return parsed;
  const { rhodium } = taskRoles(tasks);
  if (!rhodium) return warn(parsed, missingRole('rhodium'));
  if (matched.some((m) => m.id === String(rhodium.id))) return parsed;
  const byId = byIdOf(tasks);
  // Without a piece count on the answer (older callers), a sizing task's quantity is one for certain: sizing is x1 per ring.
  const sizing = matched.find((m) => isSizing(byId.get(m.id)));
  const quantity = parsed.pieces || (sizing ? sizing.quantity : 1);
  return warn(withLines(parsed, [...matched, ruled({ id: String(rhodium.id), quantity }, 'white gold')]), `Added "${rhodium.title}": white gold.`);
};

/**
 * Sizing stock for a ticket: sizes moved, rounded UP, minus the one the size-up task covers — per piece. Owner,
 * 2026-11-09: "1.25 sizes is charged as 2" and "2 sizes up is 1x task and 1x sizing stock material". None going down
 * or with the customer's gold. Shared with the form, which recomputes it when a size is edited.
 */
export const sizingStockFor = ({ moved = 0, pieces = 1, customerGold = false } = {}) => (
  !customerGold && moved > 1 ? (Math.ceil(moved) - 1) * Math.max(1, pieces) : 0
);

/**
 * Sizing stock on the answer, computed — never taken from the model (review, 2026-11-09: its arithmetic went straight
 * onto the ticket). None when no size-up task is on the ticket.
 */
export const withSizingStock = (parsed, tasks = []) => {
  const byId = byIdOf(tasks);
  const sizeUp = (parsed.matchedTasks || []).map((m) => byId.get(m.id)).find((t) => t && isSizeUp(t));
  const moved = sizesMoved(parsed);
  const quantity = sizeUp ? sizingStockFor({ moved, pieces: parsed.pieces || 1, customerGold: isCustomerGold(sizeUp) }) : 0;
  return {
    ...parsed,
    materialHints: quantity > 0
      ? [{ type: 'sizing_material', quantity, reason: `Sizing up ${moved} size${moved === 1 ? '' : 's'}: the task covers the first, stock covers the rest.` }]
      : [],
  };
};

/**
 * The model's raw answer → what the form is told. Order matters: the form's metal and the size checks first; then the
 * sizing task (so the width rule and rhodium see it); the piece count before rhodium and stock (they are per piece).
 */
export function decideIntake(raw, { tasks = [], inputText = '', formMetal = {} } = {}) {
  let p = normalizeParsedPayload(raw || {});
  if (p.overCap > 0) p = warn(p, `More than ${TASK_CAP} jobs: only the first ${TASK_CAP} were kept. Add the rest by hand.`);
  for (const field of ['currentRingSize', 'desiredRingSize']) {
    if (/\d/.test(str(raw?.[field])) && !p[field]) p = warn(p, `A ring size ("${str(raw[field])}") could not be read, so it was left blank. Enter the sizes by hand.`);
  }
  p = withFormMetal(p, raw || {}, formMetal, inputText);
  p = withKnownTasksOnly(p, tasks);
  p = withCheckedSizes(p, inputText);
  p = withSizingTaskForSizes(p, tasks);
  p = withUnknownDirection(p, tasks, inputText);
  p = withShankWidth(p, tasks, inputText);
  p = withPieceCount(p, tasks, inputText);
  p = withRhodiumForWhiteGold(p, tasks);
  p = withSizingStock(p, tasks);
  p = withPlainSpeaking(p, tasks);
  const { overCap: _overCap, pieces: _pieces, sizingUnknown: _unknown, ...out } = p;
  // What the NOTE itself stated, as opposed to what a default or the form supplied. The form uses it to decide what a
  // re-read may overwrite, and to show a default as "(assumed)" rather than as something it picked up.
  // "Said" means the NOTE names it, not merely that the model returned it: the model also sees the photo's
  // description, and a "silver-toned ring" it read there must not overwrite the metal chosen on the form (review,
  // 2026-11-09).
  const named = noteNames(inputText);
  const said = {
    metal: !!str(raw?.metalType) && named.metal,
    karat: !!str(raw?.karat) && named.karat,
    color: !!(normalizeGoldColor(raw?.goldColor) || normalizeGoldColor(raw?.metalType)) && named.color,
  };
  return { ...out, said, warnings: [...new Set(p.warnings || [])] };
}

// The prompt lives in smartIntakePrompt.js. Re-exported so there is still one module to import from.
export { prefilterTasks, tasksForPrompt, buildIntakePrompt, FULL_CATALOG_LIMIT } from './smartIntakePrompt';
