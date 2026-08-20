// src/app/api/users/route.js
import { requireAuth, requireRole } from "@/lib/apiAuth";
import { STAFF_ROLES } from "@/lib/designPermissions";
import UserController from "./controller";

/**
 * The users collection. `middleware.js` skips `/api/*`, so these handlers own their auth.
 *
 * PUT here was the same unauthenticated privilege escalation as `/api/users/[userID]`: it reaches
 * `UserService.updateUser`, whose `$set` accepted `role`, so any anonymous caller could grant themselves
 * `admin` — and the controller even contains role-change notification handling, so writing a role
 * through this path was a modelled flow rather than an oversight. GET returned every user in the
 * database, POST created accounts and DELETE removed them, none of it requiring a session.
 *
 * READ is authenticated-only rather than staff-only ON PURPOSE: `?role=artisan` feeds the collaborator
 * pickers artisans legitimately use (the drops design editor, `lib/artisans.js`), so staff-gating reads
 * would break artisans' own surfaces. Narrowing reads per-role needs the access matrix that is still
 * open; anonymous access is closed either way. WRITES are staff-only.
 */

/**
 * ✅ Route for creating a new user
 */
export async function POST(req) {
    const { errorResponse } = await requireRole(STAFF_ROLES);
    if (errorResponse) return errorResponse;
    return await UserController.createUser(req);
}

/**
 * ✅ Route for getting users
 * If a query parameter is provided, fetch a specific user
 * If a role parameter is provided, fetch users by role
 * Otherwise, fetch all users
 */
export async function GET(req) {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    // THE USER DIRECTORY IS SHOP-FLOOR ONLY. requireAuth alone meant ANY login — a customer,
    // a freshly promoted affiliate — could dump every user's name/email/phone with a bare GET.
    // Staff and artisans genuinely need it (intake at /dashboard/repairs/new and the customs
    // stepper search the client base; artisans ARE the counter staff here). Nobody else does:
    // wholesalers have their own client surfaces, and affiliates get privacy-masked referred
    // clients from /api/affiliates/metrics, never raw user documents.
    if (![...STAFF_ROLES, 'artisan'].includes(session.user?.role)) {
        return new Response(JSON.stringify({ success: false, error: 'Access denied.' }), { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const role = searchParams.get("role");

    if (query) {
        return await UserController.getUserByQuery(req);
    } else if (role) {
        return await UserController.getUsersByRole(req);
    } else {
        return await UserController.getAllUsers(req);
    }
}

/**
 * ✅ Route for updating a user by query
 */
export async function PUT(req) {
    const { errorResponse } = await requireRole(STAFF_ROLES);
    if (errorResponse) return errorResponse;
    return await UserController.updateUser(req);
}

/**
 * ✅ Route for deleting a user by query
 */
export async function DELETE(req) {
    const { errorResponse } = await requireRole(STAFF_ROLES);
    if (errorResponse) return errorResponse;
    return await UserController.deleteUser(req);
}
