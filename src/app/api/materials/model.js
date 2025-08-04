// src/app/api/materials/material.model.js
import { db } from "@/lib/database";
import { ObjectId } from 'mongodb';

export default class MaterialModel {
    /**
     * ✅ Create a new material
     * @param {Object} material - The material object to create
     * @returns {Object|null} - The created material or null if failed
     */
    static createMaterial = async (material) => {
        try {
            const dbMaterials = await db.dbMaterials();
            const result = await dbMaterials.insertOne(material);
            if (!result.insertedId) {
                throw new Error("Failed to insert material.");
            }
            return { ...material, _id: result.insertedId };
        } catch (error) {
            console.error("Error creating material:", error);
            throw new Error(`Error creating material: ${error.message}`);
        }
    }

    /**
     * ✅ Get materials with optional filtering
     * @param {Object} query - Query object to filter materials
     * @param {Object} sortOptions - Sort options
     * @returns {Array} - Array of materials
     */
    static getMaterials = async (query = {}, sortOptions = { category: 1, displayName: 1 }) => {
        try {
            const dbMaterials = await db.dbMaterials();
            const materials = await dbMaterials
                .find(query)
                .sort(sortOptions)
                .toArray();
            return materials;
        } catch (error) {
            console.error("Error fetching materials:", error);
            throw new Error(`Error fetching materials: ${error.message}`);
        }
    }

    /**
     * ✅ Get a single material by ID
     * @param {String} materialId - The material ID
     * @returns {Object|null} - The material or null if not found
     */
    static getMaterialById = async (materialId) => {
        try {
            const dbMaterials = await db.dbMaterials();
            const material = await dbMaterials.findOne({ _id: new ObjectId(materialId) });
            return material;
        } catch (error) {
            console.error("Error fetching material by ID:", error);
            throw new Error(`Error fetching material: ${error.message}`);
        }
    }

    /**
     * ✅ Get a single material by query
     * @param {Object} query - Query object to search for a material
     * @returns {Object|null} - The material or null if not found
     */
    static getMaterialByQuery = async (query) => {
        try {
            const dbMaterials = await db.dbMaterials();
            const material = await dbMaterials.findOne(query);
            return material;
        } catch (error) {
            console.error("Error fetching material by query:", error);
            throw new Error(`Error fetching material: ${error.message}`);
        }
    }

    /**
     * ✅ Update a material
     * @param {String} materialId - The material ID
     * @param {Object} updateData - The data to update
     * @returns {Object|null} - The updated material or null if failed
     */
    static updateMaterial = async (materialId, updateData) => {
        try {
            const dbMaterials = await db.dbMaterials();
            const result = await dbMaterials.updateOne(
                { _id: new ObjectId(materialId) },
                { $set: updateData }
            );
            
            if (result.matchedCount === 0) {
                return null; // Material not found
            }
            
            return { ...updateData, _id: materialId };
        } catch (error) {
            console.error("Error updating material:", error);
            throw new Error(`Error updating material: ${error.message}`);
        }
    }

    /**
     * ✅ Delete a material
     * @param {String} materialId - The material ID
     * @returns {Boolean} - True if deleted, false if not found
     */
    static deleteMaterial = async (materialId) => {
        try {
            const dbMaterials = await db.dbMaterials();
            const result = await dbMaterials.deleteOne({ _id: new ObjectId(materialId) });
            return result.deletedCount > 0;
        } catch (error) {
            console.error("Error deleting material:", error);
            throw new Error(`Error deleting material: ${error.message}`);
        }
    }

    /**
     * ✅ Check if material exists by name
     * @param {String} name - The material name to check
     * @param {String} excludeId - Optional ID to exclude from check (for updates)
     * @returns {Boolean} - True if exists, false otherwise
     */
    static materialExists = async (name, excludeId = null) => {
        try {
            const dbMaterials = await db.dbMaterials();
            const query = { name: name.toLowerCase() };
            
            if (excludeId) {
                query._id = { $ne: new ObjectId(excludeId) };
            }
            
            const material = await dbMaterials.findOne(query);
            return material !== null;
        } catch (error) {
            console.error("Error checking material existence:", error);
            throw new Error(`Error checking material: ${error.message}`);
        }
    }
}
