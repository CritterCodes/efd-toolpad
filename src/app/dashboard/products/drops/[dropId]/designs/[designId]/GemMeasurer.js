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

function caratFromDiameterMm(mm) {
  const snapped = Math.round(mm / 0.25) * 0.25; // 0.25mm trade increment → clean size buckets
  return Math.round((snapped / 6.5) ** 3 * 1000) / 1000;
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
        // Median bbox dimension = girdle spread (round: diameter; fancy: width).
        const dims = [sz.x, sz.y, sz.z].sort((a, b) => a - b);
        carats[slot.nameContains] = caratFromDiameterMm(dims[1] * toMm);
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
