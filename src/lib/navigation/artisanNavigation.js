import React from 'react';
import { USER_ROLES } from '../unifiedUserService';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import LinkIcon from '@mui/icons-material/Link';
import HandymanIcon from '@mui/icons-material/Handyman';
import WorkIcon from '@mui/icons-material/Work';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
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
  {
    segment: 'dashboard/artisan/payroll',
    title: 'Payroll',
    icon: <PaymentIcon />,
  },
];

function buildRepairOpsNav(caps = {}) {
  const children = [
    { segment: 'my-bench', title: 'My Bench', icon: <WorkIcon /> },
  ];

  if (caps.receiving === true) {
    children.push({ segment: 'pending-wholesale', title: 'Wholesale Pickup', icon: <NotificationsActiveIcon /> });
  }

  if (caps.closeoutBilling === true) {
    children.push({ segment: 'pick-up', title: 'Payment & Pickup', icon: <LocalShippingIcon /> });
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
