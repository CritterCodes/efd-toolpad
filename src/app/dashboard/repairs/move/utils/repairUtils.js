import RepairsService from "@/services/repairs";
import { buildMoveStatusUpdate, normalizeRepairWorkflow } from "@/services/repairWorkflow";

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
        case "READY FOR PICKUP":
        case "DELIVERY BATCHED":
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
    const movedRepair = {
        ...repair,
        ...buildMoveStatusUpdate(status, createStatusMetadata(status, assignedPerson, currentDateTime), repair),
        updatedAt: currentDateTime,
    };

    return normalizeRepairWorkflow(movedRepair);
};

export const moveRepairsToStatus = async (repairIDs, status, assignedPerson, actorMode = null) => {
    const currentDateTime = new Date().toISOString();
    const metadata = createStatusMetadata(status, assignedPerson, currentDateTime);

    return await RepairsService.moveRepairStatus(repairIDs, status, metadata, actorMode);
};
