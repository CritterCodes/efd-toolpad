import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
];

const extractGeminiText = (payload = {}) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part) => String(part?.text || '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
};

const buildCandidateModels = () => {
  const configuredModel = String(process.env.GEMINI_MODEL || '').trim();
  if (!configuredModel) return DEFAULT_GEMINI_MODELS;

  const deduped = [configuredModel, ...DEFAULT_GEMINI_MODELS].filter(Boolean);
  return [...new Set(deduped)];
};

const callGeminiWithFallback = async ({ apiKey, mimeType, base64Image, prompt }) => {
  const models = buildCandidateModels();
  let lastPayload = null;

  for (const model of models) {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 220
          }
        })
      }
    );

    const payload = await response.json();
    if (response.ok) {
      return { model, payload };
    }

    lastPayload = payload;

    const errorMessage = String(payload?.error?.message || '').toLowerCase();
    const shouldTryNextModel = response.status === 404 || response.status === 429 || errorMessage.includes('not found') || errorMessage.includes('not supported') || errorMessage.includes('resource exhausted');

    if (!shouldTryNextModel) {
      throw new Error(payload?.error?.message || 'Gemini request failed');
    }
  }

  throw new Error(lastPayload?.error?.message || 'No compatible Gemini model found for generateContent');
};

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Image file is required.' },
        { status: 400 }
      );
    }

    if (!String(image.type || '').startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are supported.' },
        { status: 400 }
      );
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image is too large. Max size is 10MB.' },
        { status: 400 }
      );
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');

    const prompt = [
      'You are a jewelry visual-description assistant.',
      'Describe only what the ring looks like in the image.',
      'Focus on visible colors, details, stone arrangement, and likely ring style.',
      'Do not suggest repairs, causes of damage, or work to be performed.',
      'Do not guess exact measurements, karat, or ring size unless clearly visible.',
      'Return 1-3 concise sentences suitable for a customer-facing item description field.',
      'Output plain text only, no markdown.'
    ].join(' ');

    let geminiPayload = null;
    let selectedModel = '';

    try {
      const geminiResult = await callGeminiWithFallback({
        apiKey: geminiApiKey,
        mimeType: image.type,
        base64Image,
        prompt
      });
      geminiPayload = geminiResult.payload;
      selectedModel = geminiResult.model;
    } catch (geminiError) {
      console.error('Gemini image describe error:', geminiError.message);
      return NextResponse.json(
        { success: false, error: geminiError.message || 'Gemini request failed.' },
        { status: 502 }
      );
    }

    const description = extractGeminiText(geminiPayload);
    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Gemini returned an empty description.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        description,
        model: selectedModel
      }
    });
  } catch (error) {
    console.error('POST /api/ai/describe-item-image error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate description from image.' },
      { status: 500 }
    );
  }
}
