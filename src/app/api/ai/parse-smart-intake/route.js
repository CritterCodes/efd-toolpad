import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiRefusal } from '@/lib/aiAccess';
import { recordIntakeSuggestion } from '@/services/ai/smartIntakeLog';
import { aiErrorMessage, userFacingAiError, SMART_INTAKE_FALLBACK } from '@/services/ai/aiErrorMessage';
import { buildIntakePrompt, decideIntake } from '@/services/ai/smartIntakeRules';

// The pure half lives in services/ai/smartIntakeRules.js. Re-exported so older imports keep working.
export {
  normalizeKaratValue, applyDefaultPurity, normalizeGoldColor, normalizeParsedPayload, prefilterTasks, tasksForPrompt,
  buildIntakePrompt, FULL_CATALOG_LIMIT, withRhodiumForWhiteGold, withSizingTaskForSizes, withDefaultShankWidth,
  statesWideShank, decideIntake,
} from '@/services/ai/smartIntakeRules';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_SMART_INTAKE_MAX_OUTPUT_TOKENS || 8000);

const extractGeminiText = (payload = {}) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  // Joined with nothing: a JSON answer split across two parts is one document, and a newline inside a string breaks it.
  return parts.map((part) => String(part?.text || '')).join('').trim();
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
              // 0: the same note should get the same ticket. At 0.1 a replay of real notes flipped a few tickets
              // from one run to the next (docs/goals/SMART_INTAKE.md, round 1).
              temperature: 0,
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
    // The metal already chosen on the form. The note often leaves the colour out; the form knows it.
    const formMetal = body?.metal && typeof body.metal === 'object' ? body.metal : {};

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
    const raw = extractFirstJsonObject(rawText);
    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'Gemini returned invalid JSON output.' },
        { status: 502 }
      );
    }

    // The model suggests; the rulings decide (services/ai/smartIntakeRules.js).
    const normalized = decideIntake(raw, { tasks, inputText, formMetal });

    // Smart-intake log (OPEN-QUESTIONS Q13): what was typed, what the model answered (`raw`), and what the form was
    // told. The save adds what the ticket became. Task ids are kept with their titles so the log reads without a
    // lookup. `raw` is what lets a later replay re-run today's rulings over yesterday's answers. Best-effort.
    const titleOf = new Map(tasks.map((t) => [String(t?.id || ''), String(t?.title || '')]));
    const intakeLogID = await recordIntakeSuggestion({
      session,
      kind: 'text',
      input: { text: inputText, description },
      output: {
        ...normalized,
        tasks: (normalized.matchedTasks || []).map((t) => ({ id: t.id, title: titleOf.get(t.id) || '', quantity: t.quantity })),
        raw,
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
