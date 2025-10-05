import { auth } from "../auth";
import { NextResponse } from "next/server";
import { UnifiedUserService } from "./lib/unifiedUserService.js";

// List of public routes that can be accessed without authentication  
const publicRoutes = ["/auth/signin", "/auth/register"];

// Routes that require specific permissions
const protectedRoutes = {
  "/dashboard/admin": ["adminSettings"],
  "/dashboard/users": ["userManagement"],
  "/dashboard/settings": ["adminSettings"]
};

export default async function middleware(req) {
    const session = await auth();
    const { pathname } = req.nextUrl;

    // ✅ Redirect root path to appropriate location
    if (pathname === "/") {
        if (session) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        } else {
            return NextResponse.redirect(new URL("/auth/signin", req.url));
        }
    }

    // ✅ Allow public routes to be accessed without authentication
    if (publicRoutes.includes(pathname)) {
        return NextResponse.next();
    }

    // ✅ Block protected routes if not authenticated
    if (!session) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    try {
        // Get user data with permissions
        const user = await UnifiedUserService.findUserByEmail(session.user.email);
        
        if (!user) {
            console.error("User not found in database:", session.user.email);
            return NextResponse.redirect(new URL("/auth/signin", req.url));
        }

        // Check if user can access efd-admin
        if (!UnifiedUserService.canAccessEfdAdmin(user)) {
            return new NextResponse("Access Denied: Insufficient permissions for admin panel", { 
                status: 403 
            });
        }

        // Check if user is pending approval
        if (user.status === 'pending') {
            // Allow access to pending status page only
            if (pathname !== '/dashboard/pending') {
                return NextResponse.redirect(new URL("/dashboard/pending", req.url));
            }
            return NextResponse.next();
        }

        // Check if user account is suspended or rejected
        if (user.status === 'suspended' || user.status === 'rejected') {
            return new NextResponse("Account suspended or rejected", { 
                status: 403 
            });
        }

        // Check route-specific permissions
        for (const [route, requiredPermissions] of Object.entries(protectedRoutes)) {
            if (pathname.startsWith(route)) {
                const hasPermission = requiredPermissions.some(permission => 
                    UnifiedUserService.hasPermission(user, permission)
                );
                
                if (!hasPermission) {
                    return new NextResponse("Access Denied: Insufficient permissions", { 
                        status: 403 
                    });
                }
            }
        }

        // Add user data to request headers for use in components
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', user.userID);
        requestHeaders.set('x-user-role', user.role);
        requestHeaders.set('x-user-permissions', JSON.stringify(user.permissions));

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

    } catch (error) {
        console.error("Middleware error:", error);
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
}

// ✅ Apply middleware to all routes except public ones
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
