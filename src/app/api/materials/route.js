// src/app/api/materials/route.js
import MaterialController from "./controller";

/**
 * ✅ Route for getting materials
 * Supports filtering by category, metal, active status, supplier, and Stuller items
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("id")) {
        return await MaterialController.getMaterialById(req);
    } else {
        return await MaterialController.getMaterials(req);
    }
}

/**
 * ✅ Route for creating a new material
 */
export async function POST(req) {
    return await MaterialController.createMaterial(req);
}

/**
 * ✅ Route for updating an existing material
 * Requires 'id' query parameter
 */
export async function PUT(req) {
    return await MaterialController.updateMaterial(req);
}

/**
 * ✅ Route for deleting a material
 * Requires 'id' query parameter
 */
export async function DELETE(req) {
    return await MaterialController.deleteMaterial(req);
}
