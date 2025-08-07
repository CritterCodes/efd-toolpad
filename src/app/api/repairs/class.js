import { v4 as uuidv4 } from 'uuid';
import { defaultRepairData, calculateTotalCost } from '@/schemas/repair.schema';

export default class Repair {
    constructor(repairData) {
        // Use default data as base and merge with provided data
        const data = { ...defaultRepairData, ...repairData };
        
        // Core identifiers
        this.repairID = data.repairID || `repair-${uuidv4().slice(-8)}`;
        this.userID = data.userID;
        this.clientName = data.clientName;
        
        // Basic repair information
        this.description = data.description;
        this.isRush = data.isRush || data.priority === 'rush'; // Handle legacy priority
        this.promiseDate = data.promiseDate;
        
        // Legacy fields for backward compatibility
        this.category = data.category || 'repair';
        this.priority = data.priority || (data.isRush ? 'rush' : 'standard');
        
        // Item details
        this.metalType = data.metalType;
        this.karat = data.karat;
        
        // Ring-specific fields
        this.isRing = data.isRing;
        this.currentRingSize = data.currentRingSize;
        this.desiredRingSize = data.desiredRingSize;
        
        // Notes and documentation
        this.notes = data.notes;
        this.internalNotes = data.internalNotes;
        
        // Work items
        this.tasks = data.tasks || [];
        this.processes = data.processes || [];
        this.materials = data.materials || [];
        this.customLineItems = data.customLineItems || [];
        
        // Pricing
        this.isWholesale = data.isWholesale;
        this.totalCost = data.totalCost || calculateTotalCost(data, data.isWholesale);
        
        // Status and workflow
        this.status = data.status || 'pending';
        
        // Media
        this.picture = data.picture;
        this.beforePhotos = data.beforePhotos || [];
        this.afterPhotos = data.afterPhotos || [];
        
        // Audit fields
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = new Date();
        this.completedAt = data.completedAt;
        this.pickedUpAt = data.pickedUpAt;
        
        // Team assignments
        this.assignedTo = data.assignedTo;
        this.completedBy = data.completedBy;
        
        // Legacy support
        this.repairTasks = data.repairTasks || [];
        
        // Legacy fields for backward compatibility
        this.parts = data.parts || [];
    }
    
    /**
     * Update the repair with new data
     */
    update(updateData) {
        Object.keys(updateData).forEach(key => {
            if (key !== 'repairID' && key !== 'createdAt') { // Don't allow updating these fields
                this[key] = updateData[key];
            }
        });
        
        this.updatedAt = new Date();
        
        // Recalculate total cost if work items were updated
        if (updateData.tasks || updateData.processes || updateData.materials || updateData.customLineItems) {
            this.totalCost = calculateTotalCost(this, this.isWholesale);
        }
    }
    
    /**
     * Mark repair as completed
     */
    markCompleted(completedBy = null) {
        this.status = 'completed';
        this.completedAt = new Date();
        this.updatedAt = new Date();
        if (completedBy) {
            this.completedBy = completedBy;
        }
    }
    
    /**
     * Mark repair as picked up
     */
    markPickedUp() {
        this.status = 'picked-up';
        this.pickedUpAt = new Date();
        this.updatedAt = new Date();
    }
    
    /**
     * Get repair data as plain object for database storage
     */
    toObject() {
        return {
            repairID: this.repairID,
            userID: this.userID,
            clientName: this.clientName,
            description: this.description,
            isRush: this.isRush,
            promiseDate: this.promiseDate,
            // Legacy compatibility fields
            category: this.category,
            priority: this.priority,
            metalType: this.metalType,
            karat: this.karat,
            isRing: this.isRing,
            currentRingSize: this.currentRingSize,
            desiredRingSize: this.desiredRingSize,
            notes: this.notes,
            internalNotes: this.internalNotes,
            tasks: this.tasks,
            processes: this.processes,
            materials: this.materials,
            customLineItems: this.customLineItems,
            isWholesale: this.isWholesale,
            totalCost: this.totalCost,
            status: this.status,
            picture: this.picture,
            beforePhotos: this.beforePhotos,
            afterPhotos: this.afterPhotos,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            completedAt: this.completedAt,
            pickedUpAt: this.pickedUpAt,
            assignedTo: this.assignedTo,
            completedBy: this.completedBy,
            repairTasks: this.repairTasks, // Legacy support
            parts: this.parts // Legacy support
        };
    }
}