// src/app/api/users/user.service.js

import User from "./class.js";
import UserModel from "./model.js";

export default class UserService {
    /**
     * ✅ Create a new user
     * @param {Object} userData - The data required to create a user
     * @returns {Object|null} - Created user or null if failed
     */
    static async createUser(userData) {
        try {
            userData.password = '';
            // Validate the required fields through the User class
            const newUser = new User(
                userData.firstName,
                userData.lastName,
                userData.email,
                userData.password,
                userData.phoneNumber,
                userData?.role,
                userData?.business,
                userData?.status
            );
            const createdUser = await UserModel.createUser(newUser);
            return createdUser;
        } catch (error) {
            console.error("Error in UserService.createUser:", error);
            throw new Error("Failed to create user.");
        }
    }

    /**
     * ✅ Fetch a user based on a query
     * @param {Object} query - The query to find a user
     * @returns {Object|null} - User data or null if not found
     */
    static async getUserByQuery(query) {
        try {
            console.log("🔍 Fetching user in UserService for query:", query);
            const user = await UserModel.getUserByQuery(query); 
            if (user) {
                console.log("✅ User found in service:", user);
            } else {
                console.warn("⚠️ No user found in service.");
            }
            return user;
        } catch (error) {
            console.error("❌ Error in UserService.getUserByQuery:", error);
            throw new Error("Failed to fetch user.");
        }
    }

    /**
     * ✅ Fetch all users
     * @returns {Array} - List of all users
     */
    static async getAllUsers() {
        try {
            const users = await UserModel.getAllUsers();
            return users;
        } catch (error) {
            console.error("Error in UserService.getAllUsers:", error);
            throw new Error("Failed to fetch all users.");
        }
    }

    /**
     * ✅ Fetch users by role
     * @param {string} role - The role to filter by
     * @returns {Array} - List of users with the specified role
     */
    static async getUsersByRole(role) {
        try {
            const users = await UserModel.getUsersByRole(role);
            return users;
        } catch (error) {
            console.error("Error in UserService.getUsersByRole:", error);
            throw new Error("Failed to fetch users by role.");
        }
    }

    /**
     * ✅ Fetch a user by ID
     * @param {String} userId - The ID of the user to fetch
     * @returns {Object|null} - User data or null if not found
     */
    static async getUserById(userId) {
        try {
            console.log(`🔍 Fetching user by ID: ${userId}`);
            const user = await UserModel.getUserById(userId);
            if (user) {
                console.log("✅ User found by ID:", user._id);
            } else {
                console.warn("⚠️ No user found with ID:", userId);
            }
            return user;
        } catch (error) {
            console.error("❌ Error in UserService.getUserById:", error);
            throw new Error("Failed to fetch user by ID.");
        }
    }

    /**
     * ✅ Update a user's data
     * @param {Object} query - Query to find the user
     * @param {Object} updateData - Data to update
     * @returns {Object|null} - Updated user or null if failed
     */
    static async updateUser(query, updateData) {
        try {
            const updatedUser = await UserModel.updateUser(query, updateData);
            return updatedUser;
        } catch (error) {
            console.error("Error in UserService.updateUser:", error);
            throw new Error("Failed to update user.");
        }
    }

    /**
     * ✅ Delete a user
     * @param {Object} query - Query to identify the user
     * @returns {Boolean} - True if deletion was successful, false otherwise
     */
    static async deleteUser(query) {
        try {
            const deletionResult = await UserModel.deleteUser(query);
            return deletionResult;
        } catch (error) {
            console.error("Error in UserService.deleteUser:", error);
            throw new Error("Failed to delete user.");
        }
    }

    /**
     * ✅ Update a user by MongoDB _id
     * @param {String} userId - The MongoDB _id of the user to update
     * @param {Object} updateData - The data to update
     * @returns {Object|null} - Updated user data or null if not found
     */
    static async updateUserById(userId, updateData) {
        try {
            console.log(`🔄 Updating user with ID: ${userId}`);
            const updatedUser = await UserModel.updateUserById(userId, updateData);
            if (updatedUser) {
                console.log("✅ User updated successfully:", updatedUser._id);
            } else {
                console.warn("⚠️ No user found to update with ID:", userId);
            }
            return updatedUser;
        } catch (error) {
            console.error("Error in UserService.updateUserById:", error);
            throw new Error("Failed to update user.");
        }
    }
}
