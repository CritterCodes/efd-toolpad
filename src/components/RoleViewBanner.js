/**
 * Role View Banner Component
 * Shows a banner when viewing as a different role than the actual user role
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  AdminPanelSettings as AdminIcon,
  Code as DevIcon,
  People as StaffIcon,
  Handyman as ArtisanIcon,
  RequestQuote as ApplicantIcon,
  Storefront as WholesalerIcon
} from '@mui/icons-material';
import { USER_ROLES } from '@/lib/unifiedUserService';

const ROLE_DISPLAY = {
  [USER_ROLES.WHOLESALER]: {
    label: 'Wholesaler',
    icon: <WholesalerIcon fontSize="small" />
  },
  [USER_ROLES.ARTISAN_APPLICANT]: {
    label: 'Artisan Applicant',
    icon: <ApplicantIcon fontSize="small" />
  },
  [USER_ROLES.ARTISAN]: {
    label: 'Artisan',
    icon: <ArtisanIcon fontSize="small" />
  },
  [USER_ROLES.STAFF]: {
    label: 'Staff',
    icon: <StaffIcon fontSize="small" />
  },
  [USER_ROLES.DEV]: {
    label: 'Developer',
    icon: <DevIcon fontSize="small" />
  },
  [USER_ROLES.ADMIN]: {
    label: 'Admin',
    icon: <AdminIcon fontSize="small" />
  }
};

export default function RoleViewBanner() {
  const { data: session } = useSession();
  const [currentViewRole, setCurrentViewRole] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  
  const userRole = session?.user?.role;

  // Check localStorage and listen for role changes
  useEffect(() => {
    const checkRoleView = () => {
      const savedRole = localStorage.getItem('devViewRole');
      if (savedRole && savedRole !== userRole) {
        setCurrentViewRole(savedRole);
        setShowBanner(true);
      } else {
        setCurrentViewRole(null);
        setShowBanner(false);
      }
    };

    // Initial check
    checkRoleView();

    // Listen for role changes
    const handleRoleChange = (event) => {
      checkRoleView();
    };

    window.addEventListener('roleViewChanged', handleRoleChange);
    
    return () => {
      window.removeEventListener('roleViewChanged', handleRoleChange);
    };
  }, [userRole]);

  const handleEndRoleView = () => {
    localStorage.removeItem('devViewRole');
    setCurrentViewRole(null);
    setShowBanner(false);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('roleViewChanged', { 
      detail: { newRole: userRole, actualRole: userRole } 
    }));
  };

  if (!showBanner || !currentViewRole) {
    return null;
  }

  return (
    <Collapse in={showBanner}>
      <Alert 
        severity="warning" 
        sx={{ 
          borderRadius: 0,
          '& .MuiAlert-message': { width: '100%' }
        }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleEndRoleView}
              variant="outlined"
            >
              End Role View
            </Button>
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setShowBanner(false)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {ROLE_DISPLAY[currentViewRole]?.icon}
          Now viewing as {ROLE_DISPLAY[currentViewRole]?.label}
        </AlertTitle>
        You are currently experiencing the application from a {ROLE_DISPLAY[currentViewRole]?.label.toLowerCase()}&apos;s 
        perspective. Navigation and features are adjusted accordingly.
      </Alert>
    </Collapse>
  );
}