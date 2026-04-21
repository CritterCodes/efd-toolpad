import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash-preview-04-17'];

const TASK_CATEGORIES = ['shanks', 'prongs', 'chains', 'stone_setting', 'misc', 'watches', 'engraving', 'bracelets'];

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
          generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 600 }
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

const normalizeTaskPayload = (raw = {}, availableProcesses = []) => {
  const str = (v) => String(v || '').trim();
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : Math.max(0, n); };

  // Resolve matched processes against actual available IDs
  const matchedProcesses = Array.isArray(raw.matchedProcessIds)
    ? raw.matchedProcessIds
        .map(item => {
          const process = availableProcesses.find(
            p => p._id === item.processId || String(p.displayName || '').toLowerCase() === String(item.processName || '').toLowerCase()
          );
          if (!process) return null;
          return {
            processId: process._id,
            processName: process.displayName || process.name,
            quantity: Math.max(1, parseInt(item.quantity) || 1),
            confidence: Math.min(1, Math.max(0, parseFloat(item.confidence) || 0.7)),
            reason: str(item.reason)
          };
        })
        .filter(Boolean)
    : [];

  const missingProcesses = Array.isArray(raw.missingProcesses)
    ? raw.missingProcesses.slice(0, 5).map(m => ({
        name: str(m?.name),
        reason: str(m?.reason),
        suggestedCategory: str(m?.suggestedCategory)
      })).filter(m => m.name)
    : [];

  return {
    title: str(raw.title),
    description: str(raw.description),
    category: TASK_CATEGORIES.includes(str(raw.category).toLowerCase()) ? str(raw.category).toLowerCase() : 'misc',
    matchedProcesses,
    missingProcesses,
    estimatedLaborHours: num(raw.estimatedLaborHours, 0),
    suggestedSkillLevel: str(raw.suggestedSkillLevel),
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
    const processes = Array.isArray(body?.processes) ? body.processes.slice(0, 80) : [];

    if (!description) {
      return NextResponse.json({ success: false, error: 'description is required.' }, { status: 400 });
    }

    const processListText = processes.length > 0
      ? processes.map(p => `- ID:${p._id} | Name:"${p.displayName || p.name}" | Category:${p.category} | Hours:${p.laborHours}`).join('\n')
      : '(no processes available)';

    const prompt = [
      'You are helping a jewelry repair shop build a "task" — a customer-facing service that bundles one or more repair processes.',
      'Your job: analyze the task description and match it to the best available processes.',
      '',
      `Available processes:\n${processListText}`,
      '',
      'Return ONLY valid JSON:',
      '{',
      '  "title": "Customer-facing task name (concise, professional)",',
      '  "description": "Customer-friendly 2-3 sentence description of what the customer receives.",',
      `  "category": "one of: ${TASK_CATEGORIES.join('|')}",`,
      '  "matchedProcessIds": [',
      '    { "processId": "exact ID from the list above", "processName": "exact name", "quantity": 1, "confidence": 0.95, "reason": "brief reason why this process is needed" }',
      '  ],',
      '  "missingProcesses": [',
      '    { "name": "Suggested Process Name", "reason": "Why needed but not in list", "suggestedCategory": "sizing|stone_setting|repair|..." }',
      '  ],',
      '  "estimatedLaborHours": 2.5,',
      '  "suggestedSkillLevel": "basic|standard|advanced|expert",',
      '  "confidence": 0.85',
      '}',
      'Rules:',
      '- Only use process IDs that appear EXACTLY in the available processes list above',
      '- missingProcesses = processes that would be ideal but do not exist in the list',
      '- quantity > 1 only if the task genuinely requires running that process multiple times',
      '- Do not wrap in markdown fences',
      '',
      `Task to build: ${description}`
    ].join('\n');

    const { model, payload } = await callGeminiWithFallback({ apiKey, prompt });
    const rawText = extractGeminiText(payload);
    const parsed = extractFirstJsonObject(rawText);

    if (!parsed) {
      return NextResponse.json({ success: false, error: 'AI returned invalid JSON output.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      data: { task: normalizeTaskPayload(parsed, processes), model }
    });
  } catch (error) {
    console.error('POST /api/ai/build-task error:', error);
    return NextResponse.json({ success: false, error: 'Failed to build task.' }, { status: 500 });
  }
}
