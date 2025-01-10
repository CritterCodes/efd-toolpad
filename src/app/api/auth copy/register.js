// pages/api/auth/register.js
import clientPromise from "../../../../lib/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { email, password, username } = req.body;

    try {
        const client = await clientPromise;
        const db = client.db("efd-database");
        const existingUser = await db.collection("users").findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1d" });

        const result = await db.collection("users").insertOne({
            username,
            email,
            password: hashedPassword,
            verified: false,
            verificationToken
        });

        // Send verification email using nodemailer
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
            subject: "Verify your email",
            html: `<a href="${process.env.NEXT_PUBLIC_URL}/api/auth/verify-email?token=${verificationToken}">Click here to verify your email</a>`
        });

        res.status(201).json({ message: "User registered! Please verify your email." });
    } catch (error) {
        res.status(500).json({ message: "Error registering user", error });
    }
}
