'use client'
/**
 * REFRAKT — JewelryViewer
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
 *   controls         {string}  'orbit' (default turntable) | 'arcball' (free tumble incl.
 *                              roll — grab and reorient the piece to ANY angle). When
 *                              render is enabled a ⟲ "free rotate" toggle flips this live.
 *
 * meshMap slot:
 *   { nameContains, type: 'metal', finish: 'gold'|'satin'|'whiteGold'|'roseGold'|'platinum'|'silver' }
 *   { nameContains, type: 'gem',   gemPreset: 'diamond'|'amethyst'|'ruby'|'sapphire'|'emerald'|'marquise'|'moissanite' }
 *   { nameContains, type: 'gem',   ior, color:[r,g,b], aberration, fresnel, facetBlend, colorMode }  // custom
 *   { nameContains, type: 'ignore' }  // hides the mesh
 *
 * Optional AI render — a "Generate render" button, a scene picker + turntable pause appear
 * ONLY when `onRender` is provided (the viewer stays clean for hosts that don't wire it):
 *   onRender      {fn}      async ({ image, prompt, materials, scene, context, config }) => imageUrl | { url }
 *                           `image` is a PNG data URL of the current frame; `prompt` is a
 *                           full prompt built from the config + chosen scene; `materials`/
 *                           `scene`/`context` are the parts (so the server helper can author
 *                           the final prompt). Call your image model SERVER-SIDE — the
 *                           easiest path is `generateRender` from '@crittercodes/refrakt/server'.
 *   onSaveRender  {fn}      async (imageUrl, { prompt }) => void — adds a "Save as product image" button.
 *   renderContext {string}  extra prompt context (e.g. product name / "engagement ring").
 *   renderScenes  {array}   override the scene picker options (default RENDER_SCENES).
 *   renderLabel   {string}  button label (default "Generate render").
 */

import { useRef, useMemo, useState, useLayoutEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, OrbitControls, ArcballControls } from '@react-three/drei'
import * as THREE from 'three'

import { buildFrag } from './core/shaders'
import { makeMat, syncBVH } from './core/helpers'
import { Lights } from './core/lights'
import { createRegistry } from './core/registry'
import { RENDER_SCENES, DEFAULT_SCENE, sceneFragment } from './core/renderScenes'

// Scratch objects for the one-time normalize (no per-frame allocation)
const _box = new THREE.Box3()
const _c   = new THREE.Vector3()
const _s   = new THREE.Vector3()
// Every model is normalized to this bounding-sphere radius at the origin, so a
// single fixed camera frames any GLB regardless of source units (mm/cm).
const FIT_RADIUS = 1.0

// Slot → mesh matching. Default is case-insensitive substring (forgiving, good
// for hand-written configs like 'mounting'). Set slot.match === 'exact' to
// require the whole name — the Studio uses this so per-stone assignments can't
// bleed across similarly-named meshes (e.g. 'Diamond_04' vs 'Diamond_04001').
function slotMatches(meshNameLower, slot) {
    const key = (slot.nameContains ?? '').toLowerCase()
    if (!key) return false
    return slot.match === 'exact' ? meshNameLower === key : meshNameLower.includes(key)
}

// ── Inner scene component (lives inside Canvas) ───────────────────────────────
function JewelryScene({ glbUrl, config, registry }) {
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
                if (!slotMatches(n, slot)) continue
                if (slot.type === 'metal') child.material = registry.makeMetal(slot)
                if (slot.type === 'ignore') child.visible = false
                // Gems get an immediate transmissive-glass stand-in so they never
                // flash (or get stuck on) the GLB's raw material. The BVH shader
                // below replaces it once the environment is ready; if that fails,
                // the piece still reads as a gem instead of a white blob.
                if (slot.type === 'gem') {
                    const g = registry.resolveGem(slot)
                    child.material = new THREE.MeshPhysicalMaterial({
                        color:           g.color.clone(),
                        metalness:       0,
                        roughness:       0.05,
                        transmission:    1,
                        ior:             g.ior,
                        thickness:       0.4,
                        transparent:     true,
                        envMapIntensity: 1.6,
                    })
                }
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
                    const gemCfg  = registry.resolveGem(slot)

                    const meshes = []
                    glbScene.traverse(c => {
                        if (c.isMesh && slotMatches(c.name.toLowerCase(), slot)) meshes.push(c)
                    })
                    if (!meshes.length) {
                        console.warn(`[REFRAKT] gem slot "${slot.nameContains}" matched no meshes — check the mesh name.`)
                        continue
                    }

                    // Build per slot in isolation: a bad geometry shouldn't take down
                    // the other gems. The transmissive stand-in stays if this throws.
                    try {
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
                    } catch (err) {
                        console.warn(`[REFRAKT] BVH gem shader failed for "${slot.nameContains}" — falling back to glass material.`, err)
                    }
                }
            }).catch(err => console.warn('[REFRAKT] failed to load three-mesh-bvh.', err))
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

