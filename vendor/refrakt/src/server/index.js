/**
 * REFRAKT — server render helper.
 *
 * Import from '@crittercodes/refrakt/server' inside a SERVER route (an API handler),
 * never from client code — the API key stays on the server. The package owns the model
 * default, the scene vocabulary and the prompt assembly; the host supplies only the key.
 *
 *   import { generateRender } from '@crittercodes/refrakt/server';
 *   export async function POST(req) {
 *     const { image, prompt, scene } = await req.json();
 *     const { url } = await generateRender({ apiKey: process.env.GEMINI_API_KEY, image, prompt, scene });
 *     return Response.json({ url });
 *   }
 */

import { RENDER_SCENES, DEFAULT_SCENE, sceneFragment } from '../core/renderScenes.js';
import { VALID_FINISHES, VALID_GEM_PRESETS } from '../core/library.js';

// Pure-data vocabulary is exposed here for API routes that must not pull the
// client component barrel (and its React hooks) into a server bundle.
export { RENDER_SCENES, DEFAULT_SCENE, VALID_FINISHES, VALID_GEM_PRESETS };

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3-pro-image';

/**
 * Assemble the final text prompt from the piece's parts (materials + scene + context).
 * - `scenePrompt` (freeform) wins over `scene` (a RENDER_SCENES id).
 * - If the caller supplies parts, they are authored here (this owns the wording).
 * - If ONLY a pre-built `prompt` is given (e.g. a legacy caller), it's used verbatim.
 */
export function buildRenderPrompt({ materials, prompt, scene, scenePrompt, instructions, context } = {}) {
  const sceneText = (scenePrompt && scenePrompt.trim()) || sceneFragment(scene);
  const haveParts = materials || sceneText || instructions || context;
  if (!haveParts && prompt) return prompt;
  return [
    context ? `${context}.` : '',
    'Photorealistic studio product photograph of this exact piece of fine jewellery, preserving its geometry, proportions and stone placement.',
    materials ? `Materials: ${materials}.` : '',
    sceneText ? `Setting: ${sceneText}.` : '',
    'Crisp macro detail, true-to-life metal and gemstone materials, high-end jewelry catalog quality.',
    instructions || '',
  ].filter(Boolean).join(' ');
}

/**
 * Turn a captured WebGL frame into a photoreal render.
 *
 * @param {object}  opts
 * @param {string}  opts.apiKey        - provider key (server-side; required)
 * @param {string}  opts.image         - the captured frame as a data URL (required)
 * @param {string} [opts.model]        - image model id (default 'gemini-3-pro-image')
 * @param {string} [opts.provider]     - 'gemini' (default; only provider today)
 * @param {string} [opts.materials]    - material description (from the viewer payload)
 * @param {string} [opts.prompt]       - a full prompt (fallback if no materials/scene)
 * @param {string} [opts.scene]        - a RENDER_SCENES id, e.g. 'studio-white'
 * @param {string} [opts.scenePrompt]  - freeform setting text, overrides `scene`
 * @param {string} [opts.context]      - piece context, e.g. product name (prompt prefix)
 * @param {string} [opts.instructions] - extra directives appended to the prompt
 * @param {number} [opts.temperature]  - sampling temperature (default 0.4)
 * @returns {Promise<{ url: string, prompt: string }>} data-URL render + the prompt used
 */
export async function generateRender({
  apiKey, image, model, provider = 'gemini',
  materials, prompt, scene, scenePrompt, instructions, context, temperature = 0.4,
} = {}) {
  if (!apiKey) throw new Error('generateRender: apiKey is required (call this from the server).');
  if (!image || typeof image !== 'string') throw new Error('generateRender: image (data URL) is required.');
  if (provider !== 'gemini') throw new Error(`generateRender: unsupported provider "${provider}".`);

  const mdl = model || DEFAULT_MODEL;
  const finalPrompt = buildRenderPrompt({ materials, prompt, scene, scenePrompt, instructions, context });
  const base64 = image.split(',').pop();

  const res = await fetch(`${GEMINI_API_BASE}/models/${mdl}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [
        { text: finalPrompt },
        { inlineData: { mimeType: 'image/png', data: base64 } },
      ] }],
      generationConfig: { responseModalities: ['IMAGE'], temperature },
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error?.message || `Image model request failed (${res.status}).`);
  const inline = (payload?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
  const data = inline?.inlineData?.data || inline?.inline_data?.data;
  if (!data) throw new Error('No image was returned by the model.');
  const mime = inline?.inlineData?.mimeType || inline?.inline_data?.mime_type || 'image/png';
  return { url: `data:${mime};base64,${data}`, prompt: finalPrompt };
}
