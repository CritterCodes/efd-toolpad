// pages/api/test.js
import clientPromise from "../../../lib/database";

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db("efd-database"); // Adjust database name
        const collections = await db.listCollections().toArray();
        
        res.status(200).json({ message: "Connected to MongoDB!", collections });
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        res.status(500).json({ error: "Could not connect to the database" });
    }
}
