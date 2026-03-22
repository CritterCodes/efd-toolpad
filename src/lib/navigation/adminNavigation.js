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
import ReceivingIcon from "@mui/icons-material/Inbox";
import MoveUpIcon from "@mui/icons-material/DriveFileMove";
import PickupIcon from "@mui/icons-material/LocalShipping";
import QualityIcon from "@mui/icons-material/VerifiedUser";
import PartsIcon from "@mui/icons-material/Category";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HistoryIcon from "@mui/icons-material/History";
import DiamondIcon from "@mui/icons-material/AutoAwesome";
import RingIcon from "@mui/icons-material/FiberSmartRecord";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import BusinessIcon from "@mui/icons-material/Business";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import PaymentIcon from "@mui/icons-material/Payment";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import PrintIcon from "@mui/icons-material/Print";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";

import { SHARED_NAVIGATION } from "./sharedNavigation";

export const adminNavigation = {
  [USER_ROLES.ADMIN]: [
    SHARED_NAVIGATION.dashboard,
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
    {
      segment: 'dashboard/clients',
      title: 'Clients',
      icon: <PeopleIcon />
    },
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
          segment: 'artisans',
          title: 'Artisans',
          icon: <HandymanIcon />
        }
      ]
    },
    {
      segment: 'dashboard/repairs',
      title: 'Repairs',
      icon: <BuildIcon />,
      children: [
        {
          segment: 'receiving',
          title: 'Receiving',
          icon: <ReceivingIcon />
        },
        {
          segment: 'parts',
          title: 'Parts',
          icon: <PartsIcon />
        },
        {
          segment: 'ready-for-work',
          title: 'Ready for Work',
          icon: <ListIcon />
        },
        {
          segment: 'quality-control',
          title: 'Quality Control',
          icon: <QualityIcon />
        },
        {
          segment: 'pick-up',
          title: 'Payment & Pickup',
          icon: <PickupIcon />
        },
        {
          segment: 'move',
          title: 'Move',
          icon: <MoveUpIcon />
        },
        {
          segment: 'bulk-print',
          title: 'Bulk Print',
          icon: <PrintIcon />
        }
      ]
    },
    {
      segment: 'dashboard/admin/tasks',
      title: 'Tasks',
      icon: <HandymanIcon />,
      children: [
        {
          segment: 'materials',
          title: 'Materials',
          icon: <InventoryIcon />
        },
        {
          segment: 'processes',
          title: 'Processes',
          icon: <SettingsIcon />
        }
      ]
    },
    {
      segment: 'dashboard/analytics',
      title: 'Analytics',
      icon: <BarChartIcon />
    },
    {
      segment: 'dashboard/admin/settings',
      title: 'Admin Settings',
      icon: <SettingsIcon />
    }
  ]
};
