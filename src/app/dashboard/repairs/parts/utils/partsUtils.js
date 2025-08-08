import RepairsService from "@/services/repairs";

export const updateRepairStatus = async (repairID, newStatus, assignedPerson = null) => {
    const metadata = {
        movedAt: new Date().toISOString(),
        movedBy: assignedPerson || "System User"
    };

    if (newStatus === "PARTS ORDERED") {
        metadata.partsOrderedDate = new Date().toISOString();
        metadata.partsOrderedBy = assignedPerson || "System User";
    }

    return await RepairsService.moveRepairStatus([repairID], newStatus, metadata);
};

export const savePendingMaterials = async (pendingParts) => {
    const results = [];
    
    for (const repairID in pendingParts) {
        try {
            const response = await RepairsService.addPart(repairID, pendingParts[repairID]);
            results.push({ repairID, success: true, response });
        } catch (error) {
            results.push({ repairID, success: false, error });
        }
    }
    
    return results;
};

export const filterRepairsByStatus = (repairs, status, searchQuery = '') => {
    return repairs.filter((repair) => {
        const matchesStatus = repair.status === status;
        const matchesSearch = searchQuery === '' || 
            repair.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repair.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            repair.repairID.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesStatus && matchesSearch;
    });
};

export const mergeMaterialsWithPending = (repairMaterials = [], pendingMaterials = []) => {
    const materialMap = new Map();
    
    // Add existing materials
    repairMaterials.forEach(material => {
        materialMap.set(material.sku || material.id, material);
    });
    
    // Add/update with pending materials
    pendingMaterials.forEach(material => {
        materialMap.set(material.sku || material.id, material);
    });
    
    return Array.from(materialMap.values());
};
