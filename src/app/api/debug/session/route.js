import { auth } from "@/lib/auth";
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        console.log('🔍 Debug session endpoint called');
        
        const session = await auth();
        console.log('📋 Auth session result:', session ? {
            user: session.user ? {
                userID: session.user.userID,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role
            } : 'No user data',
            expires: session.expires
        } : 'NO SESSION');
        
        // Check cookies
        const cookies = request.cookies;
        const sessionCookie = cookies.get('next-auth.session-token') || cookies.get('__Secure-next-auth.session-token');
        console.log('🍪 Session cookie present:', !!sessionCookie);
        if (sessionCookie) {
            console.log('🍪 Session cookie value (truncated):', sessionCookie.value.substring(0, 20) + '...');
        }
        
        // Check headers
        const authHeader = request.headers.get('authorization');
        console.log('🔑 Auth header present:', !!authHeader);
        
        return NextResponse.json({
            success: true,
            session: session ? {
                user: session.user,
                expires: session.expires
            } : null,
            cookies: {
                sessionToken: !!sessionCookie,
                sessionCookieLength: sessionCookie ? sessionCookie.value.length : 0
            },
            environment: {
                nodeEnv: process.env.NODE_ENV,
                nextauthUrl: process.env.NEXTAUTH_URL,
                nextauthSecret: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET'
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Debug session error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}