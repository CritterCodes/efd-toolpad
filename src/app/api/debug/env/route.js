import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        console.log('🔍 Environment debug endpoint called');
        
        const url = new URL(request.url);
        
        return NextResponse.json({
            success: true,
            environment: {
                nodeEnv: process.env.NODE_ENV,
                nextauthUrl: process.env.NEXTAUTH_URL,
                nextauthSecret: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
                publicUrl: process.env.NEXT_PUBLIC_URL,
                vercelUrl: process.env.VERCEL_URL,
                host: request.headers.get('host'),
                requestUrl: request.url,
                origin: url.origin
            },
            cookies: Object.fromEntries(request.cookies.entries()),
            headers: Object.fromEntries(request.headers.entries()),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Environment debug error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}