// src/app/api/users/user.service.js

import User from "./class";
import UserModel from "./model";

export default class UserService {
    /**
     * ✅ Create a new user
     * @param {Object} userData - The data required to create a user
     * @returns {Object|null} - Created user or null if failed
     */
    static createUser = async (userData) => {
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
    static getUserByQuery = async (query) => {
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
    static getAllUsers = async () => {
        try {
            const users = await UserModel.getAllUsers();
            return users;
        } catch (error) {
            console.error("Error in UserService.getAllUsers:", error);
            throw new Error("Failed to fetch all users.");
        }
    }

    /**
     * ✅ Update a user's data
     * @param {Object} query - Query to find the user
     * @param {Object} updateData - Data to update
     * @returns {Object|null} - Updated user or null if failed
     */
    static updateUser = async (query, updateData) => {
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
    static deleteUser = async (query) => {
        try {
            const deletionResult = await UserModel.deleteUser(query);
            return deletionResult;
        } catch (error) {
            console.error("Error in UserService.deleteUser:", error);
            throw new Error("Failed to delete user.");
        }
    }
}
