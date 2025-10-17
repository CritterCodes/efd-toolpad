/**
 * Role-Based Navigation System
 * Defines navigation menus for different user roles and includes role switching for devs/admins
 */

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
import PrintIcon from "@mui/icons-material/Print";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import PersonIcon from "@mui/icons-material/Person";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { USER_ROLES } from './unifiedUserService.js';

// Base navigation items shared across roles
const SHARED_NAVIGATION = {
  dashboard: {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />
  }
};

// Role-specific navigation configurations
export const ROLE_NAVIGATION = {
  
  // WHOLESALER - Focused on orders and inventory
  [USER_ROLES.WHOLESALER]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/orders',
      title: 'My Orders',
      icon: <ShoppingBagIcon />
    },
    {
      segment: 'dashboard/wholesale',
      title: 'Wholesale Catalog',
      icon: <StorefrontIcon />
    },
    {
      segment: 'dashboard/analytics',
      title: 'Order Analytics',
      icon: <BarChartIcon />
    },
    {
      segment: 'dashboard/profile',
      title: 'Profile',
      icon: <PersonIcon />
    }
  ],

  // ARTISAN APPLICANT - Limited access while pending approval
  [USER_ROLES.ARTISAN_APPLICANT]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/application',
      title: 'Application Status',
      icon: <RequestQuoteIcon />
    },
    {
      segment: 'dashboard/profile',
      title: 'Profile',
      icon: <PersonIcon />
    }
  ],

  // ARTISAN - Artist profile management and shop presence
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
  ],

  // STAFF - Full operational access
  [USER_ROLES.STAFF]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/clients',
      title: 'Clients',
      icon: <PeopleIcon />
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
      segment: 'dashboard/users/artisans',
      title: 'Artisan Management',
      icon: <HandymanIcon />
    },
    {
      segment: 'dashboard/custom-tickets',
      title: 'Custom Tickets',
      icon: <ReceiptIcon />
    },
    {
      segment: 'dashboard/analytics',
      title: 'Analytics',
      icon: <BarChartIcon />
    }
  ],

  // DEV - Full system access with admin capabilities
  [USER_ROLES.DEV]: [
    SHARED_NAVIGATION.dashboard,
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
          segment: '',
          title: 'Tasks',
          icon: <BuildIcon />
        },
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
      segment: 'dashboard/custom-tickets',
      title: 'Custom Tickets',
      icon: <ReceiptIcon />
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
  ],

  // ADMIN - Full system access
  [USER_ROLES.ADMIN]: [
    SHARED_NAVIGATION.dashboard,
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
          segment: '',
          title: 'Tasks',
          icon: <BuildIcon />
        },
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
      segment: 'dashboard/custom-tickets',
      title: 'Custom Tickets',
      icon: <ReceiptIcon />
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

/**
 * Get navigation for a specific user role
 */
export function getNavigationForRole(userRole) {
  // CLIENT role should not have access to admin panel
  if (userRole === USER_ROLES.CLIENT) {
    return [];
  }
  
  return ROLE_NAVIGATION[userRole] || [];
}

/**
 * Check if a user can access the admin system
 */
export function canAccessAdmin(userRole) {
  return userRole !== USER_ROLES.CLIENT;
}

/**
 * Get the effective role for navigation (considers role view switching)
 * This function should be used instead of directly accessing session.user.role
 */
export function getEffectiveRole(actualRole) {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return actualRole;
  }
  
  // Check for stored role view
  const storedRole = localStorage.getItem('devViewRole');
  
  // Return stored role if it exists and is different from actual role
  if (storedRole && storedRole !== actualRole) {
    return storedRole;
  }
  
  return actualRole;
}

/**
 * Get available roles for dev/admin role switching
 */
export function getAvailableRolesForSwitching(currentUserRole) {
  if (currentUserRole !== USER_ROLES.DEV && currentUserRole !== USER_ROLES.ADMIN) {
    return [];
  }
  
  // Devs and admins can switch to any role except client
  return [
    USER_ROLES.WHOLESALER,
    USER_ROLES.ARTISAN_APPLICANT,
    USER_ROLES.ARTISAN,
    USER_ROLES.STAFF,
    USER_ROLES.DEV,
    USER_ROLES.ADMIN
  ];
}