// ── Capture bridge (lives inside Canvas) — exposes a frame grab to the parent ──
// preserveDrawingBuffer (set on the Canvas when onRender is used) keeps the last
// frame readable; we force one render then read the pixels as a PNG data URL.
function Capture({ apiRef }) {
    const { gl, scene, camera } = useThree()
    useLayoutEffect(() => {
        apiRef.current = () => { try { gl.render(scene, camera); return gl.domElement.toDataURL('image/png') } catch { return null } }
        return () => { apiRef.current = null }
    }, [gl, scene, camera])
    return null
}

// Build a natural-language material description from the config's meshMap, so the
// image model knows what the metals and stones are ("yellow gold; diamond stones").
function describeConfig(config, registry) {
    const meshMap = config?.meshMap ?? []
    const metals = new Set(), gems = new Set()
    for (const s of meshMap) {
        if (s.type === 'gem') gems.add((registry.get && registry.get(s.gemPreset)?.label) || s.gemPreset || 'gemstone')
        else if (s.type === 'metal') metals.add((registry.get && registry.get(s.finish)?.label) || s.finish || 'precious metal')
    }
    const parts = []
    if (metals.size) parts.push(`${[...metals].join(' and ')} metalwork`)
    if (gems.size) parts.push(`${[...gems].join(', ')} ${gems.size > 1 ? 'stones' : 'stone'}`)
    return parts.join('; ')
}

