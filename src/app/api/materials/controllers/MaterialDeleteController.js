import MaterialService from "../service.js"; // Ensure .js extension
import { auth } from "@/lib/auth";

export default class MaterialDeleteController {
    /**
     * ✅ Delete a material
     * @param {Request} req - The incoming request object
     * @returns {Response} - JSON response with success or error message
     */
    static async deleteMaterial(req) {
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

            const deleted = await MaterialService.deleteMaterial(materialId);
            
            if (!deleted) {
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
                    message: "Material deleted successfully"
                }),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in MaterialController.deleteMaterial:", error);
            
            if (error.message.includes('not found')) {
                return new Response(
                    JSON.stringify({ 
                        success: false,
                        error: error.message
                    }),
                    { status: 404 }
                );
            }
            
            return new Response(
                JSON.stringify({ 
                    success: false,
                    error: "An error occurred while deleting the material.",
                    details: error.message
                }),
                { status: 500 }
            );
        }
    }
}
