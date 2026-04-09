export function buildPutUpdateFields(status, updateData, updatedBy, userEmail) {
    const updateFields = {
        'cadRequests.$.updatedAt': new Date(),
        'cadRequests.$.lastUpdatedBy': updatedBy || userEmail
    };

    if (status) {
        updateFields['cadRequests.$.status'] = status;
    }

    if (updateData.mountingType !== undefined) {
        updateFields['cadRequests.$.mountingDetails.mountingType'] = updateData.mountingType;
    }
    if (updateData.styleDescription !== undefined) {
        updateFields['cadRequests.$.mountingDetails.styleDescription'] = updateData.styleDescription;
    }
    if (updateData.ringSize !== undefined) {
        updateFields['cadRequests.$.mountingDetails.ringSize'] = updateData.ringSize;
    }
    if (updateData.specialRequests !== undefined) {
        updateFields['cadRequests.$.mountingDetails.specialRequests'] = updateData.specialRequests;
    }
    if (updateData.assignedDesigner !== undefined) {
        updateFields['cadRequests.$.assignedDesigner'] = updateData.assignedDesigner;
    }
    if (updateData.priority !== undefined) {
        updateFields['cadRequests.$.priority'] = updateData.priority;
    }

    return updateFields;
}

export function buildPatchUpdateFields(action, updateData, userEmail) {
    const updateFields = {
        'cadRequests.$.updatedAt': new Date(),
        'cadRequests.$.lastUpdatedBy': userEmail
    };

    if (action === 'status' && updateData.status) {
        updateFields['cadRequests.$.status'] = updateData.status;
    } else if (action === 'assign' && updateData.assignedDesigner) {
        updateFields['cadRequests.$.assignedDesigner'] = updateData.assignedDesigner;
    } else if (action === 'priority' && updateData.priority) {
        updateFields['cadRequests.$.priority'] = updateData.priority;
    } else {
        // Default: update any provided fields
        if (updateData.status !== undefined) {
            updateFields['cadRequests.$.status'] = updateData.status;
        }
        if (updateData.assignedDesigner !== undefined) {
            updateFields['cadRequests.$.assignedDesigner'] = updateData.assignedDesigner;
        }
        if (updateData.priority !== undefined) {
            updateFields['cadRequests.$.priority'] = updateData.priority;
        }
    }

    return updateFields;
}

export function buildStatusHistoryPush(status, notes, updatedBy, userEmail, action) {
    if (!notes) return {};
    return {
        $push: {
            'cadRequests.$.statusHistory': {
                status: status || action || 'updated',
                notes,
                updatedBy: updatedBy || userEmail,
                updatedAt: new Date()
            }
        }
    };
}
