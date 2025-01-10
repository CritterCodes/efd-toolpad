// pages/api/auth/verify-email.js
import clientPromise from "../../../../lib/database";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    const { token } = req.query;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const client = await clientPromise;
        const db = client.db("efd-database");

        await db.collection("users").updateOne(
            { email: decoded.email },
            { $set: { verified: true }, $unset: { verificationToken: "" } }
        );

        res.status(200).send("Email verified successfully!");
    } catch (error) {
        res.status(400).send("Invalid or expired token.");
    }
}
