/**
 * Enhanced logout utility that clears both server and client-side authentication
 */
export async function forceLogout() {
  try {
    console.log('🚪 [FORCE_LOGOUT] Starting complete session cleanup...');
    
    // 1. Call server-side logout API
    const logoutResponse = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (logoutResponse.ok) {
      console.log('✅ [FORCE_LOGOUT] Server-side session cleared');
    }
    
    // 2. Clear all NextAuth cookies manually (client-side backup)
    const cookiesToClear = [
      'next-auth.session-token',
      'next-auth.csrf-token', 
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token'
    ];
    
    cookiesToClear.forEach(cookieName => {
      // Clear for current domain
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      // Clear for production domain
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=repair.engelfinedesign.com;`;
    });
    
    console.log('✅ [FORCE_LOGOUT] Client-side cookies cleared');
    
    // 3. Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('✅ [FORCE_LOGOUT] Browser storage cleared');
    
    // 4. Force page reload to ensure clean state
    window.location.href = '/auth/signin';
    
  } catch (error) {
    console.error('❌ [FORCE_LOGOUT] Error during force logout:', error);
    // Last resort - hard reload
    window.location.reload();
  }
}

/**
 * Check if user has stale session with wrong role
 */
export function hasStaleSession(expectedRole, currentRole) {
  return currentRole && currentRole !== expectedRole;
}

/**
 * Enhanced logout with role validation
 */
export async function logoutIfWrongRole(expectedRole, currentRole) {
  if (hasStaleSession(expectedRole, currentRole)) {
    console.log(`🔄 [ROLE_CHECK] Role mismatch detected: expected '${expectedRole}', got '${currentRole}' - forcing logout`);
    await forceLogout();
    return true;
  }
  return false;
}