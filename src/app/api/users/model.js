// src/app/api/users/user.model.js
import { db } from "@/lib/database";
import { ObjectId } from "mongodb";

export function userIdentityQuery(userId) {
    const id = String(userId || '').trim();
    if (ObjectId.isValid(id)) {
        return { $or: [{ userID: id }, { _id: new ObjectId(id) }] };
    }
    return { userID: id };
}

/**
 * Credentials that must NEVER leave the database on a user read.
 *
 * A `users` document carries the bcrypt `password`, a live `resetToken` (+ expiry) and a
 * `verificationToken`. Every read here used a bare `findOne`/`find` with no projection, so any route
 * returning a user handed those out. That enabled a full ACCOUNT TAKEOVER CHAIN:
 *
 *   1. anonymous  POST /api/auth/forgot-password {"email":"owner@…"}   → plants a 1-hour resetToken
 *   2. any signed-in user  GET /api/users?query=owner@…                → reads the raw token
 *   3. anonymous  POST /api/auth/reset-password                        → sets the owner's password
 *
 * Applied at the MODEL layer on purpose: guarding each route individually is what let step 2 survive
 * two rounds of route-by-route auditing. A caller that genuinely needs the hash (login,
 * reset-password) queries the collection directly and is a deliberate, reviewable exception.
 */
export const USER_SECRET_FIELDS = Object.freeze({
    password: 0,
    resetToken: 0,
    resetTokenExpiry: 0,
    verificationToken: 0,
});

/**
 * Fields no caller may set through a GENERIC user update, regardless of role. Each has its own guarded
 * path — `role` via /api/users/create-admin (which additionally requires the `adminSettings`
 * permission) and /api/users/[userID]/promote-affiliate; `password` via reset-password. A blanket
 * `$set` must not be a way around those checks.
 *
 * Why staff are stripped too: `STAFF_ROLES` includes `staff`, whose ROLE_PERMISSIONS set
 * `adminSettings: false` — exactly what create-admin uses to refuse a staff-issued admin grant. Left
 * unstripped, a `staff` account could not create an admin through the guarded route but could promote
 * ITSELF through the generic one.
 */
export const USER_PRIVILEGE_FIELDS = Object.freeze([
    'role', 'password', 'status', 'emailVerified', 'staffCapabilities', 'mustChangePassword',
    'resetToken', 'resetTokenExpiry', 'verificationToken', 'permissions',
]);
// NOT in that list, deliberately: `employment` and `compensationProfile`. The admin user-management
// page edits both, and repair-ops access needs `employment.isOnsite` AND `staffCapabilities.repairOps`
// (see isOnsiteRepairOps) — stripping the capability alone already blocks the grant, so listing
// `employment` would break a real staff workflow for no additional protection.

/**
 * Remove privilege fields from an update payload. Returns a NEW object.
 *
 * Also drops DOTTED keys whose first segment is privileged (`{"staffCapabilities.repairOps": true}`),
 * which an exact-key delete misses entirely — Mongo treats that as a targeted `$set` into the
 * subdocument, so it granted the capability while looking untouched. repairOps/closeoutBilling gate
 * money operations, so this was a real escalation, not a technicality.
 */
export function stripPrivilegeFields(updateData = {}) {
    const out = {};
    for (const [key, value] of Object.entries(updateData || {})) {
        const head = String(key).split('.')[0];
        if (USER_PRIVILEGE_FIELDS.includes(head)) continue;
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        out[key] = value;
    }
    return out;
}


export default class UserModel {
    /**
     * ✅ Create a new user
     * @param {Object} user - The user object to create
     * @returns {Object|null} - The created user or null if failed
     */
    static createUser = async (user) => {
        try {
            const dbUsers = await db.dbUsers();
            const results = await dbUsers.insertOne(user);
            if (!results.insertedId) {
                throw new Error("Failed to insert user.");
            }
            return user;
        } catch (error) {
            console.error("Error creating user:", error);
            return new Response(
                JSON.stringify({ error: "Error creating user", details: error.message }),
                { status: 500 }
            );
        }
    }

