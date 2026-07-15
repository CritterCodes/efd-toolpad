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
 * the @crittercodes/refrakt package, so render output matches.
 */

import { useEffect, useLayoutEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, ArcballControls, Html } from '@react-three/drei';
import * as THREE from 'three';

import { buildFrag } from '../core/shaders';
import { makeMat, syncBVH } from '../core/helpers';
import { Lights } from '../core/lights';
import { defaultRegistry } from '../core/registry';

const _box = new THREE.Box3();
const _c = new THREE.Vector3();
const _s = new THREE.Vector3();
const FIT_RADIUS = 1.0;
const HL_COLOR = 0x29e0ff; // bright cyan — high contrast vs gold metal AND gemstones

// Selection outline: a back-face shell pushed out in SCREEN space, so the rim is a
// constant thickness in pixels regardless of stone size — a tiny melee stone gets
// just as visible a rim as a big centre stone (the old normal-inflate scaled with
// the stone, so melee rims were hair-thin). Cyan so it never blends into the metal.
function makeOutline(mesh) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(HL_COLOR) }, uWidth: { value: 0.014 } },
    vertexShader: `
      uniform float uWidth;   // constant screen-space (NDC) rim thickness
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 vn = normalize(normalMatrix * normal);   // view-space normal
        clip.xy += vn.xy * uWidth * clip.w;           // push the silhouette out in screen space
        gl_Position = clip;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
    depthTest: true,
  });
  const ov = new THREE.Mesh(mesh.geometry, mat);
  ov.renderOrder = 998;
  ov.name = '__refrakt_outline';
  ov.userData.__outline = true; // so the mesh-collection pass never treats it as a part
  return ov;
}

function Scene({ glbUrl, assign, selectedNames, onPick, onMeshes, orientation, registry }) {
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
  const [markers, setMarkers] = useState([]); // world centers of selected meshes (for pinned dots)

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
    onMeshes?.(meshes.map((m) => m.name));

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

      if (a.role === 'metal') { mesh.material = registry.makeMetal(a); continue; }

      const cfg = registry.resolveGem(a);
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
  }, [assign, glbScene, engineReady, registry]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Pinned dot-markers: a constant-size cyan ring at each selected stone's centre.
  // Size-independent (unlike the rim), so melee stay clearly visible. Stones are
  // static in world space (the camera orbits), so we compute world centres once
  // per selection/orientation change and let <Html> re-project them each frame.
  useEffect(() => {
    const g = groupRef.current;
    if (!g) { setMarkers([]); return; }
    g.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const out = [];
    for (const name of selectedNames) {
      const mesh = meshesRef.current.find((m) => m.name === name);
      if (!mesh) continue;
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      v.copy(mesh.geometry.boundingSphere.center).applyMatrix4(mesh.matrixWorld);
      out.push([v.x, v.y, v.z]);
    }
    setMarkers(out);
  }, [selKey, orientation, engineReady, glbScene]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <>
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
      {markers.map((p, i) => (
        <Html key={i} position={p} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div className="rfk-sel-marker" style={{
            width: 13, height: 13, borderRadius: '50%',
            border: '2px solid #29e0ff', background: 'rgba(41,224,255,0.10)',
            boxShadow: '0 0 5px #29e0ff, inset 0 0 3px rgba(41,224,255,0.5)',
          }} />
        </Html>
      ))}
    </>
  );
}

export default function StudioViewer({ glbUrl, assign = {}, selectedNames = [], onPick, onClear, onMeshes, orientation, environment = 'city', background = '#080808', autoRotate = false, arcball = false, registry = defaultRegistry, style }) {
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
          <Scene glbUrl={glbUrl} assign={assign} selectedNames={selectedNames} onPick={onPick} onMeshes={onMeshes} orientation={orientation} registry={registry} />
        </Suspense>
        {arcball ? (
          // Free tumble — grab and reorient to ANY angle, incl. roll (like JewelryViewer's arcball).
          // Click-to-select still works: the mesh pointer down/up drag-threshold is control-agnostic.
          <ArcballControls makeDefault enablePan={false} enableZoom minDistance={0.6} maxDistance={12} />
        ) : (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            zoomToCursor
            autoRotate={autoRotate}
            autoRotateSpeed={1.0}
            enableDamping
            dampingFactor={0.08}
            minDistance={0.6}
            maxDistance={12}
            minPolarAngle={Math.PI * 0.05}
            maxPolarAngle={Math.PI * 0.95}
          />
        )}
      </Canvas>
    </div>
  );
}
