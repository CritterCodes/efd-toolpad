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

    async dbUsers() {
        await this.connect(); // ✅ Ensure the database connection is established before returning the collection
        return this._instance.collection("users");
    }

    async dbRepairs() {
        await this.connect(); // ✅ Ensure the database connection is established before returning the collection
        return this._instance.collection("repairs");
    }

    async dbCollectors() {
        await this.connect(); // ✅ Ensure the database connection is established before returning the collection
        return this._instance.collection("collectors");
    }
}

export const db = new Database();
