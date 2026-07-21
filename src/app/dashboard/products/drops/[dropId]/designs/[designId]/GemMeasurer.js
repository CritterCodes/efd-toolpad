'use client';

/**
 * Headless GLB probe → a DIAMOND-EQUIVALENT carat per gem mesh, so stone-setting labor (and
 * size-split rows) can be inferred automatically the way the owner eyeballs it ("a 5.5mm
 * amethyst is the 0.5ct diamond I'd charge for").
 *
 * Why diameter, not volume: cut-stone meshes aren't watertight solids, so signed-volume
 * over-reports (a 1.3mm melee measured >its own bounding box). The girdle DIAMETER from the
 * bounding box is robust and is exactly how the trade sizes stones. Standard round-diamond
 * table: carat = (diameter_mm / 6.5)³  (6.5mm ≈ 1.00ct; matches 1.25mm→0.007, 2mm→0.03).
 *
 * Units: glTF's standard unit is meters, and CAD exports here come through that way (a ring
 * reads ~0.028 model units = 28mm). We auto-detect the unit from the overall model size —
 * no dependence on a matching STL.
 */
import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { meshMatchesSlot } from '@crittercodes/refrakt';

// Convert a model-unit length to millimeters from the overall piece size (jewelry is small).
function unitToMm(longestModelDim) {
  if (longestModelDim < 1) return 1000; // meters (glTF standard) — e.g. 0.028 → 28mm
  if (longestModelDim < 5) return 10;   // centimeters — e.g. a 2.5 → 25mm ring
  return 1;                             // already millimeters
}

// Carat from the face-up footprint (length × width), shape-agnostic. The two largest bbox
// dims ARE the shape (a baguette's box is long+thin, a princess's is square), so no need to
// know the cut. Depth is estimated from the width (~0.62×W, the usual proportion) rather than
// the raw mesh z, which is noisy (bezel seats, orientation). Factor calibrated so a 6.5mm
// round ≈ 1.00ct; matches the trade's L×W×depth×factor rule. Dims snapped to 0.25mm.
function caratFromFootprintMm(lengthMm, widthMm) {
  const l = Math.round(lengthMm / 0.25) * 0.25;
  const w = Math.round(widthMm / 0.25) * 0.25;
  return Math.round(0.00364 * l * w * w * 1000) / 1000; // 0.00364 = 0.62 depth-ratio × 0.00587
}

function Probe({ glbUrl, meshMap, onMeasure }) {
  const { scene } = useGLTF(glbUrl);
  const done = useRef(false);
  useEffect(() => {
    if (!scene || done.current) return;
    done.current = true;
    try {
      scene.updateMatrixWorld(true);
      const gemSlots = (meshMap || []).filter((s) => s.type === 'gem');
      const whole = new THREE.Box3().setFromObject(scene);
      const wsz = new THREE.Vector3(); whole.getSize(wsz);
      const toMm = unitToMm(Math.max(wsz.x, wsz.y, wsz.z));

      const carats = {};
      const box = new THREE.Box3();
      const sz = new THREE.Vector3();
      scene.traverse((o) => {
        if (!o.isMesh || o.userData?.__outline) return;
        const slot = gemSlots.find((s) => meshMatchesSlot(o.name, s));
        if (!slot) return;
        box.setFromObject(o); box.getSize(sz);
        // Two largest bbox dims (mm) = the face-up footprint: length ≥ width.
        const dims = [sz.x, sz.y, sz.z].map((v) => v * toMm).sort((a, b) => b - a);
        carats[slot.nameContains] = caratFromFootprintMm(dims[0], dims[1]);
      });
      onMeasure({ carats, unitToMm: toMm });
    } catch (e) {
      onMeasure({ carats: {}, error: e.message });
    }
  }, [scene, glbUrl]); // measure once per GLB
  return null;
}

export default function GemMeasurer({ glbUrl, meshMap, onMeasure }) {
  if (!glbUrl || !meshMap?.length) return null;
  return (
    <div aria-hidden style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <Canvas frameloop="demand" style={{ width: 1, height: 1 }} gl={{ preserveDrawingBuffer: false }}>
        <Suspense fallback={null}>
          <Probe glbUrl={glbUrl} meshMap={meshMap} onMeasure={onMeasure} />
        </Suspense>
      </Canvas>
    </div>
  );
}
