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

/**
 * Check if the current user can access repair operations pages/APIs at all.
 * Admins and wholesalers always pass. Artisans must be onsite with repairOps.
 */
export function canAccessRepairs(session) {
    return isAdmin(session)
        || isWholesaler(session)
        || isOnsiteRepairOps(session);
}

/**
 * Check if the current user is an onsite artisan with repairOps capability
 */
export function isOnsiteRepairOps(session) {
    return session?.user?.role === 'artisan'
        && session?.user?.employment?.isOnsite === true
        && session?.user?.staffCapabilities?.repairOps === true;
}

/**
 * Check if the user has a specific staff capability (admin always passes)
 */
export function hasStaffCapability(session, capability) {
    if (session?.user?.role === 'admin') return true;
    return isOnsiteRepairOps(session)
        && session?.user?.staffCapabilities?.[capability] === true;
}

export function hasAnyStaffCapability(session, capabilities = []) {
    if (session?.user?.role === 'admin') return true;
    if (!isOnsiteRepairOps(session)) return false;
    return capabilities.some((capability) => session?.user?.staffCapabilities?.[capability] === true);
}

/**
 * Require repairOps capability, optionally requiring a specific sub-capability.
 * Admins always pass. Artisans must be onsite with repairOps (and the sub-cap if specified).
 */
export async function requireRepairOps(requiredCapability = null) {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return { session: null, errorResponse };

    if (session.user.role === 'admin') return { session, errorResponse: null };

    if (!isOnsiteRepairOps(session)) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: 'Access denied. Repair operations capability required.' },
                { status: 403 }
            ),
        };
    }

    if (requiredCapability && !session.user.staffCapabilities?.[requiredCapability]) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: `Access denied. ${requiredCapability} capability required.` },
                { status: 403 }
            ),
        };
    }

    return { session, errorResponse: null };
}

export async function requireRepairOpsAny(requiredCapabilities = []) {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return { session: null, errorResponse };

    if (session.user.role === 'admin') return { session, errorResponse: null };

    if (!isOnsiteRepairOps(session)) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: 'Access denied. Repair operations capability required.' },
                { status: 403 }
            ),
        };
    }

    if (
        Array.isArray(requiredCapabilities) &&
        requiredCapabilities.length > 0 &&
        !requiredCapabilities.some((capability) => session.user.staffCapabilities?.[capability] === true)
    ) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: `Access denied. One of these capabilities is required: ${requiredCapabilities.join(', ')}.` },
                { status: 403 }
            ),
        };
    }

    return { session, errorResponse: null };
}

/**
 * Require general repair access.
 * Admins and wholesalers always pass. Artisans must be onsite with repairOps.
 */
export async function requireRepairsAccess() {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return { session: null, errorResponse };

    if (!canAccessRepairs(session)) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: 'Access denied. Repair access is restricted to admins, wholesalers, and onsite artisans with repair ops.' },
                { status: 403 }
            ),
        };
    }

    return { session, errorResponse: null };
}
