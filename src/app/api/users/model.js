// src/app/api/users/user.model.js
import { db } from "@/lib/database";


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
            });

            if (!user) {
                console.warn("⚠️ No user found in database for query:", query);
            } else {
                console.log("✅ User found in database:", user);
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
            const { ObjectId } = require('mongodb');
            const dbInstance = await db.connect();
            console.log(`🔍 Searching user in the database with ID: ${userId}`);
            
            const user = await dbInstance.collection("users").findOne({
                _id: new ObjectId(userId)
            });

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
            const users = await dbUsers.find().toArray();
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
            const users = await dbUsers.find({ role: role }).toArray();
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
            });
            return updatedUser;
            
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
    static async updateUser(userId, updateData) {
        try {
            const { ObjectId } = require('mongodb');
            const dbInstance = await db.connect();
            console.log(`🔄 Updating user in database with ID: ${userId}`);
            
            const result = await dbInstance.collection("users").updateOne(
                { _id: new ObjectId(userId) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                console.warn("⚠️ No user found to update with ID:", userId);
                return null;
            }

            // Fetch and return the updated user
            const updatedUser = await dbInstance.collection("users").findOne({
                _id: new ObjectId(userId)
            });

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