    /**
     * ✅ Get a single user by any query parameter
     * @param {Object} query - Query object to search for a user
     * @returns {Object|null} - The found user or null if not found
     */
    static getUserByQuery = async (query) => {
        try {
            db.connect();
            console.log("🔍 Searching user in the database with query:", query);
            const dbInstance = await db.connect();

            // Modified to search by multiple fields using a case-insensitive regex search
            const user = await dbInstance.collection("users").findOne({
                $or: [
                    { firstName: { $regex: query, $options: "i" } },
                    { lastName: { $regex: query, $options: "i" } },
                    { email: { $regex: query, $options: "i" } },
                    { phoneNumber: { $regex: query, $options: "i" } },
                    { userID: { $regex: query, $options: "i" } }
                ]
            }, { projection: USER_SECRET_FIELDS });

            if (!user) {
                console.warn("⚠️ No user found in database for query:", query);
            } else {
                // Log the identifier, NOT the document — this used to print the whole user, i.e. the
                // bcrypt hash and any live reset token, into the server logs.
                console.log("✅ User found in database:", user.userID || user.email);
            }

            return user;
        } catch (error) {
            console.error("❌ Error retrieving user from database:", error);
            return null;
        }
    }

    /**
     * ✅ Get a single user by ID
     * @param {String} userId - The ID of the user to fetch
     * @returns {Object|null} - User data or null if not found
     */
    static async getUserById(userId) {
        try {
            const dbInstance = await db.connect();
            console.log(`🔍 Searching user in the database with ID: ${userId}`);
            
            const user = await dbInstance.collection("users").findOne(userIdentityQuery(userId), { projection: USER_SECRET_FIELDS });

            if (!user) {
                console.warn("⚠️ No user found in database for ID:", userId);
            } else {
                console.log("✅ User found in database:", user);
            }

            return user;
        } catch (error) {
            console.error("❌ Error retrieving user by ID from database:", error);
            return null;
        }
    }




    /**
     * ✅ Get all users
     * @returns {Array} - Array of all users
     */
    static getAllUsers = async () => {
        try {
            const dbUsers = await db.dbUsers();
            const users = await dbUsers.find({}, { projection: USER_SECRET_FIELDS }).toArray();
            return users;
        } catch (error) {
            console.error("Error retrieving all users:", error);
            return [];
        }
    }

    /**
     * ✅ Get users by role
     * @param {string} role - The role to filter by
     * @returns {Array} - Array of users with the specified role
     */
    static getUsersByRole = async (role) => {
        try {
            const dbUsers = await db.dbUsers();
            const users = await dbUsers.find({ role: role }, { projection: USER_SECRET_FIELDS }).toArray();
            return users;
        } catch (error) {
            console.error("Error retrieving users by role:", error);
            return [];
        }
    }

    /**
     * ✅ Update a user's data
     * @param {Object} query - Query to find the user
     * @param {Object} updateData - Data to update
     * @returns {Object|null} - Updated user data or null if failed
     */
    static updateUser = async (query, updateData) => {
        try {
            const dbUsers = await db.dbUsers();
            const result = await dbUsers.updateOne(
                {
                    $or: [
                        { firstName: query },
                        { lastName: query },
                        { email: query },
                        { phoneNumber: query },
                        { userID: query }
                    ]
                },
                { $set: updateData }
            );
            

            if (result.matchedCount === 0) {
                throw new Error("No user found to update.");
            }

            const updatedUser = await dbUsers.findOne({
                $or: [
                    { firstName: query },
                    { lastName: query },
                    { email: query },
                    { phoneNumber: query },
                    { userID: query }
                ]
            }, { projection: USER_SECRET_FIELDS });
            return updatedUser;
        } catch (error) {
            console.error("Error updating user:", error);
            return null;
        }
    }

        /**
     * ✅ Update a user by ID
     * @param {String} userId - The ID of the user to update
     * @param {Object} updateData - The data to update
     * @returns {Object|null} - Updated user data or null if not found
     */
    static async updateUserById(userId, updateData) {
        try {
            const dbInstance = await db.connect();
            console.log(`🔄 Updating user in database with ID: ${userId}`);
            
            const result = await dbInstance.collection("users").updateOne(
                userIdentityQuery(userId),
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                console.warn("⚠️ No user found to update with ID:", userId);
                return null;
            }

            // Fetch and return the updated user
            const updatedUser = await dbInstance.collection("users").findOne(userIdentityQuery(userId), { projection: USER_SECRET_FIELDS });

            console.log("✅ User updated in database:", updatedUser);
            return updatedUser;
        } catch (error) {
            console.error("❌ Error updating user in database:", error);
            return null;
        }
    }

    /**
     * ✅ Delete a user
     * @param {Object} query - Query object to identify the user to delete
     * @returns {Boolean} - True if deletion was successful, false otherwise
     */
    static deleteUser = async (query) => {
        try {
            const dbUsers = await db.dbUsers();
            const result = await dbUsers.deleteOne(query);
            return result.deletedCount > 0;
        } catch (error) {
            console.error("Error deleting user:", error);
            return false;
        }
    }
}
