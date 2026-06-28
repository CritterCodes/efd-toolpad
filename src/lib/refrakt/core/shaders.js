/**
 * REFRAKT — BVH Gemstone Shader Core
 *
 * Shared vertex + fragment shaders for all gem/diamond materials.
 * The fragment shader is built dynamically at runtime by injecting
 * three-mesh-bvh's shaderStructs and shaderIntersectFunction strings,
 * which define the BVH uniform type and bvhIntersectFirstHit() function.
 *
 * Usage:
 *   import('three-mesh-bvh').then(({ shaderStructs, shaderIntersectFunction }) => {
 *     const frag = buildFrag(shaderStructs, shaderIntersectFunction)
 *     // use VERT + frag in a THREE.ShaderMaterial
 *   })
 */

// ── Vertex shader ─────────────────────────────────────────────────────────────
// Passes world position, interpolated normals, and inverse model matrix to
// the fragment shader so the BVH ray-marcher can work in local mesh space.
export const VERT = /* glsl */`
uniform mat4 viewMatrixInverse;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying mat4 vModelMatrixInverse;

void main() {
    vModelMatrixInverse = inverse(modelMatrix);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize((viewMatrixInverse * vec4(normalMatrix * normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`

// ── Fragment shader builder ───────────────────────────────────────────────────
// Returns the complete fragment shader source string.
// Must be called after three-mesh-bvh is loaded (async import).
//
// Key techniques:
//   totalInternalReflection()  — BVH ray-march loop for TIR simulation
//   Chromatic aberration       — R, G, B channels sampled at different IORs
//   Fresnel rim                — pow(1 + dot(viewDir, normal), 10) rim highlight
//   colorMode uniform          — 0 = direct env color, 1 = luminance-tinted color
//   equirectUv()               — Three.js built-in for HDRI equirectangular lookup
export function buildFrag(shaderStructs, shaderIntersectFunction) {
    return /* glsl */`
#define ENVMAP_TYPE_CUBE_UV
precision highp isampler2D;
precision highp usampler2D;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying mat4 vModelMatrixInverse;

uniform sampler2D envMap;
uniform float bounces;

// ${shaderStructs}
// ${shaderIntersectFunction}

uniform BVH   bvh;
uniform float ior;
uniform vec2  resolution;
uniform float fresnel;
uniform float facetBlend;
uniform mat4  modelMatrix;
uniform mat4  projectionMatrixInverse;
uniform mat4  viewMatrixInverse;
uniform float aberrationStrength;
uniform vec3  color;
uniform float colorMode;
uniform float bvhOffset;

float fresnelFunc(vec3 viewDir, vec3 worldNormal) {
    return pow(1.0 + dot(viewDir, worldNormal), 10.0);
}

// Ray-march through gem interior using BVH acceleration.
// Handles total internal reflection (TIR) and refraction exits.
vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float _ior, mat4 mmi) {
    vec3 rayOrigin    = ro;
    vec3 rayDirection = rd;
    rayDirection = refract(rayDirection, normal, 1.0 / _ior);
    rayOrigin    = vWorldPosition + rayDirection * 0.001;
    rayOrigin    = (mmi * vec4(rayOrigin, 1.0)).xyz;
    rayDirection = normalize((mmi * vec4(rayDirection, 0.0)).xyz);
    for (float i = 0.0; i < bounces; i++) {
        uvec4 faceIndices = uvec4(0u);
        vec3  faceNormal  = vec3(0.0, 0.0, 1.0);
        vec3  barycoord   = vec3(0.0);
        float side = 1.0;
        float dist = 0.0;
        bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
        vec3 hitPos  = rayOrigin + rayDirection * max(dist - bvhOffset * 0.1, 0.0);
        vec3 tempDir = refract(rayDirection, faceNormal, _ior);
        if (length(tempDir) != 0.0) { rayDirection = tempDir; break; }
        rayDirection = reflect(rayDirection, faceNormal);
        rayOrigin    = hitPos + rayDirection * bvhOffset;
    }
    return normalize((modelMatrix * vec4(rayDirection, 0.0)).xyz);
}

#include <common>

// Sample HDR environment with texture gradient anti-aliasing
vec4 sampleEnv(vec3 dir, vec3 camDir) {
    vec2 uv       = equirectUv(dir);
    vec2 smoothUv = equirectUv(camDir);
    return textureGrad(envMap, uv, dFdx(smoothUv), dFdy(smoothUv));
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec3 camDir = normalize(
        (viewMatrixInverse * vec4(
            (projectionMatrixInverse * vec4(uv * 2.0 - 1.0, 0.0, 1.0)).xyz,
        0.0)).xyz);

    // Blend between interpolated vertex normal and face geometric normal
    vec3 geoNormal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    geoNormal = faceforward(geoNormal, normalize(vWorldPosition - cameraPosition), geoNormal);
    vec3 normal = normalize(mix(vNormal, geoNormal, facetBlend));

    vec3 rayOrig = cameraPosition;
    vec3 rayDir  = normalize(vWorldPosition - cameraPosition);

    // Chromatic aberration — separate IORs for R and B channels
    float iorR = max(ior * (1.0 - aberrationStrength), 1.0);
    float iorB = max(ior * (1.0 + aberrationStrength), 1.0);

    vec3 dirG = totalInternalReflection(rayOrig, rayDir, normal, max(ior, 1.0), vModelMatrixInverse);
    vec3 dirR = totalInternalReflection(rayOrig, rayDir, normal, iorR, vModelMatrixInverse);
    vec3 dirB = totalInternalReflection(rayOrig, rayDir, normal, iorB, vModelMatrixInverse);

    vec3 eR = sampleEnv(dirR, camDir).rgb;
    vec3 eG = sampleEnv(dirG, camDir).rgb;
    vec3 eB = sampleEnv(dirB, camDir).rgb;

    // Direct color: multiply gem tint against per-channel env sample
    vec3 directColor = color * vec3(eR.r, eG.g, eB.b);

    // Luminance-modulated color: brightens gems from inside (for colored stones)
    float lR = dot(eR, vec3(0.2126, 0.7152, 0.0722));
    float lG = dot(eG, vec3(0.2126, 0.7152, 0.0722));
    float lB = dot(eB, vec3(0.2126, 0.7152, 0.0722));
    vec3 lumMod   = vec3(lR, lG, lB) * 1.75 + 0.05;
    vec3 gemColor = mix(directColor, color * lumMod, colorMode);

    // Fresnel rim highlight (white blowout at glancing angles)
    float nFresnel = fresnelFunc(normalize(vWorldPosition - cameraPosition), normal) * fresnel;
    gl_FragColor   = vec4(mix(gemColor, vec3(1.0), nFresnel), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`
}
