'use client';

/**
 * MaterialPreview — a live material preview that PLUCKS a single mesh (a diamond)
 * out of the already-loaded model GLB and renders it through the real engine with
 * a given material. Used as the hero preview in the Change Material page so the
 * jeweller sees the true shader on their own stone, not a placeholder.
 *
 * One canvas only (mounted just while the library page is open). Gem → BVH
 * refraction shader; metal → MeshPhysicalMaterial. Mirrors StudioViewer's
 * material construction so the preview matches the model exactly.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

import { buildFrag } from '../core/shaders';
import { makeMat, syncBVH } from '../core/helpers';
import { defaultRegistry } from '../core/registry';

function PluckedMesh({ glbUrl, meshName, kind, preset, finish, over, registry, onReady }) {
  const { scene } = useGLTF(glbUrl);
  const { scene: threeScene, size, camera } = useThree();
  const meshRef = useRef();
  const matRef = useRef(null);
  const fragRef = useRef(null);
  const bvhModRef = useRef(null);
  const [ready, setReady] = useState(0);
  const ovKey = JSON.stringify(over || {});

  // Pluck the chosen mesh's geometry (clone — never mutate the shared cache),
  // normalize to a unit sphere at the origin, and compute an orientation that
  // turns the stone's table toward the camera. A brilliant cut is wider than it
  // is tall, so its FLATTEST bounding axis is the table↔culet axis — aim that at
  // the viewer (tilted up a touch) so we see the crown, not the side.
  const pluck = useMemo(() => {
    let g = null;
    scene.traverse((o) => { if (o.isMesh && o.name === meshName && !g) g = o.geometry; });
    if (!g) scene.traverse((o) => { if (o.isMesh && !g) g = o.geometry; });
    if (!g) return null;
    const geo = g.clone();
    geo.computeBoundingBox();
    const c = new THREE.Vector3();
    geo.boundingBox.getCenter(c);
    geo.translate(-c.x, -c.y, -c.z);
    geo.computeBoundingSphere();
    const r = geo.boundingSphere.radius || 1;
    geo.scale(1 / r, 1 / r, 1 / r);
    geo.computeBoundingBox();
    const sz = new THREE.Vector3();
    geo.boundingBox.getSize(sz);
    const axis = sz.x <= sz.y && sz.x <= sz.z ? new THREE.Vector3(1, 0, 0) : sz.y <= sz.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const target = new THREE.Vector3(0, 0.45, 1).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(axis, target);
    return { geo, quat: [q.x, q.y, q.z, q.w] };
  }, [scene, meshName]);
  const geom = pluck ? pluck.geo : null;

  useEffect(() => {
    let alive = true;
    import('three-mesh-bvh').then((mod) => { if (!alive) return; bvhModRef.current = mod; fragRef.current = buildFrag(mod.shaderStructs, mod.shaderIntersectFunction); setReady((v) => v + 1); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!geom || !mesh) return;
    if (kind === 'metal') { mesh.material = registry.makeMetal({ finish, ...(over || {}) }); matRef.current = null; onReady && onReady(); return; }
    const bvhMod = bvhModRef.current;
    if (!bvhMod || !fragRef.current || !threeScene.environment) return;
    try {
      const bvh = new bvhMod.MeshBVH(geom, { strategy: bvhMod.SAH, maxLeafTris: 1 });
      const bvhStruct = new bvhMod.MeshBVHUniformStruct();
      bvhStruct.updateFrom(bvh);
      mesh.updateMatrixWorld(true);
      mesh.material = makeMat({ env: threeScene.environment, size, state: { camera }, bvhStruct, frag: fragRef.current, mesh, ...registry.resolveGem({ gemPreset: preset, ...(over || {}) }) });
      matRef.current = mesh.material;
      onReady && onReady();
    } catch { /* keep placeholder */ }
  }, [geom, ready, kind, preset, finish, ovKey, threeScene.environment, size, registry]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => { if (matRef.current && meshRef.current) syncBVH([{ mesh: meshRef.current, mat: matRef.current }], { camera }, size); });

  if (!geom) return null;
  return (
    <mesh ref={meshRef} geometry={geom} quaternion={pluck.quat}>
      <meshPhysicalMaterial color="#cfe6ff" roughness={0.05} metalness={0} transmission={1} ior={1.8} thickness={0.4} transparent envMapIntensity={1.4} />
    </mesh>
  );
}

