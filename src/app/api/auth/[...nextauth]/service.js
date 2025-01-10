// src/app/api/auth/auth.service.js

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import UserModel from './model';
import { sendVerificationEmail, sendInviteEmail } from '@/app/utils/email.util.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '7d'; // Token expiration for JWT tokens

export default class AuthService {

    /**
     * ✅ Register a new user with email and password
     * - Called during manual sign-up
     */
    static async register({ firstName, lastName, email, password, phoneNumber, image }) {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new Error("User already exists with this email.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newUser = await UserModel.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            image,
            role: 'client',
            status: 'unverified',
            verificationToken
        });

        // ✅ Send the verification email using the email utility
        await sendVerificationEmail(email, verificationToken);
        return newUser;
    }

    /**
     * ✅ Login a user with email and password
     * - Called in CredentialsProvider flow of NextAuth
     */
    static async login(email, password) {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new Error("User not found.");
        }

        if (user.status !== 'verified') {
            throw new Error("Please verify your email before logging in.");
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error("Invalid password.");
        }

        // ✅ Generate JWT Token for the authenticated user
        const token = jwt.sign({ userID: user.userID, role: user.role }, JWT_SECRET, {
            expiresIn: JWT_EXPIRATION
        });

        return token;
    }

    /**
     * ✅ Google Authentication Logic
     * - Called when logging in through GoogleProvider in NextAuth
     */
    static async googleAuth({ email, name, image }) {
        let user = await UserModel.findByEmail(email);
        
        if (!user) {
            const [firstName, lastName] = name.split(' ');

            user = await UserModel.create({
                firstName,
                lastName,
                email,
                image,
                role: 'client',
                status: 'verified'
            });
        }

        // ✅ Return the user object for NextAuth JWT management
        const token = jwt.sign({ userID: user.userID, role: user.role }, JWT_SECRET, {
            expiresIn: JWT_EXPIRATION
        });

        return { user, token };
    }

    /**
     * ✅ Verify user's email using token
     */
    static async verifyEmail(token) {
        const user = await UserModel.findByVerificationToken(token);
        if (!user) {
            throw new Error("Invalid or expired verification token.");
        }

        user.status = 'verified';
        user.verificationToken = null;
        await user.save();

        return { message: "Email successfully verified." };
    }

    /**
     * ✅ Resend the verification email for unverified users
     */
    static async resendVerification(email) {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new Error("User not found.");
        }

        if (user.status === 'verified') {
            throw new Error("User is already verified.");
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();

        // ✅ Resend the verification email
        await sendVerificationEmail(email, verificationToken);
    }

    /**
     * ✅ Invite a new client created by an admin
     * - Creates an unverified client and sends an invite email
     */
    static async inviteClient({ firstName, lastName, email }) {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new Error("A user with this email already exists.");
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newUser = await UserModel.create({
            firstName,
            lastName,
            email,
            role: 'client',
            status: 'unverified',
            verificationToken
        });

        // ✅ Send the invite email with the verification link
        await sendInviteEmail(email, verificationToken, firstName);

        return newUser;
    }

    /**
     * ✅ Logout - Stateless JWT-based logout
     */
    static async logout() {
        return { message: "You have been logged out." };
    }
}
