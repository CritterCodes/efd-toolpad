import RepairsService from "@/services/repairs";

export const assignJewelerToRepairs = async (repairIDs, jewelerName) => {
    const metadata = {
        assignedAt: new Date().toISOString(),
        assignedBy: "System User"
    };

    // For each repair, update with assigned jeweler
    const promises = repairIDs.map(async (repairID) => {
        try {
            // This assumes your RepairsService has an updateRepair method
            // You may need to adjust this based on your actual API structure
            const response = await fetch(`/api/repairs/${repairID}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    assignedJeweler: jewelerName,
                    assignedTo: jewelerName,
                    ...metadata
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to assign jeweler to repair ${repairID}`);
            }

            return { repairID, success: true, response: await response.json() };
        } catch (error) {
            return { repairID, success: false, error };
        }
    });

    return await Promise.all(promises);
};

export const startWorkOnRepair = async (repairID, jewelerName) => {
    const metadata = {
        startedAt: new Date().toISOString(),
        startedBy: jewelerName || "System User"
    };

    return await RepairsService.moveRepairStatus([repairID], "IN PROGRESS", metadata);
};

export const updateRepairAssignment = (repair, jewelerName) => {
    return {
        ...repair,
        assignedJeweler: jewelerName,
        assignedTo: jewelerName,
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

export const calculateWorkPriority = (repair) => {
    let priority = 0;
    
    // Rush orders get highest priority
    if (repair.isRush) priority += 100;
    
    // Overdue items get high priority
    if (repair.promiseDate) {
        const today = new Date();
        const dueDate = new Date(repair.promiseDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) priority += 50; // Overdue
        else if (daysUntilDue === 0) priority += 30; // Due today
        else if (daysUntilDue <= 3) priority += 15; // Due soon
    }
    
    // Assigned items get slight priority boost
    if (repair.assignedJeweler && repair.assignedJeweler !== 'Unassigned') {
        priority += 5;
    }
    
    return priority;
};

export const groupRepairsByJeweler = (repairs) => {
    const groups = {
        'Unassigned': [],
        ...Object.fromEntries(
            ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Lisa Davis'].map(name => [name, []])
        )
    };

    repairs.forEach(repair => {
        const jeweler = repair.assignedJeweler || 'Unassigned';
        if (groups[jeweler]) {
            groups[jeweler].push(repair);
        } else {
            groups['Unassigned'].push(repair);
        }
    });

    return groups;
};

export const getWorkloadStats = (repairs) => {
    const stats = {
        total: repairs.length,
        assigned: 0,
        unassigned: 0,
        rush: 0,
        overdue: 0,
        dueToday: 0,
        byJeweler: {}
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    repairs.forEach(repair => {
        if (repair.assignedJeweler && repair.assignedJeweler !== 'Unassigned') {
            stats.assigned++;
            stats.byJeweler[repair.assignedJeweler] = (stats.byJeweler[repair.assignedJeweler] || 0) + 1;
        } else {
            stats.unassigned++;
        }

        if (repair.isRush) stats.rush++;

        if (repair.promiseDate) {
            const dueDate = new Date(repair.promiseDate);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today) stats.overdue++;
            else if (dueDate.getTime() === today.getTime()) stats.dueToday++;
        }
    });

    return stats;
};
