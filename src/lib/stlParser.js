/**
 * STL Parser and Volume Calculator
 * Parses STL files (ASCII and binary) and calculates 3D volume
 */

/**
 * Parse STL file and extract vertices
 * Supports both ASCII and binary STL formats
 * 
 * @param {File|ArrayBuffer|string} file - The STL file to parse
 * @returns {Promise<{vertices: Array, triangles: Array}>}
 */
export async function parseSTL(file) {
  let arrayBuffer;

  // Convert File to ArrayBuffer
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else if (typeof file === 'string') {
    // Assume it's a URL - fetch it
    const response = await fetch(file);
    arrayBuffer = await response.arrayBuffer();
  } else if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else {
    throw new Error('Invalid file format. Expected File, ArrayBuffer, or URL string.');
  }

  // Try to determine if ASCII or binary
  const view = new Uint8Array(arrayBuffer);
  
  // Check if it's likely ASCII (starts with "solid")
  const isASCII = isASCIISTL(view);

  if (isASCII) {
    return parseASCIISTL(arrayBuffer);
  } else {
    return parseBinarySTL(arrayBuffer);
  }
}

/**
 * Check if buffer is ASCII STL format
 */
function isASCIISTL(view) {
  // ASCII STL files start with "solid"
  const header = String.fromCharCode(...view.slice(0, 5));
  return header === 'solid';
}

/**
 * Parse ASCII STL file
 */
function parseASCIISTL(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);
  const text = String.fromCharCode(...view);

  const vertices = [];
  const triangles = [];

  // Match all facets
  const facetPattern = /facet\s+normal\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+outer\s+loop\s+(.*?)\s+endloop/gi;

  let match;
  while ((match = facetPattern.exec(text)) !== null) {
    const vertexData = match[7];
    const vertexPattern = /vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/gi;

    let vertexMatch;
    const triangleVertices = [];

    while ((vertexMatch = vertexPattern.exec(vertexData)) !== null) {
      const x = parseFloat(vertexMatch[1]);
      const y = parseFloat(vertexMatch[3]);
      const z = parseFloat(vertexMatch[5]);

      const vertexKey = `${x},${y},${z}`;
      let vertexIndex = vertices.findIndex(
        v => `${v.x},${v.y},${v.z}` === vertexKey
      );

      if (vertexIndex === -1) {
        vertices.push({ x, y, z });
        vertexIndex = vertices.length - 1;
      }

      triangleVertices.push(vertexIndex);
    }

    if (triangleVertices.length === 3) {
      triangles.push(triangleVertices);
    }
  }

  return { vertices, triangles };
}

/**
 * Parse Binary STL file
 */
function parseBinarySTL(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const vertices = [];
  const triangles = [];

  // Skip header (80 bytes)
  const triangleCount = view.getUint32(80, true);

  let offset = 84;
  const vertexMap = new Map();

  for (let i = 0; i < triangleCount; i++) {
    // Skip normal vector (3 floats = 12 bytes)
    offset += 12;

    const triangleVertices = [];

    // Read 3 vertices (each 3 floats = 12 bytes)
    for (let j = 0; j < 3; j++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);
      offset += 12;

      const vertexKey = `${x.toFixed(10)},${y.toFixed(10)},${z.toFixed(10)}`;
      let vertexIndex = vertexMap.get(vertexKey);

      if (vertexIndex === undefined) {
        vertices.push({ x, y, z });
        vertexIndex = vertices.length - 1;
        vertexMap.set(vertexKey, vertexIndex);
      }

      triangleVertices.push(vertexIndex);
    }

    triangles.push(triangleVertices);

    // Skip attribute byte count (2 bytes)
    offset += 2;
  }

  return { vertices, triangles };
}

/**
 * Calculate volume of 3D mesh using divergence theorem
 * Formula: V = (1/6) * Σ (p · (q × r)) for each triangle
 * where p, q, r are triangle vertices
 * 
 * @param {Array} vertices - Array of {x, y, z} vertex objects
 * @param {Array} triangles - Array of [v1, v2, v3] vertex indices
 * @returns {number} Volume in cubic units
 */
export function calculateMeshVolume(vertices, triangles) {
  let volume = 0;

  for (let triangle of triangles) {
    const v1 = vertices[triangle[0]];
    const v2 = vertices[triangle[1]];
    const v3 = vertices[triangle[2]];

    // Calculate cross product (v2 - v1) × (v3 - v1)
    const a = {
      x: v2.x - v1.x,
      y: v2.y - v1.y,
      z: v2.z - v1.z
    };

    const b = {
      x: v3.x - v1.x,
      y: v3.y - v1.y,
      z: v3.z - v1.z
    };

    const cross = {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };

    // Dot product: v1 · cross
    const dot = v1.x * cross.x + v1.y * cross.y + v1.z * cross.z;

    volume += dot;
  }

  // Apply divergence theorem formula
  volume = Math.abs(volume) / 6;

  return volume;
}

/**
 * Calculate volume from STL file
 * 
 * @param {File|ArrayBuffer|string} file - The STL file
 * @returns {Promise<number>} Volume in cubic units (assuming mm³ for standard STL)
 */
export async function getSTLVolume(file) {
  const { vertices, triangles } = await parseSTL(file);
  return calculateMeshVolume(vertices, triangles);
}

/**
 * Get mesh statistics (bounding box, dimensions, center)
 * 
 * @param {Array} vertices - Array of {x, y, z} vertex objects
 * @returns {object} Stats including bounds and dimensions
 */
export function getMeshStats(vertices) {
  if (!vertices || vertices.length === 0) {
    return {
      minX: 0, minY: 0, minZ: 0,
      maxX: 0, maxY: 0, maxZ: 0,
      width: 0, height: 0, depth: 0,
      centerX: 0, centerY: 0, centerZ: 0
    };
  }

  let minX = vertices[0].x, maxX = vertices[0].x;
  let minY = vertices[0].y, maxY = vertices[0].y;
  let minZ = vertices[0].z, maxZ = vertices[0].z;

  for (let v of vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
    minZ = Math.min(minZ, v.z);
    maxZ = Math.max(maxZ, v.z);
  }

  return {
    minX, minY, minZ,
    maxX, maxY, maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2
  };
}

/**
 * Convert file to ArrayBuffer for volume calculation without uploading
 * 
 * @param {File} file - The file to convert
 * @returns {Promise<ArrayBuffer>}
 */
export function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
