// src/app/api/materials/material.class.js
import { v4 as uuidv4 } from 'uuid';
import { generateMaterialSku } from '@/utils/skuGenerator';

export default class Material {
    constructor(
        displayName,
        category,
        unitCost,
        unitType = 'application',
        compatibleMetals = [],
        supplier = '',
        description = '',
        stuller_item_number = null,
        auto_update_pricing = false,
        createdBy = 'system'
    ) {
        this.sku = generateMaterialSku(category, this.determineMaterialType(displayName, category));
        this.name = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        this.displayName = displayName.trim();
        this.category = category.toLowerCase();
        this.unitCost = parseFloat(unitCost) || 0;
        this.unitType = unitType;
        this.compatibleMetals = compatibleMetals;
        this.supplier = supplier;
        this.description = description;
        
        // Stuller integration fields
        this.stuller_item_number = stuller_item_number;
        this.auto_update_pricing = auto_update_pricing;
        this.last_price_update = stuller_item_number ? new Date() : null;
        
        // Standard fields
        this.isActive = true;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.createdBy = createdBy;
        
        // Additional fields for advanced materials
        this.karat = '';
        this.portionsPerUnit = 1;
        this.portionType = '';
        this.costPerPortion = 0;
        
        // Initialize pricing structure - will be calculated later
        this.pricing = null;
    }
    
    /**
     * Calculate pricing with admin settings
     */
    calculatePricing(adminSettings) {
        const settings = adminSettings || {};
        const pricing = settings.pricing || {};
        const materialMarkup = pricing.materialMarkup || 1.3;
        
        // Base price is the raw unit cost divided by portions per unit
        const basePrice = this.portionsPerUnit > 0 ? this.unitCost / this.portionsPerUnit : this.unitCost;
        const finalPrice = basePrice * materialMarkup;
        
        this.pricing = {
            basePrice: Math.round(basePrice * 1000) / 1000, // Round to 3 decimal places
            materialMarkup: materialMarkup,
            finalPrice: Math.round(finalPrice * 1000) / 1000,
            calculatedAt: new Date()
        };
        
        // Also set the legacy costPerPortion field for backwards compatibility
        this.costPerPortion = this.pricing.finalPrice;
        
        return this.pricing;
    }

    /**
     * Determine material type from name and category for better SKU generation
     */
    determineMaterialType(name, category) {
        const nameType = name.toLowerCase();
        const categoryType = category.toLowerCase();
        
        // Check for specific material types in the name
        if (nameType.includes('silver')) return 'silver';
        if (nameType.includes('gold')) return 'gold';
        if (nameType.includes('platinum')) return 'platinum';
        if (nameType.includes('copper')) return 'copper';
        if (nameType.includes('brass')) return 'brass';
        if (nameType.includes('steel')) return 'steel';
        
        // Check for tool/supply types
        if (nameType.includes('polish') || nameType.includes('compound')) return 'polishing';
        if (nameType.includes('cut') || nameType.includes('blade') || nameType.includes('saw')) return 'cutting';
        if (nameType.includes('adhesive') || nameType.includes('glue') || nameType.includes('cement')) return 'adhesive';
        if (nameType.includes('solvent') || nameType.includes('cleaner')) return 'solvent';
        if (nameType.includes('lubricant') || nameType.includes('oil')) return 'lubricant';
        
        // Fall back to category-based detection
        if (categoryType.includes('metal')) return 'general';
        if (categoryType.includes('tool')) return 'general';
        if (categoryType.includes('supply')) return 'consumable';
        
        return 'general';
    }

    /**
     * Validate material data
     */
    validate() {
        const errors = [];
        
        if (!this.displayName || this.displayName.trim().length === 0) {
            errors.push('Display name is required');
        }
        
        if (!this.category || this.category.trim().length === 0) {
            errors.push('Category is required');
        }
        
        if (this.unitCost < 0 || this.unitCost > 10000) {
            errors.push('Unit cost must be between 0 and $10,000');
        }
        
        // Compatible metals is only required for non-Stuller materials
        if (!this.stuller_item_number && (!this.compatibleMetals || this.compatibleMetals.length === 0)) {
            errors.push('At least one compatible metal must be specified for manual materials');
        }
        
        return errors;
    }

    /**
     * Update material with new data
     */
    update(updateData) {
        const allowedFields = [
            'displayName', 'category', 'unitCost', 'unitType', 'compatibleMetals',
            'supplier', 'description', 'isActive', 'stuller_item_number',
            'auto_update_pricing', 'karat', 'portionsPerUnit', 'portionType', 'costPerPortion', 'pricing'
        ];
        
        allowedFields.forEach(field => {
            if (updateData.hasOwnProperty(field)) {
                this[field] = updateData[field];
            }
        });
        
        // Update derived fields
        if (updateData.displayName) {
            this.name = updateData.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        }
        
        this.updatedAt = new Date();
        
        return this;
    }

    /**
     * Convert to plain object for database storage
     */
    toObject() {
        const obj = {
            sku: this.sku,
            name: this.name,
            displayName: this.displayName,
            category: this.category,
            unitCost: this.unitCost,
            unitType: this.unitType,
            compatibleMetals: this.compatibleMetals,
            supplier: this.supplier,
            description: this.description,
            stuller_item_number: this.stuller_item_number,
            auto_update_pricing: this.auto_update_pricing,
            last_price_update: this.last_price_update,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            createdBy: this.createdBy,
            karat: this.karat,
            portionsPerUnit: this.portionsPerUnit,
            portionType: this.portionType,
            costPerPortion: this.costPerPortion
        };
        
        // Include pricing structure if it exists
        if (this.pricing) {
            obj.pricing = this.pricing;
        }
        
        return obj;
    }
}
