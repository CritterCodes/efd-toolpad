/**
 * STL File Volume Calculator
 * Parses binary and ASCII STL files to calculate volume using the divergence theorem
 */

export async function calculateSTLVolume(file) {
    try {
        if (file instanceof File) {
            // Handle File object
            const arrayBuffer = await file.arrayBuffer();
            return parseSTLAndCalculateVolume(arrayBuffer, file.name);
        } else if (typeof file === 'string') {
            // Handle URL or file path
            const response = await fetch(file);
            const arrayBuffer = await response.arrayBuffer();
            return parseSTLAndCalculateVolume(arrayBuffer, file);
        } else {
            // Handle ArrayBuffer directly
            return parseSTLAndCalculateVolume(file, 'unknown.stl');
        }
    } catch (error) {
        console.error('❌ Error calculating STL volume:', error);
        return {
            success: false,
            volume: 0,
            error: error.message,
            meshStats: null
        };
    }
}

function parseSTLAndCalculateVolume(arrayBuffer, fileName = 'unknown.stl') {
    // Try binary format first
    if (isBinarySTL(arrayBuffer)) {
        return calculateBinarySTLVolume(arrayBuffer);
    }
    
    // Fall back to ASCII format
    const text = new TextDecoder().decode(arrayBuffer);
    return calculateASCIISTLVolume(text);
}

function isBinarySTL(arrayBuffer) {
    // Binary STL has specific header and structure
    // ASCII STL starts with "solid" keyword
    const view = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(view.slice(0, 5));
    return text.toLowerCase() !== 'solid' || view.length < 84;
}

function calculateBinarySTLVolume(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    
    // Read header (80 bytes)
    const header = new Uint8Array(arrayBuffer, 0, 80);
    
    // Read number of triangles (4 bytes at offset 80)
    const triangleCount = view.getUint32(80, true);
    
    if (triangleCount === 0) {
        return {
            success: false,
            volume: 0,
            error: 'No triangles found in STL file',
            meshStats: null
        };
    }

    let volume = 0;
    const vertices = [];
    let offset = 84; // Start after header and triangle count

    // Process each triangle
    for (let i = 0; i < triangleCount; i++) {
        // Skip normal vector (12 bytes = 3 floats)
        
        // Read vertices (36 bytes = 3 vertices * 3 floats each)
        const v1 = readVector3(view, offset + 12);
        const v2 = readVector3(view, offset + 24);
        const v3 = readVector3(view, offset + 36);
        
        vertices.push(v1, v2, v3);
        
        // Calculate signed volume contribution of this triangle
        // Using the divergence theorem: volume = sum of (v1 dot (v2 cross v3)) / 6
        const signedVolume = calculateTetrahedronVolume(v1, v2, v3);
        volume += signedVolume;
        
        // Skip attribute byte count (2 bytes) and move to next triangle
        offset += 50;
    }

    // The result is already divided by 6 in the tetrahedron calculation
    volume = Math.abs(volume / 6.0);
    
    // Calculate mesh statistics
    const meshStats = calculateMeshStats(vertices);

    return {
        success: true,
        volume: Math.round(volume * 1000) / 1000, // Round to 3 decimal places
        volumeUnitCm3: true,
        meshStats: meshStats,
        triangleCount: triangleCount,
        vertexCount: vertices.length / 3
    };
}

function calculateASCIISTLVolume(text) {
    const triangles = [];
    const vertices = [];
    
    // Parse ASCII STL format
    const facetRegex = /facet\s+normal[\s\S]*?outer\s+loop([\s\S]*?)endloop[\s\S]*?endfacet/gi;
    const vertexRegex = /vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/g;
    
    let match;
    let triangleCount = 0;
    let volume = 0;

    while ((match = facetRegex.exec(text)) !== null) {
        const facetText = match[1];
        const vertexMatches = [];
        let vMatch;

        while ((vMatch = vertexRegex.exec(facetText)) !== null) {
            const vertex = {
                x: parseFloat(vMatch[1]),
                y: parseFloat(vMatch[3]),
                z: parseFloat(vMatch[5])
            };
            vertexMatches.push(vertex);
            vertices.push(vertex);
        }

        if (vertexMatches.length === 3) {
            triangles.push(vertexMatches);
            const v1 = vertexMatches[0];
            const v2 = vertexMatches[1];
            const v3 = vertexMatches[2];
            
            const signedVolume = calculateTetrahedronVolume(v1, v2, v3);
            volume += signedVolume;
            triangleCount++;
        }
    }

    if (triangleCount === 0) {
        return {
            success: false,
            volume: 0,
            error: 'No valid triangles found in STL file',
            meshStats: null
        };
    }

    volume = Math.abs(volume / 6.0);
    
    // Calculate mesh statistics
    const meshStats = calculateMeshStats(vertices);

    return {
        success: true,
        volume: Math.round(volume * 1000) / 1000,
        volumeUnitCm3: true,
        meshStats: meshStats,
        triangleCount: triangleCount,
        vertexCount: vertices.length
    };
}

function readVector3(view, offset) {
    return {
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true)
    };
}

function calculateTetrahedronVolume(v1, v2, v3) {
    // Calculate volume of tetrahedron formed by origin and triangle vertices
    // Volume = (v1 . (v2 x v3)) / 6
    const cross = {
        x: v2.y * v3.z - v2.z * v3.y,
        y: v2.z * v3.x - v2.x * v3.z,
        z: v2.x * v3.y - v2.y * v3.x
    };

    const dot = v1.x * cross.x + v1.y * cross.y + v1.z * cross.z;
    return dot;
}

function calculateMeshStats(vertices) {
    if (vertices.length === 0) {
        return null;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    vertices.forEach(v => {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
        minZ = Math.min(minZ, v.z);
        maxZ = Math.max(maxZ, v.z);
    });

    return {
        width: Math.round((maxX - minX) * 1000) / 1000,
        height: Math.round((maxY - minY) * 1000) / 1000,
        depth: Math.round((maxZ - minZ) * 1000) / 1000,
        boundingBox: {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        }
    };
}
