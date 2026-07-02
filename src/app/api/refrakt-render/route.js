/**
 * POST /api/refrakt-render — turn a JewelryViewer frame into a photoreal render.
 *
 * Body: { image, prompt, materials, scene, context } → { url }
 *
 * The model config, scene → prompt assembly and the Gemini call live in the package
 * (generateRender from '@crittercodes/refrakt/server'); this route only supplies the key.
 * Admin-only.
 */
import { NextResponse } from 'next/server';
import { generateRender } from '@crittercodes/refrakt/server';
import { requireRole } from '@/lib/apiAuth';

export async function POST(request) {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Render not configured (GEMINI_API_KEY missing).' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const { image, prompt, materials, scene, context } = body || {};

  try {
    const { url } = await generateRender({
      apiKey,
      model: process.env.GEMINI_IMAGE_MODEL,
      image, prompt, materials, scene, context,
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e && e.message) || 'Render failed.' }, { status: 500 });
  }
}
