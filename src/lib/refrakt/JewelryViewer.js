'use client'
/**
 * REFRAKT — JewelryViewer
 *
 * NOTE: Ported verbatim from efd-shop/lib/refrakt (the customer-facing viewer) so the
 * admin renders GLBs (CAD QC, 3D & Share) with the SAME renderer the client sees. This
 * is a temporary duplicate pending the planned `packages/refrakt` extraction consumed by
 * both apps — keep in sync with the shop copy until then.
 *
 * Generic BVH ray-marching gemstone viewer for PRODUCT pages.
 * Accepts any GLB + a config object that maps mesh names to material/gem types.
 *
 * Interaction model: this is an inspectable product viewer — drag to orbit to
 * any angle, scroll to zoom, with a slow turntable auto-rotate that pauses while
 * the user is interacting. It deliberately does NOT do the homepage's cursor-
 * follow gem-lift / glow (that vanity lives in the inline app/experience scenes).
 *
 * Usage (SSR-safe — always dynamically import this component):
 *
 *   const JewelryViewer = dynamic(() => import('@/lib/refrakt/JewelryViewer'), { ssr: false })
 *
 *   <JewelryViewer
 *     glbUrl="/models/efd_ring.glb"
 *     config={{
 *       scale: 50,
 *       camera: { position: [0, 0.05, 2.8], fov: 36 },
 *       meshMap: [
 *         { nameContains: 'mounting', type: 'metal', finish: 'gold' },
 *         { nameContains: 'diamond',  type: 'gem',   gemPreset: 'diamond' },
 *         { nameContains: 'amethyst', type: 'gem',   gemPreset: 'amethyst' },
 *       ],
 *       environment: 'city',
 *       background: '#080808',
 *     }}
 *   />
 *
 * Config reference:
 *   scale            {number}   Three.js group scale (50 for cm geometry, 0.05 for mm)
 *   camera.position  {[x,y,z]} Initial camera position / orbit radius (default [0, 0.05, 2.8])
 *   camera.fov       {number}  Camera field-of-view (default 36)
 *   meshMap          {array}   Array of mesh slot descriptors (see below)
 *   environment      {string}  drei Environment preset (city|studio|sunset|dawn|forest|night|park|warehouse)
 *   background       {string}  CSS background color (default '#080808')
 *   autoRotate       {boolean} Turntable auto-rotation (default true)
 *   autoRotateSpeed  {number}  Turntable speed (default 1.2)
 *   enableZoom       {boolean} Scroll/pinch zoom (default true)
 *
 * meshMap slot:
 *   { nameContains, type: 'metal', finish: 'gold'|'satin'|'whiteGold'|'roseGold'|'platinum'|'silver' }
 *   { nameContains, type: 'gem',   gemPreset: 'diamond'|'amethyst'|'ruby'|'sapphire'|'emerald'|'marquise'|'moissanite' }
 *   { nameContains, type: 'gem',   ior, color:[r,g,b], aberration, fresnel, facetBlend, colorMode }  // custom
 *   { nameContains, type: 'ignore' }  // hides the mesh
 */

import { useRef, useLayoutEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { GEM_CONFIGS, GOLD_MAT, SATIN_MAT, SILVER_MAT } from './core/materials'
import { buildFrag } from './core/shaders'
import { makeMat, syncBVH } from './core/helpers'
import { Lights } from './core/lights'

// ── Metal material factory ────────────────────────────────────────────────────
const METAL_MATS = {
    gold:      () => GOLD_MAT.clone(),
    satin:     () => SATIN_MAT.clone(),
    whiteGold: () => SILVER_MAT.clone(),
    platinum:  () => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0.80, 0.82, 0.85),
        metalness: 1.0, roughness: 0.09, envMapIntensity: 1.8,
    }),
    roseGold:  () => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0.85, 0.58, 0.52),
        metalness: 1.0, roughness: 0.07, envMapIntensity: 2.0,
    }),
    silver:    () => SILVER_MAT.clone(),
}

// ── Gem config resolver ───────────────────────────────────────────────────────
function resolveGemCfg(slot) {
    const base = GEM_CONFIGS[slot.gemPreset] || GEM_CONFIGS.diamond
    return {
        ior:     slot.ior        ?? base.ior,
        color:   slot.color      ? new THREE.Color(...slot.color) : base.color.clone(),
        aber:    slot.aberration ?? base.aber,
        fresnel: slot.fresnel    ?? base.fresnel,
        fb:      slot.facetBlend ?? base.fb,
        cm:      slot.colorMode  ?? base.cm,
        off:     base.off,
    }
}

// Scratch objects for the one-time normalize (no per-frame allocation)
const _box = new THREE.Box3()
const _c   = new THREE.Vector3()
const _s   = new THREE.Vector3()
// Every model is normalized to this bounding-sphere radius at the origin, so a
// single fixed camera frames any GLB regardless of source units (mm/cm).
const FIT_RADIUS = 1.0

