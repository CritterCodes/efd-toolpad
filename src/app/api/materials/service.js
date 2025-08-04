// src/app/api/materials/material.service.js

import Material from "./class";
import MaterialModel from "./model";
import { db } from '@/lib/database';

export default class MaterialService {
    
    /**
     * Get admin settings for pricing calculations
     */
    static async getAdminSettings() {
        try {
            await db.connect();
            const adminCollection = db._instance.collection('adminSettings');
            const settings = await adminCollection.findOne({});
            return settings || {};
        } catch (error) {
            console.error('Error fetching admin settings:', error);
            return {};
        }
    }

    /**
     * ✅ Create a new material
     * @param {Object} materialData - The data required to create a material
     * @param {String} createdBy - The user creating the material
     * @returns {Object|null} - Created material or null if failed
     */
    static createMaterial = async (materialData, createdBy = 'system') => {
        try {
            // Create new Material instance with validation
            const newMaterial = new Material(
                materialData.displayName,
                materialData.category,
                materialData.unitCost,
                materialData.unitType,
                materialData.compatibleMetals,
                materialData.supplier,
                materialData.description,
                materialData.stuller_item_number,
                materialData.auto_update_pricing,
                createdBy
            );
            
            // Set additional material properties if provided
            if (materialData.karat) newMaterial.karat = materialData.karat;
            if (materialData.portionsPerUnit) newMaterial.portionsPerUnit = materialData.portionsPerUnit;
            if (materialData.portionType) newMaterial.portionType = materialData.portionType;

            // Calculate pricing with admin settings
            const adminSettings = await this.getAdminSettings();
            newMaterial.calculatePricing(adminSettings);

            // Validate the material
            const validationErrors = newMaterial.validate();
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Check for duplicate names
            const exists = await MaterialModel.materialExists(newMaterial.name);
            if (exists) {
                throw new Error('A material with this name already exists');
            }

            // Create the material
            const createdMaterial = await MaterialModel.createMaterial(newMaterial.toObject());
            return createdMaterial;
        } catch (error) {
            console.error("Error in MaterialService.createMaterial:", error);
            throw new Error(`Failed to create material: ${error.message}`);
        }
    }

    /**
     * ✅ Get materials with optional filtering
     * @param {Object} filters - Filter parameters
     * @returns {Array} - Array of materials
     */
    static getMaterials = async (filters = {}) => {
        try {
            // Build query from filters
            const query = MaterialService.buildQuery(filters);
            
            // Get materials from model
            const materials = await MaterialModel.getMaterials(query);
            return materials;
        } catch (error) {
            console.error("Error in MaterialService.getMaterials:", error);
            throw new Error(`Failed to fetch materials: ${error.message}`);
        }
    }

    /**
     * ✅ Get a single material by ID
     * @param {String} materialId - The material ID
     * @returns {Object|null} - The material or null if not found
     */
    static getMaterialById = async (materialId) => {
        try {
            const material = await MaterialModel.getMaterialById(materialId);
            return material;
        } catch (error) {
            console.error("Error in MaterialService.getMaterialById:", error);
            throw new Error(`Failed to fetch material: ${error.message}`);
        }
    }

    /**
     * ✅ Update a material
     * @param {String} materialId - The material ID
     * @param {Object} updateData - The data to update
     * @returns {Object|null} - The updated material or null if not found
     */
    static updateMaterial = async (materialId, updateData) => {
        try {
            // Get existing material
            const existingMaterial = await MaterialModel.getMaterialById(materialId);
            if (!existingMaterial) {
                throw new Error('Material not found');
            }

            // Create Material instance for validation
            const materialInstance = new Material(
                existingMaterial.displayName,
                existingMaterial.category,
                existingMaterial.unitCost,
                existingMaterial.unitType,
                existingMaterial.compatibleMetals,
                existingMaterial.supplier,
                existingMaterial.description,
                existingMaterial.stuller_item_number,
                existingMaterial.auto_update_pricing,
                existingMaterial.createdBy
            );
            
            // Set existing additional properties
            materialInstance.karat = existingMaterial.karat || '';
            materialInstance.portionsPerUnit = existingMaterial.portionsPerUnit || 1;
            materialInstance.portionType = existingMaterial.portionType || '';
            materialInstance.pricing = existingMaterial.pricing || null;

            // Update with new data
            materialInstance.update(updateData);
            
            // Recalculate pricing if cost-related fields changed
            if (updateData.unitCost || updateData.portionsPerUnit) {
                const adminSettings = await this.getAdminSettings();
                materialInstance.calculatePricing(adminSettings);
            }

            // Validate updated material
            const validationErrors = materialInstance.validate();
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Check for duplicate names (excluding current material)
            if (updateData.displayName) {
                const exists = await MaterialModel.materialExists(materialInstance.name, materialId);
                if (exists) {
                    throw new Error('A material with this name already exists');
                }
            }

            // Update the material
            const updatedMaterial = await MaterialModel.updateMaterial(materialId, materialInstance.toObject());
            return updatedMaterial;
        } catch (error) {
            console.error("Error in MaterialService.updateMaterial:", error);
            throw new Error(`Failed to update material: ${error.message}`);
        }
    }

    /**
     * ✅ Delete a material
     * @param {String} materialId - The material ID
     * @returns {Boolean} - True if deleted successfully
     */
    static deleteMaterial = async (materialId) => {
        try {
            // Check if material exists
            const material = await MaterialModel.getMaterialById(materialId);
            if (!material) {
                throw new Error('Material not found');
            }

            // Delete the material
            const deleted = await MaterialModel.deleteMaterial(materialId);
            return deleted;
        } catch (error) {
            console.error("Error in MaterialService.deleteMaterial:", error);
            throw new Error(`Failed to delete material: ${error.message}`);
        }
    }

    /**
     * ✅ Build query object from filters
     * @param {Object} filters - Filter parameters
     * @returns {Object} - MongoDB query object
     */
    static buildQuery = (filters) => {
        const query = {};

        if (filters.category) {
            query.category = filters.category.toLowerCase();
        }

        if (filters.metal) {
            query.compatibleMetals = { $in: [filters.metal] };
        }

        if (filters.active !== undefined) {
            query.isActive = filters.active === 'true' || filters.active === true;
        }

        if (filters.supplier) {
            query.supplier = { $regex: filters.supplier, $options: 'i' };
        }

        if (filters.stuller_item_number) {
            query.stuller_item_number = { $ne: null };
        }

        return query;
    }
}
