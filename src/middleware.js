import { auth } from "../auth";
import { NextResponse } from "next/server";

// List of public routes that can be accessed without authentication
const publicRoutes = ["/", "/auth/signin", "/auth/register"];

export default async function middleware(req) {
    const session = await auth();
    const { pathname } = req.nextUrl;

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

// ✅ Apply middleware only to protected routes
export const config = {
    matcher: ["/dashboard/:path*"],
};
