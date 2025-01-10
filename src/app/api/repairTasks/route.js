// src/app/api/repairTasks/route.js
import RepairTasksController from "./controller";

export const GET = async (req) => {
    try {
        return await RepairTasksController.getRepairTasks(req);
    } catch (error) {
        console.error("Error in route:", error);
        return new Response(
            JSON.stringify({ error: "Failed to fetch repair tasks", details: error.message }),
            { status: 500 }
        );
    }
};
