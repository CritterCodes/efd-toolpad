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

  const checkDatabaseRole = useCallback(async (session) => {
    console.log('🔍 Checking user role in database...');
    try {
      const email = session?.user?.email || 'jacobaengel55@gmail.com';
      console.log('📧 Checking role for email:', email);
      
      const response = await fetch(`/api/auth/fix-role?email=${encodeURIComponent(email)}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('📊 Database user data:', data);
      
      if (data.success) {
        console.log('👤 Current user in database:');
        console.log('  📧 Email:', data.user.email);
        console.log('  🎭 Role:', data.user.role);
        console.log('  📋 Status:', data.user.status);
        console.log('  👤 Name:', data.user.firstName, data.user.lastName);
        
        alert(`Database Role Check:\n\nEmail: ${data.user.email}\nRole: ${data.user.role}\nStatus: ${data.user.status}\n\nIf role is wrong, use the Fix Role button.`);
      } else {
        console.error('❌ Error:', data.error);
        alert(`Error checking role: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Failed to check role:', error);
      alert(`Failed to check role: ${error.message}`);
    }
  }, []);

  const fixRoleToAdmin = useCallback(async (session) => {
    console.log('🔧 Fixing user role in database...');
    const confirmFix = window.confirm('This will change your database role from "client" to "admin".\n\nAre you sure you want to proceed?');
    if (!confirmFix) {
      console.log('ℹ️ Role fix cancelled by user');
      return;
    }
    
    try {
      const email = session?.user?.email || 'jacobaengel55@gmail.com';
      console.log('📧 Fixing role for email:', email);
      
      const response = await fetch('/api/auth/fix-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email,
          newRole: 'admin'
        })
      });
      
      const data = await response.json();
      console.log('📊 Role fix response:', data);
      
      if (data.success) {
        console.log('✅ Role fixed successfully!');
        alert(`✅ Role Fixed Successfully!\n\nEmail: ${data.user.email}\nOld Role: ${data.user.oldRole}\nNew Role: ${data.user.newRole}\n\nPlease logout and login again to see the changes.`);
        
        const shouldLogout = window.confirm('Role has been fixed in the database.\n\nWould you like to logout now so you can login with the new admin role?');
        if (shouldLogout) {
          window.location.href = '/api/auth/signout';
        }
      } else {
        console.error('❌ Role fix failed:', data.error);
        alert(`❌ Role Fix Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Failed to fix role:', error);
      alert(`Failed to fix role: ${error.message}`);
    }
  }, []);

  return {
    handleForceLogout,
    handleRegularLogout,
    handleDebugAuth,
    handleComprehensiveDebug,
    clearRoleOverride,
    executeNuclearLogout,
    checkDatabaseRole,
    fixRoleToAdmin
  };
};