import MaterialService from "../service.js"; // Ensure .js extension
import { auth } from "@/lib/auth";

export default class MaterialCreateController {
    /**
     * ✅ Create a new material
     * @param {Request} req - The incoming request object containing material data
     * @returns {Response} - JSON response with success or error message
     */
    static async createMaterial(req) {
        try {
            // Authentication check
            const session = await auth();
            if (!session || !session.user?.email?.includes('@')) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401 }
                );
            }

            const materialData = await req.json();
            const createdMaterial = await MaterialService.createMaterial(materialData, session.user.email);
            
            return new Response(
                JSON.stringify({ 
                    success: true,
                    message: "Material created successfully", 
                    material: createdMaterial,
                    materialId: createdMaterial._id
                }),
                { status: 201 }
            );
        } catch (error) {
            console.error("Error in MaterialController.createMaterial:", error);
            
            const msg = error.message || '';
            
            // User-fixable errors → 400
            const isUserError = [
                'already exists',
                'Validation failed',
                'Missing required fields',
                'required',
                'invalid',
                'duplicate'
            ].some(keyword => msg.toLowerCase().includes(keyword.toLowerCase()));
            
            if (isUserError) {
                return new Response(
                    JSON.stringify({ 
                        success: false,
                        error: msg
                    }),
                    { status: 400 }
                );
            }
            
            return new Response(
                JSON.stringify({ 
                    success: false,
                    error: msg || "An error occurred while creating the material.",
                    details: msg
                }),
                { status: 500 }
            );
        }
    }
}
