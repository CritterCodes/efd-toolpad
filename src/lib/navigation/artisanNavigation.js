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
import ChecklistIcon from '@mui/icons-material/Checklist';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
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
    // What the artisan OWES, as against Payroll (what they're owed). Shown to every artisan, not
    // gated on a capability: any artisan can incur a casting or work-order bill, and an overdue one
    // pauses their new work — so the page that explains and clears it must always be reachable.
    segment: 'dashboard/artisan/invoices',
    title: 'My Invoices',
    icon: <ReceiptLongIcon />,
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

  // Outbound coordination — the API behind it admits receiving OR closeoutBilling.
  if (caps.receiving === true || caps.closeoutBilling === true) {
    items.push({
      segment: 'dashboard/repairs/shipping',
      title: 'Shipping & Delivery',
      icon: <LocalShippingIcon />,
    });
  }

  // QC lives on the Move surface (/dashboard/repairs/quality-control just redirects there). That page
  // ALREADY admits onsite repair-ops by its own guard, but no artisan navigation item pointed at it, so
  // it was a room with no door: capable staff could only reach QC by typing the URL. Entry is gated on
  // repairOps to match the page guard; the individual destinations carry their own capability checks
  // (benchWork to send INTO QC, qualityControl to complete OUT of it), so a repairOps-only user gets a
  // working page with a correspondingly shorter status list rather than buttons that 403.
  items.push({
    segment: 'dashboard/repairs/move',
    title: 'Move & QC',
    icon: <ChecklistIcon />,
  });

  // Payment & Pickup: match the rule the page (canAccessCloseout) and the /api/repair-invoices/* action
  // routes enforce — closeoutBilling OR qualityControl. Gating the LINK on closeoutBilling alone left
  // anyone holding only qualityControl authorized by the API but unable to navigate there. (Reopen is
  // the lone admin-only action on that page; the page hides it from non-admins.)
  if (caps.closeoutBilling === true || caps.qualityControl === true) {
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
      // Customs: full visibility of orders the artisan is ASSIGNED to (owner, 2026-07-22);
      // the customs APIs scope the list + reads by assignments.userID.
      { segment: 'dashboard/customs', title: 'My Customs', icon: <WorkIcon /> },
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
