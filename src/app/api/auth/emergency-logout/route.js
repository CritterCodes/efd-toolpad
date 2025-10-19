import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    console.log('🚨 [EMERGENCY_LOGOUT] Emergency logout request received')
    
    // Create response that clears all auth cookies
    const response = NextResponse.json({ 
      success: true, 
      message: 'Emergency logout completed' 
    })
    
    // NUCLEAR cookie clearing - try every possible variant
    const domains = ['repair.engelfinedesign.com', '.repair.engelfinedesign.com', '.engelfinedesign.com', 'localhost']
    const cookieNames = [
      'next-auth.session-token',
      'next-auth.csrf-token', 
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.session-token',
      '__Host-next-auth.csrf-token',
      'session-token',
      'csrf-token',
      'authjs.session-token',
      'authjs.csrf-token'
    ]
    const paths = ['/', '/api', '/auth']
    
    domains.forEach(domain => {
      cookieNames.forEach(cookieName => {
        paths.forEach(path => {
          // Try all combinations of secure/non-secure, different samesite values
          const cookieOptions = [
            { path, domain, httpOnly: true, secure: true, sameSite: 'lax' },
            { path, domain, httpOnly: true, secure: true, sameSite: 'strict' },
            { path, domain, httpOnly: true, secure: true, sameSite: 'none' },
            { path, domain, httpOnly: true, secure: false, sameSite: 'lax' },
            { path, domain, httpOnly: false, secure: true, sameSite: 'lax' },
            { path, domain, httpOnly: false, secure: false, sameSite: 'lax' },
            { path, secure: true, sameSite: 'lax' }, // No domain specified
            { path, secure: false, sameSite: 'lax' }, // No domain specified
          ]
          
          cookieOptions.forEach(options => {
            try {
              response.cookies.set(cookieName, '', {
                expires: new Date(0),
                ...options
              })
            } catch (e) {
              // Ignore cookie setting errors for invalid combinations
            }
          })
        })
      })
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