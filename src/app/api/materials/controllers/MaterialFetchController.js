import MaterialService from "../service.js"; // Ensure .js extension
import { auth } from "@/lib/auth";

export default class MaterialFetchController {
    /**
     * ✅ Get materials with optional filtering
     * @param {Request} req - The incoming request object
     * @returns {Response} - JSON response with materials or error message
     */
    static async getMaterials(req) {
        try {
            // Authentication check
            const session = await auth();
            if (!session || !session.user?.email?.includes('@')) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401 }
                );
            }

            // Parse query parameters
            const { searchParams } = new URL(req.url);
            const filters = {
                category: searchParams.get('category'),
                metal: searchParams.get('metal'),
                active: searchParams.get('active'),
                supplier: searchParams.get('supplier'),
                stuller_item_number: searchParams.get('stuller') === 'true'
            };

            // Remove null/undefined filters
            Object.keys(filters).forEach(key => {
                if (filters[key] === null || filters[key] === undefined) {
                    delete filters[key];
                }
            });

            const materials = await MaterialService.getMaterials(filters);
            
            return new Response(
                JSON.stringify({ 
                    success: true,
                    materials: materials || []
                }),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in MaterialController.getMaterials:", error);
            return new Response(
                JSON.stringify({ 
                    success: false,
                    error: "Failed to fetch materials",
                    details: error.message
                }),
                { status: 500 }
            );
        }
    }

    /**
     * ✅ Get a single material by ID
     * @param {Request} req - The incoming request object
     * @returns {Response} - JSON response with material or error message  
     */
    static async getMaterialById(req) {
        try {
            // Authentication check
            const session = await auth();
            if (!session || !session.user?.email?.includes('@')) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401 }
                );
            }

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

            const material = await MaterialService.getMaterialById(materialId);
            
            if (!material) {
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
                    material: material
                }),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in MaterialController.getMaterialById:", error);
            return new Response(
                JSON.stringify({ 
                    success: false,
                    error: "An error occurred while fetching the material.",
                    details: error.message
                }),
                { status: 500 }
            );
        }
    }
}