// ── Public API ────────────────────────────────────────────────────────────────
export default function JewelryViewer({ glbUrl, config = {}, materials, onRender, onSaveRender, renderContext, renderScenes = RENDER_SCENES, renderLabel = 'Generate render', style, className }) {
    // Curated baseline merged with any tenant-supplied materials (app-sourced).
    const registry = useMemo(() => createRegistry(materials), [materials])
    const bg     = config.background ?? '#080808'
    // The scene normalizes every model to a unit sphere at the origin, so this
    // fixed camera frames any GLB. Slightly elevated 3/4 view; ~80% fill.
    const camPos = config.camera?.position ?? [0, 1.0, 4.0]
    const camFov = config.camera?.fov      ?? 35
    const env    = config.environment      ?? 'city'

    const autoRotate      = config.autoRotate      ?? true
    const autoRotateSpeed = config.autoRotateSpeed ?? 1.2
    const enableZoom      = config.enableZoom      ?? true
    // Zoom toward the cursor (so you can zoom into the head/a side stone, not just
    // the piece's center), and let the camera get close enough to inspect a small
    // part — the model is normalized to a unit sphere, so minDistance must be < 1.
    const zoomToCursor    = config.zoomToCursor    ?? true
    const enablePan       = config.enablePan       ?? false
    const minDistance     = config.minDistance     ?? 0.6
    const maxDistance     = config.maxDistance      ?? 12

    // Camera interaction: turntable orbit (default) vs free tumble (arcball, incl. roll).
    // `config.controls` sets the initial mode; the render controls expose a live toggle.
    const [arcball, setArcball] = useState(config.controls === 'arcball')

    // ── Generate Render (optional — only when the host wires an onRender handler) ──
    const captureRef = useRef(null)
    const [paused, setPaused]   = useState(false)
    const [busy, setBusy]       = useState(false)
    const [result, setResult]   = useState(null)
    const [err, setErr]         = useState(null)
    const [saved, setSaved]     = useState(false)
    const [sceneId, setSceneId] = useState(renderScenes[0]?.id ?? DEFAULT_SCENE)
    const modalOpen = busy || !!result || !!err

    const generate = async () => {
        if (!onRender) return
        setPaused(true); setErr(null); setResult(null); setSaved(false); setBusy(true)
        // Let the pause take effect + settle a frame so the capture is sharp.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        const image = captureRef.current && captureRef.current()
        if (!image) { setErr('Could not capture the view — try again.'); setBusy(false); return }
        const mats = describeConfig(config, registry)
        const sceneTxt = sceneFragment(sceneId)
        const prompt = `${renderContext ? renderContext + '. ' : ''}Photorealistic studio product photograph of this exact piece of fine jewelry, preserving its geometry, proportions and stone placement.${mats ? ' Materials: ' + mats + '.' : ''}${sceneTxt ? ' Setting: ' + sceneTxt + '.' : ''} Crisp macro detail, true-to-life materials, high-end jewelry catalog style.`
        try {
            const r = await onRender({ image, prompt, materials: mats, scene: sceneId, context: renderContext, config })
            const url = typeof r === 'string' ? r : (r && (r.url || r.image))
            if (!url) throw new Error('No image was returned.')
            setResult(url)
        } catch (e) { setErr((e && e.message) || 'Render failed.') } finally { setBusy(false) }
    }
    const closeModal = () => { setResult(null); setErr(null); setSaved(false) }
    const save = async () => {
        if (!onSaveRender || !result) return
        try { await onSaveRender(result, { prompt: describeConfig(config, registry) }); setSaved(true) }
        catch (e) { setErr((e && e.message) || 'Could not save.') }
    }

    // Small overlay control styles.
    const ctlBtn = { width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(12,12,15,0.7)', backdropFilter: 'blur(6px)', color: '#f4f4f5', cursor: 'pointer', fontSize: 14, lineHeight: 1 }

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
            style={{ position: 'relative', width: '100%', height: '100%', background: bg, touchAction: 'none', ...style }}>
            <Canvas
                camera={{ position: camPos, fov: camFov }}
                gl={{
                    antialias:    true,
                    toneMapping:  THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2,
                    preserveDrawingBuffer: !!onRender, // only pay the cost when render is enabled
                }}
                dpr={[1, 1.5]}>
                <Lights />
                <Environment preset={env} />
                <Suspense fallback={null}>
                    <JewelryScene glbUrl={glbUrl} config={config} registry={registry} />
                </Suspense>
                {onRender && <Capture apiRef={captureRef} />}
                {arcball ? (
                    // Free tumble — grab and reorient to any angle, including roll, so you
                    // can frame the piece from viewpoints the turntable can't reach.
                    <ArcballControls
                        makeDefault
                        enablePan={enablePan}
                        enableZoom={enableZoom}
                        minDistance={minDistance}
                        maxDistance={maxDistance}
                    />
                ) : (
                    <OrbitControls
                        makeDefault
                        enablePan={enablePan}
                        enableZoom={enableZoom}
                        zoomToCursor={zoomToCursor}
                        autoRotate={autoRotate && !paused}
                        autoRotateSpeed={autoRotateSpeed}
                        enableDamping
                        dampingFactor={0.08}
                        minDistance={minDistance}
                        maxDistance={maxDistance}
                        // Near-full polar range so top-down and under views are reachable
                        // (a small epsilon avoids the gimbal flip exactly at the poles).
                        minPolarAngle={0.02}
                        maxPolarAngle={Math.PI - 0.02}
                    />
                )}
            </Canvas>

            {/* Render controls — only present when the host wired an onRender handler. */}
            {onRender && (
                <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 8, zIndex: 5, alignItems: 'center' }}>
                    <button onClick={() => setArcball((v) => !v)} title={arcball ? 'Turntable (orbit)' : 'Free rotate (tumble + roll)'} style={{ ...ctlBtn, background: arcball ? '#fbbf24' : 'rgba(12,12,15,0.7)', color: arcball ? '#1a1408' : '#f4f4f5', border: arcball ? 'none' : '1px solid rgba(255,255,255,0.18)' }}>⟲</button>
                    {!arcball && <button onClick={() => setPaused((v) => !v)} title={paused ? 'Resume turntable' : 'Pause turntable'} style={ctlBtn}>{paused ? '▶' : '❙❙'}</button>}
                    {renderScenes.length > 1 && (
                        <select value={sceneId} onChange={(e) => setSceneId(e.target.value)} title="Render setting" style={{ height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(12,12,15,0.7)', backdropFilter: 'blur(6px)', color: '#f4f4f5', cursor: 'pointer', fontSize: 12, padding: '0 8px' }}>
                            {renderScenes.map((s) => <option key={s.id} value={s.id} style={{ color: '#111' }}>{s.label}</option>)}
                        </select>
                    )}
                    <button onClick={generate} disabled={busy} style={{ ...ctlBtn, width: 'auto', padding: '0 16px', fontWeight: 600, fontSize: 13, background: busy ? 'rgba(12,12,15,0.7)' : '#fbbf24', color: busy ? '#8a8a8f' : '#1a1408', border: busy ? '1px solid rgba(255,255,255,0.18)' : 'none', cursor: busy ? 'default' : 'pointer' }}>{busy ? 'Generating…' : `✦ ${renderLabel}`}</button>
                </div>
            )}

            {/* Result modal */}
            {modalOpen && (
                <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 560px)', background: '#0d0d0d', border: '1px solid #26262b', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.6)', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #1f1f1f' }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f5' }}>Generated render</span>
                            <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: '#8a8a8f', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
                        </div>
                        <div style={{ padding: 16, minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                            {busy && <span style={{ color: '#8a8a8f', fontSize: 14 }}>✦ Generating your render…</span>}
                            {err && !busy && <span style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>{err}</span>}
                            {result && !busy && (
                                <>
                                    <img src={result} alt="Generated render" style={{ maxWidth: '100%', maxHeight: '58vh', borderRadius: 10, display: 'block' }} />
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <a href={result} download="refrakt-render.png" style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #26262b', borderRadius: 9, color: '#f4f4f5', fontSize: 13, fontWeight: 500 }}>Download</a>
                                        {onSaveRender && <button onClick={save} disabled={saved} style={{ padding: '9px 18px', background: saved ? 'transparent' : '#fbbf24', border: saved ? '1px solid #26262b' : 'none', borderRadius: 9, color: saved ? '#8a8a8f' : '#1a1408', fontSize: 13, fontWeight: 600, cursor: saved ? 'default' : 'pointer' }}>{saved ? '✓ Saved' : 'Save as product image'}</button>}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
