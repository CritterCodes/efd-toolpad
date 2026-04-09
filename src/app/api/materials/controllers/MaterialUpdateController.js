import MaterialService from "../service.js"; // Ensure .js extension
import { auth } from "@/lib/auth";

export default class MaterialUpdateController {
    /**
     * ✅ Update an existing material
     * @param {Request} req - The incoming request object containing material data
     * @returns {Response} - JSON response with success or error message
     */
    static async updateMaterial(req) {
        try {
            // Authentication check
            const session = await auth();
            if (!session || !session.user?.email?.includes('@')) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401 }
                );
            }

            // Get material ID from query parameters
            const { searchParams } = new URL(req.url);
            const materialId = searchParams.get('id');

            if (!materialId) {
                return new Response(
                    JSON.stringify({ 
                        success: false,
                        error: 'Material ID is required' 
                    }),
                    { status: 400 }
                );
            }

            const updateData = await req.json();
            const updatedMaterial = await MaterialService.updateMaterial(materialId, updateData);
            
            if (!updatedMaterial) {
                return new Response(
                    JSON.stringify({ 
                        success: false,
                        error: 'Material not found' 
                    }),
                    { status: 404 }
                );
            }
            
            return new Response(
                JSON.stringify({ 
                    success: true,
                    message: "Material updated successfully", 
                    material: updatedMaterial
                }),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in MaterialController.updateMaterial:", error);
            
            // Handle validation errors
            if (error.message.includes('Validation failed') || error.message.includes('already exists') || error.message.includes('not found')) {
                return new Response(
                    JSON.stringify({ 
                        success: false,
                        error: error.message
                    }),
                    { status: 400 }
                );
            }
            
            return new Response(
                JSON.stringify({ 
                    success: false,
                    error: "An error occurred while updating the material.",
                    details: error.message
                }),
                { status: 500 }
            );
        }
    }
}
