'use client';

/**
 * Headless GLB probe: measures each gem mesh's volume (via REFRAKT's computeSlotVolumes,
 * which already decodes the GLB through drei) and converts to a DIAMOND-equivalent carat
 * (volume × 3.52 SG ÷ 0.2 g/ct = ×17.6) so stone-setting labor can be inferred by band —
 * the same way the owner eyeballs a colored stone as "the diamond it looks like".
 *
 * Units are the one real unknown (a GLB may be authored in mm/cm/m). Rather than guess, we
 * CALIBRATE against the design's known STL mounting volume: measure the GLB's metal volume,
 * scale so it equals stlVolumeCm3, then apply that scale to the gems. Falls back to a mm
 * assumption (low confidence) when there's no STL.
 */
import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { computeSlotVolumes } from '@crittercodes/refrakt';

const CT_PER_CM3 = 17.6;

function Probe({ glbUrl, meshMap, stlVolumeCm3, onMeasure }) {
  const { scene } = useGLTF(glbUrl);
  const done = useRef(false);
  useEffect(() => {
    if (!scene || done.current) return;
    done.current = true;
    try {
      const metalSlots = (meshMap || []).filter((s) => s.type === 'metal');
      const gemSlots = (meshMap || []).filter((s) => s.type === 'gem');
      // Raw model-unit³ volumes (modelUnit 'cm' → unit factor 1 → untouched raw volume).
      const metalRaw = computeSlotVolumes(scene, metalSlots, { modelUnit: 'cm' });
      const gemRaw = computeSlotVolumes(scene, gemSlots, { modelUnit: 'cm' });
      const metalRawTotal = Object.values(metalRaw).reduce((s, v) => s + v, 0);

      // unitCubed = cm³ per model-unit³. Calibrate off the known STL mounting volume.
      let unitCubed;
      let calibrated;
      if (Number(stlVolumeCm3) > 0 && metalRawTotal > 0) {
        unitCubed = Number(stlVolumeCm3) / metalRawTotal;
        calibrated = true;
      } else {
        unitCubed = 0.001; // assume model units are mm (mm³ → cm³)
        calibrated = false;
      }

      const carats = {};
      for (const [name, raw] of Object.entries(gemRaw)) {
        carats[name] = Math.round(raw * unitCubed * CT_PER_CM3 * 1000) / 1000;
      }
      onMeasure({ carats, calibrated });
    } catch (e) {
      onMeasure({ carats: {}, calibrated: false, error: e.message });
    }
  }, [scene, glbUrl]); // measure once per GLB
  return null;
}

export default function GemMeasurer({ glbUrl, meshMap, stlVolumeCm3, onMeasure }) {
  if (!glbUrl || !meshMap?.length) return null;
  return (
    <div aria-hidden style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <Canvas frameloop="demand" style={{ width: 1, height: 1 }} gl={{ preserveDrawingBuffer: false }}>
        <Suspense fallback={null}>
          <Probe glbUrl={glbUrl} meshMap={meshMap} stlVolumeCm3={stlVolumeCm3} onMeasure={onMeasure} />
        </Suspense>
      </Canvas>
    </div>
  );
}
