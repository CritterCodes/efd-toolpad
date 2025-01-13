// src/app/api/users/user.controller.js

import UserService from "./service";

export default class UserController {
    /**
     * ✅ Create a new user through the service layer
     * @param {Request} req - The incoming request object containing user data
     * @returns {Response} - JSON response with success or error message
     */
    static async createUser(req) {
        try {
            const userData = await req.json();
            const createdUser = await UserService.createUser(userData);
            if (!createdUser) {
                return new Response(
                    JSON.stringify({ error: "Failed to create user." }),
                    { status: 400 }
                );
            }
            return new Response(
                JSON.stringify({ message: "User created successfully", user: createdUser }),
                { status: 201 }
            );
        } catch (error) {
            console.error("Error in UserController.createUser:", error);
            return new Response(
                JSON.stringify({ error: "An error occurred while creating the user." }),
                { status: 500 }
            );
        }
    }

    /**
     * ✅ Get a user by query parameter
     * @param {Request} req - The request object containing the query parameter
     * @returns {Response} - JSON response with user data or error message
     */
    static async getUserByQuery(req) {
        try {
            console.log("🔍 Received request for getUserByQuery:", req.url);
            const { searchParams } = new URL(req.url);
            const query = searchParams.get("query");
    
            if (!query) {
                console.warn("⚠️ Query parameter missing in request.");
                return new Response(
                    JSON.stringify({ error: "Query parameter is required." }),
                    { status: 400 }
                );
            }
    
            console.log("✅ Query parameter received:", query);
            const user = await UserService.getUserByQuery(query);
            
            if (!user) {
                console.warn("⚠️ No user found for query:", query);
                return new Response(
                    JSON.stringify({ error: "User not found." }),
                    { status: 404 }
                );
            }
    
            console.log("✅ User found:", user);
            return new Response(
                JSON.stringify({ user }),
                { status: 200 }
            );
        } catch (error) {
            console.error("❌ Error in UserController.getUserByQuery:", error);
            return new Response(
                JSON.stringify({ error: "Failed to fetch user." }),
                { status: 500 }
            );
        }
    }
    

    /**
     * ✅ Get all users from the database
     * @returns {Response} - JSON response with all users or error message
     */
    static async getAllUsers() {
        try {
            const users = await UserService.getAllUsers();
            return new Response(
                JSON.stringify({ users }),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in UserController.getAllUsers:", error);
            return new Response(
                JSON.stringify({ error: "Failed to fetch users." }),
                { status: 500 }
            );
        }
    }

    /**
     * ✅ Update a user by query
     * @param {Request} req - Request containing the query and update data
     * @returns {Response} - JSON response with success or error message
     */
    static async updateUser(req) {
        try {
            const { searchParams } = new URL(req.url);
            const query = searchParams.get("query");
            const updateData = await req.json();

            if (!query) {
                return new Response(
                    JSON.stringify({ error: "Query parameter is required." }),
                    { status: 400 }
                );
            }

            const updatedUser = await UserService.updateUser(query, updateData);
            if (!updatedUser) {
                return new Response(
                    JSON.stringify({ error: "Failed to update user." }),
                    { status: 400 }
                );
            }

            return new Response(
                JSON.stringify({ message: "User updated successfully", user: updatedUser }),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in UserController.updateUser:", error);
            return new Response(
                JSON.stringify({ error: "An error occurred while updating the user." }),
                { status: 500 }
            );
        }
    }

    /**
     * ✅ Delete a user by query parameter
     * @param {Request} req - Request containing the query parameter
     * @returns {Response} - JSON response with success or error message
     */
    static async deleteUser(req) {
        try {
            const { searchParams } = new URL(req.url);
            const query = searchParams.get("query");

            if (!query) {
                return new Response(
                    JSON.stringify({ error: "Query parameter is required." }),
                    { status: 400 }
                );
            }

            const deletionResult = await UserService.deleteUser(query);
            if (!deletionResult) {
                return new Response(
                    JSON.stringify({ error: "Failed to delete user." }),
                    { status: 400 }
                );
            }

            return new Response(
                JSON.stringify({ message: "User deleted successfully." }),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in UserController.deleteUser:", error);
            return new Response(
                JSON.stringify({ error: "An error occurred while deleting the user." }),
                { status: 500 }
            );
        }
    }
}
