/**
 * Role-Aware Dashboard Layout
 * Provides role-based content and shows role view banner when needed
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Box } from '@mui/material';
import RoleViewBanner from '@/components/RoleViewBanner';

export default function RoleAwareLayout({ children }) {
  const sessionState = useSession() || {};
  const { data: session = null } = sessionState;
  const [currentViewRole, setCurrentViewRole] = useState(null);

  // Check for saved role view and listen for changes
  useEffect(() => {
    const checkRoleView = () => {
      const savedRole = localStorage.getItem('devViewRole');
      if (savedRole) {
        setCurrentViewRole(savedRole);
      } else if (session?.user?.role) {
        setCurrentViewRole(session.user.role);
      }
    };

    // Initial check
    checkRoleView();

    // Listen for role changes
    const handleRoleChange = () => {
      checkRoleView();
    };

    window.addEventListener('roleViewChanged', handleRoleChange);
    
    return () => {
      window.removeEventListener('roleViewChanged', handleRoleChange);
    };
  }, [session?.user?.role]);

  // Don't render until we have session data
  if (!session?.user || !currentViewRole) {
    return null;
  }

  return (
    <Box>
      {/* Role View Banner - appears when viewing as different role */}
      <RoleViewBanner />
      
      {/* Main content */}
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        {children}
      </Box>
    </Box>
  );
}
