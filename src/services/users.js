// src/service/users.js
import axiosInstance from '@/utils/axiosInstance';

/**
 * Class-based service for handling all user-related API interactions
 */
class UsersService {
    /**
     * Fetch all users
     * @returns {Promise<Object[]>} - Array of user objects
     */
    static getAllUsers = async () => {
        try {
            const response = await axiosInstance.get('/users');
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    /**
     * Fetch a user by query
     * @param {string} query - The query to fetch the user
     * @returns {Promise<Object>} - The user object
     */
    static getUserByQuery = async (query) => {
        try {
            const response = await axiosInstance.get(`/users?query=${query}`);
            return response.data.user;
        } catch (error) {
            throw error;
        }
    };

    /**
     * Create a new user
     * @param {Object} userData - The data required to create a user
     * @returns {Promise<Object>} - The created user object
     */
    static createUser = async (userData) => {
        try {
            const response = await axiosInstance.post('/users', userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    /**
     * Update a user by query
     * @param {string} query - The query to identify the user
     * @param {Object} updateData - The data to update the user
     * @returns {Promise<Object>} - The updated user object
     */
    static updateUser = async (query, updateData) => {
        try {
            const response = await axiosInstance.put(`/users?query=${query}`, updateData);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    /**
     * Delete a user by query
     * @param {string} query - The query to identify the user
     * @returns {Promise<Object>} - Confirmation message
     */
    static deleteUser = async (query) => {
        try {
            const response = await axiosInstance.delete(`/users?query=${query}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    };
}

export default UsersService;
