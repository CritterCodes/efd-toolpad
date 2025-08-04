import Controller from "./controller.js";

/**
 * Materials API Routes
 * Following the new MVC architecture pattern
 */

/**
 * GET /api/materials
 * Fetch all materials with optional filtering
 */
export async function GET(request) {
    return await Controller.getMaterials(request);
}

/**
 * POST /api/materials
 * Create a new material
 */
export async function POST(request) {
    return await Controller.createMaterial(request);
}

/**
 * PUT /api/materials
 * Update an existing material
 */
export async function PUT(request) {
    return await Controller.updateMaterial(request);
}

/**
 * DELETE /api/materials
 * Delete a material
 */
export async function DELETE(request) {
    return await Controller.deleteMaterial(request);
}
