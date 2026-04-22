import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];

const REQUIRED_INFO_OPTIONS = ['metalType', 'karat', 'currentRingSize', 'desiredRingSize', 'stoneCount', 'chainLength', 'stoneType', 'engraving'];

const buildCandidateModels = () => {
  const configured = String(process.env.GEMINI_MODEL || '').trim();
  if (!configured) return DEFAULT_GEMINI_MODELS;
  return [...new Set([configured, ...DEFAULT_GEMINI_MODELS])];
};

const extractGeminiText = (payload = {}) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map(p => String(p?.text || '')).filter(Boolean).join('\n').trim();
};

const extractFirstJsonObject = (raw = '') => {
  const text = String(raw || '').trim();
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try { return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)); } catch { return null; }
};

const callGeminiWithFallback = async ({ apiKey, prompt }) => {
  const models = buildCandidateModels();
  let lastPayload = null;
  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 800 }
          }),
          signal: controller.signal
        }
      );
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') continue;
      throw err;
    }
    clearTimeout(timeout);
    const payload = await response.json();
    if (response.ok) return { model, payload };
    lastPayload = payload;
    const errMsg = String(payload?.error?.message || '').toLowerCase();
    const retryable = response.status === 404 || response.status === 429 || errMsg.includes('not found') || errMsg.includes('not supported') || errMsg.includes('resource exhausted');
    if (!retryable) throw new Error(payload?.error?.message || 'Gemini request failed');
  }
  throw new Error(lastPayload?.error?.message || 'No compatible Gemini model found');
};

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not configured.' }, { status: 500 });
    }

    const body = await request.json();
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const category = String(body?.category || '').trim();

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required.' }, { status: 400 });
    }

    const prompt = [
      'You are a jewelry repair expert helping configure an AI repair assistant.',
      'A repair "task" needs AI metadata so a conversational chatbot can correctly identify when to suggest this task and what info to collect before quoting.',
      '',
      `Task title: ${title}`,
      `Description: ${description || '(none)'}`,
      `Category: ${category || '(none)'}`,
      '',
      `Available requiredInfo keys: ${REQUIRED_INFO_OPTIONS.join(', ')}`,
      '',
      'Return ONLY valid JSON with this exact shape:',
      '{',
      '  "whenToUse": "Plain English sentence(s) describing EXACTLY what a customer says or describes that should trigger this task. Be specific — include common phrasings, symptoms, and complaints.",',
      '  "symptoms": ["short phrase 1", "short phrase 2", "...up to 8 natural phrases a customer might say"],',
      '  "requiredInfo": ["keys from the available list that MUST be collected before this task can be quoted accurately"],',
      '  "neverUseWhen": "Describe situations where this task looks relevant but should NOT be applied. Leave empty string if no clear exclusions.",',
      '  "pairsWith": ["task title 1", "task title 2 — tasks commonly done together with this one. Leave empty array if none."]',
      '}',
      '',
      'Rules:',
      '- symptoms should sound like real customer speech, not technical terms',
      '- requiredInfo: only include keys that are ACTUALLY needed for accurate pricing (e.g. ring sizing always needs currentRingSize + desiredRingSize)',
      '- Keep all values concise and actionable for a chatbot',
      '- Do not wrap in markdown fences',
    ].join('\n');

    const { model, payload } = await callGeminiWithFallback({ apiKey, prompt });
    const rawText = extractGeminiText(payload);
    const parsed = extractFirstJsonObject(rawText);

    if (!parsed) {
      return NextResponse.json({ success: false, error: 'AI returned invalid JSON output.' }, { status: 502 });
    }

    const str = (v) => String(v || '').trim();
    const arr = (v) => Array.isArray(v) ? v.map(str).filter(Boolean) : [];

    const aiMeta = {
      whenToUse: str(parsed.whenToUse),
      symptoms: arr(parsed.symptoms),
      requiredInfo: arr(parsed.requiredInfo).filter(k => REQUIRED_INFO_OPTIONS.includes(k)),
      neverUseWhen: str(parsed.neverUseWhen),
      pairsWith: arr(parsed.pairsWith),
    };

    return NextResponse.json({ success: true, data: { aiMeta, model } });
  } catch (error) {
    console.error('POST /api/ai/generate-ai-meta error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate AI metadata.' }, { status: 500 });
  }
}
