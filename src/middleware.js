import { auth } from "../auth";
import { NextResponse } from "next/server";
import { logRequestCookies, logSessionData } from "./lib/cookie-debug.js";

// List of public routes that can be accessed without authentication  
const publicRoutes = ["/auth/signin", "/emergency-logout"];

export default async function middleware(req) {
    console.log('\n🛡️ === MIDDLEWARE START ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🌐 Request URL:', req.url);
    console.log('📍 Pathname:', req.nextUrl.pathname);
    console.log('🔗 Method:', req.method);
    
    // Log all cookies in the request
    logRequestCookies(req, 'MIDDLEWARE_REQUEST');
    
    const session = await auth();
    console.log('🔐 Auth session result:');
    if (session) {
        console.log('  ✅ Session exists');
        console.log('  📧 Email:', session.user?.email);
        console.log('  🎭 Role:', session.user?.role);
        console.log('  👤 Name:', session.user?.name);
        logSessionData(session, 'MIDDLEWARE_SESSION');
    } else {
        console.log('  ❌ No session found');
    }
    
    const { pathname } = req.nextUrl;

    // ✅ Redirect root path to sign-in for internal app
    if (pathname === "/") {
        if (session) {
            console.log('🏠 Root redirect - authenticated user going to dashboard');
            console.log('🛡️ === MIDDLEWARE END (ROOT->DASHBOARD) ===\n');
            return NextResponse.redirect(new URL("/dashboard", req.url));
        } else {
            console.log('🏠 Root redirect - unauthenticated user going to signin');
            console.log('🛡️ === MIDDLEWARE END (ROOT->SIGNIN) ===\n');
            return NextResponse.redirect(new URL("/auth/signin", req.url));
        }
    }

    // ✅ Redirect register page to sign-in (internal app only)
    if (pathname === "/auth/register") {
        console.log('📝 Register redirect - sending to signin');
        console.log('🛡️ === MIDDLEWARE END (REGISTER->SIGNIN) ===\n');
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // ✅ Allow public routes to be accessed without authentication
    if (publicRoutes.includes(pathname)) {
        console.log('🔓 Public route access granted:', pathname);
        console.log('🛡️ === MIDDLEWARE END (PUBLIC) ===\n');
        return NextResponse.next();
    }

    // ✅ Block protected routes if not authenticated
    if (!session) {
        console.log('🚫 Protected route blocked - no session, redirecting to signin');
        console.log('🛡️ === MIDDLEWARE END (PROTECTED->SIGNIN) ===\n');
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // ✅ If authenticated, allow access to dashboard routes
    console.log('✅ Protected route access granted for authenticated user');
    console.log('  📧 User:', session.user?.email);
    console.log('  🎭 Role:', session.user?.role);
    console.log('🛡️ === MIDDLEWARE END (PROTECTED_ACCESS) ===\n');
    return NextResponse.next();
}

// ✅ Apply middleware to all routes except public ones
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};