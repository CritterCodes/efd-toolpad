import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiRefusal } from '@/lib/aiAccess';
import { recordIntakeSuggestion } from '@/services/ai/smartIntakeLog';
import { aiErrorMessage, userFacingAiError, SMART_INTAKE_FALLBACK } from '@/services/ai/aiErrorMessage';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_SMART_INTAKE_MAX_OUTPUT_TOKENS || 8000);

const extractGeminiText = (payload = {}) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '').trim()).filter(Boolean).join('\n').trim();
};

const extractFirstJsonObject = (raw = '') => {
  const text = String(raw || '').trim();
  if (!text) return null;
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try { return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)); } catch { return null; }
};

const normalizeIsoDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

/**
 * Karat/purity → the exact vocabulary the form's Select uses ('14k', '925',
 * '950'…). Gemini answers in free text ("14K", "14 kt"); anything that doesn't
 * normalize cleanly becomes '' rather than a value the Select can't render —
 * a silently blank field is how a 14k price gets charged on an 18k ring.
 */
export const normalizeKaratValue = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) return '';
  if (/^\d{3}$/.test(raw)) return raw;            // 925 / 950 / 999
  const m = raw.match(/^(\d{1,2})k?t?$/);          // 14, 14k, 14kt
  return m ? `${m[1]}k` : '';
};

/**
 * Silver and platinum carry their purity in the NAME, so nobody says it out loud.
 *
 * "Sterling silver ring, size to 7.5" states no karat, so the model returns `karat: ""` — and an
 * empty karat is exactly what `metalKey` refuses: for any metal but gold it returns null, which the
 * engine reports as METAL_REQUIRED. So every silver job parsed by smart intake reached the pricing
 * step and said "Choose a metal to price this", with the metal already filled in (owner, 2026-10-12).
 *
 * A jeweller saying "silver" means sterling, and "platinum" means 950 — which is what intake's own
 * Select offers, and what the stock is filed under. Filling that in is not a guess about the piece;
 * it is the trade's default spelled out.
 *
 * ONLY when the field came back empty. A stated 999 or 900 is left exactly as stated — the whole
 * point is to stop refusing to price, never to overwrite what somebody said.
 */
const DEFAULT_PURITY = Object.freeze({ silver: '925', platinum: '950' });

export const applyDefaultPurity = (metalType, karat) => (
  karat ? karat : (DEFAULT_PURITY[metalType] || karat)
);

export const normalizeParsedPayload = (payload = {}) => {
  const normalizeString = (value) => String(value || '').trim();
  const normalizeEnum = (value, allowed = []) => {
    const normalized = normalizeString(value).toLowerCase();
    return allowed.includes(normalized) ? normalized : '';
  };
  const toBool = (value) => {
    if (typeof value === 'boolean') return value;
    const normalized = normalizeString(value).toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
    return null;
  };
  const taskHints = Array.isArray(payload.taskHints)
    ? payload.taskHints.map((item) => normalizeString(item)).filter(Boolean).slice(0, 5)
    : [];
  const confidence = Math.min(1, Math.max(0, Number(payload.confidence || 0)));
  // matchedTasks carries per-task QUANTITY ("retip 14 prongs" = the retip task
  // x14 -- per-unit tasks price per prong/stone/link, so a dropped count is a
  // silently wrong invoice). matchedTaskIds kept for backward compatibility.
  const matchedTasks = Array.isArray(payload.matchedTasks)
    ? payload.matchedTasks
        .map((item) => ({
          id: normalizeString(item?.id),
          quantity: Math.min(99, Math.max(1, Math.round(Number(item?.quantity) || 1))),
        }))
        .filter((item) => item.id)
        .slice(0, 3)
    : [];
  const matchedTaskIds = matchedTasks.length
    ? matchedTasks.map((item) => item.id)
    : (Array.isArray(payload.matchedTaskIds)
        ? payload.matchedTaskIds.map(s => String(s || '').trim()).filter(Boolean).slice(0, 3)
        : []);
  const materialHints = Array.isArray(payload.materialHints)
    ? payload.materialHints.map((item) => ({
        type: normalizeString(item?.type || item?.name).toLowerCase().replace(/\s+/g, '_'),
        quantity: Math.max(0, Number(item?.quantity || 0)),
        reason: normalizeString(item?.reason)
      }))
      // Sizing stock is charged by the whole size, rounded up (owner, 2026-11-09: "1.25 sizes is charged as 2").
      // The model kept answering 0.25 / 0.5 / 0.75, which put a fraction of a piece of stock on the ticket.
      .map((item) => (item.type === 'sizing_material' ? { ...item, quantity: Math.ceil(item.quantity) } : item))
      .filter((item) => item.type && item.quantity > 0).slice(0, 3)
    : [];

  const metalType = normalizeEnum(payload.metalType, ['gold', 'silver', 'platinum', 'costume']);

  return {
    metalType,
    karat: applyDefaultPurity(metalType, normalizeKaratValue(payload.karat)),
    // Gold with no colour said is yellow (owner, 2026-11-09; 5 of 5 logged intakes were corrected to yellow).
    goldColor: normalizeEnum(payload.goldColor, ['yellow', 'white', 'rose']) || (metalType === 'gold' ? 'yellow' : ''),
    isRing: toBool(payload.isRing),
    currentRingSize: normalizeString(payload.currentRingSize),
    desiredRingSize: normalizeString(payload.desiredRingSize),
    promiseDate: normalizeIsoDate(payload.promiseDate),
    taskHints,
    materialHints,
    normalizedSummary: normalizeString(payload.normalizedSummary),
    confidence,
    matchedTaskIds,
    matchedTasks: matchedTasks.length ? matchedTasks : matchedTaskIds.map((id) => ({ id, quantity: 1 }))
  };
};

