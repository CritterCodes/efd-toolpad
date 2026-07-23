import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * STL → viewer GLB, for GEMSTONE designs only (never jewelry — a jewelry GLB needs authored,
 * named parts; an STL is one anonymous solid, which is exactly what a gem is).
 *
 * Why this works for gems: the stone's LOOK comes from the variant's REFRAKT gem preset (amethyst
 * vs garnet is a material swap), so the GLB just needs the geometry — one mesh, canonically named
 * so the REFRAKT studio auto-recognizes the gem slot. STL facet normals stay FLAT on purpose
 * (faceted stones should shade per-facet; smoothing would blob it). CAD STLs are mm; glTF's
 * standard unit is meters, so the node is scaled 0.001 (REFRAKT's unit auto-detect reads the
 * overall bbox and expects meters).
 *
 * @param {ArrayBuffer|File|Blob} input  the STL (binary or ASCII)
 * @param {{ meshName?: string }} [opts]
 * @returns {Promise<Blob>} a GLB blob ready to upload as the design's viewer model
 */
export async function stlToGlb(input, { meshName = 'Gemstone' } = {}) {
  const buffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
  const geometry = new STLLoader().parse(buffer);
  // STLLoader emits per-facet (flat) normals — keep them; do NOT computeVertexNormals().

  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ name: 'GemstoneMaterial' }));
  mesh.name = meshName;
  mesh.scale.setScalar(0.001); // mm (CAD) → meters (glTF standard)

  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new GLTFExporter();
  const glb = await new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true });
  });
  return new Blob([glb], { type: 'model/gltf-binary' });
}
