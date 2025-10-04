// src/app/api/users/user.class.js
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRATION = '15m'; // 15 minutes token expiration

export default class User {
    constructor( 
        firstName, 
        lastName, 
        email, 
        password, 
        phoneNumber,
        role,
        business,
        status
    ) {
        // Basic validation
        if (!firstName || !lastName || !email) {
            throw new Error('firstName, lastName, and email are required');
        }
        
        if (!role) {
            throw new Error('role is required');
        }

        this.userID = `user-${uuidv4().slice(0, 8)}`;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.address = {};
        this.image = '';
        this.role = role;
        this.business = business;
        this.status = status ? status : 'unverified';
        this.password = password;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        // Vendor profile integration (for artisans)
        this.vendorProfileId = null;
        this.vendorSlug = null;
        this.verificationToken = this.generateVerificationToken();
    }

    /**
     * ✅ Generates a JWT token for email verification
     * Token expires in 15 minutes.
     */
    generateVerificationToken() {
        return jwt.sign(
            { email: this.email, userID: this.userID },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRATION }
        );
    }

    /**
     * ✅ Verify the provided JWT token (used when verifying the user)
     * @param {string} token - JWT token to verify
     * @returns {boolean|object} - Returns decoded token or false if invalid
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            console.error("Invalid or expired token:", error);
            return false;
        }
    }
}
