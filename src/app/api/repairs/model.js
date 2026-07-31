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
     * Append after-photo URLs without touching the rest of the array.
     *
     * The closeout route used to read `afterPhotos`, push the new URLs onto that snapshot, and $set the
     * whole array back — a read-modify-write that loses photos under concurrency: two staff confirming
     * the same repair each read the array before the other wrote, and the second $set overwrites the
     * first's photo (leaving the uploaded object orphaned in MinIO). Every confirm now reaches this
     * write, since photos no longer gate invoicing, so both requests always race.
     *
     * `$addToSet` also makes a retried request idempotent — re-appending the same URL is a no-op rather
     * than a duplicate thumbnail. It cannot swallow a legitimate second photo, because upload keys embed
     * Date.now() (utils/s3.util.js), so two uploads of the same file get different URLs.
     *
     * Safe on legacy docs. $addToSet creates the array when the field is ABSENT, but errors when the
     * field exists with a non-array type ("Cannot apply $addToSet to non-array field"). The old
     * read-modify-write coerced such a value away silently; without the normalize below, a malformed
     * field would instead 500 on every retry and permanently block attaching a photo to that repair —
     * after the object had already been uploaded to MinIO. Verified 2026-07-31 against prod and DEV:
     * 180 repairs per DB have no `afterPhotos` field and ZERO have it as a non-array or explicit null,
     * so the normalize is belt-and-braces — but `PUT /api/repairs` applies its body with no field
     * whitelist, so a bad value is writable in principle.
     *
     * Deliberately does NOT run WorkOrdersModel.syncFromRepair: the work-order mirror carries no photo
     * fields (see workOrders/model.js), so there is nothing to sync.
     */
    static async appendAfterPhotos(repairID, urls = []) {
        const additions = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
        if (additions.length === 0) return;

        const dbInstance = await db.connect();
        const col = dbInstance.collection("repairs");

        // Matches ONLY a doc whose afterPhotos exists and isn't an array — a missing field is left alone
        // for $addToSet to create, so the normal path writes nothing here.
        await col.updateOne(
            { repairID, afterPhotos: { $exists: true, $not: { $type: 'array' } } },
            { $set: { afterPhotos: [] } }
        );

        const result = await col.updateOne(
            { repairID },
            { $addToSet: { afterPhotos: { $each: additions } } }
        );
        if (result.matchedCount === 0) throw new Error("Repair not found.");
    }

    /**
     * Atomically claim a repair for auto-invoicing. Returns true only for the caller that won.
     *
     * Why this exists: the closeout route decides whether to raise an invoice by READING
     * `invoiceID` and then writing it, which is not atomic. Two staff confirming the same repair
     * from two devices could both read it empty and both call createRepairInvoice — the same repair
     * billed twice, with one orphan draft invoice holding a priced snapshot of it. Since photos
     * stopped gating invoicing (owner, 2026-07-31) EVERY confirm invoices, so every confirm is in
     * that race rather than only the ones that happened to carry a photo.
     *
     * `closeoutStatus: 'batched'` is the claim token because it is what a successful invoice sets
     * anyway, and it is already in the schema enum — so winning the claim never writes a state the
     * repair wasn't about to reach. The filter demands BOTH an unbatched closeout and an empty
     * invoiceID, so it is a true compare-and-swap: MongoDB applies the update to at most one caller.
     *
     * Callers MUST releaseAutoInvoiceClaim() if invoicing then fails, or the repair is left claiming
     * to be batched with no invoice behind it and no way to retry.
     */
    static async claimForAutoInvoice(repairID) {
        const dbInstance = await db.connect();
        const result = await dbInstance.collection("repairs").updateOne(
            {
                repairID,
                closeoutStatus: { $ne: 'batched' },
                $or: [{ invoiceID: '' }, { invoiceID: null }, { invoiceID: { $exists: false } }],
            },
            { $set: { closeoutStatus: 'batched' } }
        );
        return result.modifiedCount === 1;
    }

    /**
     * Undo claimForAutoInvoice when the invoice could not be created.
     *
     * The invoiceID condition only protects against releasing a repair whose invoiceID was already
     * written — it CANNOT tell whether an invoice document exists, because createRepairInvoice inserts
     * the invoice before it writes repair.invoiceID. Callers are responsible for checking the invoices
     * collection first; the closeout route does this before calling here.
     */
    static async releaseAutoInvoiceClaim(repairID) {
        const dbInstance = await db.connect();
        await dbInstance.collection("repairs").updateOne(
            { repairID, closeoutStatus: 'batched', $or: [{ invoiceID: '' }, { invoiceID: null }, { invoiceID: { $exists: false } }] },
            { $set: { closeoutStatus: 'in_review' } }
        );
    }

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
