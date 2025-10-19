// src/app/api/auth/auth.service.js

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto, { hash } from 'crypto';
import User from '../../users/class';
import UserModel from './model';
import { sendVerificationEmail, sendInviteEmail } from '@/app/utils/email.util.js';
import storefront from '@/lib/shopify';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '7d'; // Token expiration for JWT tokens

export default class AuthService {

    /**
     * ✅ Register a new user with email and password
     * - Called during manual sign-up
     */
    static async register(userData) {
        const { firstName, lastName, email, password, phoneNumber, status, role, business } = userData;
        console.log(userData);
        console.log('looking for user');
        const existingUser = await UserModel.findByEmail(email);
        console.log(existingUser);
        if (existingUser) {
            throw new Error("User already exists with this email.");
        };
        console.log('hashing password');
        const hashedPassword = password ? await bcrypt.hash(password, 10) : 'no password';
        console.log('creating new user with:', firstName, lastName, email, hashedPassword, phoneNumber, status);
        
        const newUser = new User(
            firstName,
            lastName,
            email,
            hashedPassword,
            phoneNumber ? phoneNumber : '',
            role ? role : 'client',
            business ? business : '',
            status
        );
        console.log("newUser", newUser);
        console.log('creating user');
        const results = await UserModel.create(newUser);

        // ✅ Send the verification email using the email utility
        if (userData.status === 'unverified') {
            await sendVerificationEmail(email, newUser.verificationToken);
        };
        return results;
    }

    /**
     * ✅ Login a user with email and password
     * - Uses Shopify Storefront API to authenticate credentials
     * - Then fetches user from MongoDB if Shopify auth succeeds
     */
    static async login(email, password) {
        try {
            console.log('🔐 [AUTH_SERVICE] Starting Shopify authentication for:', email);

            // Step 1: Authenticate with Shopify Storefront API
            const mutation = `
              mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
                customerAccessTokenCreate(input: $input) {
                  customerAccessToken {
                    accessToken
                    expiresAt
                  }
                  customerUserErrors {
                    field
                    message
                    code
                  }
                }
              }
            `;

            const variables = {
              input: {
                email,
                password
              }
            };

            const response = await storefront(mutation, variables);
            const result = response?.customerAccessTokenCreate;

            if (!result) {
                console.log('❌ [AUTH_SERVICE] No response from Shopify API');
                throw new Error("Authentication service unavailable.");
            }

            if (result.customerUserErrors && result.customerUserErrors.length > 0) {
                const error = result.customerUserErrors[0];
                console.log('❌ [AUTH_SERVICE] Shopify authentication failed:', error.message);
                throw new Error("Invalid email or password.");
            }

            if (!result.customerAccessToken) {
                console.log('❌ [AUTH_SERVICE] Invalid Shopify credentials for:', email);
                throw new Error("Invalid email or password.");
            }

            console.log('✅ [AUTH_SERVICE] Shopify authentication successful for:', email);

            // Step 2: Fetch user from MongoDB for admin authorization
            const user = await UserModel.findByEmail(email);
            if (!user) {
                console.log('❌ [AUTH_SERVICE] User not found in admin database:', email);
                throw new Error("Access denied. Contact administrator for admin access.");
            }

            if (user.status !== 'verified') {
                console.log('❌ [AUTH_SERVICE] User not verified:', email);
                throw new Error("Please verify your email before logging in.");
            }

            console.log('✅ [AUTH_SERVICE] user found:', user);

            // ✅ Generate JWT Token for the authenticated user
            const token = jwt.sign({ userID: user.userID, role: user.role }, JWT_SECRET, {
                expiresIn: JWT_EXPIRATION
            });

            console.log("✅ [AUTH_SERVICE] Token generated for admin user.");

            // ✅ Return the full user data along with the token and Shopify access token
            return {
                token,
                userID: user.userID,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                image: user.image,
                shopifyAccessToken: result.customerAccessToken.accessToken
            };

        } catch (error) {
            console.error('❌ [AUTH_SERVICE] Login error:', error);
            throw error;
        }
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
