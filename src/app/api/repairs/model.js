import { db } from "@/lib/database";
import { v4 as uuidv4 } from 'uuid';
import WorkOrdersModel from "@/app/api/workOrders/model";

export default class RepairsModel {
    /**
     * ✅ Find all repairs in the collection
     * Returns all repair records ignoring `_id`.
     */
    static findAll = async () => {
        const dbInstance = await db.connect();
        return await dbInstance.collection("repairs").find({}).project({ _id: 0 }).toArray();
    };

    /**
     * ✅ Find a single repair by repairID
     */
    static findById = async (repairID) => {
        const dbInstance = await db.connect();
        const repair = await dbInstance.collection("repairs").findOne(
            { repairID },
            { projection: { _id: 0 } }
        );
        if (!repair) throw new Error("Repair not found.");
        return repair;
    };


    /**
     * ✅ Insert a new repair record and return the complete object
     */
    static create = async (repair) => {
        try {
            console.log("📦 Attempting to Insert Repair in the Database...");
            const dbInstance = await db.connect();

            const result = await dbInstance.collection("repairs").insertOne(repair);

            if (result.acknowledged) {
                // ✅ Return the full inserted repair object
                console.log("✅ Repair successfully saved to the database:", repair.repairID);
                // Spine sync: ensure a work order exists for this repair (S0).
                // Non-fatal — a repair must still save even if WO sync hiccups.
                try {
                    await WorkOrdersModel.syncFromRepair(repair);
                } catch (woError) {
                    console.error("⚠️ Work order sync failed on repair create:", woError.message);
                }
                return repair;
            } else {
                console.error("❌ Database Insert Failed");
                throw new Error("Failed to insert repair into the database.");
            }
        } catch (error) {
            console.error("❌ Database Error:", error.message);
            throw new Error("Database operation failed.");
        }
    };

    /**
     * ✅ Update a repair by repairID and return the updated object
     */
    static async updateById(repairID, updateData) {
        const dbInstance = await db.connect();
        
        try {
            // ✅ Ensure the repairID and data are correctly handled
            const result = await dbInstance.collection("repairs").updateOne(
                { repairID },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                throw new Error("Repair not found.");
            }

            // ✅ Return the updated repair object after updating
            const updatedRepair = await this.findById(repairID);
            // Spine sync: mirror the repair's bench state onto its work order (S0).
            try {
                await WorkOrdersModel.syncFromRepair(updatedRepair);
            } catch (woError) {
                console.error("⚠️ Work order sync failed on repair update:", woError.message);
            }
            return updatedRepair;
        } catch (error) {
            console.error("❌ Error in RepairsModel:", error);
            throw new Error("Failed to update repair in the database.");
        }
    }


    /**
     * ✅ Delete a repair by repairID, cascading to everything tied to it so no orphans linger.
     * Removes the repair's work order(s) and labor log(s); if a labor log was in a payroll batch,
     * the batch is kept internally consistent (log pulled, counts decremented, its hours/pay
     * backed out). Repair invoices are intentionally NOT touched — they're customer billing
     * records (a consolidated wholesale invoice can reference other live repairs too).
     */
    static deleteById = async (repairID) => {
        const dbInstance = await db.connect();

        // 1) Work orders (bench spine) — not financial, always safe to remove.
        const woResult = await dbInstance.collection("workOrders")
            .deleteMany({ sourceType: "repair", sourceID: repairID });

        // 2) Labor logs — back each out of its payroll batch (grouped, so a repair with multiple
        //    logs in one batch only decrements repairsWorked once), then delete them.
        const logs = await dbInstance.collection("laborLogs")
            .find({ repairID })
            .project({ _id: 0, logID: 1, payrollBatchID: 1, creditedLaborHours: 1, creditedValue: 1 })
            .toArray();
        const byBatch = {};
        for (const log of logs) {
            if (!log.payrollBatchID) continue;
            const agg = (byBatch[log.payrollBatchID] ||= { logIDs: [], hours: 0, pay: 0 });
            agg.logIDs.push(log.logID);
            agg.hours += Number(log.creditedLaborHours) || 0;
            agg.pay += Number(log.creditedValue) || 0;
        }
        for (const [batchID, agg] of Object.entries(byBatch)) {
            await dbInstance.collection("payrollBatches").updateOne(
                { batchID },
                {
                    $pull: { logIDs: { $in: agg.logIDs } },
                    $inc: {
                        entryCount: -agg.logIDs.length,
                        repairsWorked: -1,
                        laborHours: -(Math.round(agg.hours * 100) / 100),
                        laborPay: -(Math.round(agg.pay * 100) / 100),
                    },
                    $set: { updatedAt: new Date() },
                }
            );
        }
        const logResult = await dbInstance.collection("laborLogs").deleteMany({ repairID });

        // 3) The repair itself.
        const result = await dbInstance.collection("repairs").deleteOne({ repairID });
        if (result.deletedCount === 0) {
            throw new Error("Repair not found.");
        }

        return {
            message: `Successfully deleted repair with ID: ${repairID}`,
            cascade: { workOrders: woResult.deletedCount, laborLogs: logResult.deletedCount },
        };
    };

    /**
     * ✅ Find repairs created by a specific user (by ID or email)
     */
    static findByCreator = async (userId, userEmail) => {
        const dbInstance = await db.connect();
        
        const orConditions = [];
        if (userId) {
            orConditions.push({ "userID": userId });
            orConditions.push({ "createdBy": userId });
        }
        if (userEmail) {
            orConditions.push({ "submittedBy": userEmail });
            orConditions.push({ "userID": userEmail });
        }
        
        return await dbInstance.collection("repairs")
            .find({ $or: orConditions })
            .project({ _id: 0 })
            .sort({ createdAt: -1 })
            .toArray();
    };
}
