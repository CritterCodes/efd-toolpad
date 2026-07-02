/**
 * POST /api/refrakt-render — turn a JewelryViewer frame into a photoreal render.
 *
 * Body: { image: "data:image/png;base64,…", prompt: string } → { url: "data:…;base64,…" }
 *
 * Calls Gemini 3 Pro Image ("Nano Banana") via REST (no SDK). The input frame preserves
 * the piece's geometry; the prompt supplies the metals/stones from the config. Admin-only.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image';

export async function POST(request) {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Render not configured (GEMINI_API_KEY missing).' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const { image, prompt } = body || {};
  if (!image || typeof image !== 'string') return NextResponse.json({ error: 'Missing image.' }, { status: 400 });

  const base64 = image.split(',').pop();

  try {
    const res = await fetch(`${GEMINI_API_BASE}/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: prompt || 'Photorealistic studio product photograph of this piece of fine jewelry, preserving its exact geometry.' },
          { inlineData: { mimeType: 'image/png', data: base64 } },
        ] }],
        generationConfig: { responseModalities: ['IMAGE'], temperature: 0.4 },
      }),
    });
    const payload = await res.json();
    if (!res.ok) return NextResponse.json({ error: payload?.error?.message || 'Gemini request failed.' }, { status: 502 });
    const inline = (payload?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
    const data = inline?.inlineData?.data || inline?.inline_data?.data;
    if (!data) return NextResponse.json({ error: 'No image was returned.' }, { status: 502 });
    const mime = inline?.inlineData?.mimeType || inline?.inline_data?.mime_type || 'image/png';
    return NextResponse.json({ url: `data:${mime};base64,${data}` });
  } catch (e) {
    return NextResponse.json({ error: (e && e.message) || 'Render failed.' }, { status: 500 });
  }
}
