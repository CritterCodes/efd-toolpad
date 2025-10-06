/**
 * Role Switching Component
 * Allows devs and admins to view the dashboard from different role perspectives
 * Now manages its own state using localStorage and window events
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
  Card,
  CardContent,
  Button
} from '@mui/material';
import { 
  AdminPanelSettings as AdminIcon,
  Code as DevIcon,
  People as StaffIcon,
  Handyman as ArtisanIcon,
  RequestQuote as ApplicantIcon,
  Storefront as WholesalerIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { USER_ROLES } from '@/lib/unifiedUserService';
import { getAvailableRolesForSwitching } from '@/lib/roleBasedNavigation';

const ROLE_DISPLAY = {
  [USER_ROLES.WHOLESALER]: {
    label: 'Wholesaler',
    color: 'primary',
    icon: <WholesalerIcon fontSize="small" />
  },
  [USER_ROLES.ARTISAN_APPLICANT]: {
    label: 'Artisan Applicant',
    color: 'warning',
    icon: <ApplicantIcon fontSize="small" />
  },
  [USER_ROLES.ARTISAN]: {
    label: 'Artisan',
    color: 'secondary',
    icon: <ArtisanIcon fontSize="small" />
  },
  [USER_ROLES.STAFF]: {
    label: 'Staff',
    color: 'info',
    icon: <StaffIcon fontSize="small" />
  },
  [USER_ROLES.DEV]: {
    label: 'Developer',
    color: 'success',
    icon: <DevIcon fontSize="small" />
  },
  [USER_ROLES.ADMIN]: {
    label: 'Admin',
    color: 'error',
    icon: <AdminIcon fontSize="small" />
  }
};

export default function RoleSwitcher() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [currentViewRole, setCurrentViewRole] = useState(userRole);
  
  const availableRoles = getAvailableRolesForSwitching(userRole);
  
  // Load saved role from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('devViewRole');
    if (savedRole && availableRoles.includes(savedRole)) {
      setCurrentViewRole(savedRole);
    } else if (userRole) {
      setCurrentViewRole(userRole);
    }
  }, [userRole, availableRoles]);

  // Save role to localStorage and dispatch event when changed
  const handleRoleChange = (newRole) => {
    setCurrentViewRole(newRole);
    
    if (newRole === userRole) {
      // Reset to actual role
      localStorage.removeItem('devViewRole');
    } else {
      // Save the simulated role
      localStorage.setItem('devViewRole', newRole);
    }
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('roleViewChanged', { 
      detail: { newRole, actualRole: userRole } 
    }));
  };

  const handleClearRole = () => {
    handleRoleChange(userRole);
  };

  // Only show role switcher to devs and admins
  if (!availableRoles.length) {
    return null;
  }

  const isViewingAsOtherRole = currentViewRole !== userRole;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6" component="h2">
          Role View Switcher
        </Typography>
        <Chip 
          icon={ROLE_DISPLAY[userRole]?.icon}
          label={`Actual Role: ${ROLE_DISPLAY[userRole]?.label}`}
          color={ROLE_DISPLAY[userRole]?.color}
          variant="outlined"
          size="small"
        />
      </Box>
      
      {isViewingAsOtherRole && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are currently viewing as a <strong>{ROLE_DISPLAY[currentViewRole]?.label}</strong>. 
          This affects navigation and features across the entire application.
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>View Dashboard As</InputLabel>
          <Select
            value={currentViewRole}
            label="View Dashboard As"
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            {availableRoles.map((role) => (
              <MenuItem key={role} value={role}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {ROLE_DISPLAY[role]?.icon}
                  {ROLE_DISPLAY[role]?.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {isViewingAsOtherRole && (
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClearRole}
            size="small"
          >
            Reset to Actual Role
          </Button>
        )}
      </Box>
    </Box>
  );
}