export default function MaterialPreview({ glbUrl, meshName, kind, preset, finish, over, registry = defaultRegistry }) {
  if (!glbUrl) return null;
  // Camera pulled back so the whole stone sits centered with padding (its round
  // silhouette reads as a 3D stone, not an edge-cropped square swatch). Canvas
  // fills its parent so the preview spans the card.
  return (
    <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0.2, 3.7], fov: 30 }} style={{ width: '100%', height: '100%', display: 'block' }}>
      <Suspense fallback={null}>
        <Environment preset="city" />
        <PluckedMesh glbUrl={glbUrl} meshName={meshName} kind={kind} preset={preset} finish={finish} over={over} registry={registry} />
      </Suspense>
    </Canvas>
  );
}

// ── Snapshot baker ──────────────────────────────────────────────────────────────
// Render each gem ONCE through a single shared renderer and cache a PNG, so a large
// material library shows real engine renders WITHOUT one live WebGL context per card.
// Cards then display a cached <img>; the only extra context is this baker, which
// unmounts once everything's baked.
const EMPTY = {};
export const GEM_SNAP = new Map(); // key → data URL (module-level: persists across opens)
export const gemSnapKey = (glbUrl, meshName, preset) => `${glbUrl}|${meshName}|${preset}`;

function BakeOne({ glbUrl, meshName, preset, registry, onDone }) {
  const { gl } = useThree();
  const armed = useRef(false);
  const frames = useRef(0);
  const total = useRef(0);
  const handled = useRef(null);
  useFrame(() => {
    // Reset counters in-frame (not in a useEffect) when the preset changes — a reset
    // effect would run AFTER the child's onReady and clobber `armed` back to false.
    if (handled.current !== preset) { handled.current = preset; armed.current = false; frames.current = 0; total.current = 0; }
    total.current++;
    if (armed.current) {
      frames.current++;
      if (frames.current >= 4) { armed.current = false; let url = null; try { url = gl.domElement.toDataURL('image/png'); } catch { /* tainted/unsupported */ } onDone(url); }
    } else if (total.current > 180) {
      onDone(null); // ~3s safety: material never readied (e.g. BVH failed) — skip so the queue advances
    }
  });
  return <PluckedMesh glbUrl={glbUrl} meshName={meshName} kind="gem" preset={preset} over={EMPTY} registry={registry} onReady={() => { armed.current = true; frames.current = 0; }} />;
}

// Bakes every preset not already cached, one at a time, into GEM_SNAP. Calls onBaked()
// after each so the host re-renders and swaps in the new image. Renders an offscreen
// canvas; returns null (unmounts) once the queue is done.
export function GemBaker({ glbUrl, meshName, presets = [], registry = defaultRegistry, onBaked }) {
  const [i, setI] = useState(0);
  const cur = presets[i];
  const cached = cur != null && GEM_SNAP.has(gemSnapKey(glbUrl, meshName, cur));
  useEffect(() => { if (cur != null && cached) setI((v) => v + 1); }, [i, cur, cached]);
  if (!glbUrl || !meshName || cur == null || i >= presets.length || cached) return null;
  const done = (url) => { if (url) GEM_SNAP.set(gemSnapKey(glbUrl, meshName, cur), url); onBaked && onBaked(); setI((v) => v + 1); };
  return (
    <Canvas dpr={1} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} camera={{ position: [0, 0.2, 3.7], fov: 30 }} style={{ position: 'absolute', left: -9999, top: 0, width: 140, height: 140, pointerEvents: 'none' }} aria-hidden>
      <Suspense fallback={null}>
        <Environment preset="city" />
        <BakeOne glbUrl={glbUrl} meshName={meshName} preset={cur} registry={registry} onDone={done} />
      </Suspense>
    </Canvas>
  );
}
