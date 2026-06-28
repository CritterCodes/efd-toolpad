import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

// POST /api/glb/inspect  { glbUrl: string }
//
// Parses a GLB's node names and returns a heuristic `suggestedMeshMap` (assign each
// mesh to metal / gem / ignore) so the REFRAKT viewer can render gems with the gem
// shader. Used by the CAD QC viewer to auto-map a raw GLB that has no meshMap yet.
// Ported from efd-shop/app/api/glb/inspect (pending the shared packages/refrakt).
//
// three.js (GLTFLoader) names rendered objects by their glTF NODE name, so
// `meshMap.nameContains` is matched against the node names returned here.

export const runtime = 'nodejs';

// SSRF guard — only allow same-origin assets and the configured storage host(s).
function allowedHosts() {
  const hosts = new Set();
  if (process.env.MINIO_PUBLIC_URL) {
    try { hosts.add(new URL(process.env.MINIO_PUBLIC_URL).hostname); } catch {}
  }
  const bucket = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME;
  if (bucket && process.env.AWS_REGION) {
    hosts.add(`${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`);
  }
  return hosts;
}

const GEM_KEYWORDS = ['diamond', 'amethyst', 'ruby', 'sapphire', 'emerald', 'moissanite', 'topaz', 'aquamarine', 'tourmaline', 'opal', 'gem', 'stone', 'centerstone'];
const METAL_KEYWORDS = ['mounting', 'shank', 'band', 'metal', 'prong', 'head', 'setting'];
const GEM_PRESETS = new Set(['diamond', 'amethyst', 'ruby', 'sapphire', 'emerald', 'moissanite', 'marquise']);

function resolveUrl(glbUrl, origin) {
  let u;
  try {
    u = new URL(glbUrl, origin);
  } catch {
    return { error: 'Invalid glbUrl' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'Unsupported protocol' };
  const sameOrigin = u.origin === origin;
  const isLocal = ['localhost', '127.0.0.1'].includes(u.hostname);
  if (!sameOrigin && !isLocal && !allowedHosts().has(u.hostname)) {
    return { error: `Host not allowed: ${u.hostname}` };
  }
  return { url: u.toString() };
}

// Parse a GLB (binary glTF) buffer and return its embedded JSON chunk.
function parseGlbJson(buffer) {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('Not a GLB (bad magic)'); // 'glTF'
  let offset = 12;
  const chunkLength = dv.getUint32(offset, true); offset += 4;
  const chunkType = dv.getUint32(offset, true); offset += 4;
  if (chunkType !== 0x4e4f534a) throw new Error('First chunk is not JSON'); // 'JSON'
  const bytes = new Uint8Array(buffer, offset, chunkLength);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function suggestSlot(name) {
  const n = name.toLowerCase();
  for (const k of METAL_KEYWORDS) {
    if (n.includes(k)) return { nameContains: name, type: 'metal', finish: 'gold' };
  }
  for (const k of GEM_KEYWORDS) {
    if (n.includes(k)) {
      const preset = [...GEM_PRESETS].find(p => n.includes(p)) || 'diamond';
      return { nameContains: name, type: 'gem', gemPreset: preset };
    }
  }
  return null; // unknown — leave on its default material
}

export async function POST(req) {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { glbUrl } = body || {};
  if (!glbUrl || typeof glbUrl !== 'string') {
    return NextResponse.json({ ok: false, error: 'glbUrl (string) is required' }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const resolved = resolveUrl(glbUrl, origin);
  if (resolved.error) {
    return NextResponse.json({ ok: false, error: resolved.error }, { status: 400 });
  }

  let buffer;
  try {
    const res = await fetch(resolved.url, { headers: { Accept: 'model/gltf-binary,application/octet-stream' } });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Fetch failed: ${res.status}` }, { status: 502 });
    }
    buffer = await res.arrayBuffer();
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Fetch error: ${e.message}` }, { status: 502 });
  }

  let json;
  try {
    json = parseGlbJson(buffer);
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Parse error: ${e.message}` }, { status: 422 });
  }

  const nodes = json.nodes || [];
  const meshes = json.meshes || [];
  const materials = (json.materials || []).map(m => m.name).filter(Boolean);

  const meshNodeNames = nodes
    .filter(n => n.mesh !== undefined && n.name)
    .map(n => n.name);

  const seen = new Set();
  const suggestedMeshMap = [];
  for (const name of meshNodeNames) {
    const slot = suggestSlot(name);
    if (!slot) continue;
    const key = `${slot.type}:${slot.finish || slot.gemPreset}:${slot.nameContains}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestedMeshMap.push(slot);
  }

  return NextResponse.json({
    ok: true,
    sizeBytes: buffer.byteLength,
    meshNodeNames,
    meshNames: meshes.map(m => m.name).filter(Boolean),
    materials,
    suggestedMeshMap,
  });
}
