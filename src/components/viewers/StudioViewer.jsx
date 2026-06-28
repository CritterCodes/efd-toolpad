'use client';

/**
 * REFRAKT StudioViewer — interactive editor viewer.
 *
 * Unlike the canonical JewelryViewer (a turntable display for product pages),
 * this one is built for editing:
 *   • click a mesh to select it (click more to accumulate, click empty to clear)
 *   • selected meshes get a gold additive highlight
 *   • materials update IN PLACE when `assign` changes — no remount, so the
 *     camera and selection survive every edit
 *   • turntable is opt-in (off by default)
 *
 * It shares the gem shader / materials / lights with the canonical engine via
 * the lib/refrakt/core modules, so render output matches.
 */

import { useEffect, useLayoutEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { GEM_CONFIGS, GOLD_MAT, SATIN_MAT, SILVER_MAT } from '@/lib/refrakt/core/materials';
import { buildFrag } from '@/lib/refrakt/core/shaders';
import { makeMat, syncBVH } from '@/lib/refrakt/core/helpers';
import { Lights } from '@/lib/refrakt/core/lights';

const METAL_MATS = {
  gold: () => GOLD_MAT.clone(),
  satin: () => SATIN_MAT.clone(),
  whiteGold: () => SILVER_MAT.clone(),
  platinum: () => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.8, 0.82, 0.85), metalness: 1, roughness: 0.09, envMapIntensity: 1.8 }),
  roseGold: () => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.85, 0.58, 0.52), metalness: 1, roughness: 0.07, envMapIntensity: 2 }),
  silver: () => SILVER_MAT.clone(),
};

// Effective gem params = preset defaults overridden by any custom values on the
// assignment (ior / color [r,g,b] / aber / fresnel / fb / cm).
function resolveGemCfg(a) {
  const base = GEM_CONFIGS[a.gemPreset] || GEM_CONFIGS.diamond;
  const color = Array.isArray(a.color) ? new THREE.Color(a.color[0], a.color[1], a.color[2]) : base.color.clone();
  const density = a.density ?? base.density ?? 0;
  const absorption = new THREE.Vector3((1 - color.r) * density, (1 - color.g) * density, (1 - color.b) * density);
  return {
    ior: a.ior ?? base.ior,
    color,
    aber: a.aber ?? base.aber,
    fresnel: a.fresnel ?? base.fresnel,
    fb: a.fb ?? base.fb,
    cm: a.cm ?? base.cm,
    off: base.off,
    absorption,
    inclusions: a.inclusions ?? base.incl ?? 0,
    inclScale: a.inclScale ?? base.inclScale ?? 1,
    tubes: a.tubes ?? base.tubes ?? 0,
    tubeAngle: a.tubeAngle ?? base.tubeAngle ?? 0,
    velvet: a.velvet ?? base.velvet ?? 0,
    opacity: a.opacity ?? base.opacity ?? 0,
  };
}

function makeMetalMat(a) {
  const m = (METAL_MATS[a.finish] || METAL_MATS.gold)();
  if (Array.isArray(a.color)) m.color.setRGB(a.color[0], a.color[1], a.color[2]);
  if (a.roughness != null) m.roughness = a.roughness;
  return m;
}

const _box = new THREE.Box3();
const _c = new THREE.Vector3();
const _s = new THREE.Vector3();
const FIT_RADIUS = 1.0;
const HL_COLOR = 0xffcc33;

