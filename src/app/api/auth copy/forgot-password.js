// pages/api/auth/forgot-password.js
import clientPromise from "../../../../lib/database";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
    const { email } = req.body;

    try {
        const client = await clientPromise;
        const db = client.db("efd-database");
        const user = await db.collection("users").findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "15m" });

        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset",
            html: `<a href="${process.env.NEXT_PUBLIC_URL}/reset-password?token=${resetToken}">Click here to reset your password</a>`
        });

        res.status(200).json({ message: "Password reset email sent." });
    } catch (error) {
        res.status(500).json({ message: "Error sending password reset email", error });
    }
}
