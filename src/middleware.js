import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// List of public routes that can be accessed without authentication  
const publicRoutes = ["/auth/signin", "/emergency-logout"];

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

    // ✅ If authenticated, allow access to dashboard routes
    return NextResponse.next();
}

// ✅ Apply middleware only to dashboard routes and auth routes
export const config = {
    matcher: ["/", "/dashboard/:path*", "/auth/:path*", "/emergency-logout"],
};