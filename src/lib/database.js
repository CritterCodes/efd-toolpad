// lib/database.js
import { MongoClient } from "mongodb";

class Database {
    constructor() {
        if (!Database.instance) {
            this.client = new MongoClient(process.env.MONGODB_URI, {
                minPoolSize: 5,
                maxPoolSize: 10,
            });
            this._instance = null;
        }
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

    dbUsers = () => this.getDb().collection("users");
    dbRepairs = () => this.getDb().collection("repairs");
    dbCollectors = () => this.getDb().collection("collectors");
}

export const db = new Database();
