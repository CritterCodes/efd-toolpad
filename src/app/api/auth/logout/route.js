import { NextResponse } from 'next/server'
import { signOut } from '../../../../../auth.js'

export async function POST(req) {
  try {
    
    // Clear NextAuth session
    await signOut()
    
    // Create response that clears all auth cookies
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
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
    
    
    return response
    
  } catch (error) {
    console.error('❌ [LOGOUT] Error during logout:', error)
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}