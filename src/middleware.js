import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// List of public routes that can be accessed without authentication  
const publicRoutes = ["/auth/signin", "/auth/register"];

// Client role constant (to avoid import issues in Edge Runtime)
const CLIENT_ROLE = 'client';

export default async function middleware(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // ✅ Redirect root path to appropriate location
    if (pathname === "/") {
        if (token) {
            // Block clients from accessing admin panel
            if (token.role === CLIENT_ROLE) {
                return NextResponse.redirect(new URL("https://engelfinedesign.com", req.url));
            }
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
    if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // 🚫 CRITICAL: Block client role from accessing any admin routes
    if (token.role === CLIENT_ROLE) {
        console.log(`Blocking client access to admin panel: ${token.email}`);
        return NextResponse.redirect(new URL("https://engelfinedesign.com", req.url));
    }

    // For authenticated users with proper roles, we'll handle permission checking in the actual pages
    // rather than in middleware to avoid Edge Runtime limitations
    
    // Add basic user info to headers if available from token
    const requestHeaders = new Headers(req.headers);
    if (token) {
        requestHeaders.set('x-user-email', token.email || '');
        requestHeaders.set('x-user-role', token.role || '');
        requestHeaders.set('x-user-id', token.userID || '');
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

// ✅ Apply middleware to all routes except public ones
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
