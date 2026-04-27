import React from 'react';
import { USER_ROLES } from '../unifiedUserService';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import LinkIcon from '@mui/icons-material/Link';
import HandymanIcon from '@mui/icons-material/Handyman';
import InboxIcon from '@mui/icons-material/Inbox';
import WorkIcon from '@mui/icons-material/Work';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SHARED_NAVIGATION } from './sharedNavigation';

const BASE_ARTISAN_NAV = [
  SHARED_NAVIGATION.dashboard,
  {
    segment: 'dashboard/profile',
    title: 'Profile Management',
    icon: <PersonIcon />,
  },
  {
    segment: 'dashboard/gallery',
    title: 'Gallery Management',
    icon: <PhotoLibraryIcon />,
  },
  {
    segment: 'dashboard/artisan/affiliate',
    title: 'Affiliate',
    icon: <LinkIcon />,
  },
];

function buildRepairOpsNav(caps = {}) {
  const children = [
    { segment: 'receiving', title: 'Receiving', icon: <InboxIcon /> },
    { segment: 'my-bench', title: 'My Bench', icon: <WorkIcon /> },
    { segment: 'ready-for-work', title: 'Ready for Work', icon: <HandymanIcon /> },
    { segment: 'parts', title: 'Parts', icon: <CategoryIcon /> },
  ];

  children.push({ segment: 'completed', title: 'Completed', icon: <CheckCircleIcon /> });
  if (caps.closeoutBilling === true) {
    children.push({ segment: 'pick-up', title: 'Payment & Pickup', icon: <CheckCircleIcon /> });
  }

  return {
    segment: 'dashboard/repairs',
    title: 'Repairs',
    icon: <HandymanIcon />,
    children,
  };
}

export const artisanNavigation = {
  [USER_ROLES.ARTISAN]: BASE_ARTISAN_NAV,
};

export function generateArtisanNavigation(artisanTypes = [], staffCapabilities = null, employment = null) {
  const base = [...BASE_ARTISAN_NAV];

  const isOnsiteRepairOps =
    employment?.isOnsite === true &&
    staffCapabilities?.repairOps === true;

  if (isOnsiteRepairOps) {
    base.push(buildRepairOpsNav(staffCapabilities));
    base.push({
      segment: '/dashboard/repairs/move?mode=scan',
      title: 'Scan Ticket',
      icon: <QrCodeScannerIcon />,
    });
  }

  return base;
}
