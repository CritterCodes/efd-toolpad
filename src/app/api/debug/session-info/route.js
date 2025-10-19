/**
 * Debug session information - add this to a test API route
 * GET /api/debug/session-info
 */

import { auth } from '../../../../../auth.js';

export async function GET(req) {
  try {
    const session = await auth();
    
    return Response.json({
      hasSession: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        name: session.user.name
      } : null,
      expires: session?.expires,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nextauthUrl: process.env.NEXTAUTH_URL,
      nextPublicUrl: process.env.NEXT_PUBLIC_URL
    }, { status: 200 });
    
  } catch (error) {
    console.error('Session debug error:', error);
    return Response.json({
      error: 'Session debug failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}