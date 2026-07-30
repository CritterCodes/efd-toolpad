import { useCallback } from 'react';
import { forceLogout, debugAuthState } from '@/lib/auth-utils';
import { 
  debugClientAuthState, 
  debugServerAuthState, 
  clearAllStorage, 
  clearAllCookies 
} from '@/utilities/auth/emergencyLogout.helpers';

export const useEmergencyLogout = () => {

  const handleForceLogout = useCallback(async () => {
    console.log('🚨 [EMERGENCY] Force logout triggered by user');
    await forceLogout();
  }, []);

  const handleRegularLogout = useCallback(async () => {
    try {
      console.log('🚪 [EMERGENCY] Regular logout attempted');
      const { signOut } = await import('next-auth/react');
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true
      });
    } catch (error) {
      console.error('❌ [EMERGENCY] Regular logout failed, falling back to force logout:', error);
      await forceLogout();
    }
  }, []);

  const handleDebugAuth = useCallback(() => {
    console.log('🔍 [EMERGENCY] Running authentication debug...');
    debugAuthState();
  }, []);

  const handleComprehensiveDebug = useCallback(async (status, session) => {
    console.log('🔍 Starting comprehensive auth debug...');
    debugClientAuthState();
    await debugServerAuthState();
    
    console.log('\n=== 🎣 HOOK STATE DEBUG ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📊 Current status from hook:', status);
    console.log('👤 Current session from hook:', session);
    console.log('=== 🎣 HOOK STATE DEBUG END ===\n');
  }, []);

  const clearRoleOverride = useCallback(() => {
    console.log('🎭 Checking and clearing devViewRole...');
    const devViewRole = localStorage.getItem('devViewRole');
    console.log('🔍 Current devViewRole:', devViewRole);
    
    if (devViewRole) {
      localStorage.removeItem('devViewRole');
      console.log('✅ Cleared devViewRole from localStorage');
      console.log('🔄 Reloading page to refresh navigation...');
      window.location.reload();
    } else {
      console.log('ℹ️ No devViewRole found in localStorage');
      alert('No devViewRole found in localStorage. The issue might be elsewhere.');
    }
  }, []);

  const executeNuclearLogout = useCallback(async () => {
    console.log('☢️ Starting NUCLEAR logout...');
    await clearAllStorage();
    clearAllCookies();
    
    console.log('☢️ Calling server emergency logout...');
    try {
      const response = await fetch('/api/auth/emergency-logout', { 
        method: 'POST',
        credentials: 'include'
      });
      console.log('Server logout response:', response.status);
    } catch (error) {
      console.error('Server logout error:', error);
    }
    
    console.log('🔄 Force reloading page...');
    window.location.href = window.location.href + '?nuclear=' + Date.now();
  }, []);

  // REMOVED: checkDatabaseRole / fixRoleToAdmin. They called POST /api/auth/fix-role, an
  // UNAUTHENTICATED endpoint that set an arbitrary role from the request body — a self-service
  // "make me admin" button on a page listed in middleware's publicRoutes. The route is deleted;
  // role changes go through the guarded /api/users/create-admin path.

  return {
    handleForceLogout,
    handleRegularLogout,
    handleDebugAuth,
    handleComprehensiveDebug,
    clearRoleOverride,
    executeNuclearLogout
  };
};