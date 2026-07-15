/**
 * REFRAKT — Scene Lighting
 *
 * Standard lighting rig used across all scenes:
 *   - Warm key light (directional, top-right, casts shadows)
 *   - Cool fill light (directional, left)
 *   - Back rim light (point, behind subject)
 *   - Soft under-fill (point, below)
 *   - Ambient base (very dim, avoids pure black shadows)
 *   - GlowLight: cursor-reactive warm point that follows the intersection point
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// ── Static rig ────────────────────────────────────────────────────────────────
export function Lights() {
    return <>
        <directionalLight position={[2, 3, 2]}   intensity={3.5} color="#fff5e0" castShadow />
        <directionalLight position={[-3, 1, 1]}  intensity={1.2} color="#d0e8ff" />
        <pointLight       position={[0, 2, -3]}  intensity={4}   color="#fff"    distance={10} />
        <pointLight       position={[0, -2, 1]}  intensity={0.8} color="#fff8e0" distance={6} />
        <ambientLight     intensity={0.18} />
    </>
}

// ── Cursor-reactive glow ──────────────────────────────────────────────────────
/**
 * A warm point light that lerps toward the last pointer intersection on any ring.
 * Driven by a posRef that the ring components write to on every onPointerMove.
 *
 * posRef shape: { x: number, y: number, z: number, on: 0 | 1 }
 *   - on=1 → light powers up (intensity → 4)
 *   - on=0 → light powers down (intensity → 0)
 *
 * Usage:
 *   const glowRef = useRef({ x: 0, y: 0, z: 0, on: 0 })
 *   <GlowLight posRef={glowRef} />
 *   // In ring onPointerMove: glowRef.current = { x, y, z, on: 1 }
 *   // In ring onPointerLeave: glowRef.current.on = 0
 */
export function GlowLight({ posRef }) {
    const lRef = useRef()
    useFrame((_, d) => {
        if (!lRef.current) return
        const g = posRef.current
        lRef.current.position.lerp({ x: g.x, y: g.y, z: g.z + 0.08 }, 0.14)
        lRef.current.intensity += (g.on * 4 - lRef.current.intensity) * (1 - Math.exp(-8 * d))
    })
    return <pointLight ref={lRef} color="#fff5e8" distance={0.55} intensity={0} />
}
