// lib/database.js
import { MongoClient } from "mongodb";
import Constants from "./constants.js";

class Database {
    constructor() {
        // Prevent instantiation on client-side
        if (typeof window !== 'undefined') {
            throw new Error('Database class should only be used on the server-side');
        }
        
        if (!Database.instance) {
            // Check if MONGODB_URI is defined
            const mongoUri = process.env.MONGODB_URI;
            
            if (!mongoUri) {
                throw new Error('MONGODB_URI environment variable is not defined');
            }
            
            // Use HMR-friendly approach from Vercel example
            if (process.env.NODE_ENV === "development") {
                // In development mode, use a global variable for HMR compatibility
                let globalWithMongo = global;
                if (!globalWithMongo._mongoClient) {
                    globalWithMongo._mongoClient = new MongoClient(mongoUri, {
                        minPoolSize: 5,
                        maxPoolSize: 10,
                    });
                }
                this.client = globalWithMongo._mongoClient;
            } else {
                // In production mode, create a new client
                this.client = new MongoClient(mongoUri, {
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
                await this.client.connect();
                console.log("✅ MongoDB Connected");
                this._instance = this.client.db(process.env.MONGO_DB_NAME || "efd-database");
            } catch (error) {
                console.error("❌ MongoDB Connection Error:", error);
                throw new Error("Failed to connect to MongoDB");
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
