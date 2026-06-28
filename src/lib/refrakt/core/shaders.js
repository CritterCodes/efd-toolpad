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
uniform vec3  absorption;   // per-channel Beer–Lambert coefficient (0 = clear, e.g. diamond)
uniform float inclusions;   // 0 = flawless; higher = more jardin (cloud + specks)
uniform vec3  inclusionSeed; // per-stone offset so every stone's flaws are unique
uniform float inclScale;    // feature size multiplier for inclusions (1 = default)
uniform float tubes;        // 0..1 directional growth-tube needles (emerald)
uniform float tubeAngle;    // tube direction (radians, in the stone's XY plane)
uniform float velvet;       // 0 = glassy/optical; higher = turbid soft reflections
uniform float opacity;      // 0 = clear/transparent; 1 = opaque lit body (low clarity)

float fresnelFunc(vec3 viewDir, vec3 worldNormal) {
    return pow(1.0 + dot(viewDir, worldNormal), 10.0);
}

// ── Cheap 3D value noise (for volumetric inclusions) ───────────────────────────
float ihash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(ihash(i + vec3(0,0,0)), ihash(i + vec3(1,0,0)), f.x),
                   mix(ihash(i + vec3(0,1,0)), ihash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(ihash(i + vec3(0,0,1)), ihash(i + vec3(1,0,1)), f.x),
                   mix(ihash(i + vec3(0,1,1)), ihash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
    return s;
}

// Ray-march through gem interior using BVH acceleration.
// Handles total internal reflection (TIR) and refraction exits.
vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float _ior, mat4 mmi, out float pathLength, out vec3 incl, bool doIncl) {
    pathLength = 0.0;
    incl = vec3(0.0);   // x = cloud/silk, y = carbon specks, z = growth tubes
    // BVH march runs in local/model space; convert local distances to world units
    // (geometry is normalized to a unit sphere) so absorption is unit-independent.
    float worldScale = length(modelMatrix[0].xyz);
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
        pathLength  += max(dist, 0.0) * worldScale;
        // Volumetric inclusions: sample noise at the segment midpoint (normalized
        // to unit-sphere space) so flaws sit at fixed points inside the stone and
        // parallax correctly as it turns. Only the primary (green) ray pays for it.
        if (doIncl && (inclusions > 0.0 || tubes > 0.0)) {
            // Peak (not path-integral) so flaws stay LOCALIZED and crisp instead of
            // washing the whole stone. Sampled in unit-sphere space so they sit at
            // fixed points inside the stone and parallax correctly as it turns.
            vec3 sp = (rayOrigin + rayDirection * (dist * 0.5)) * worldScale + inclusionSeed;
            float fsc = max(inclScale, 0.05);
            if (inclusions > 0.0) {
                incl.x = max(incl.x, smoothstep(0.46, 0.72, fbm3(sp * 6.0 * fsc)));        // silk/cloud veils
                incl.y = max(incl.y, smoothstep(0.82, 0.92, vnoise(sp * 32.0 * fsc + 13.0))); // carbon specks
            }
            if (tubes > 0.0) {
                // Growth tubes: thin round cross-sections (cellular cores) in the
                // plane perpendicular to tdir → long parallel needles along tdir,
                // appearing in patches. tubeAngle steers the direction.
                vec3 tdir = normalize(vec3(sin(tubeAngle), cos(tubeAngle), 0.0001));
                vec3 aAx  = normalize(cross(tdir, vec3(0.0, 0.0, 1.0)));
                vec3 bAx  = cross(tdir, aAx);
                float along = dot(sp, tdir);
                vec2 uv = vec2(dot(sp, aAx), dot(sp, bAx)) * 7.0 * fsc;
                vec2 cell = floor(uv), f = fract(uv);
                float md = 1.0;
                for (int yy = -1; yy <= 1; yy++) {
                    for (int xx = -1; xx <= 1; xx++) {
                        vec2 g = vec2(float(xx), float(yy));
                        vec3 hc = vec3(cell + g, 11.0);
                        vec2 o  = vec2(ihash(hc), ihash(hc + 3.7));
                        md = min(md, length(g + o - f));
                    }
                }
                float core = smoothstep(0.22, 0.0, md);                                  // thin needle cores
                float mask = smoothstep(0.42, 0.72, fbm3(vec3(uv * 0.22, along * 0.5)));  // only in patches
                incl.z = max(incl.z, core * mask);
            }
        }
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

// Turbid sampling: average a few jittered directions so the transmitted
// environment reads soft/velvety instead of mirror-sharp (real gem scatter).
vec4 sampleEnvBlur(vec3 dir, vec3 camDir, float blur) {
    vec4 c = sampleEnv(dir, camDir);
    if (blur < 0.001) return c;
    c += sampleEnv(normalize(dir + vec3( blur,  blur * 0.3, 0.0)),        camDir);
    c += sampleEnv(normalize(dir + vec3(-blur,  0.0,        blur * 0.6)), camDir);
    c += sampleEnv(normalize(dir + vec3( 0.0,  -blur,       blur * 0.4)), camDir);
    c += sampleEnv(normalize(dir + vec3( blur * 0.5, -blur * 0.7, -blur * 0.5)), camDir);
    return c * 0.2;
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

    float pathR, pathG, pathB;
    vec3 inclG = vec3(0.0);
    vec3 inclTmp;
    vec3 dirG = totalInternalReflection(rayOrig, rayDir, normal, max(ior, 1.0), vModelMatrixInverse, pathG, inclG, true);
    vec3 dirR = totalInternalReflection(rayOrig, rayDir, normal, iorR, vModelMatrixInverse, pathR, inclTmp, false);
    vec3 dirB = totalInternalReflection(rayOrig, rayDir, normal, iorB, vModelMatrixInverse, pathB, inclTmp, false);

    float envBlur = velvet * 0.14;
    vec3 eR = sampleEnvBlur(dirR, camDir, envBlur).rgb;
    vec3 eG = sampleEnvBlur(dirG, camDir, envBlur).rgb;
    vec3 eB = sampleEnvBlur(dirB, camDir, envBlur).rgb;

    // Direct color: multiply gem tint against per-channel env sample
    vec3 directColor = color * vec3(eR.r, eG.g, eB.b);

    // Luminance-modulated color: brightens gems from inside (for colored stones)
    float lR = dot(eR, vec3(0.2126, 0.7152, 0.0722));
    float lG = dot(eG, vec3(0.2126, 0.7152, 0.0722));
    float lB = dot(eB, vec3(0.2126, 0.7152, 0.0722));
    vec3 lumMod   = vec3(lR, lG, lB) * 1.75 + 0.05;
    vec3 gemColor = mix(directColor, color * lumMod, colorMode);

    // Beer–Lambert absorption: light is attenuated per channel by how far it
    // travelled through the stone, so colour deepens with depth (a thin edge
    // reads pale, the belly rich) — what separates a gemstone from tinted glass.
    vec3 transmittance = exp(-absorption * vec3(pathR, pathG, pathB));
    gemColor *= transmittance;

    // Inclusions (jardin): milky silk/cloud haze + dark carbon specks, embedded
    // in the stone's volume. Gives colored stones character a clean facet model
    // can't — emeralds especially.
    if (inclusions > 0.0) {
        float veil = inclG.x * inclusions;
        gemColor = mix(gemColor, gemColor * 0.42, veil * 0.7);            // darker mottled jardin
        gemColor = mix(gemColor, vec3(0.85, 0.88, 0.85), veil * 0.28);    // faint silk feathers
        gemColor = mix(gemColor, vec3(0.03), inclG.y * inclusions);        // black carbon specks
    }
    // Growth tubes: fine light reflective needles along tubeAngle.
    if (tubes > 0.0) {
        gemColor = mix(gemColor, vec3(0.92, 0.93, 0.9), inclG.z * tubes * 0.6);
    }

    // Opacity (low clarity): VOLUMETRIC — light scatters more the further it
    // travels through the stone, so thick parts go milky/opaque from within while
    // thin edges stay clearer. Driven by path length, not the surface normal.
    if (opacity > 0.0) {
        float scatter = 1.0 - exp(-opacity * pathG * 3.0);
        vec3 body = color * (0.45 + 0.55 * lG);   // soft internal glow of the body colour
        gemColor = mix(gemColor, body, scatter);
    }

    // Fresnel rim highlight (white blowout at glancing angles)
    float nFresnel = fresnelFunc(normalize(vWorldPosition - cameraPosition), normal) * fresnel;
    gl_FragColor   = vec4(mix(gemColor, vec3(1.0), nFresnel), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`
}
