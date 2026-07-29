import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { STAFF_ROLES } from "@/lib/designPermissions";

// List of public routes that can be accessed without authentication
const publicRoutes = ["/auth/signin", "/auth/change-password", "/emergency-logout"];

/**
 * Dashboard sections only EFD staff may open. Until this existed the middleware checked only WHETHER
 * a session existed, so any authenticated user — including a freshly approved artisan — could
 * navigate straight to /dashboard/admin/artisans and approve or reject other applications. That is
 * the page-level twin of the missing API auth on /api/admin/artisans/*; both halves are needed,
 * since either alone leaves the other reachable.
 *
 * Deliberately a DENYLIST of one unambiguous prefix, not a blanket role matcher: no artisan
 * navigation item resolves under /dashboard/admin (see lib/navigation/artisanNavigation.js), so this
 * cannot lock out a legitimate artisan. Other plausibly-staff-only sections (finance, users, clients,
 * analytics, wholesaler) are NOT gated here — the intended access matrix for them isn't recorded
 * anywhere, and guessing it would lock real people out of work they do today. They need a deliberate
 * pass with the owner.
 */
const STAFF_ONLY_PREFIXES = ["/dashboard/admin"];

export default async function middleware(req) {
    const { pathname } = req.nextUrl;
    
    // Skip middleware completely for static assets 
    if (pathname.startsWith('/_next') || 
        pathname.includes('.') || 
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/logos')) {
        return NextResponse.next();
    }
    
    // Skip auth for API routes (they handle their own auth)
    if (pathname.startsWith('/api')) {
        return NextResponse.next();
    }
    
    // Minimal logging for auth checks
    
    const session = await auth();

    // ✅ Redirect root path to sign-in for internal app
    if (pathname === "/") {
        if (session) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        } else {
            return NextResponse.redirect(new URL("/auth/signin", req.url));
        }
    }

    // ✅ Redirect register page to sign-in (internal app only)
    if (pathname === "/auth/register") {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // ✅ Allow public routes to be accessed without authentication
    if (publicRoutes.includes(pathname)) {
        return NextResponse.next();
    }

    // ✅ Block protected routes if not authenticated
    if (!session) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // ✅ Force password change if mustChangePassword flag is set
    if (session.user?.mustChangePassword && pathname !== '/auth/change-password') {
        return NextResponse.redirect(new URL("/auth/change-password", req.url));
    }

    // ✅ Staff-only dashboard sections — authenticated is NOT sufficient (see STAFF_ONLY_PREFIXES).
    // Redirect rather than 403 so a mis-navigated artisan lands somewhere useful instead of a wall.
    if (STAFF_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        if (!STAFF_ROLES.includes(session.user?.role)) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    // ✅ If authenticated, allow access to dashboard routes
    return NextResponse.next();
}

// ✅ Apply middleware only to dashboard routes and auth routes
export const config = {
    matcher: ["/", "/dashboard/:path*", "/auth/:path*", "/emergency-logout"],
};