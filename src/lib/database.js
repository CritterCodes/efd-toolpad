// lib/database.js
import { MongoClient } from "mongodb";
import Constants from "./constants.js";

// Resolve the target database name. Fails closed: if MONGO_DB_NAME is unset we
// throw rather than silently defaulting to production ("efd-database"). This is
// only reached at runtime (connect()), never during `next build`, so it can't
// break page-data collection.
function resolveDbName() {
    const name = process.env.MONGO_DB_NAME;
    if (!name) {
        throw new Error(
            'MONGO_DB_NAME environment variable is not defined (refusing to default to production).'
        );
    }
    return name;
}

class Database {
    constructor() {
        // Prevent instantiation on client-side
        if (typeof window !== 'undefined') {
            throw new Error('Database class should only be used on the server-side');
        }

        if (Database.instance) {
            return Database.instance;
        }

        // Defer client creation and the MONGODB_URI check to first use (see
        // _ensureClient). Doing it here would throw when `new Database()` runs at
        // module import — which happens during `next build` page-data collection,
        // where the env var may legitimately be absent.
        this.client = null;
        this._instance = null;
        Database.instance = this;
        return this;
    }

    // Lazily create the MongoClient. Safe to call repeatedly; only the first call
    // builds the client. Throws only when a connection is actually needed at runtime.
    _ensureClient() {
        if (this.client) return this.client;

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
        return this.client;
    }

    async connect() {
        if (!this._instance) {
            try {
                console.log("🔄 Attempting MongoDB connection...");
                this._ensureClient();
                await this.client.connect();
                this._instance = this.client.db(resolveDbName());
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
                        this._instance = this.client.db(resolveDbName());
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

    async dbInventoryTransactions() {
        await this.connect();
        return this._instance.collection(Constants.INVENTORY_TRANSACTIONS_COLLECTION);
    }

    async dbInventoryReorderSuggestions() {
        await this.connect();
        return this._instance.collection(Constants.INVENTORY_REORDER_SUGGESTIONS_COLLECTION);
    }

    // Affiliate Collections
    async dbAffiliates() {
        await this.connect();
        return this._instance.collection(Constants.AFFILIATES_COLLECTION);
    }

    async dbAffiliateCampaigns() {
        await this.connect();
        return this._instance.collection(Constants.AFFILIATE_CAMPAIGNS_COLLECTION);
    }

    async dbAffiliateReferralEvents() {
        await this.connect();
        return this._instance.collection(Constants.AFFILIATE_REFERRAL_EVENTS_COLLECTION);
    }

    // Manufacturing / Production cycle (Work Order spine — see docs/manufacturing)
    async dbWorkOrders() {
        await this.connect();
        return this._instance.collection(Constants.WORK_ORDERS_COLLECTION);
    }

    async dbLaborLogs() {
        await this.connect();
        return this._instance.collection(Constants.LABOR_LOGS_COLLECTION);
    }

    async dbPayrollBatches() {
        await this.connect();
        return this._instance.collection(Constants.PAYROLL_BATCHES_COLLECTION);
    }

    async dbDrops() {
        await this.connect();
        return this._instance.collection(Constants.DROPS_COLLECTION);
    }

    async dbDesigns() {
        await this.connect();
        return this._instance.collection(Constants.DESIGNS_COLLECTION);
    }

    async dbPieces() {
        await this.connect();
        return this._instance.collection(Constants.PIECES_COLLECTION);
    }

    // Legacy alias for backward compatibility
    async dbRepairTasks() {
        await this.connect();
        return this._instance.collection(Constants.REPAIRTASKS_COLLECTION);
    }
}

export default Database;
export const db = new Database();

// Backward compatibility export
export const connectDB = async () => {
    await db.connect();
    return db;
};
