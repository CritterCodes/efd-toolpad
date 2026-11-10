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

export const TASK_CAP = 6;
export const MAX_PIECES = 20;

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
  if (/^\d{3}$/.test(raw)) return raw;            // 925 / 950 / 999
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
  if (/\bwhite\b|^wg$/.test(raw)) return 'white';
  if (/\brose\b|\bpink\b|^rg$/.test(raw)) return 'rose';
  if (/\byellow\b|^yg$/.test(raw)) return 'yellow';
  return '';
};

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
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * The model's answer in the form's vocabulary. No rulings here — only shape: enums, karat, sizes as numbers, task
 * lines as { id, quantity }, duplicates merged, at most TASK_CAP lines. `overCap` says how many were cut.
 */
export const normalizeParsedPayload = (payload = {}) => {
  const lines = Array.isArray(payload.matchedTasks) && payload.matchedTasks.length
    ? payload.matchedTasks.map((item) => ({ id: str(item?.id), quantity: wholeNumber(item?.quantity, 1, 99, 1) }))
    : (Array.isArray(payload.matchedTaskIds) ? payload.matchedTaskIds : []).map((id) => ({ id: str(id), quantity: 1 }));
  // One line per task: a task named twice keeps its larger quantity (review, 2026-11-09: duplicate ids were kept).
  const merged = new Map();
  for (const line of lines) {
    if (!line.id) continue;
    merged.set(line.id, Math.max(merged.get(line.id) || 0, line.quantity));
  }
  const all = [...merged].map(([id, quantity]) => ({ id, quantity }));
  const matchedTasks = all.slice(0, TASK_CAP);

  const metalRaw = str(payload.metalType).toLowerCase();
  const metalType = ['gold', 'silver', 'platinum', 'costume'].includes(metalRaw) ? metalRaw : '';
  const sizeChange = Number(payload.sizeChange);

  return {
    metalType,
    karat: applyDefaultPurity(metalType, normalizeKaratValue(payload.karat)),
    // Gold with no colour said is yellow (owner, 2026-11-09; 5 of 5 logged intakes were corrected to yellow).
    goldColor: normalizeGoldColor(payload.goldColor) || (metalType === 'gold' && !str(payload.goldColor) ? 'yellow' : ''),
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
  return { ...roles, problems };
}

/** The up-to-3mm sibling of a 3-to-5mm task, or null. */
export function narrowSiblingOf(task, tasks = []) {
  if (!task || !WIDE_BAND.test(titleOf(task))) return null;
  const siblings = tasks.filter((t) => NARROW_BAND.test(titleOf(t)) && familyOf(t) === familyOf(task)
    && String(restricted(t) ? t.metals : '') === String(restricted(task) ? task.metals : ''));
  return siblings.length === 1 ? siblings[0] : null;
}

/* ----------------------------------------------------------- what was said */

const STONE_WORDS = '(?:stones?|diamonds?|round|cz|pearls?|sapphires?|rub(?:y|ies)|emeralds?|opals?|moissanites?|cabochons?|beads?|balls?|jump|links?|chains?|rope|cable|box|curb|wire)';
/**
 * Did the intake say the shank is wide? A stated width over 3mm ("5 mm band", "4 millimeter shank", "5x2"), or the
 * word for it next to the band. "6mm stone" and "heavy wear on the prongs" are not about the shank (review, 2026-11-09).
 */
export const statesWideShank = (...texts) => {
  const text = texts.map((t) => str(t).toLowerCase()).join(' . ');
  const widths = [...text.matchAll(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:x\\s*\\d+(?:\\.\\d+)?\\s*)?(?:mm|millimet(?:er|re)s?)\\b(?!\\s*${STONE_WORDS})`, 'g'))]
    .map((m) => Number(m[1]));
  if (widths.some((w) => w > 3 && w <= 12)) return true;
  return /\b(?:wide|thick|chunky)\s+(?:\w+\s+)?(?:band|shank|ring)\b/.test(text)
    || /\b(?:band|shank|ring)\s+is\s+(?:\w+\s+)?(?:wide|thick|chunky)\b/.test(text);
};

const NUMBER_WORDS = { two: 2, both: 2, three: 3, four: 4, five: 5, six: 6 };
const PIECE_NOUNS = '(?:rings?|bands?|chains?|bracelets?|pendants?|necklaces?|pieces?|items?)';
/**
 * How many pieces the sentence says are on this job: "2 rings", "two rings", "both rings", "all 3". 1 when it does
 * not say. A backstop for the model's own `pieceCount`, so "2 rings" never depends on the model alone.
 */
export const statedPieceCount = (inputText = '') => {
  const text = str(inputText).toLowerCase();
  const found = [];
  // The count must sit right against the noun, with only words that DESCRIBE the piece in between ("two white gold
  // rings"). Anything else in between means the number counts something else: "retip 4 prongs on a ring" is four
  // prongs, "two jump rings" is two jump rings. And the number must be a whole number of its own — the "5" in
  // "size 7.5 ring" is half a size, not five rings (Codex review of #344, 2026-11-09: both inflated every quantity).
  const DESCRIBES = '(?:white|yellow|rose|gold|silver|sterling|platinum|plat|wg|yg|rg|wedding|engagement|matching|stacking|plain|diamond|mens|ladies|\\d{2}k|\\d{2}-?karat)';
  for (const m of text.matchAll(new RegExp(`(?<![\\d.])(\\d{1,2}|two|both|three|four|five|six)\\s+(?:${DESCRIBES}\\s+){0,4}${PIECE_NOUNS}\\b`, 'g'))) {
    // "size 8 ring", "to a 6 ring": a size in front of a noun is not a count.
    if (/(?:size|sz|to|a)\s*$/.test(text.slice(Math.max(0, m.index - 6), m.index))) continue;
    found.push(NUMBER_WORDS[m[1]] || Number(m[1]));
  }
  const all = text.match(/\ball\s+(\d{1,2}|two|three|four|five|six)\b/);
  if (all) found.push(NUMBER_WORDS[all[1]] || Number(all[1]));
  const n = Math.max(1, ...found.filter((x) => Number.isFinite(x)));
  return n <= MAX_PIECES ? n : 1;
};

/* ----------------------------------------------------------------- rulings */

const byIdOf = (tasks) => new Map(tasks.map((t) => [String(t.id), t]));
const withLines = (parsed, matchedTasks) => ({ ...parsed, matchedTasks, matchedTaskIds: matchedTasks.map((m) => m.id) });
const warn = (parsed, message) => ({ ...parsed, warnings: [...(parsed.warnings || []), message] });

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
  return dropped ? warn(withLines(parsed, known), `Dropped ${dropped} task${dropped > 1 ? 's' : ''} the catalog does not have.`) : parsed;
};

/**
 * Sizes that move ARE a sizing job. "Going up two sizes from 5 to a 7" came back with sizing stock and no task
 * (owner's screenshot, 2026-11-09). When no sizing task was matched, add the standard one: Size Down, or the
 * up-to-3mm Size Up. The form's metal alignment swaps in the platinum task afterwards.
 */
export const withSizingTaskForSizes = (parsed, tasks = []) => {
  const moved = sizesMoved(parsed);
  if (!moved) return parsed;
  const byId = byIdOf(tasks);
  const matched = parsed.matchedTasks || [];
  if (matched.some((m) => isSizing(byId.get(m.id)))) return parsed;
  const roles = taskRoles(tasks);
  const pick = moved < 0 ? roles.sizeDown : roles.sizeUp;
  if (!pick) return parsed;
  return warn(withLines(parsed, [{ id: String(pick.id), quantity: 1 }, ...matched]), `Added "${pick.title}": the ring changes size.`);
};

/**
 * A ring is 3x2mm unless the intake says otherwise (owner, 2026-11-09: "Default ring mm is always 3x2 unless specified
 * 3-5"). A matched 3-to-5mm task becomes its up-to-3mm sibling when no wide shank was stated — in the sentence OR the
 * item description.
 */
export const withDefaultShankWidth = (parsed, tasks = [], inputText = '', description = '') => {
  if (statesWideShank(inputText, description)) return parsed;
  const byId = byIdOf(tasks);
  let swapped = '';
  const lines = (parsed.matchedTasks || []).map((m) => {
    const narrow = narrowSiblingOf(byId.get(m.id), tasks);
    if (!narrow) return m;
    swapped = narrow.title;
    return { ...m, id: String(narrow.id) };
  });
  if (!swapped) return parsed;
  // The swap can land on a task that is already on the ticket.
  const merged = new Map();
  for (const l of lines) merged.set(l.id, Math.max(merged.get(l.id) || 0, l.quantity));
  return warn(withLines(parsed, [...merged].map(([id, quantity]) => ({ id, quantity }))), `Used "${swapped}": no wide shank was stated.`);
};

/**
 * Several pieces on one job (owner, 2026-11-09: "If there are 2 rings then there are 2x task and 2x materials. Each
 * ring gets a task and a material."). The piece count is the larger of what the model returned and what the sentence
 * plainly says. Every task is done once per piece, so a quantity below the piece count is raised to it; a per-unit
 * count already above it ("retip 4 prongs each" = 8) is left alone.
 *
 * Solder Together is the exception (owner, 2026-11-09: "2 rings is 1x task. 3 rings is 2x tasks"): its quantity is
 * the number of joins, rings − 1, and the joined rings are then ONE piece for everything else on the ticket.
 */
export const withPieceCount = (parsed, tasks = [], inputText = '') => {
  const pieces = Math.max(Number(parsed.pieceCount) || 1, statedPieceCount(inputText));
  const byId = byIdOf(tasks);
  const matched = parsed.matchedTasks || [];
  const solder = matched.find((m) => isSolderTogether(byId.get(m.id)));
  if (solder) {
    const joins = pieces >= 2 ? pieces - 1 : solder.quantity;
    const lines = matched.map((m) => (m === solder ? { ...m, quantity: joins } : m));
    return { ...withLines(parsed, lines), pieceCount: pieces, pieces: 1 };
  }
  if (pieces <= 1) return { ...parsed, pieceCount: 1, pieces: 1 };
  const lines = matched.map((m) => ({ ...m, quantity: Math.max(m.quantity, pieces) }));
  return warn({ ...withLines(parsed, lines), pieceCount: pieces, pieces }, `${pieces} pieces: each task and material is counted ${pieces} times.`);
};

/**
 * Every white gold job gets rhodium (owner, 2026-11-09: "yes all white gold get rhodium"). The Rhodium Plating task's
 * own aiMeta only says "turned yellow or dull, or the customer asks", so the model left it off. One per piece: 14
 * prongs retipped on one ring is one rhodium, not fourteen (review, 2026-11-09).
 */
export const withRhodiumForWhiteGold = (parsed, tasks = []) => {
  if (parsed?.metalType !== 'gold' || parsed?.goldColor !== 'white') return parsed;
  const { rhodium } = taskRoles(tasks);
  const matched = parsed.matchedTasks || [];
  if (!rhodium || !matched.length || matched.some((m) => m.id === String(rhodium.id))) return parsed;
  const byId = byIdOf(tasks);
  // Without a piece count on the answer (older callers), a sizing task's quantity is one for certain: sizing is x1 per ring.
  const sizing = matched.find((m) => isSizing(byId.get(m.id)));
  const quantity = parsed.pieces || (sizing ? sizing.quantity : 1);
  return warn(withLines(parsed, [...matched, { id: String(rhodium.id), quantity }]), `Added "${rhodium.title}": white gold.`);
};

/**
 * Sizing stock, computed — never taken from the model (review, 2026-11-09: its arithmetic went straight onto the
 * ticket). Owner, 2026-11-09: "1.25 sizes is charged as 2" and "2 sizes up is 1x task and 1x sizing stock material":
 * the size-up task covers the first size, and stock is the sizes moved, rounded UP, minus one — per piece. None when
 * the ring goes down, when the customer supplies the gold, or when no size-up task is on the ticket.
 */
export const withSizingStock = (parsed, tasks = []) => {
  const byId = byIdOf(tasks);
  const sizeUp = (parsed.matchedTasks || []).map((m) => byId.get(m.id)).find((t) => t && isSizeUp(t));
  const moved = sizesMoved(parsed);
  const perPiece = sizeUp && !isCustomerGold(sizeUp) && moved > 1 ? Math.ceil(moved) - 1 : 0;
  const quantity = perPiece * (parsed.pieces || 1);
  return {
    ...parsed,
    materialHints: quantity > 0
      ? [{ type: 'sizing_material', quantity, reason: `Sizing up ${moved} size${moved === 1 ? '' : 's'}: the task covers the first, stock covers the rest.` }]
      : [],
  };
};

/**
 * The model's raw answer → what the form is told. Order matters: the sizing task first (so the width default and
 * rhodium see it), the piece count before rhodium and stock (they are per piece).
 */
export function decideIntake(raw, { tasks = [], inputText = '', description = '' } = {}) {
  let p = normalizeParsedPayload(raw || {});
  if (p.overCap > 0) p = warn(p, `More than ${TASK_CAP} jobs: only the first ${TASK_CAP} were kept — add the rest by hand.`);
  p = withKnownTasksOnly(p, tasks);
  p = withSizingTaskForSizes(p, tasks);
  p = withDefaultShankWidth(p, tasks, inputText, description);
  p = withPieceCount(p, tasks, inputText);
  p = withRhodiumForWhiteGold(p, tasks);
  p = withSizingStock(p, tasks);
  const { overCap: _overCap, pieces: _pieces, ...out } = p;
  return { ...out, warnings: p.warnings || [] };
}

/* ------------------------------------------------------------------ prompt */

export const prefilterTasks = (inputText, tasks, limit = 15) => {
  const words = inputText.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  if (!words.length) return tasks.slice(0, limit);
  const scored = tasks.map((t) => {
    const haystack = [t.title, ...(t.symptoms || []), t.whenToUse || ''].join(' ').toLowerCase();
    return { task: t, score: words.filter((w) => haystack.includes(w)).length };
  });
  const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.task);
  return matched.length > 0 ? matched : tasks.slice(0, limit);
};

/**
 * Which tasks the model gets to choose from: the whole catalog while it is small enough to send. The keyword prefilter
 * hid real answers — across the saved typed intakes logged 2026-10-02 to 11-06, 11 of the 94 tasks on the finished
 * tickets were never shown to the model ("11.5 to 9" shares no word with "Size Down"). It stays only for a catalog
 * too big to send.
 */
export const FULL_CATALOG_LIMIT = 80;
export const tasksForPrompt = (inputText, tasks = []) => (
  tasks.length <= FULL_CATALOG_LIMIT ? tasks : prefilterTasks(inputText, tasks, 40)
);

/** The prompt, built in one place so the route and the replay send exactly the same words. */
export function buildIntakePrompt({ inputText, description = '', tasks = [], todayIso }) {
  const offered = tasks.length > 0 ? tasksForPrompt(inputText, tasks) : [];
  const taskList = offered.map((t) => (
    `- id:${t.id} | title:"${t.title}"`
    + (restricted(t) ? ` | onlyForMetals:${JSON.stringify(t.metals)}` : '')
    + (t.symptoms?.length ? ` | symptoms:${JSON.stringify(t.symptoms)}` : '')
    + (t.whenToUse ? ` | whenToUse:"${t.whenToUse}"` : '')
    + (t.neverUseWhen ? ` | neverUseWhen:"${t.neverUseWhen}"` : '')
  )).join('\n');

  return [
    'You turn a jeweler\'s repair intake note into structured data for a repair ticket. The note is shop shorthand, typed or dictated by the jeweler at the counter — not a customer talking.',
    'The item can be any jewelry: ring, pendant, necklace, bracelet, chain, earrings, watch, brooch.',
    `Today is ${todayIso}.`,
    '',
    'Return ONLY a JSON object with exactly these keys:',
    '{',
    '  "metalType": "gold" | "silver" | "platinum" | "costume" | "",',
    '  "karat": "",            // "10k", "14k", "18k"; "925" for silver, "950" for platinum unless another purity is said',
    '  "goldColor": "yellow" | "white" | "rose" | "",',
    '  "isRing": false,        // true only for a ring or band',
    '  "currentRingSize": "",  // a number as text, e.g. "7.5"; "" when not said',
    '  "desiredRingSize": "",',
    '  "sizeChange": 0,        // sizes moved when only the change is said: "size up 2 sizes" = 2, "down a half size" = -0.5; else 0',
    '  "pieceCount": 1,        // how many separate pieces of jewelry are on this job',
    '  "promiseDate": "",      // YYYY-MM-DD only when a due date is said; else ""',
    '  "normalizedSummary": "",',
    `  "matchedTasks": [{"id": "", "quantity": 1}]   // from the task list below; at most ${TASK_CAP}`,
    '}',
    '',
    'Reading the note:',
    '- Shorthand: yg/wg/rg = yellow/white/rose gold; kt, karat = k; sz = size; plat, pt = platinum; ss, sterling = silver.',
    '- Metal, karat and color: report what is said. Do not guess a color that is not said.',
    '- Sizes: "from 11.5 to 9", "7.25 needs to be 6.75", "going from a 5 to a 7" give both sizes. "size 7, down 3 sizes" means 7 to 4: do the arithmetic and fill both. Fill sizes only for a ring.',
    '- A count of pieces is never a ring size: "size all 3 to a 6" is 3 pieces going to size 6, with the current size unknown. "2 rings", "both rings", "all 3" set pieceCount. A pair of earrings is one piece unless the note counts them.',
    '- promiseDate: only from words about when it is due ("by Friday", "ready 11/20"). A fraction or a carat weight ("1/2 ct") is never a date.',
    ...(taskList ? [
      '',
      'Choosing tasks:',
      '- One task per distinct job in the note. Cover every job: "size down, tighten, retip" is three tasks.',
      '- The TITLE says what the work is. symptoms and whenToUse were written as examples of a customer talking and are often narrower than the task: when the note names the work in the title ("laser weld", "set stone", "clean and polish"), choose that task on any kind of jewelry, even if whenToUse describes a different situation.',
      '- Two different ring sizes are a sizing job even when the word "size" is missing.',
      '- quantity: for work priced per unit (per prong, per stone, per weld, per link, per jump ring) it is the count said — "retip 14 prongs" is quantity 14, "3 laser welds" is 3, "set three stones" is the set-stone task with quantity 3. A sizing task is quantity 1 per ring, however many sizes it moves. When no count is said, 1.',
      '- When a task comes in shank-width bands and the note states no width, pick the narrowest band.',
      '- A task with onlyForMetals may be chosen only for that metal, and for that metal it is preferred over the general one.',
      '- neverUseWhen applies only when its condition is stated in the note. Never skip a job because the ideal task is not listed: pick the closest listed task.',
      '- Use only ids from the list. If nothing fits a job, leave it out.',
      '',
      'Tasks:',
      taskList,
    ] : []),
    '',
    `Note: ${inputText}`,
    description ? `Item description: ${description}` : '',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}