/**
 * Every white gold job gets rhodium (owner, 2026-11-09: "yes all white gold get rhodium"). The Rhodium Plating task's
 * own aiMeta only says "turned yellow or dull, or the customer asks", so the model left it off 4 logged white-gold jobs.
 * Deterministic: the prompt asks for it, this guarantees it. Added past the 3-task cap, with the piece count the other
 * jobs carry when they all agree ("2 rings" = rhodium x2), otherwise 1.
 */
export const withRhodiumForWhiteGold = (parsed, tasks = []) => {
  if (parsed?.metalType !== 'gold' || parsed?.goldColor !== 'white') return parsed;
  const rhodium = tasks.find((t) => /rhodium/i.test(String(t?.title || '')));
  const matched = parsed.matchedTasks || [];
  if (!rhodium || !matched.length || matched.some((m) => m.id === String(rhodium.id))) return parsed;
  const quantities = [...new Set(matched.map((m) => m.quantity))];
  const next = [...matched, { id: String(rhodium.id), quantity: quantities.length === 1 ? quantities[0] : 1 }];
  return { ...parsed, matchedTasks: next, matchedTaskIds: next.map((m) => m.id) };
};

const titleOf = (t) => String(t?.title || '').toLowerCase();
const WIDE_BAND = /3\s*(?:mm)?\s*to\s*5\s*mm/;
const NARROW_BAND = /up to 3\s*mm/;
/** A task title with its width band and filler removed, so "Size Up - 3mm to 5mm shanks" and "Size up (1 size) - up to 3mm x 2 mm shank" compare equal. */
const familyOf = (t) => titleOf(t)
  .replace(WIDE_BAND, '').replace(NARROW_BAND, '').replace(/\(1 size\)|x\s*2\s*mm|shanks?/g, '')
  .replace(/[^a-z]+/g, ' ').trim();
/** Did the intake say the shank is wide? A stated width over 3mm, or the word for it. */
export const statesWideShank = (inputText = '') => {
  const text = String(inputText).toLowerCase();
  const widths = [...text.matchAll(/(\d+(?:\.\d+)?)\s*mm/g)].map((m) => Number(m[1]));
  return widths.some((w) => w > 3) || /\b(wide|thick|heavy|chunky)\b/.test(text);
};

/**
 * A ring is 3x2mm unless the intake says otherwise (owner, 2026-11-09: "Default ring mm is always 3x2 unless specified
 * 3-5"). A matched 3-to-5mm task becomes its up-to-3mm sibling when no wide shank was stated.
 */
export const withDefaultShankWidth = (parsed, tasks = [], inputText = '') => {
  if (statesWideShank(inputText)) return parsed;
  const byId = new Map(tasks.map((t) => [String(t.id), t]));
  const matchedTasks = (parsed.matchedTasks || []).map((m) => {
    const task = byId.get(m.id);
    if (!task || !WIDE_BAND.test(titleOf(task))) return m;
    const narrow = tasks.find((t) => NARROW_BAND.test(titleOf(t)) && familyOf(t) === familyOf(task));
    return narrow ? { ...m, id: String(narrow.id) } : m;
  });
  return { ...parsed, matchedTasks, matchedTaskIds: matchedTasks.map((m) => m.id) };
};

