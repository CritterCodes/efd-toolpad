import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth.js'

export async function GET(request) {
  try {
    console.log('🔍 Debug session called...')
    
    // Get session from NextAuth
    const session = await auth()
    console.log('NextAuth session:', session)
    
    // Get all cookies from request
    const cookieHeader = request.headers.get('cookie') || ''
    console.log('Request cookies:', cookieHeader)
    
    // Parse cookies
    const cookies = {}
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=')
      if (name) {
        cookies[name] = rest.join('=')
      }
    })
    
    // Filter auth-related cookies
    const authCookies = {}
    Object.keys(cookies).forEach(name => {
      if (name.includes('auth') || name.includes('session') || name.includes('csrf') || name.includes('next-auth')) {
        authCookies[name] = cookies[name]?.substring(0, 100) + '...' // Truncate for security
      }
    })
    
    const debugData = {
      timestamp: new Date().toISOString(),
      hasSession: !!session,
      sessionUser: session?.user ? {
        email: session.user.email,
        role: session.user.role,
        name: session.user.name
      } : null,
      authCookiesCount: Object.keys(authCookies).length,
      authCookieNames: Object.keys(authCookies),
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
    }
    
    console.log('Debug data:', debugData)
    
    return NextResponse.json({
      success: true,
      debug: debugData,
      message: 'Session debug complete'
    })
    
  } catch (error) {
    console.error('🚨 Debug session error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}