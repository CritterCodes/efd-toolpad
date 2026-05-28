import React from 'react';
import { USER_ROLES } from '../unifiedUserService';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import LinkIcon from '@mui/icons-material/Link';
import WorkIcon from '@mui/icons-material/Work';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import AddIcon from '@mui/icons-material/Add';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { SHARED_NAVIGATION } from './sharedNavigation';

const BASE_ARTISAN_NAV = [
  SHARED_NAVIGATION.dashboard,
  { kind: 'header', title: 'Studio' },
  {
    segment: 'dashboard/profile',
    title: 'Profile',
    icon: <PersonIcon />,
  },
  {
    segment: 'dashboard/gallery',
    title: 'Gallery',
    icon: <PhotoLibraryIcon />,
  },
  {
    segment: 'dashboard/artisan/affiliate',
    title: 'Affiliate',
    icon: <LinkIcon />,
  },
  { kind: 'header', title: 'Finance' },
  {
    segment: 'dashboard/artisan/payroll',
    title: 'Payroll',
    icon: <PaymentIcon />,
  },
];

function buildRepairOpsNavItems(caps = {}) {
  const items = [
    { kind: 'header', title: 'Commerce' },
  ];

  if (caps.repairOps === true || caps.closeoutBilling === true) {
    items.push({
      segment: 'dashboard/commerce/sales-invoices',
      title: 'Sales Invoices',
      icon: <PointOfSaleIcon />,
    });
  }

  items.push(
    { kind: 'header', title: 'Repair Work' },
    { segment: 'dashboard/repairs/new', title: 'New Repair', icon: <AddIcon /> },
    { segment: 'dashboard/repairs/my-bench', title: 'My Bench', icon: <WorkIcon /> },
    { segment: 'dashboard/artisan/my-work', title: 'My Work', icon: <WorkHistoryIcon /> },
  );

  if (caps.receiving === true) {
    items.push({
      segment: 'dashboard/repairs/pending-wholesale',
      title: 'Wholesale Pickup',
      icon: <NotificationsActiveIcon />,
    });
  }

  if (caps.closeoutBilling === true) {
    items.push({
      segment: 'dashboard/repairs/pick-up',
      title: 'Payment & Pickup',
      icon: <LocalShippingIcon />,
    });
  }

  return items;
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
    base.push(...buildRepairOpsNavItems(staffCapabilities));
  }

  return base;
}
