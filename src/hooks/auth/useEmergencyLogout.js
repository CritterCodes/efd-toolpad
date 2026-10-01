import { useCallback } from 'react';
import { forceLogout } from '@/lib/auth-utils';
import { clearAllStorage, clearAllCookies } from '@/utilities/auth/emergencyLogout.helpers';

/**
 * The emergency-logout page's actions. Its "debug auth state" buttons, which dumped cookies, storage and the
 * session into the browser console, were removed on 2026-10-01 (owner: remove; docs/OPEN-QUESTIONS.md Q6).
 */
export const useEmergencyLogout = () => {

  const handleForceLogout = useCallback(async () => {
    await forceLogout();
  }, []);

  const handleRegularLogout = useCallback(async () => {
    try {
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

  const clearRoleOverride = useCallback(() => {
    const devViewRole = localStorage.getItem('devViewRole');
    if (devViewRole) {
      localStorage.removeItem('devViewRole');
      window.location.reload();
    } else {
      alert('No devViewRole found in localStorage. The issue might be elsewhere.');
    }
  }, []);

  const executeNuclearLogout = useCallback(async () => {
    await clearAllStorage();
    clearAllCookies();
    try {
      await fetch('/api/auth/emergency-logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Server logout error:', error);
    }
    window.location.href = window.location.href + '?nuclear=' + Date.now();
  }, []);

  // REMOVED: checkDatabaseRole / fixRoleToAdmin. They called POST /api/auth/fix-role, an
  // UNAUTHENTICATED endpoint that set an arbitrary role from the request body — a self-service
  // "make me admin" button on a page listed in middleware's publicRoutes. The route is deleted;
  // role changes go through the guarded /api/users/create-admin path.

  return {
    handleForceLogout,
    handleRegularLogout,
    clearRoleOverride,
    executeNuclearLogout
  };
};
