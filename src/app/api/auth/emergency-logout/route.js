import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    console.log('🚨 [EMERGENCY_LOGOUT] Emergency logout request received')
    
    // Create response that clears all auth cookies
    const response = NextResponse.json({ 
      success: true, 
      message: 'Emergency logout completed' 
    })
    
    // Clear all NextAuth cookies explicitly
    const domain = process.env.NODE_ENV === 'production' ? 'repair.engelfinedesign.com' : 'localhost'
    
    // Clear session token
    response.cookies.set('next-auth.session-token', '', {
      expires: new Date(0),
      path: '/',
      domain,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
    
    // Clear CSRF token
    response.cookies.set('next-auth.csrf-token', '', {
      expires: new Date(0),
      path: '/',
      domain,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
    
    // Clear callback URL
    response.cookies.set('next-auth.callback-url', '', {
      expires: new Date(0),
      path: '/',
      domain,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
    
    // Also try to clear any secure variants
    response.cookies.set('__Secure-next-auth.session-token', '', {
      expires: new Date(0),
      path: '/',
      domain,
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    })
    
    response.cookies.set('__Secure-next-auth.csrf-token', '', {
      expires: new Date(0),
      path: '/',
      domain,
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    })
    
    console.log('✅ [EMERGENCY_LOGOUT] All auth cookies cleared')
    
    return response
    
  } catch (error) {
    console.error('❌ [EMERGENCY_LOGOUT] Error during emergency logout:', error)
    return NextResponse.json(
      { success: false, error: 'Emergency logout failed' },
      { status: 500 }
    )
  }
}