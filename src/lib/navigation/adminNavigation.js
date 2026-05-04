import React from "react";
import { USER_ROLES } from "../unifiedUserService";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Handyman";
import BarChartIcon from "@mui/icons-material/Insights";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory2";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SettingsIcon from "@mui/icons-material/Settings";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HandymanIcon from "@mui/icons-material/Handyman";
import ListIcon from "@mui/icons-material/List";
import PickupIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import DiamondIcon from "@mui/icons-material/AutoAwesome";
import RingIcon from "@mui/icons-material/FiberSmartRecord";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import LeadsIcon from "@mui/icons-material/ChatBubbleOutline";
import LinkIcon from "@mui/icons-material/Link";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";

import { SHARED_NAVIGATION } from "./sharedNavigation";

export const adminNavigation = {
  [USER_ROLES.ADMIN]: [
    SHARED_NAVIGATION.dashboard,
    { kind: 'header', title: 'Commerce' },
    {
      segment: 'dashboard/products',
      title: 'Products',
      icon: <InventoryIcon />,
      children: [
        {
          segment: 'jewelry',
          title: 'Jewelry',
          icon: <RingIcon />
        },
        {
          segment: 'gemstones',
          title: 'Gemstones',
          icon: <DiamondIcon />
        },
        {
          segment: 'awaiting-approval',
          title: 'Awaiting Approval',
          icon: <AssignmentIcon />
        }
      ]
    },
    {
      segment: 'dashboard/clients',
      title: 'Clients',
      icon: <PeopleIcon />
    },
    {
      segment: 'dashboard/requests',
      title: 'Requests',
      icon: <AssignmentIcon />,
      children: [
        {
          segment: 'cad-requests',
          title: 'CAD Requests',
          icon: <DesignServicesIcon />
        },
        {
          segment: 'custom-tickets',
          title: 'Custom Tickets',
          icon: <ReceiptIcon />
        }
      ]
    },
    { kind: 'header', title: 'Repair Work' },
    {
      segment: 'dashboard/repairs/my-bench',
      title: 'My Bench',
      icon: <BuildIcon />
    },
    {
      segment: 'dashboard/repairs/pick-up',
      title: 'Payment & Pickup',
      icon: <PickupIcon />
    },
    {
      segment: 'dashboard/repairs/leads',
      title: 'Leads',
      icon: <LeadsIcon />
    },
    {
      segment: 'dashboard/repairs/pending-wholesale',
      title: 'Wholesale Pickup',
      icon: <NotificationsActiveIcon />
    },
    { kind: 'header', title: 'Administration' },
    {
      segment: 'dashboard/users',
      title: 'User Management',
      icon: <PeopleIcon />,
      children: [
        {
          segment: 'admin',
          title: 'Administrators',
          icon: <SettingsIcon />
        },
        {
          segment: 'developers',
          title: 'Developers',
          icon: <BuildIcon />
        },
        {
          segment: 'wholesalers',
          title: 'Wholesalers',
          icon: <StorefrontIcon />
        },
        {
          segment: '/dashboard/admin/artisans',
          title: 'Artisan Applications',
          icon: <AssignmentIcon />
        },
        {
          segment: 'artisans',
          title: 'Artisans',
          icon: <HandymanIcon />
        }
      ]
    },
    {
      segment: 'dashboard/repairs',
      title: 'Repair Admin',
      icon: <ReceiptIcon />,
      children: [
        {
          segment: 'labor-review',
          title: 'Labor Review',
          icon: <ReceiptIcon />
        },
        {
          segment: 'payroll',
          title: 'Payroll',
          icon: <PaymentIcon />
        }
      ]
    },
    {
      segment: 'dashboard/admin/tasks',
      title: 'Tasks',
      icon: <HandymanIcon />,
      children: [
        {
          segment: '',
          title: 'Tasks',
          icon: <ListIcon />
        },
        {
          segment: 'tools-machinery',
          title: 'Tools & Machinery',
          icon: <HandymanIcon />
        },
        {
          segment: 'materials',
          title: 'Materials',
          icon: <InventoryIcon />
        },
        // {
        //   segment: 'processes',
        //   title: 'Processes',
        //   icon: <SettingsIcon />
        // }
      ]
    },
    {
      segment: 'dashboard/admin/affiliates',
      title: 'Affiliates',
      icon: <LinkIcon />
    },
    {
      segment: 'dashboard/admin/wholesale-acquisition',
      title: 'Wholesale Acquisition',
      icon: <TravelExploreIcon />
    },
    { kind: 'header', title: 'Finance & Analytics' },
    {
      segment: 'dashboard/finance',
      title: 'Finance',
      icon: <AccountBalanceWalletIcon />,
      children: [
        {
          segment: '',
          title: 'Overview',
          icon: <AccountBalanceWalletIcon />
        },
        {
          segment: 'expenses',
          title: 'Expenses',
          icon: <ReceiptIcon />
        },
        {
          segment: 'inventory',
          title: 'Inventory',
          icon: <InventoryIcon />
        },
        {
          segment: '/dashboard/admin/stuller',
          title: 'Stuller',
          icon: <InventoryIcon />
        },
        {
          segment: 'payroll',
          title: 'Payroll',
          icon: <PaymentIcon />
        },
        {
          segment: 'owner-draws',
          title: 'Owner Draws',
          icon: <PaymentIcon />
        },
        {
          segment: 'tax-reserve',
          title: 'Tax Reserve',
          icon: <BarChartIcon />
        }
      ]
    },
    {
      segment: 'dashboard/analytics',
      title: 'Analytics',
      icon: <BarChartIcon />,
      children: [
        {
          segment: '',
          title: 'Dash',
          icon: <BarChartIcon />
        },
        {
          segment: 'reports',
          title: 'Reports',
          icon: <ReceiptIcon />
        }
      ]
    },
    {
      segment: 'dashboard/admin/settings',
      title: 'Admin Settings',
      icon: <SettingsIcon />
    }
  ]
};
