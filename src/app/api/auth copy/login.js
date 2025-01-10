// pages/api/auth/login.js
import clientPromise from "../../../../lib/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { email, password } = req.body;

    try {
        const client = await clientPromise;
        const db = client.db("efd-database");
        const user = await db.collection("users").findOne({ email });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (!user.verified) {
            return res.status(401).json({ message: "Email not verified" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: "Login error", error });
    }
}
