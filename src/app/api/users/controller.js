// src/app/api/users/user.controller.js

import UserService from "./service";
import { NotificationService, NOTIFICATION_TYPES, CHANNELS } from "@/lib/notificationService.js";

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
                    JSON.stringify({ 
                        success: false, 
                        error: "Failed to create user." 
                    }),
                    { status: 400 }
                );
            }

            // Send notification if user is an artisan being added by admin
            try {
              if (userData.role === 'artisan' || userData.artisanTypes?.length > 0) {
                const artisanName = `${createdUser.firstName || ''} ${createdUser.lastName || ''}`.trim();
                
                await NotificationService.createNotification({
                  userId: createdUser.userID,
                  type: NOTIFICATION_TYPES.ARTISAN_ADDED,
                  title: 'Welcome to Engel Fine Design',
                  message: 'Your artisan account has been created and is ready to use.',
                  channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                  data: {
                    artisanName: artisanName || 'Artisan',
                    email: createdUser.email,
                    business: createdUser.business || 'N/A',
                    loginUrl: process.env.NEXTAUTH_URL || 'https://admin.engelsfinedesign.com'
                  },
                  templateName: 'artisan_added',
                  recipientEmail: createdUser.email
                });
              }
            } catch (notificationError) {
              console.error('⚠️ Failed to send artisan welcome notification:', notificationError);
              // Don't fail the API if notifications fail
            }

            return new Response(
                JSON.stringify({ 
                    success: true, 
                    message: "User created successfully", 
                    data: createdUser 
                }),
                { status: 201 }
            );
        } catch (error) {
            console.error("Error in UserController.createUser:", error);
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: error.message || "An error occurred while creating the user." 
                }),
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
     * ✅ Get users by role from the database
     * @param {Request} request - Request object with role parameter
     * @returns {Response} - JSON response with filtered users or error message
     */
    static async getUsersByRole(request) {
        try {
            const { searchParams } = new URL(request.url);
            const role = searchParams.get("role");
            
            if (!role) {
                return new Response(
                    JSON.stringify({ error: "Role parameter is required." }),
                    { status: 400 }
                );
            }

            const users = await UserService.getUsersByRole(role);
            
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    data: users 
                }),
                { status: 200 }
            );
        } catch (error) {
            console.error("Error in UserController.getUsersByRole:", error);
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: "Failed to fetch users by role." 
                }),
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
                    JSON.stringify({ error: "No user found to update." }),
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
