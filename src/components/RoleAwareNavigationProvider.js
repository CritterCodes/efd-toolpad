/**
 * Role-Aware Navigation Provider
 * Handles navigation updates based on role view switching
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AppProvider } from '@toolpad/core/AppProvider';
import { getNavigationForRole, getEffectiveRole } from '@/lib/roleBasedNavigation';

export default function RoleAwareNavigationProvider({ 
  children, 
  branding, 
  authentication, 
  session,
  theme
}) {
  const [currentNavigation, setCurrentNavigation] = useState([]);

  // Update navigation when session loads or role view changes
  useEffect(() => {
    if (!session?.user?.role) return;

    const updateNavigation = () => {
      const effectiveRole = getEffectiveRole(session.user.role);
      const navigation = getNavigationForRole(effectiveRole, session.user.artisanTypes);
      setCurrentNavigation(navigation);
      
      console.log('📋 [NAVIGATION] Updated for role:', effectiveRole, 'with artisan types:', session.user.artisanTypes);
      console.log('📋 [NAVIGATION] Generated navigation:', navigation);
    };

    // Initial navigation setup
    updateNavigation();

    // Listen for role view changes
    const handleRoleChange = (event) => {
      console.log('📋 [NAVIGATION] Role view changed:', event.detail);
      updateNavigation();
    };

    window.addEventListener('roleViewChanged', handleRoleChange);
    
    // Also listen for storage changes from other tabs
    const handleStorageChange = (event) => {
      if (event.key === 'devViewRole') {
        updateNavigation();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('roleViewChanged', handleRoleChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [session?.user?.role, session?.user?.artisanTypes]);

  return (
    <AppProvider
      session={session}
      navigation={currentNavigation}
      branding={branding}
      authentication={authentication}
      theme={theme}
    >
      {children}
    </AppProvider>
  );
}