/**
 * Two ring sizes ARE a sizing job. "Going up two sizes from 5 to a 7" came back with sizing stock and no task
 * (owner's screenshot, 2026-11-09). When the sizes move and no sizing task was matched, add the standard one:
 * Size Down, or the up-to-3mm Size Up. The form's metal alignment swaps in the platinum task afterwards.
 */
export const withSizingTaskForSizes = (parsed, tasks = []) => {
  const from = Number.parseFloat(parsed.currentRingSize);
  const to = Number.parseFloat(parsed.desiredRingSize);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return parsed;
  const byId = new Map(tasks.map((t) => [String(t.id), t]));
  const matched = parsed.matchedTasks || [];
  const isSizing = (t) => /\bsiz(e|ing)\b/.test(titleOf(t)) && !/bead/.test(titleOf(t));
  if (matched.some((m) => isSizing(byId.get(m.id)))) return parsed;
  const standard = tasks.filter((t) => !/platinum|customer|bead/.test(titleOf(t)) && !(Array.isArray(t.metals) && t.metals.length));
  const pick = to < from
    ? standard.find((t) => /size down/.test(titleOf(t)))
    : (standard.find((t) => /size up/.test(titleOf(t)) && NARROW_BAND.test(titleOf(t))) || standard.find((t) => /size up/.test(titleOf(t))));
  if (!pick) return parsed;
  const matchedTasks = [{ id: String(pick.id), quantity: 1 }, ...matched];
  return { ...parsed, matchedTasks, matchedTaskIds: matchedTasks.map((m) => m.id) };
};

export const prefilterTasks = (inputText, tasks, limit = 15) => {
  const words = inputText.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  if (!words.length) return tasks.slice(0, limit);
  const scored = tasks.map(t => {
    const haystack = [t.title, ...(t.symptoms || []), t.whenToUse || ''].join(' ').toLowerCase();
    const score = words.filter(w => haystack.includes(w)).length;
    return { task: t, score };
  });
  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.task);
  return matched.length > 0 ? matched : tasks.slice(0, limit);
};

/**
 * Which tasks the model gets to choose from. The whole catalog when it is small enough to send.
 *
 * The keyword prefilter hid real answers: across the 77 saved text intakes logged 2026-10-02 to 11-06, 11 of the 94
 * tasks on the finished tickets were never shown to the model. "11.5 to 9" has no word in common with "Size Down",
 * "laser-welded" isn't "laser weld", "tips" isn't inside "retip". The live catalog is 32 tasks, which costs a few
 * hundred tokens to send whole. The prefilter stays only for a catalog too big to send.
 */
export const FULL_CATALOG_LIMIT = 80;
export const tasksForPrompt = (inputText, tasks = []) => (
  tasks.length <= FULL_CATALOG_LIMIT ? tasks : prefilterTasks(inputText, tasks, 40)
);

