// src/app/api/auth/register/route.js
import { NextResponse } from "next/server";
import AuthController from "../[...nextauth]/controller";

/**
 * @route POST /api/auth/register
 * @desc Handles new user registration with proper error handling and validation
 * @access Public
 */
export async function POST(req) {
    try {
        // Ensure the request body is properly formatted
        const data = await req.json();
        
        if (!data || typeof data !== "object") {
            return NextResponse.json({ error: "Invalid request data format." }, { status: 400 });
        }
        console.log(data);
        console.log('sending to auth controller');
        // Register the new user using the AuthController service
        const result = await AuthController.register(data);

        // Check if registration was successful
        if (!result) {
            return NextResponse.json({
                error: "Registration failed. Please try again later.",
            }, { status: 500 });
        }

        return NextResponse.json({
            message: "User registered successfully!",
            user: result,  // ✅ Return a unique identifier for the created user
        }, { status: 201 });

    } catch (error) {
        console.error("Error during registration:", error);

        // Handle known MongoDB error patterns gracefully
        if (error.code === 11000) {  // Duplicate key error for unique fields
            return NextResponse.json({
                error: "A user with this email already exists. Please use a different email.",
            }, { status: 409 });
        }

        // Provide a generic error message for unexpected issues
        return NextResponse.json({
            error: error.message || "An unexpected error occurred during registration.",
        }, { status: 500 });
    }
}
