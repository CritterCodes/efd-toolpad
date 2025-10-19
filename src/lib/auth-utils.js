/**
 * Enhanced logout utility that clears both server and client-side authentication
 */
export async function forceLogout() {
  try {
    console.log('🚪 [FORCE_LOGOUT] Starting complete session cleanup...');
    
    // 1. Debug current cookies before clearing
    console.log('🔍 [FORCE_LOGOUT] Current cookies:', document.cookie);
    
    // 2. Try emergency logout API first (doesn't require auth)
    const logoutResponse = await fetch('/api/auth/emergency-logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (logoutResponse.ok) {
      console.log('✅ [FORCE_LOGOUT] Server-side session cleared');
    }
    
    // 3. NUCLEAR COOKIE CLEARING - try every possible combination
    const cookiesToClear = [
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
    ];
    
    const domains = [
      null, // Current domain
      window.location.hostname, // Exact hostname
      'repair.engelfinedesign.com', // Production domain
      '.repair.engelfinedesign.com', // Subdomain variant
      '.engelfinedesign.com', // Parent domain
      'localhost' // Local domain
    ];
    
    const paths = ['/', '/api', '/auth'];
    
    cookiesToClear.forEach(cookieName => {
      domains.forEach(domain => {
        paths.forEach(path => {
          // Clear with all combinations
          const domainStr = domain ? `; domain=${domain}` : '';
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainStr}; secure; samesite=none`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainStr}; secure; samesite=lax`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainStr}; samesite=lax`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainStr}`;
        });
      });
    });
    
    console.log('✅ [FORCE_LOGOUT] Nuclear cookie clearing completed');
    
    // 4. Clear ALL browser storage
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(database => {
            indexedDB.deleteDatabase(database.name);
          });
        });
      }
      
      // Clear service worker caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
    } catch (storageError) {
      console.error('❌ [FORCE_LOGOUT] Storage clearing error:', storageError);
    }
    
    console.log('✅ [FORCE_LOGOUT] All browser storage cleared');
    
    // 5. Debug cookies after clearing
    console.log('🔍 [FORCE_LOGOUT] Cookies after clearing:', document.cookie);
    
    // 6. Force complete page refresh to bypass any cached state
    window.location.replace('/auth/signin');
    
  } catch (error) {
    console.error('❌ [FORCE_LOGOUT] Error during force logout:', error);
    // Last resort - complete reload
    window.location.replace('/auth/signin');
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

/**
 * Debug function to inspect all authentication state
 */
export function debugAuthState() {
  console.log('🔍 [DEBUG_AUTH] === AUTHENTICATION STATE DEBUG ===');
  
  // 1. All cookies
  console.log('🍪 [DEBUG_AUTH] All cookies:', document.cookie);
  
  // 2. Parse cookies for auth-related ones
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && (name.includes('auth') || name.includes('session') || name.includes('csrf'))) {
      acc[name] = value;
    }
    return acc;
  }, {});
  console.log('🔑 [DEBUG_AUTH] Auth cookies:', cookies);
  
  // 3. Local Storage
  const localStorage_auth = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('auth') || key.includes('session') || key.includes('next'))) {
      localStorage_auth[key] = localStorage.getItem(key);
    }
  }
  console.log('💾 [DEBUG_AUTH] Auth localStorage:', localStorage_auth);
  
  // 4. Session Storage  
  const sessionStorage_auth = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('auth') || key.includes('session') || key.includes('next'))) {
      sessionStorage_auth[key] = sessionStorage.getItem(key);
    }
  }
  console.log('📋 [DEBUG_AUTH] Auth sessionStorage:', sessionStorage_auth);
  
  // 5. Current session via NextAuth
  if (typeof window !== 'undefined' && window.next && window.next.router) {
    console.log('🏠 [DEBUG_AUTH] Router ready, checking session...');
  }
  
  console.log('🔍 [DEBUG_AUTH] === END AUTHENTICATION DEBUG ===');
  
  return {
    cookies,
    localStorage: localStorage_auth,
    sessionStorage: sessionStorage_auth
  };
}