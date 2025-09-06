// lib/database.js
import { MongoClient } from "mongodb";
import Constants from "./constants.js";

class Database {
    constructor() {
        if (!Database.instance) {
            // Use HMR-friendly approach from Vercel example
            if (process.env.NODE_ENV === "development") {
                // In development mode, use a global variable for HMR compatibility
                let globalWithMongo = global;
                if (!globalWithMongo._mongoClient) {
                    globalWithMongo._mongoClient = new MongoClient(process.env.MONGODB_URI, {
                        minPoolSize: 5,
                        maxPoolSize: 10,
                    });
                }
                this.client = globalWithMongo._mongoClient;
            } else {
                // In production mode, create a new client
                this.client = new MongoClient(process.env.MONGODB_URI, {
                    minPoolSize: 5,
                    maxPoolSize: 10,
                });
            }
            this._instance = null;
            Database.instance = this;
        }
        return Database.instance;
    }

    async connect() {
        if (!this._instance) {
            try {
                console.log("🔄 Attempting MongoDB connection...");
                await this.client.connect();
                console.log("✅ MongoDB Connected");
                this._instance = this.client.db(process.env.MONGO_DB_NAME || "efd-database");
            } catch (error) {
                console.error("❌ MongoDB Connection Error:", error.message);
                // Try alternative connection string without directConnection
                if (error.message.includes('Server selection timed out')) {
                    console.log("🔄 Retrying with alternative connection settings...");
                    try {
                        // Create new client with different settings
                        const altClient = new MongoClient(process.env.MONGODB_URI.replace('directConnection=true&', ''), {
                            minPoolSize: 2,
                            maxPoolSize: 5,
                            serverSelectionTimeoutMS: 15000,
                            connectTimeoutMS: 15000,
                        });
                        await altClient.connect();
                        console.log("✅ MongoDB Connected (alternative settings)");
                        this.client = altClient;
                        this._instance = this.client.db(process.env.MONGO_DB_NAME || "efd-database");
                    } catch (altError) {
                        console.error("❌ Alternative MongoDB Connection Also Failed:", altError.message);
                        throw new Error("Failed to connect to MongoDB");
                    }
                } else {
                    throw new Error("Failed to connect to MongoDB");
                }
            }
        }
        return this._instance;
    }

    getDb() {
        if (!this._instance) throw new Error("Database not initialized");
        return this._instance;
    }

    // Core Collections
    async dbUsers() {
        await this.connect();
        return this._instance.collection(Constants.USERS_COLLECTION);
    }

    async dbRepairs() {
        await this.connect();
        return this._instance.collection(Constants.REPAIRS_COLLECTION);
    }

    async dbTasks() {
        await this.connect();
        return this._instance.collection(Constants.TASKS_COLLECTION);
    }

    async dbMaterials() {
        await this.connect();
        return this._instance.collection(Constants.MATERIALS_COLLECTION);
    }

    async dbProcesses() {
        await this.connect();
        return this._instance.collection(Constants.PROCESSES_COLLECTION);
    }

    // Admin Collections
    async dbAdminSettings() {
        await this.connect();
        return this._instance.collection(Constants.ADMIN_SETTINGS_COLLECTION);
    }

    async dbAdminSettingsAudit() {
        await this.connect();
        return this._instance.collection(Constants.ADMIN_SETTINGS_AUDIT_COLLECTION);
    }

    // Additional Collections
    async dbCollectors() {
        await this.connect();
        return this._instance.collection(Constants.COLLECTORS_COLLECTION);
    }

    async dbContactRequests() {
        await this.connect();
        return this._instance.collection(Constants.CONTACT_REQUESTS_COLLECTION);
    }

    async dbCustomTickets() {
        await this.connect();
        return this._instance.collection(Constants.CUSTOM_TICKETS_COLLECTION);
    }

    async dbInventory() {
        await this.connect();
        return this._instance.collection(Constants.INVENTORY_COLLECTION);
    }

    // Legacy alias for backward compatibility
    async dbRepairTasks() {
        await this.connect();
        return this._instance.collection(Constants.REPAIRTASKS_COLLECTION);
    }
}

export const db = new Database();