// Selection outline: a back-face shell inflated along normals, so it draws a
// clean rim AROUND the part without tinting its surface (true colour stays
// visible while editing). Width scales with each mesh's own size, so it reads
// consistently on a tiny pavé stone and on the band alike.
function makeOutline(mesh) {
  const geo = mesh.geometry;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const width = (geo.boundingSphere?.radius || 1) * 0.045;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(HL_COLOR) }, uWidth: { value: width } },
    vertexShader: `
      uniform float uWidth;
      void main() {
        vec3 p = position + normalize(normal) * uWidth;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
  });
  const ov = new THREE.Mesh(geo, mat);
  ov.renderOrder = 998;
  ov.name = '__refrakt_outline';
  ov.userData.__outline = true; // so the mesh-collection pass never treats it as a part
  return ov;
}

function Scene({ glbUrl, assign, selectedNames, onPick, orientation }) {
  const { scene: glbScene } = useGLTF(glbUrl);
  const { scene: threeScene, size, camera } = useThree();

  const groupRef = useRef();
  const meshesRef = useRef([]);
  const gemListRef = useRef([]);
  const bvhCacheRef = useRef(new Map());
  const overlaysRef = useRef(new Map());
  const bvhModRef = useRef(null);
  const fragRef = useRef(null);
  const downRef = useRef(null);
  const envDoneRef = useRef(false);

  const [engineReady, setEngineReady] = useState(0);

  // Load three-mesh-bvh once; build the fragment shader.
  useEffect(() => {
    let alive = true;
    import('three-mesh-bvh')
      .then((mod) => {
        if (!alive) return;
        bvhModRef.current = mod;
        fragRef.current = buildFrag(mod.shaderStructs, mod.shaderIntersectFunction);
        setEngineReady((v) => v + 1);
      })
      .catch((e) => console.warn('[REFRAKT] failed to load three-mesh-bvh.', e));
    return () => { alive = false; };
  }, []);

  // Collect meshes + normalize to a unit sphere at the origin (re-runs on orientation).
  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g || !glbScene) return;
    glbScene.rotation.set(orientation?.[0] || 0, orientation?.[1] || 0, orientation?.[2] || 0);
    glbScene.position.set(0, 0, 0);

    const meshes = [];
    glbScene.traverse((c) => {
      if (c.isMesh && !c.userData.__outline) { c.castShadow = true; c.receiveShadow = true; meshes.push(c); }
    });
    meshesRef.current = meshes;

    g.scale.setScalar(1);
    g.updateMatrixWorld(true);
    _box.makeEmpty();
    for (const m of meshes) _box.expandByObject(m); // fit to real parts only, never the outline shells
    if (!_box.isEmpty()) {
      _box.getCenter(_c);
      _box.getSize(_s);
      const r = 0.5 * Math.hypot(_s.x, _s.y, _s.z) || 1;
      glbScene.position.copy(_c).multiplyScalar(-1);
      g.scale.setScalar(FIT_RADIUS / r);
      g.updateMatrixWorld(true);
    }
  }, [glbScene, orientation]);

  // Apply materials in place whenever assignment (or the engine) changes.
  useEffect(() => {
    if (!glbScene) return;
    const envReady = !!threeScene.environment;
    const bvhMod = bvhModRef.current;
    const gemList = [];

    for (const mesh of meshesRef.current) {
      const a = assign[mesh.name] || { role: 'metal', finish: 'gold' };
      if (a.role === 'ignore') { mesh.visible = false; continue; }
      mesh.visible = true;

      if (a.role === 'metal') { mesh.material = makeMetalMat(a); continue; }

      const cfg = resolveGemCfg(a);
      let bvhStruct = null;
      if (bvhMod && envReady && fragRef.current) {
        bvhStruct = bvhCacheRef.current.get(mesh.geometry.uuid);
        if (!bvhStruct) {
          try {
            const bvh = new bvhMod.MeshBVH(mesh.geometry.clone(), { strategy: bvhMod.SAH, maxLeafTris: 1 });
            bvhStruct = new bvhMod.MeshBVHUniformStruct();
            bvhStruct.updateFrom(bvh);
            bvhCacheRef.current.set(mesh.geometry.uuid, bvhStruct);
          } catch (e) {
            console.warn(`[REFRAKT] BVH build failed for "${mesh.name}" — using glass fallback.`, e);
          }
        }
      }
      if (bvhStruct) {
        const mat = makeMat({ env: threeScene.environment, size, state: { camera }, bvhStruct, frag: fragRef.current, mesh, ...cfg });
        mesh.material = mat;
        gemList.push({ mesh, mat });
      } else {
        // Glass stand-in until env + BVH are ready (or if the BVH build failed).
        mesh.material = new THREE.MeshPhysicalMaterial({ color: cfg.color.clone(), metalness: 0, roughness: 0.05, transmission: 1, ior: cfg.ior, thickness: 0.4, transparent: true, envMapIntensity: 1.6 });
      }
    }
    gemListRef.current = gemList;
  }, [assign, glbScene, engineReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selection highlight: additive gold overlay sharing each mesh's geometry.
  const selKey = selectedNames.join('|');
  useEffect(() => {
    const cur = overlaysRef.current;
    const want = new Set(selectedNames);
    for (const [name, ov] of [...cur]) {
      if (!want.has(name)) { ov.parent?.remove(ov); ov.material.dispose(); cur.delete(name); }
    }
    for (const name of selectedNames) {
      if (cur.has(name)) continue;
      const mesh = meshesRef.current.find((m) => m.name === name);
      if (!mesh) continue;
      const ov = makeOutline(mesh);
      mesh.add(ov);
      cur.set(name, ov);
    }
  }, [selKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame: detect env ready (to upgrade glass → BVH), keep gem uniforms synced.
  useFrame((state) => {
    if (!envDoneRef.current && threeScene.environment && bvhModRef.current) {
      envDoneRef.current = true;
      setEngineReady((v) => v + 1);
    }
    if (glbScene) glbScene.updateMatrixWorld(true);
    syncBVH(gemListRef.current, state, size);
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={(e) => { downRef.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const d = downRef.current;
        downRef.current = null;
        if (!d) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return; // was a drag/orbit
        const hit = e.intersections.find((i) => i.object?.isMesh && i.object.visible);
        if (hit?.object?.name) {
          e.stopPropagation();
          onPick(hit.object.name);
        }
      }}
    >
      <primitive object={glbScene} />
    </group>
  );
}

export default function StudioViewer({ glbUrl, assign = {}, selectedNames = [], onPick, onClear, orientation, environment = 'city', background = '#080808', autoRotate = false, style }) {
  return (
    <div style={{ width: '100%', height: '100%', background, touchAction: 'none', ...style }}>
      <Canvas
        camera={{ position: [0, 1.0, 4.0], fov: 35 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        dpr={[1, 1.5]}
        onPointerMissed={() => onClear?.()}
      >
        <Lights />
        <Environment preset={environment} />
        <Suspense fallback={null}>
          <Scene glbUrl={glbUrl} assign={assign} selectedNames={selectedNames} onPick={onPick} orientation={orientation} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          autoRotate={autoRotate}
          autoRotateSpeed={1.0}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.6}
          maxDistance={12}
          minPolarAngle={Math.PI * 0.05}
          maxPolarAngle={Math.PI * 0.95}
        />
      </Canvas>
    </div>
  );
}
