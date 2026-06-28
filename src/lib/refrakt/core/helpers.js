/**
 * REFRAKT — Shared Helpers
 *
 * Keyframe interpolation, BVH material factory, per-frame uniform sync,
 * and carousel station math.
 */

import * as THREE from 'three'
import { VERT, buildFrag } from './shaders'

// ── Scratch vector (no per-frame allocation) ──────────────────────────────────
const _ct = new THREE.Vector3()

// ── Keyframe interpolation ────────────────────────────────────────────────────
/**
 * Smooth (cubic smoothstep) interpolation through a circular array of values.
 * Used for camera waypoints and ring Y positions.
 *
 * @param {number[]|number[][]} vals  Circular array of scalar or vec3 values
 * @param {number}              t     Progress 0..1 (wraps)
 * @returns {number|number[]}
 */
export function kf(vals, t) {
    const N  = vals.length
    const sc = (((t % 1) + 1) % 1) * N
    const i0 = Math.floor(sc) % N
    const i1 = (i0 + 1) % N
    const f  = sc - Math.floor(sc)
    const s  = f * f * (3 - 2 * f)  // smoothstep
    if (Array.isArray(vals[0])) return vals[i0].map((v, k) => v + (vals[i1][k] - v) * s)
    return vals[i0] + (vals[i1] - vals[i0]) * s
}

/**
 * Linear interpolation through a keyed array { t, v }.
 * Used for ring Y-angle so spin rate stays constant (smoothstep causes stutter at seams).
 *
 * @param {{ t: number, v: number }[]} keys
 * @param {number}                     t
 * @returns {number}
 */
export function kfLin(keys, t) {
    if (t <= keys[0].t)                  return keys[0].v
    if (t >= keys[keys.length - 1].t)    return keys[keys.length - 1].v
    for (let i = 0; i < keys.length - 1; i++) {
        if (t >= keys[i].t && t < keys[i + 1].t) {
            const s = (t - keys[i].t) / (keys[i + 1].t - keys[i].t)
            return keys[i].v + (keys[i + 1].v - keys[i].v) * s
        }
    }
    return keys[keys.length - 1].v
}

// ── Carousel math ─────────────────────────────────────────────────────────────
/**
 * Returns the nearest station index (0, 1, 2) for a given carousel progress t.
 */
export function stationFromT(t) {
    return Math.round((((t % 1) + 1) % 1) * 3) % 3
}

/**
 * Wrapped circular distance between t and a ring's home position.
 * Returns a value in [0, 0.5] — used to test if a ring should be visible.
 */
export function wdist(t, homeT) {
    const d = (((t - homeT) % 1) + 1) % 1
    return d > 0.5 ? 1 - d : d
}

/**
 * Computes ring visibility alpha.
 * Returns 0 when the ring is at the wrong station (prevents teleport artifact)
 * and fades out as the ring travels far from center (baseY threshold).
 */
export function ringAlpha(t, homeT, baseY) {
    if (wdist(t, homeT) >= 0.22) return 0
    const fd = Math.max(0, Math.abs(baseY) - 0.8)
    return Math.max(0, 1 - fd / 1.6)
}

// ── BVH material factory ──────────────────────────────────────────────────────
/**
 * Creates a THREE.ShaderMaterial wired up for BVH gem refraction.
 *
 * @param {object} opts
 * @param {THREE.Texture}             opts.env     - Scene environment texture
 * @param {{ width, height }}         opts.size    - Renderer size
 * @param {*}                         opts.state   - R3F state (for camera matrices)
 * @param {MeshBVHUniformStruct}       opts.bvhStruct
 * @param {string}                    opts.frag    - Fragment shader from buildFrag()
 * @param {THREE.Mesh}                opts.mesh
 * @param {number}                    opts.ior
 * @param {THREE.Color}               opts.color
 * @param {number}                    opts.aber    - Chromatic aberration strength
 * @param {number}                    opts.fresnel
 * @param {number}                    opts.fb      - facetBlend (0=interp, 1=geo)
 * @param {number}                    opts.cm      - colorMode (0=direct, 1=lum)
 * @param {number}                    opts.off     - bvhOffset (self-intersection guard)
 * @returns {THREE.ShaderMaterial}
 */
export function makeMat({ env, size, state, bvhStruct, frag, mesh, ior, color, aber, fresnel, fb, cm, off }) {
    return new THREE.ShaderMaterial({
        uniforms: {
            envMap:                  { value: env },
            bvh:                     { value: bvhStruct },
            bounces:                 { value: 4 },
            ior:                     { value: ior },
            color:                   { value: color },
            aberrationStrength:      { value: aber },
            fresnel:                 { value: fresnel },
            facetBlend:              { value: fb },
            colorMode:               { value: cm },
            bvhOffset:               { value: off },
            resolution:              { value: new THREE.Vector2(size.width, size.height) },
            projectionMatrixInverse: { value: state.camera.projectionMatrixInverse.clone() },
            viewMatrixInverse:       { value: state.camera.matrixWorld.clone() },
            modelMatrix:             { value: mesh.matrixWorld.clone() },
        },
        vertexShader:   VERT,
        fragmentShader: frag,
    })
}

/**
 * Syncs per-frame camera and geometry uniforms for all active BVH materials.
 * Call every frame AFTER updateMatrixWorld(true) on the ring group.
 *
 * @param {{ mesh: THREE.Mesh, mat: THREE.ShaderMaterial }[]} list
 * @param {*}                                                  state - R3F state
 * @param {{ width: number, height: number }}                  size
 */
export function syncBVH(list, state, size) {
    for (const { mesh, mat } of list) {
        mat.uniforms.projectionMatrixInverse.value = state.camera.projectionMatrixInverse
        mat.uniforms.viewMatrixInverse.value       = state.camera.matrixWorld
        mat.uniforms.modelMatrix.value             = mesh.matrixWorld
        mat.uniforms.resolution.value.set(size.width, size.height)
    }
}
