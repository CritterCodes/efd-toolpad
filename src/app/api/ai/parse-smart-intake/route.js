import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_SMART_INTAKE_MAX_OUTPUT_TOKENS || 2048);

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

const normalizeParsedPayload = (payload = {}) => {
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
  const matchedTaskIds = Array.isArray(payload.matchedTaskIds)
    ? payload.matchedTaskIds.map(s => String(s || '').trim()).filter(Boolean).slice(0, 5)
    : [];
  const materialHints = Array.isArray(payload.materialHints)
    ? payload.materialHints.map((item) => ({
        type: normalizeString(item?.type || item?.name).toLowerCase().replace(/\s+/g, '_'),
        quantity: Math.max(0, Number(item?.quantity || 0)),
        reason: normalizeString(item?.reason)
      })).filter((item) => item.type && item.quantity > 0).slice(0, 3)
    : [];

  return {
    metalType: normalizeEnum(payload.metalType, ['gold', 'silver', 'platinum', 'costume']),
    karat: normalizeString(payload.karat),
    goldColor: normalizeEnum(payload.goldColor, ['yellow', 'white', 'rose']),
    isRing: toBool(payload.isRing),
    currentRingSize: normalizeString(payload.currentRingSize),
    desiredRingSize: normalizeString(payload.desiredRingSize),
    promiseDate: normalizeIsoDate(payload.promiseDate),
    taskHints,
    materialHints,
    normalizedSummary: normalizeString(payload.normalizedSummary),
    confidence,
    matchedTaskIds
  };
};

const prefilterTasks = (inputText, tasks, limit = 15) => {
  const words = inputText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (!words.length) return tasks.slice(0, limit);
  const scored = tasks.map(t => {
    const haystack = [t.title, ...(t.symptoms || []), t.whenToUse || ''].join(' ').toLowerCase();
    const score = words.filter(w => haystack.includes(w)).length;
    return { task: t, score };
  });
  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.task);
  return matched.length > 0 ? matched : tasks.slice(0, limit);
};

const callGemini = async ({ apiKey, prompt }) => {
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
  if (response.status === 429) {
    throw Object.assign(new Error('AI is temporarily rate limited. Please wait a moment and try again.'), { status: 429 });
  }
  throw new Error(payload?.error?.message || 'Gemini request failed');
};

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const body = await request.json();
    const inputText = String(body?.inputText || '').trim();
    const description = String(body?.description || '').trim();
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];

    if (!inputText) {
      return NextResponse.json({ success: false, error: 'inputText is required.' }, { status: 400 });
    }

    const relevantTasks = tasks.length > 0 ? prefilterTasks(inputText, tasks) : [];
    const todayIso = new Date().toISOString().slice(0, 10);
    const taskListText = relevantTasks.length > 0
      ? relevantTasks.map(t =>
          `- id:${t.id} | title:"${t.title}"` +
          (t.symptoms?.length ? ` | symptoms:${JSON.stringify(t.symptoms)}` : '') +
          (t.whenToUse ? ` | whenToUse:"${t.whenToUse}"` : '') +
          (t.neverUseWhen ? ` | neverUseWhen:"${t.neverUseWhen}"` : '')
        ).join('\n')
      : '';
    console.log('[parse-smart-intake] tasks total:', tasks.length, 'after prefilter:', relevantTasks.length);

    const prompt = [
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
      '  "matchedTaskIds": []',
      '}',
      ...(taskListText ? [
        '',
        'You are also given a list of available repair tasks. Identify which tasks (by id) best match the repair described (up to 3 tasks maximum).',
        'Use the symptoms, whenToUse, and neverUseWhen fields to decide. Return their ids in "matchedTaskIds". If no task clearly matches, return an empty array.',
        '',
        'Available tasks:',
        taskListText,
      ] : []),
      '',
      'Rules:',
      '- CRITICAL: isRing must be true ONLY if the item is explicitly a ring or band. For pendants, necklaces, bracelets, chains, earrings, watches, brooches, or any non-ring item, isRing must be false.',
      '- currentRingSize and desiredRingSize should ONLY be set if the item is a ring.',
      '- promiseDate must be YYYY-MM-DD. Resolve relative dates like "next friday" against the current date. If no due/promise date is stated, use an empty string.',
      '- taskHints should be SHORT keywords that describe repair work.',
      '- materialHints should only be used when the intake clearly implies extra material beyond the base task.',
      '- For ring sizing, assume the base sizing task covers 1 size. If the ring is being sized UP by more than 1 full size, add a sizing_material hint with quantity equal to the extra sizes beyond the first included size. Example: from 7 to 9 => quantity 1. from 7 to 8.5 => quantity 0.5.',
      '- Do not add materialHints for size-down work unless material is explicitly mentioned.',
      '- Ring examples: "resize", "size up", "size down", "resize with stones", "size with accent stones", "retip", "prong", "setting"',
      '- Non-ring examples: "solder", "chain repair", "clasp repair", "restring", "clean", "polish", "stone replace", "weld", "refinish", "replating"',
      '- IMPORTANT: If the ring has accent stones or multiple stones (not just a center stone), prefer task hints like "resize with stones" or "size with stones" instead of just "resize"',
      '- taskHints must be generic repair terms that could match task names like "Ring Sizing", "Ring Sizing with Stones", "Retip Setting", "Stone Setting", "Cleaning & Polishing", "Chain Repair", "Clasp Repair"',
      '- Return 1-3 task hints, NOT full task names',
      '- confidence must be between 0 and 1 (1.0 = very confident in parsing)',
      '- Use empty strings or empty arrays for unknown values.',
      '- Do not include markdown fences or extra commentary.',
      `Input text: ${inputText}`,
      description ? `Item description: ${description}` : ''
    ].filter(Boolean).join('\n');

    let geminiPayload = null;

    try {
      geminiPayload = await callGemini({ apiKey: geminiApiKey, prompt });
    } catch (geminiError) {
      console.error('Gemini smart intake parse error:', geminiError.message);
      return NextResponse.json(
        { success: false, error: geminiError.message || 'Gemini request failed.' },
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

    return NextResponse.json({
      success: true,
      data: {
        parsed: normalizeParsedPayload(parsed),
        model: GEMINI_MODEL
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