// ── Inner scene component (lives inside Canvas) ───────────────────────────────
function JewelryScene({ glbUrl, config }) {
    const { scene: glbScene }                 = useGLTF(glbUrl)
    const { scene: threeScene, size, camera } = useThree()
    const groupRef = useRef()
    const bvhList  = useRef([])
    const initDone = useRef(false)

    const meshMap  = config.meshMap ?? []
    const gemSlots = meshMap.filter(s => s.type === 'gem')

    // ── Orient → assign materials → center at origin → normalize to unit sphere ─
    // Done once, deterministically, so the orbit pivots on the piece and a fixed
    // camera frames it. OrbitControls then drives drag + turntable from origin.
    useLayoutEffect(() => {
        const g = groupRef.current
        if (!g || !glbScene) return

        // Orientation: auto for most CAD exports; override via config.orientation.
        const o = config.orientation
        glbScene.rotation.set(
            Array.isArray(o) ? (o[0] || 0) : 0,
            Array.isArray(o) ? (o[1] || 0) : 0,
            Array.isArray(o) ? (o[2] || 0) : 0,
        )
        glbScene.position.set(0, 0, 0)

        // Materials (gems are upgraded to the BVH shader once env is ready, below).
        glbScene.traverse(child => {
            if (!child.isMesh) return
            child.castShadow    = true
            child.receiveShadow = true
            const n = child.name.toLowerCase()
            for (const slot of meshMap) {
                const key = (slot.nameContains ?? '').toLowerCase()
                if (!n.includes(key)) continue
                if (slot.type === 'metal') child.material = (METAL_MATS[slot.finish] || METAL_MATS.gold)()
                if (slot.type === 'ignore') child.visible = false
                break // first matching slot wins
            }
        })

        // Measure at scale 1 → recenter content at origin → scale to unit sphere.
        g.scale.setScalar(1)
        g.updateMatrixWorld(true)
        _box.setFromObject(g)
        if (_box.isEmpty()) return
        _box.getCenter(_c)
        _box.getSize(_s)
        const radius = 0.5 * Math.hypot(_s.x, _s.y, _s.z) || 1
        glbScene.position.copy(_c).multiplyScalar(-1)         // center at origin
        g.scale.setScalar(config.scale ?? (FIT_RADIUS / radius))
        g.updateMatrixWorld(true)
    }, [glbScene]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Per-frame: BVH lazy init + uniform sync ───────────────────────────────
    // OrbitControls drives all camera motion (drag + turntable around origin).
    // Here we only keep the gem shader uniforms in sync with the moving camera.
    useFrame((state) => {
        // BVH init — wait until scene.environment is ready (Environment HDR loads async)
        if (!initDone.current && threeScene.environment && gemSlots.length) {
            initDone.current = true
            import('three-mesh-bvh').then(({ shaderStructs: ss, shaderIntersectFunction: si, MeshBVH, MeshBVHUniformStruct, SAH }) => {
                const frag = buildFrag(ss, si)

                for (const slot of gemSlots) {
                    const nameKey = (slot.nameContains ?? '').toLowerCase()
                    const gemCfg  = resolveGemCfg(slot)

                    const meshes = []
                    glbScene.traverse(c => {
                        if (c.isMesh && c.name.toLowerCase().includes(nameKey)) meshes.push(c)
                    })
                    if (!meshes.length) continue

                    // Shared BVH — build once from first mesh, reuse for identical geometry
                    const bvh       = new MeshBVH(meshes[0].geometry.clone(), { strategy: SAH, maxLeafTris: 1 })
                    const bvhStruct = new MeshBVHUniformStruct()
                    bvhStruct.updateFrom(bvh)

                    for (const mesh of meshes) {
                        const mat = makeMat({
                            env: threeScene.environment,
                            size,
                            state: { camera },
                            bvhStruct,
                            frag,
                            mesh,
                            ...gemCfg,
                        })
                        mesh.material = mat
                        bvhList.current.push({ mesh, mat })
                    }
                }
            })
        }

        glbScene.updateMatrixWorld(true)
        syncBVH(bvhList.current, state, size)
    })

    return (
        <group ref={groupRef}>
            <primitive object={glbScene} />
        </group>
    )
}

// ── Public API ────────────────────────────────────────────────────────────────
export default function JewelryViewer({ glbUrl, config = {}, style, className }) {
    const bg     = config.background ?? '#080808'
    // The scene normalizes every model to a unit sphere at the origin, so this
    // fixed camera frames any GLB. Slightly elevated 3/4 view; ~80% fill.
    const camPos = config.camera?.position ?? [0, 1.0, 4.0]
    const camFov = config.camera?.fov      ?? 35
    const env    = config.environment      ?? 'city'

    const autoRotate      = config.autoRotate      ?? true
    const autoRotateSpeed = config.autoRotateSpeed ?? 1.2
    const enableZoom      = config.enableZoom      ?? true

    if (!glbUrl) {
        return (
            <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
                <span style={{ color: '#666', fontSize: 14, fontFamily: 'monospace' }}>No model configured</span>
            </div>
        )
    }

    return (
        <div
            className={className}
            style={{ width: '100%', height: '100%', background: bg, touchAction: 'none', ...style }}>
            <Canvas
                camera={{ position: camPos, fov: camFov }}
                gl={{
                    antialias:    true,
                    toneMapping:  THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2,
                }}
                dpr={[1, 1.5]}>
                <Lights />
                <Environment preset={env} />
                <Suspense fallback={null}>
                    <JewelryScene glbUrl={glbUrl} config={config} />
                </Suspense>
                <OrbitControls
                    makeDefault
                    enablePan={false}
                    enableZoom={enableZoom}
                    autoRotate={autoRotate}
                    autoRotateSpeed={autoRotateSpeed}
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={1.8}
                    maxDistance={12}
                    minPolarAngle={Math.PI * 0.12}
                    maxPolarAngle={Math.PI * 0.88}
                />
            </Canvas>
        </div>
    )
}
