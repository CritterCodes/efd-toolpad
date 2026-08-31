// lib/apiAuth.js - Authentication & authorization helpers for API routes
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
// Pure predicates live in a client-safe module so pages can share them rather
// than retyping the same role test. See lib/repairAccess.js.
import { canAccessLeads, isAdminRole, isOnsiteRepairOps } from "@/lib/repairAccess";

export { canAccessLeads, isOnsiteRepairOps };

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
    return isAdminRole(session);
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
 * Staff-side repair session: admin/dev or an onsite artisan with repair ops —
 * everyone `canAccessRepairs` admits EXCEPT wholesalers. Wholesalers are outside
 * businesses: they may use the repair pipeline, but only on their own jobs.
 */
export function isStaffRepairSession(session) {
    return isAdmin(session) || isOnsiteRepairOps(session);
}

/**
 * The Mongo filter that scopes a repair query to what this session may see.
 * Staff → null (unscoped). Wholesaler → only repairs they own or created.
 *
 * WHY THIS EXISTS. `requireRepairsAccess` admits wholesalers because they create
 * and track repairs — but every sink behind it queried the WHOLE collection, so
 * any wholesaler login could read (and via PUT, edit) every repair in the shop,
 * including other jewelers' customers and pricing. Guard the sink, not the route:
 * the route-level guard stays, and each query composes this filter.
 */
export function repairOwnershipFilter(session) {
    if (isStaffRepairSession(session)) return null;
    const id = session?.user?.userID || '__no_user__';
    return { $or: [{ userID: id }, { createdBy: id }] };
}

/** May this session touch this specific repair record? (Staff: always.) */
export function canTouchRepair(session, repair) {
    if (isStaffRepairSession(session)) return true;
    if (!repair) return false;
    const id = session?.user?.userID;
    return Boolean(id) && (repair.userID === id || repair.createdBy === id);
}

/**
 * Check if the user has a specific staff capability (admin always passes)
 */
export function hasStaffCapability(session, capability) {
    if (['admin', 'dev'].includes(session?.user?.role)) return true;
    return isOnsiteRepairOps(session)
        && session?.user?.staffCapabilities?.[capability] === true;
}

export function hasAnyStaffCapability(session, capabilities = []) {
    if (['admin', 'dev'].includes(session?.user?.role)) return true;
    if (!isOnsiteRepairOps(session)) return false;
    return capabilities.some((capability) => session?.user?.staffCapabilities?.[capability] === true);
}

export function canAccessSalesPos(session) {
    if (['admin', 'dev', 'staff'].includes(session?.user?.role)) return true;
    if (!isOnsiteRepairOps(session)) return false;
    return session?.user?.staffCapabilities?.repairOps === true
        || session?.user?.staffCapabilities?.closeoutBilling === true;
}

export async function requireSalesPosAccess() {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return { session: null, errorResponse };

    if (!canAccessSalesPos(session)) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: 'Access denied. Sales POS access is restricted to admins, staff, and onsite artisans with sales/repair operations capability.' },
                { status: 403 }
            ),
        };
    }

    return { session, errorResponse: null };
}

/**
 * Require repairOps capability, optionally requiring a specific sub-capability.
 * Admins always pass. Artisans must be onsite with repairOps (and the sub-cap if specified).
 */
export async function requireRepairOps(requiredCapability = null) {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return { session: null, errorResponse };

    if (['admin', 'dev'].includes(session.user.role)) return { session, errorResponse: null };

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

    if (['admin', 'dev'].includes(session.user.role)) return { session, errorResponse: null };

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
/**
 * Staff-only repairs guard: admins/devs and onsite repair-ops artisans, but NOT
 * wholesalers. For surfaces wholesalers have no business on (e.g. the appointment
 * book, which lists every customer) — `requireRepairsAccess` admits them because
 * they create repairs, so anything beyond their own jobs needs this instead.
 */
export async function requireStaffRepairsAccess() {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return { session: null, errorResponse };

    if (!isStaffRepairSession(session)) {
        return {
            session: null,
            errorResponse: NextResponse.json(
                { error: 'Access denied. This area is restricted to staff.' },
                { status: 403 }
            ),
        };
    }

    return { session, errorResponse: null };
}

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
