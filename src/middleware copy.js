import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// List of public routes that can be accessed without authentication  
const publicRoutes = ["/auth/signin", "/auth/register"];

export default async function middleware(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // ✅ Redirect root path to appropriate location
    if (pathname === "/") {
        if (token) {
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

    // For authenticated users, we'll handle permission checking in the actual pages
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
