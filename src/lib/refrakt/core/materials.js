/**
 * REFRAKT — Precious Metal Materials
 *
 * Three.js MeshPhysicalMaterial presets for the three metal finishes
 * used across all ring models. Import and clone as needed — never mutate
 * the shared instances directly.
 *
 * Usage:
 *   import { GOLD_MAT, SATIN_MAT, SILVER_MAT } from '../core/materials'
 *   child.material = GOLD_MAT.clone()  // clone for per-mesh independence
 */

import * as THREE from 'three'

// High-polish yellow gold — mirror-like, very low roughness
export const GOLD_MAT = new THREE.MeshPhysicalMaterial({
    color:           new THREE.Color(0.85, 0.62, 0.20),
    metalness:       1.0,
    roughness:       0.07,
    envMapIntensity: 2.5,
})

// Satin/brushed yellow gold — matte, diffuse sheen
export const SATIN_MAT = new THREE.MeshPhysicalMaterial({
    color:           new THREE.Color(0.78, 0.56, 0.16),
    metalness:       0.95,
    roughness:       0.72,
    envMapIntensity: 0.9,
})

// High-polish white gold / platinum / silver
export const SILVER_MAT = new THREE.MeshPhysicalMaterial({
    color:           new THREE.Color(0.76, 0.78, 0.82),
    metalness:       1.0,
    roughness:       0.14,
    envMapIntensity: 1.6,
})

/**
 * GEM_CONFIGS — BVH shader parameters for common gem types.
 *
 * Pass these to makeMat() in helpers.js.
 *
 * IOR reference values (refractive index):
 *   Diamond:   2.42
 *   Moissanite:2.65
 *   Sapphire:  1.77
 *   Ruby:      1.77
 *   Emerald:   1.57
 *   Amethyst:  1.54
 *   Aquamarine:1.57
 *   Tourmaline:1.62
 *   Topaz:     1.62
 *   Opal:      1.45
 *   Glass:     1.52
 */
export const GEM_CONFIGS = {
    diamond: {
        // Matches the homepage accent-diamond setup for efd_ring.glb
        // (app/experience/FeaturedRingsScene.js — RingAmethyst).
        ior:   2.42,
        color: new THREE.Color(1, 1, 1),
        aber:  0.025,   // chromatic aberration strength
        fresnel: 0.25,
        fb:    0.0,     // facetBlend — 0=interpolated normals, 1=geometric normals
        cm:    0.0,     // colorMode — 0=direct, 1=luminance-tinted
        off:   0.01,    // bvhOffset — prevents self-intersection artifacts
        density: 0.0,   // Beer–Lambert depth absorption (0 = clear like diamond; colour deepens with path)
    },
    amethyst: {
        ior:   1.54,
        color: new THREE.Color(0.60, 0.22, 0.90),
        aber:  0.02,
        fresnel: 0.0,
        fb:    0.0,
        cm:    1.0,     // luminance mode for rich color
        off:   0.00005,
        density: 1.4,
        velvet: 0.2,
        opacity: 0.12,
    },
    ruby: {
        ior:   1.77,
        color: new THREE.Color(0.88, 0.08, 0.15),
        aber:  0.015,
        fresnel: 0.15,
        fb:    0.0,
        cm:    1.0,
        off:   0.0001,
        density: 2.2,
        velvet: 0.3,
        opacity: 0.22,
    },
    sapphire: {
        ior:   1.77,
        color: new THREE.Color(0.10, 0.20, 0.85),
        aber:  0.015,
        fresnel: 0.15,
        fb:    0.0,
        cm:    1.0,
        off:   0.0001,
        density: 2.2,
        velvet: 0.32,
        opacity: 0.25,
    },
    emerald: {
        ior:   1.57,
        color: new THREE.Color(0.05, 0.60, 0.15),
        aber:  0.012,
        fresnel: 0.10,
        fb:    0.0,
        cm:    1.0,
        off:   0.0001,
        density: 3.0,   // emeralds carry the most body colour
        incl:  0.55,    // jardin — emeralds are expected to be included
        velvet: 0.5,    // turbid/soft — emeralds are not optically clean like glass
        opacity: 0.32,  // low clarity — many emeralds read nearly opaque
        tubes: 0.45,    // parallel growth tubes — signature emerald inclusion
        tubeAngle: 0.4,
    },
    marquise: {
        // Marquise-cut diamond — slightly higher facetBlend for geometric sharpness
        ior:   2.42,
        color: new THREE.Color(1, 1, 1),
        aber:  0.008,
        fresnel: 0.25,
        fb:    1.0,     // full geometric normals for sharp facet breaks
        cm:    0.0,
        off:   0.01,
        density: 0.0,
    },
    moissanite: {
        ior:   2.65,    // higher than diamond — more fire/dispersion
        color: new THREE.Color(0.98, 0.98, 1.0),
        aber:  0.032,
        fresnel: 0.28,
        fb:    0.0,
        cm:    0.0,
        off:   0.01,
        density: 0.0,
    },
}
