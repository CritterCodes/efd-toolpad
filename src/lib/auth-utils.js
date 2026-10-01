/**
 * Enhanced logout utility that clears both server and client-side authentication
 */
export async function forceLogout() {
  try {
    
    // 1. Debug current cookies before clearing
    
    // 2. Try emergency logout API first (doesn't require auth)
    const logoutResponse = await fetch('/api/auth/emergency-logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (logoutResponse.ok) {
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
    
    
    // 5. Debug cookies after clearing
    
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
    await forceLogout();
    return true;
  }
  return false;
}
