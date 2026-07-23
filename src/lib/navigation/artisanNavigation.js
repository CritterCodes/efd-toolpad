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
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { SHARED_NAVIGATION } from './sharedNavigation';
import { normalizeArtisanType, ARTISAN_TYPE } from '@/lib/artisans';

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
  {
    segment: 'dashboard/artisan/my-work',
    title: 'My Work',
    icon: <WorkHistoryIcon />,
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

// Artisan types that can author designs (owner's matrix, 2026-07-22): gem cutters author
// gemstone designs; jewelers/engravers/CAD designers author jewelry. Any of them gets the
// Designs section — the API scopes what they can actually create/see.
const DESIGNER_TYPES = [
  ARTISAN_TYPE.JEWELER,
  ARTISAN_TYPE.ENGRAVER,
  ARTISAN_TYPE.CAD_DESIGNER,
  ARTISAN_TYPE.DESIGNER,
  ARTISAN_TYPE.GEM_CUTTER,
];

export function generateArtisanNavigation(artisanTypes = [], staffCapabilities = null, employment = null) {
  const base = [...BASE_ARTISAN_NAV];

  const types = (Array.isArray(artisanTypes) ? artisanTypes : []).map(normalizeArtisanType);
  if (types.some((t) => DESIGNER_TYPES.includes(t))) {
    base.push(
      { kind: 'header', title: 'Designs' },
      { segment: 'dashboard/artisan/designs', title: 'My Designs', icon: <DesignServicesIcon /> },
      // The drops surface is role-agnostic — the drops APIs scope artisans to drops they own or
      // collaborate on, and force artisan creations self-owned + draft (releasing stays with EFD).
      { segment: 'dashboard/products/drops', title: 'My Drops', icon: <RocketLaunchIcon /> },
    );
  }

  const isOnsiteRepairOps =
    employment?.isOnsite === true &&
    staffCapabilities?.repairOps === true;

  if (isOnsiteRepairOps) {
    base.push(...buildRepairOpsNavItems(staffCapabilities));
  }

  return base;
}
