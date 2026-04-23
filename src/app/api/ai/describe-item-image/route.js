import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.0-flash';

const extractGeminiText = (payload = {}) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '').trim()).filter(Boolean).join('\n').trim();
};

const callGemini = async ({ apiKey, mimeType, base64Image, prompt }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  let response;
  try {
    response = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Image } }] }],
          generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 512 }
        }),
        signal: controller.signal
      }
    );
  } finally {
    clearTimeout(timeout);
  }
  const payload = await response.json();
  if (response.ok) return payload;
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
    const selectedModel = GEMINI_MODEL;

    try {
      geminiPayload = await callGemini({
        apiKey: geminiApiKey,
        mimeType: image.type,
        base64Image,
        prompt
      });
    } catch (geminiError) {
      console.error('Gemini image describe error:', geminiError.message);
      return NextResponse.json(
        { success: false, error: geminiError.message || 'Gemini request failed.' },
        { status: geminiError.status === 429 ? 429 : 502 }
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
