// Auth utility wrapper for API routes
// This file provides a clean import path for auth functionality
export * from '../../auth';
export { auth } from '../../auth';

// Backward compatibility for NextAuth v4 style imports
// In NextAuth v5, use auth() directly instead of getServerSession
export const authOptions = {};

// Helper for getting session in v5 (replaces old getServerSession)
export async function getServerSession() {
    throw new Error(
        'getServerSession from "next-auth/next" is no longer available in NextAuth v5. ' +
        'Use `import { auth } from "@/lib/auth"` and call `await auth()` instead.'
    );
}