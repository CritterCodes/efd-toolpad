// src/app/api/repairTasks/controller.js
import RepairTasksService from "./service";

export default class RepairTasksController {
    static getRepairTasks = async () => {
        try {
            const repairTasks = await RepairTasksService.fetchRepairTasks();
            return new Response(JSON.stringify(repairTasks), { status: 200 });
        } catch (error) {
            console.error("Error in controller:", error);
            return new Response(
                JSON.stringify({ error: "Error fetching repair tasks", details: error.message }),
                { status: 500 }
            );
        }
    };
}