/** The prompt, built in one place so the route and the replay of logged intakes send exactly the same words. */
export function buildIntakePrompt({ inputText, description = '', tasks = [], todayIso }) {
  const relevantTasks = tasks.length > 0 ? tasksForPrompt(inputText, tasks) : [];
  const taskListText = relevantTasks.length > 0
    ? relevantTasks.map(t =>
        `- id:${t.id} | title:"${t.title}"` +
        (Array.isArray(t.metals) && t.metals.length ? ` | onlyForMetals:${JSON.stringify(t.metals)}` : '') +
        (t.symptoms?.length ? ` | symptoms:${JSON.stringify(t.symptoms)}` : '') +
        (t.whenToUse ? ` | whenToUse:"${t.whenToUse}"` : '') +
        (t.neverUseWhen ? ` | neverUseWhen:"${t.neverUseWhen}"` : '')
      ).join('\n')
    : '';

  return [
    'You are parsing jewelry repair intake text into structured data for form autofill.',
    'The item could be ANY type of jewelry: ring, pendant, necklace, bracelet, chain, earring, watch, brooch, anklet, cufflinks, etc.',
    'Extract only what is explicitly present in the text and description.',
    `Current date: ${todayIso}`,
    'Return ONLY valid JSON with this exact shape:',
    '{',
    '  "metalType": "gold|silver|platinum|costume|",',
    '  "karat": "",',
    '  "goldColor": "yellow|white|rose|",',
    '  "isRing": false,',
    '  "currentRingSize": "",',
    '  "desiredRingSize": "",',
    '  "promiseDate": "YYYY-MM-DD|",',
    '  "taskHints": ["solder", "polish"],',
    '  "materialHints": [{"type":"sizing_material","quantity":1,"reason":""}],',
    '  "normalizedSummary": "",',
    '  "confidence": 0.0,',
    '  "matchedTasks": [{"id":"", "quantity": 1}]',
    '}',
    ...(taskListText ? [
      '',
      'You are also given the list of available repair tasks. Identify which tasks (by id) best match the repair described (up to 3 tasks maximum), each with a quantity.',
      'QUANTITY: for tasks priced per unit (per prong, per stone, per link, per item), quantity is the stated count -- "retip 14 prongs" means the retip task with quantity 14. Sizing tasks are ALWAYS quantity 1 no matter how many sizes the ring moves. When no count is stated, quantity is 1.',
      'SEVERAL PIECES: "2 rings", "both rings", "all 3", "a pair of earrings" is a count of PIECES, not a size or a stone count. Every job done to each piece gets that quantity ("size all 3 to a 6" = the sizing task x3; "2 rings, size down and rhodium" = sizing x2 and rhodium x2). A piece count is never a ring size: "size all 3 to a 6" has no current size, so currentRingSize stays empty.',
      'COVER EVERY JOB: the intake may describe several jobs ("size down, tighten, retip") -- return one matched task per distinct job, not just the most prominent one.',
      'SIZE WITH NO WORD "SIZE": two ring sizes are a sizing job even when the word size is missing -- "7.25 needs to be 6.75" and "from 11.5 to 9" are a size down; "going from a 5 to a 7" is a size up.',
      'SHANK WIDTH: when a sizing or shank task comes in width bands (e.g. "up to 3mm" and "3mm to 5mm") and no width is stated, pick the narrowest band.',
      'A neverUseWhen exclusion applies ONLY when its condition is explicitly stated in the intake text. Do not exclude a task on inference, and do not skip a job because the ideal specialized task is not in the list -- pick the closest listed task instead.',
      'Use the symptoms, whenToUse, and neverUseWhen fields to decide. Return their ids in "matchedTaskIds". If no task clearly matches, return an empty array.',
      'A task with onlyForMetals must ONLY be matched when the item is that metal — and when the item IS that metal, prefer the onlyForMetals task over a generic one (e.g. a platinum ring gets the platinum sizing task, never the standard soldered one).',
      '',
      'Available tasks:',
      taskListText,
    ] : []),
    '',
    'Rules:',
    '- CRITICAL: isRing must be true ONLY if the item is explicitly a ring or band. For pendants, necklaces, bracelets, chains, earrings, watches, brooches, or any non-ring item, isRing must be false.',
    '- Jeweler shorthand: yg/wg/rg = yellow/white/rose gold; "14kt"/"14 kt" = karat 14k; sz = size; plat/pt = platinum; ss = sterling silver.',
    '- PURITY FOR SILVER AND PLATINUM: these carry it in the name, so it is rarely said out loud. Unless a different purity is stated, silver means karat "925" and platinum means karat "950". Fill it in — a blank karat cannot be priced.',
    '- RELATIVE SIZING: "size 7 ... size down 3 sizes" means currentRingSize 7 and desiredRingSize 4 (7 - 3). "size up 2 sizes from 5" means 5 -> 7. Always resolve the arithmetic and fill BOTH sizes when the starting size is stated.',
    '- currentRingSize and desiredRingSize should ONLY be set if the item is a ring.',
    '- promiseDate must be YYYY-MM-DD. Resolve relative dates like "next friday" against the current date. If no due/promise date is stated, use an empty string.',
    '- taskHints should be SHORT keywords that describe repair work.',
    '- materialHints should only be used when the intake clearly implies extra material beyond the base task.',
    '- For ring sizing, the base sizing task covers 1 size. Sizing stock is charged by the WHOLE size, rounded UP: 1.25 sizes counts as 2. If the ring is being sized UP by more than 1 size, add a sizing_material hint with quantity = (sizes moved, rounded up) - 1. Examples: 7 to 9 => 1. 7 to 8.5 => 1. 4.75 to 6 => 1. 8.5 to 12.25 => 3. Never a fraction.',
    '- WHITE GOLD: every white gold job also gets the rhodium plating task when one is listed, whether or not rhodium is mentioned.',
    '- GOLD COLOR: gold with no color stated is yellow.',
    '- Do not add materialHints for size-down work unless material is explicitly mentioned.',
    '- Ring examples: "resize", "size up", "size down", "resize with stones", "size with accent stones", "retip", "prong", "setting"',
    '- Non-ring examples: "solder", "chain repair", "clasp repair", "restring", "clean", "polish", "stone replace", "weld", "refinish", "replating"',
    '- If the ring has accent stones and a stones-aware sizing task EXISTS IN THE LIST (e.g. "Ring Sizing with Stones"), prefer it; when no such task is listed, use the standard sizing task -- never skip the sizing job.',
    '- taskHints must be generic repair terms that could match task names like "Ring Sizing", "Ring Sizing with Stones", "Retip Setting", "Stone Setting", "Cleaning & Polishing", "Chain Repair", "Clasp Repair"',
    '- Return 1-3 task hints, NOT full task names',
    '- confidence must be between 0 and 1 (1.0 = very confident in parsing)',
    '- Use empty strings or empty arrays for unknown values.',
    '- Do not include markdown fences or extra commentary.',
    `Input text: ${inputText}`,
    description ? `Item description: ${description}` : ''
  ].filter(Boolean).join('\n');
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const callGemini = async ({ apiKey, prompt }) => {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              topP: 0.9,
              maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
              responseMimeType: 'application/json'
            }
          }),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }
    const payload = await response.json();
    if (response.ok) return payload;
    console.error('[parse-smart-intake] Gemini error status:', response.status, 'body:', JSON.stringify(payload));
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10);
      const delay = retryAfter > 0 ? retryAfter * 1000 : BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delay);
      continue;
    }
    if (response.status === 429) {
      throw userFacingAiError('AI is temporarily rate limited. Please wait a moment and try again.', { status: 429 });
    }
    throw new Error(payload?.error?.message || 'Gemini request failed');
  }
};

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    // Only the accounts that can open the page using it (OPEN-QUESTIONS Q11, owner 2026-10-01).
    const refused = aiRefusal(session, 'intake');
    if (refused) return refused;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const startedAt = Date.now();
    const body = await request.json();
    const inputText = String(body?.inputText || '').trim();
    const description = String(body?.description || '').trim();
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];

    if (!inputText) {
      return NextResponse.json({ success: false, error: 'inputText is required.' }, { status: 400 });
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const prompt = buildIntakePrompt({ inputText, description, tasks, todayIso });

    let geminiPayload = null;

    try {
      geminiPayload = await callGemini({ apiKey: geminiApiKey, prompt });
    } catch (geminiError) {
      // Provider text stays in the log. The person is told what failed and that the manual path works.
      console.error('Gemini smart intake parse error:', geminiError.message);
      return NextResponse.json(
        { success: false, error: aiErrorMessage(geminiError, { fallback: SMART_INTAKE_FALLBACK }) },
        { status: geminiError.status === 429 ? 429 : 502 }
      );
    }

    const rawText = extractGeminiText(geminiPayload);
    const parsed = extractFirstJsonObject(rawText);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Gemini returned invalid JSON output.' },
        { status: 502 }
      );
    }

    // The model suggests; these decide. Order matters: the sizing task first, so rhodium sees a matched job.
    const normalized = withRhodiumForWhiteGold(
      withDefaultShankWidth(withSizingTaskForSizes(normalizeParsedPayload(parsed), tasks), tasks, inputText),
      tasks,
    );

    // Smart-intake log (OPEN-QUESTIONS Q13): what was typed and what the AI said. The save adds what the ticket
    // became. Task ids are kept with their titles so the log reads without a lookup. Best-effort.
    const titleOf = new Map(tasks.map((t) => [String(t?.id || ''), String(t?.title || '')]));
    const intakeLogID = await recordIntakeSuggestion({
      session,
      kind: 'text',
      input: { text: inputText, description },
      output: {
        ...normalized,
        tasks: (normalized.matchedTasks || []).map((t) => ({ id: t.id, title: titleOf.get(t.id) || '', quantity: t.quantity })),
      },
      model: GEMINI_MODEL,
      ms: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        parsed: normalized,
        model: GEMINI_MODEL,
        intakeLogID,
      }
    });
  } catch (error) {
    console.error('POST /api/ai/parse-smart-intake error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse smart intake input.' },
      { status: 500 }
    );
  }
}
