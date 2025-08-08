import RepairsService from "@/services/repairs";

export const createStatusMetadata = (status, assignedPerson, currentDateTime) => {
    const baseMetadata = {
        movedAt: currentDateTime,
        movedBy: assignedPerson || "System User"
    };

    switch (status) {
        case "PARTS ORDERED":
            return {
                ...baseMetadata,
                partsOrderedDate: currentDateTime,
                partsOrderedBy: assignedPerson || "System User"
            };
        case "IN PROGRESS":
            return {
                ...baseMetadata,
                assignedJeweler: assignedPerson || "Unassigned",
                assignedTo: assignedPerson || "Unassigned"
            };
        case "QUALITY CONTROL":
            return {
                ...baseMetadata,
                qcDate: currentDateTime,
                qcBy: assignedPerson || "System User"
            };
        case "COMPLETED":
            return {
                ...baseMetadata,
                completedAt: currentDateTime,
                completedBy: assignedPerson || "System User"
            };
        default:
            return baseMetadata;
    }
};

export const updateRepairWithMetadata = (repair, status, assignedPerson, currentDateTime) => {
    const baseUpdate = {
        ...repair,
        status,
        updatedAt: currentDateTime
    };

    switch (status) {
        case "PARTS ORDERED":
            return {
                ...baseUpdate,
                partsOrderedDate: currentDateTime,
                partsOrderedBy: assignedPerson || "System User"
            };
        case "IN PROGRESS":
            return {
                ...baseUpdate,
                assignedJeweler: assignedPerson || "Unassigned",
                assignedTo: assignedPerson || "Unassigned"
            };
        case "QUALITY CONTROL":
            return {
                ...baseUpdate,
                qcDate: currentDateTime,
                qcBy: assignedPerson || "System User"
            };
        case "COMPLETED":
            return {
                ...baseUpdate,
                completedAt: currentDateTime,
                completedBy: assignedPerson || "System User"
            };
        default:
            return baseUpdate;
    }
};

export const moveRepairsToStatus = async (repairIDs, status, assignedPerson) => {
    const currentDateTime = new Date().toISOString();
    const metadata = createStatusMetadata(status, assignedPerson, currentDateTime);
    
    const updatePayload = {
        repairIDs,
        status,
        metadata
    };

    return await RepairsService.moveRepairStatus(repairIDs, status, metadata);
};
