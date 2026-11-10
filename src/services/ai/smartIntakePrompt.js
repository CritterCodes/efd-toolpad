/**
 * Smart intake: what the model is sent. The rulings that decide what happens to its answer are in smartIntakeRules.js.
 * Built in one place so the route and the replay send exactly the same words.
 */
import { TASK_CAP } from './smartIntakeLimits';

const restricted = (t) => Array.isArray(t?.metals) && t.metals.length > 0;

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

/**
 * What the model is shown in place of a task's database id: its title as a slug ("sizing-beads"), in list order.
 *
 * The model has to copy an id back. Shown 24-character database ids that differ by a character or two, it blended two
 * neighbours — "…5763…12" (Solder Together) and "…5766…13" (Sizing Beads) came back as "…5763…13", an id no task has —
 * so Sizing Beads was dropped every single time it was asked for (made-up notes, 2026-11-10: 0 of 10). A key made of
 * the task's own name cannot be blended into another's. ("T1", "T2"… were tried first and fixed it too, but moved
 * three real tickets; the slug moved none on balance.) Two tasks with one title get "-2", "-3".
 */
export const taskKeys = (tasks = []) => {
  const seen = new Map();
  return tasks.map((t, i) => {
    const base = String(t?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `task-${i + 1}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base}-${n}` : base;
  });
};

/** The model's answer with its task keys turned back into task ids. Anything that is not a key is left as it is. */
export function withTaskIds(raw, tasks = []) {
  if (!raw || !Array.isArray(raw.matchedTasks)) return raw;
  const keys = taskKeys(tasks);
  const idOf = new Map(tasks.map((t, i) => [keys[i], String(t?.id || '')]));
  return {
    ...raw,
    matchedTasks: raw.matchedTasks.map((m) => {
      const key = String(m?.id ?? '').trim().toLowerCase();
      return m && typeof m === 'object' && idOf.has(key) ? { ...m, id: idOf.get(key) } : m;
    }),
  };
}

/** The prompt, built in one place so the route and the replay send exactly the same words. */
export function buildIntakePrompt({ inputText, description = '', tasks = [], todayIso }) {
  const offered = tasks.length > 0 ? tasksForPrompt(inputText, tasks) : [];
  const keys = taskKeys(tasks);
  const keyOf = new Map(tasks.map((t, i) => [t, keys[i]]));
  const taskList = offered.map((t) => (
    `- id:${keyOf.get(t)} | title:"${t.title}"`
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
    `  "matchedTasks": [{"id": "", "quantity": 1}]   // the id is a task's id from the list below, copied exactly; at most ${TASK_CAP}`,
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
      '- If the note names no work to do, return an empty matchedTasks. Never guess a job from the metal or the kind of piece alone.',
      '',
      'Tasks:',
      taskList,
    ] : []),
    '',
    `Note: ${inputText}`,
    description ? `How the piece looks (written from a photo — use it only to tell what kind of piece it is; NEVER take the metal, karat, color, sizes or any work from it): ${description}` : '',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

/**
 * A fingerprint of everything the model is sent except the note itself: every word of the instructions, and the task
 * list. ONE function for the route (which logs it with each read) and the replay (which holds the stored answers to
 * it) — two formulas could never be compared (review, 2026-11-10). Returns the text to hash; each caller takes sha256 of it and keeps 12 hex characters.
 */
export function intakePromptFingerprint(tasks = []) {
  return buildIntakePrompt({ inputText: 'NOTE', description: 'DESCRIPTION', tasks, todayIso: 'TODAY' });
}
