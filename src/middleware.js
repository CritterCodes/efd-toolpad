import { auth } from "../auth";
import { NextResponse } from "next/server";

// List of public routes that can be accessed without authentication  
const publicRoutes = ["/auth/signin"];

export default async function middleware(req) {
    const session = await auth();
    const { pathname } = req.nextUrl;

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

// ✅ Apply middleware to all routes except public ones
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};