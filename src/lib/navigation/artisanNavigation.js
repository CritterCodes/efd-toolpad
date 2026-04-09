import React from 'react';
import { USER_ROLES } from '../unifiedUserService';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { SHARED_NAVIGATION } from './sharedNavigation';

export const artisanNavigation = {
  [USER_ROLES.ARTISAN]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/profile',
      title: 'Profile Management',
      icon: <PersonIcon />
    },
    {
      segment: 'dashboard/gallery',
      title: 'Gallery Management',
      icon: <PhotoLibraryIcon />
    }
  ]
};

export function generateArtisanNavigation(artisanTypes = []) {
  return artisanNavigation[USER_ROLES.ARTISAN] || [];
}
