import { GEMINI_API_BASE, GEMINI_MODEL } from './shared';
import { inferLeadBusinessHints } from './shared';
export const GEMINI_FEATURE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    has_jewelry: { type: 'BOOLEAN' },
    business_type: { type: 'STRING', enum: ['pawn_shop', 'jewelry_store', 'watch_business', 'bridal_jewelry', 'gold_buyer', 'luxury_retailer', 'unclear'] },
    pawn_signals: { type: 'BOOLEAN' },
    used_inventory_signals: { type: 'BOOLEAN' },
    refurbishment_opportunity: { type: 'BOOLEAN' },
    offers_repair: { type: 'BOOLEAN' },
    repair_capability: { type: 'NUMBER' },
    in_house_repair: { type: 'BOOLEAN' },
    mature_in_house_repair: { type: 'BOOLEAN' },
    manual_process_likelihood: { type: 'NUMBER' },
    process_maturity: { type: 'STRING', enum: ['manual', 'semi', 'digital', 'unknown'] },
    estimated_scale: { type: 'STRING', enum: ['micro', 'small', 'medium', 'large', 'chain', 'unknown'] },
    repair_volume_signal: { type: 'NUMBER' },
    revenue_opportunity: { type: 'NUMBER' },
    sales_friction: { type: 'NUMBER' },
    luxury_brand: { type: 'BOOLEAN' },
    chain_or_multi_location: { type: 'BOOLEAN' },
    outsourcing_evidence: { type: 'BOOLEAN' },
    turnaround_complaints: { type: 'BOOLEAN' },
    review_repair_evidence: { type: 'BOOLEAN' },
    review_owner_jeweler_evidence: { type: 'BOOLEAN' },
    review_service_mentions: { type: 'ARRAY', items: { type: 'STRING' } },
    contact_quality: { type: 'NUMBER' },
    confidence: { type: 'NUMBER' },
    summary: { type: 'STRING' },
    likely_repair_need: { type: 'STRING' },
    concerns: { type: 'ARRAY', items: { type: 'STRING' } },
    recommended_outreach_angle: { type: 'STRING' },
  },
  required: [
    'has_jewelry',
    'business_type',
    'pawn_signals',
    'used_inventory_signals',
    'refurbishment_opportunity',
    'offers_repair',
    'repair_capability',
    'in_house_repair',
    'mature_in_house_repair',
    'manual_process_likelihood',
    'process_maturity',
    'estimated_scale',
    'repair_volume_signal',
    'revenue_opportunity',
    'sales_friction',
    'luxury_brand',
    'chain_or_multi_location',
    'outsourcing_evidence',
    'turnaround_complaints',
    'review_repair_evidence',
    'review_owner_jeweler_evidence',
    'review_service_mentions',
    'contact_quality',
    'confidence',
    'summary',
    'likely_repair_need',
    'concerns',
    'recommended_outreach_angle',
  ],
  propertyOrdering: [
    'has_jewelry',
    'business_type',
    'pawn_signals',
    'used_inventory_signals',
    'refurbishment_opportunity',
    'offers_repair',
    'repair_capability',
    'in_house_repair',
    'mature_in_house_repair',
    'manual_process_likelihood',
    'process_maturity',
    'estimated_scale',
    'repair_volume_signal',
    'revenue_opportunity',
    'sales_friction',
    'luxury_brand',
    'chain_or_multi_location',
    'outsourcing_evidence',
    'turnaround_complaints',
    'review_repair_evidence',
    'review_owner_jeweler_evidence',
    'review_service_mentions',
    'contact_quality',
    'confidence',
    'summary',
    'likely_repair_need',
    'concerns',
    'recommended_outreach_angle',
  ],
};

export const GEMINI_OUTREACH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    subject: { type: 'STRING' },
    emailBody: { type: 'STRING' },
    callOpener: { type: 'STRING' },
    followUpNote: { type: 'STRING' },
    inviteMessage: { type: 'STRING' },
  },
  required: ['subject', 'emailBody', 'callOpener', 'followUpNote', 'inviteMessage'],
  propertyOrdering: ['subject', 'emailBody', 'callOpener', 'followUpNote', 'inviteMessage'],
};

