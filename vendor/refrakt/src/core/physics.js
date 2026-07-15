/**
 * REFRAKT — Zero-G Ring Physics
 *
 * Lightweight fake physics for the floating ring effect. Simulates
 * scroll-velocity impulse, exponential drag (zero-g momentum lingers),
 * idle wobble, and a slow spring-back to upright.
 *
 * Also includes the gem lift system — proximity-based screen-space hover
 * that lifts individual gem meshes toward the cursor in NDC space.
 */

import * as THREE from 'three'

// ── State factory ─────────────────────────────────────────────────────────────
/**
 * Creates a fresh physics state object.
 * Call once per ring and store in a useRef().
 *
 * @returns {{ velX, velZ, angX, angZ, prevY }}
 */
export function makePhys() {
    return { velX: 0, velZ: 0, angX: 0, angZ: 0, prevY: 0 }
}

// ── Per-frame step ────────────────────────────────────────────────────────────
/**
 * Advance physics by one frame.
 *
 * @param {ReturnType<makePhys>} p      Physics state (mutated in place)
 * @param {number}               baseY  Current ring Y from keyframe interpolation
 * @param {number}               delta  Frame delta time (seconds)
 * @param {number}               time   Elapsed time (seconds)
 */
export function stepPhys(p, baseY, delta, time) {
    const yVel = (baseY - p.prevY) / Math.max(delta, 0.001)
    p.prevY = baseY

    // Tilt from scroll impulse — more responsive on X than Z
    p.velX += yVel * 0.08
    p.velZ += yVel * Math.sin(time * 2.1) * 0.04

    // Exponential drag — proximity to center slows decay (ring at rest is stickier)
    const cp   = Math.max(0, 1 - Math.abs(baseY) * 0.35)
    const drag = 1 - Math.exp(-delta * (1.0 + cp * 2.5))
    p.velX *= (1 - drag)
    p.velZ *= (1 - drag)

    // Integrate angular velocity
    p.angX += p.velX * delta
    p.angZ += p.velZ * delta

    // Tiny idle wobble — imperceptible tumble even when perfectly still
    p.angX += Math.sin(time * 0.11 + 1.3) * 0.0004
    p.angZ += Math.cos(time * 0.13 + 2.1) * 0.0003

    // Very slow spring-back to upright when near center — drifts rather than snaps
    if (Math.abs(baseY) < 0.4) {
        const sp = 1 - Math.exp(-delta * 1.4)
        p.angX  -= p.angX * sp
        p.angZ  -= p.angZ * sp
    }

    // Hard clamp — prevents runaway tilt on fast scroll
    p.angX = THREE.MathUtils.clamp(p.angX, -1.6, 1.6)
    p.angZ = THREE.MathUtils.clamp(p.angZ, -1.1, 1.1)
}

// ── Gem lift (cursor proximity) ───────────────────────────────────────────────
// Scratch vector — allocated once, reused every frame to avoid GC pressure
const _wp = new THREE.Vector3()

/**
 * Lifts individual gem meshes toward the cursor based on screen-space proximity.
 * Each mesh must have userData.origY set to its rest Y position.
 *
 * @param {THREE.Mesh[]} gems    Array of gem meshes to affect
 * @param {THREE.Camera} camera  Active camera
 * @param {number}       mx      NDC mouse X (-1..1)
 * @param {number}       my      NDC mouse Y (-1..1, already flipped from screen Y)
 * @param {number}       alpha   Ring visibility alpha — scales lift at 0 when hidden
 */
export function liftGems(gems, camera, mx, my, alpha) {
    if (!gems.length || alpha < 0.05) return
    for (const m of gems) {
        m.getWorldPosition(_wp)
        _wp.project(camera)
        const prox   = Math.max(0, 1 - Math.hypot(_wp.x - mx, _wp.y - my) / 0.22) * alpha
        m.position.y = m.userData.origY + prox * prox * 0.003
    }
}
