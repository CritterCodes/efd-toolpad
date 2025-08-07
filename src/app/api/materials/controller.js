// src/app/api/materials/material.controller.js

import MaterialService from "./service";
import { auth } from '../../../../../auth';

export default class MaterialController {
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
            
            // Handle validation errors
            if (error.message.includes('Validation failed') || error.message.includes('already exists')) {
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
                    error: "An error occurred while creating the material.",
                    details: error.message
                }),
                { status: 500 }
            );
        }
    }

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