export const extractGeminiText = (payload = {}) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '').trim()).filter(Boolean).join('\n').trim();
};

export const parseJsonSafely = (candidate = '') => {
  const text = String(candidate || '').trim();
  if (!text) return null;
  const attempts = [
    text,
    text.replace(/^\uFEFF/, ''),
    text
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'"),
  ];

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // Try the next normalized candidate.
    }
  }
  return null;
};

export const escapeRawLineBreaksInsideStrings = (candidate = '') => {
  let output = '';
  let inString = false;
  let escaped = false;

  for (const char of String(candidate || '')) {
    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      output += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      output += char;
      inString = !inString;
      continue;
    }
    if (inString && char === '\n') {
      output += '\\n';
      continue;
    }
    if (inString && char === '\r') {
      output += '\\r';
      continue;
    }
    if (inString && char === '\t') {
      output += '\\t';
      continue;
    }
    output += char;
  }

  return output;
};

export const findBalancedJsonObject = (text = '') => {
  const raw = String(text || '');
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) return raw.slice(start, index + 1);
    }
  }

  return '';
};

export const extractJson = (raw = '') => {
  const text = String(raw || '').trim();
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidates = [
    fencedMatch ? fencedMatch[1] : '',
    text,
    findBalancedJsonObject(fencedMatch ? fencedMatch[1] : text),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const objectCandidate = candidate.trim().startsWith('{') ? candidate : findBalancedJsonObject(candidate);
    const parsed = parseJsonSafely(objectCandidate) || parseJsonSafely(escapeRawLineBreaksInsideStrings(objectCandidate));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  }
  return null;
};

export const callGemini = async (prompt, options = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY is not configured'), { status: 500 });
  const generationConfig = {
    temperature: options.temperature ?? 0,
    topP: options.topP ?? 0.8,
    maxOutputTokens: options.maxOutputTokens || 3000,
    responseMimeType: 'application/json',
    thinkingConfig: { thinkingBudget: 0 },
    ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
  };
  const response = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(payload?.error?.message || 'Gemini request failed'), { status: response.status });
  }
  const finishReason = payload?.candidates?.[0]?.finishReason;
  if (finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(finishReason)) {
    throw Object.assign(new Error(`Gemini response did not complete cleanly: ${finishReason}`), { status: 502, finishReason });
  }
  const text = extractGeminiText(payload);
  const parsed = extractJson(text);
  if (!parsed) {
    throw Object.assign(new Error(`Gemini returned invalid JSON${options.label ? ` for ${options.label}` : ''}`), {
      status: 502,
      finishReason,
      responsePreview: text.slice(0, 500),
    });
  }
  return parsed;
};

export const leadPromptContext = (lead) => JSON.stringify({
  storeName: lead.storeName,
  contactName: lead.contactName,
  website: lead.website,
  phone: lead.phone,
  email: lead.email,
  address: lead.address,
  city: lead.city,
  state: lead.state,
  googleRating: lead.googleRating,
  googleReviewCount: lead.googleReviewCount,
  googleBusinessTypes: lead.googleBusinessTypes,
  websiteResearch: {
    summary: lead.websiteSummary || lead.websiteResearch?.summary || '',
    signals: lead.websiteSignals || lead.websiteResearch?.signals || {},
    checkedUrls: lead.websiteResearch?.checkedUrls || [],
  },
  googleReviewResearch: {
    summary: lead.googleReviewSummary || lead.googleReviewResearch?.summary || '',
    signals: lead.googleReviewSignals || lead.googleReviewResearch?.signals || {},
    snippets: lead.googleReviewResearch?.snippets
      || (Array.isArray(lead.googleReviews) ? lead.googleReviews.map((review) => review.text).filter(Boolean).slice(0, 5) : []),
  },
  notes: lead.notes,
  shippingRequired: lead.shippingRequired,
  shippingNotes: lead.shippingNotes,
  businessProfileHints: inferLeadBusinessHints(lead),
}, null, 2);

