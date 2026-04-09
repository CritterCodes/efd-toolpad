import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];

const PROCESS_CATEGORIES = ['sizing', 'stone_setting', 'repair', 'restoration', 'cleaning', 'engraving', 'manufacturing', 'custom_work', 'rhodium_plating', 'soldering'];
const SKILL_LEVELS = ['basic', 'standard', 'advanced', 'expert'];

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
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 500 }
        })
      }
    );
    const payload = await response.json();
    if (response.ok) return { model, payload };
    lastPayload = payload;
    const errMsg = String(payload?.error?.message || '').toLowerCase();
    const retryable = response.status === 404 || errMsg.includes('not found') || errMsg.includes('not supported');
    if (!retryable) throw new Error(payload?.error?.message || 'Gemini request failed');
  }
  throw new Error(lastPayload?.error?.message || 'No compatible Gemini model found');
};

const normalizeProcessPayload = (raw = {}) => {
  const str = (v) => String(v || '').trim();
  const num = (v, fallback) => { const n = parseFloat(v); return isNaN(n) ? fallback : Math.max(0, n); };
  return {
    displayName: str(raw.displayName),
    category: PROCESS_CATEGORIES.includes(str(raw.category).toLowerCase()) ? str(raw.category).toLowerCase() : 'repair',
    skillLevel: SKILL_LEVELS.includes(str(raw.skillLevel).toLowerCase()) ? str(raw.skillLevel).toLowerCase() : 'standard',
    laborHours: num(raw.laborHours, 1.0),
    description: str(raw.description),
    suggestedMaterials: Array.isArray(raw.suggestedMaterials)
      ? raw.suggestedMaterials.slice(0, 8).map(m => ({
          name: str(m?.name),
          category: str(m?.category),
          searchQuery: str(m?.searchQuery || m?.name)
        })).filter(m => m.name)
      : [],
    metalCompatibility: Array.isArray(raw.metalCompatibility) ? raw.metalCompatibility.slice(0, 6) : [],
    confidence: Math.min(1, Math.max(0, parseFloat(raw.confidence) || 0.5))
  };
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
    const description = String(body?.description || '').trim();
    if (!description) {
      return NextResponse.json({ success: false, error: 'description is required.' }, { status: 400 });
    }

    const prompt = [
      'You are helping a jewelry repair shop build structured process records.',
      'A "process" is a single repeatable technical operation performed by a jeweler.',
      'Examples: "Prong Retipping", "Ring Sizing", "Stone Tightening", "Rhodium Plating", "Jump Ring Solder"',
      '',
      'Based on this description, return ONLY valid JSON:',
      '{',
      '  "displayName": "Short professional process name (2-5 words)",',
      `  "category": "must be one of: ${PROCESS_CATEGORIES.join('|')}",`,
      `  "skillLevel": "must be one of: ${SKILL_LEVELS.join('|')} — basic=cleaning/polishing, standard=soldering/sizing, advanced=stone setting/prongs, expert=complex fabrication",`,
      '  "laborHours": 1.0,',
      '  "description": "2-3 sentence professional description of exactly what this process involves.",',
      '  "suggestedMaterials": [',
      '    { "name": "Specific Material Name", "category": "solder|flux|polish|metal|findings|tool|chemical", "searchQuery": "stuller search keyword" }',
      '  ],',
      '  "metalCompatibility": ["gold", "silver", "platinum"],',
      '  "confidence": 0.9',
      '}',
      'Important rules:',
      '- laborHours should be realistic: 0.25 (cleaning) to 4.0 (complex fabrication)',
      '- suggestedMaterials should only list consumable materials (solder, flux, polish, findings), not tools',
      '- searchQuery should be the best Stuller catalog search term for that material',
      '- Do not wrap in markdown fences or add commentary',
      '',
      `Process to build: ${description}`
    ].join('\n');

    const { model, payload } = await callGeminiWithFallback({ apiKey, prompt });
    const rawText = extractGeminiText(payload);
    const parsed = extractFirstJsonObject(rawText);

    if (!parsed) {
      return NextResponse.json({ success: false, error: 'AI returned invalid JSON output.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      data: { process: normalizeProcessPayload(parsed), model }
    });
  } catch (error) {
    console.error('POST /api/ai/build-process error:', error);
    return NextResponse.json({ success: false, error: 'Failed to build process.' }, { status: 500 });
  }
}
