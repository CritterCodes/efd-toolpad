// lib/apiAuth.js - Authentication & authorization helpers for API routes
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Require authentication on an API route.
 * Returns the session if authenticated, or a 401 Response if not.
 * 
 * Usage:
 *   const { session, errorResponse } = await requireAuth();
 *   if (errorResponse) return errorResponse;
 */
export async function requireAuth() {
    const session = await auth();
    if (!session?.user) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            ),
        };
    }
    return { session, errorResponse: null };
}

/**
 * Require authentication AND one of the specified roles.
 * Returns the session if authorized, or a 401/403 Response if not.
 * 
 * Usage:
 *   const { session, errorResponse } = await requireRole(['admin', 'wholesaler']);
 *   if (errorResponse) return errorResponse;
 */
export async function requireRole(allowedRoles = []) {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return { session: null, errorResponse };

    if (!allowedRoles.includes(session.user.role)) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: "Access denied. Insufficient permissions." },
                { status: 403 }
            ),
        };
    }
    return { session, errorResponse: null };
}

/**
 * Check if the current user is an admin
 */
export function isAdmin(session) {
    return session?.user?.role === 'admin';
}

/**
 * Check if the current user is a wholesaler
 */
export function isWholesaler(session) {
    return session?.user?.role === 'wholesaler';
}
