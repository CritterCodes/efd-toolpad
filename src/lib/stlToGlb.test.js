// @vitest-environment jsdom
// (GLTFExporter uses FileReader for the binary pack — jsdom supplies it; node doesn't.)
import { describe, expect, it } from 'vitest';
import { stlToGlb } from '@/lib/stlToGlb';

// Minimal binary STL: a tetrahedron (4 triangular facets), ~10mm scale like real melee CAD.
function tetrahedronStl() {
  const tris = [
    [[0, 0, 0], [10, 0, 0], [0, 10, 0]],
    [[0, 0, 0], [10, 0, 0], [0, 0, 10]],
    [[0, 0, 0], [0, 10, 0], [0, 0, 10]],
    [[10, 0, 0], [0, 10, 0], [0, 0, 10]],
  ];
  const buf = new ArrayBuffer(84 + tris.length * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, tris.length, true);
  let o = 84;
  for (const tri of tris) {
    o += 12; // facet normal (zeros — STLLoader recomputes flat normals)
    for (const v of tri) { dv.setFloat32(o, v[0], true); dv.setFloat32(o + 4, v[1], true); dv.setFloat32(o + 8, v[2], true); o += 12; }
    o += 2; // attribute byte count
  }
  return buf;
}

// jsdom's Blob has no arrayBuffer(); read through FileReader (what browsers had first anyway).
const blobToArrayBuffer = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsArrayBuffer(blob);
});

describe('stlToGlb (gemstone viewer model from CAD solid)', () => {
  it('produces a valid GLB with the canonical Gemstone mesh, scaled mm→m', async () => {
    const blob = await stlToGlb(tetrahedronStl());
    expect(blob.type).toBe('model/gltf-binary');

    const buf = await blobToArrayBuffer(blob);
    // GLB magic + version 2
    const dv = new DataView(buf);
    expect(String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3))).toBe('glTF');
    expect(dv.getUint32(4, true)).toBe(2);

    // The JSON chunk carries the canonical mesh name + the 0.001 unit scale.
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
    const node = (json.nodes || []).find((n) => n.name === 'Gemstone');
    expect(node).toBeTruthy();
    // The exporter may encode the transform as `scale` or a full `matrix` — accept either.
    const scaleX = node.scale ? node.scale[0] : node.matrix?.[0];
    expect(scaleX).toBeCloseTo(0.001, 6);
    expect((json.meshes || []).length).toBe(1);
  });

  it('honors a custom mesh name', async () => {
    const blob = await stlToGlb(tetrahedronStl(), { meshName: 'Stone_01' });
    const buf = await blobToArrayBuffer(blob);
    const dv = new DataView(buf);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, dv.getUint32(12, true))));
    expect((json.nodes || []).some((n) => n.name === 'Stone_01')).toBe(true);
  });
});
