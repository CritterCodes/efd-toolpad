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
import DiamondIcon from "@mui/icons-material/Diamond";
import RingIcon from "@mui/icons-material/Circle";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import { USER_ROLES } from './unifiedUserService.js';

// Base navigation items shared across roles
const SHARED_NAVIGATION = {
  dashboard: {
    segment: 'dashboard',
    title: 'Dashboard',
    icon: <DashboardIcon />
  }
};

// Artisan type to navigation mapping
const ARTISAN_TYPE_NAVIGATION = {
  'Jeweler': [
    {
      segment: 'jewelry',
      title: 'Jewelry',
      icon: <RingIcon />
    },
    {
      segment: 'cad-design',
      title: 'CAD Design',
      icon: <DesignServicesIcon />
    }
  ],
  'Gem Cutter': [
    {
      segment: 'gemstones',
      title: 'Gemstones',
      icon: <DiamondIcon />
    }
  ],
};

// Requests navigation for artisans
const ARTISAN_REQUESTS_NAVIGATION = {
  'CAD Designer': [
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
  ],
  'Jeweler': [
    {
      segment: 'custom-tickets',
      title: 'Custom Tickets',
      icon: <ReceiptIcon />
    }
  ],
  'Gem Cutter': [
    {
      segment: 'custom-tickets',
      title: 'Custom Tickets',
      icon: <ReceiptIcon />
    }
  ],
  'Hand Engraver': [
    {
      segment: 'custom-tickets',
      title: 'Custom Tickets',
      icon: <ReceiptIcon />
    }
  ]
};

/**
 * Generate dynamic artisan navigation based on artisan types
 * @param {Array} artisanTypes - Array of artisan types for the user
 * @returns {Array} Navigation items specific to the artisan's capabilities
 */
export function generateArtisanNavigation(artisanTypes = []) {
  console.log('🏗️ [NAV] Generating artisan navigation for types:', artisanTypes);
  
  const baseNavigation = [
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
  ];

  // Add Products dropdown if artisan has any product types
  if (artisanTypes && artisanTypes.length > 0) {
    const productChildren = [];
    
    // Add navigation items based on artisan types
    artisanTypes.forEach(type => {
      console.log('🔍 [NAV] Processing artisan type:', type);
      const typeNavigation = ARTISAN_TYPE_NAVIGATION[type];
      console.log('🔍 [NAV] Found navigation for type:', type, typeNavigation);
      if (typeNavigation) {
        productChildren.push(...typeNavigation);
      }
    });

    console.log('📦 [NAV] Product children:', productChildren);
    
    // Only add Products dropdown if we have children
    if (productChildren.length > 0) {
      const productsDropdown = {
        segment: 'dashboard/products',
        title: 'Products',
        icon: <InventoryIcon />,
        children: productChildren
      };
      
      console.log('✅ [NAV] Adding Products dropdown:', productsDropdown);
      baseNavigation.push(productsDropdown);
    }

    // Add Requests dropdown
    const requestsChildren = [];
    artisanTypes.forEach(type => {
      const requestsNavigation = ARTISAN_REQUESTS_NAVIGATION[type];
      if (requestsNavigation) {
        requestsNavigation.forEach(request => {
          // Avoid duplicates
          if (!requestsChildren.find(r => r.segment === request.segment)) {
            requestsChildren.push(request);
          }
        });
      }
    });

    if (requestsChildren.length > 0) {
      const requestsDropdown = {
        segment: 'dashboard/requests',
        title: 'Requests',
        icon: <AssignmentIcon />,
        children: requestsChildren
      };
      
      console.log('✅ [NAV] Adding Requests dropdown:', requestsDropdown);
      baseNavigation.push(requestsDropdown);
    }
  }

  console.log('🏁 [NAV] Final navigation:', baseNavigation);
  return baseNavigation;
}

// Role-specific navigation configurations
export const ROLE_NAVIGATION = {
  
  // WHOLESALER - Enhanced repair management with structured navigation
  [USER_ROLES.WHOLESALER]: [
    SHARED_NAVIGATION.dashboard,
    {
      segment: 'dashboard/repairs',
      title: 'Repairs',
      icon: <BuildIcon />,
      children: [
        {
          segment: 'new',
          title: 'Create Repair',
          icon: <BuildIcon />
        },
        {
          segment: 'current',
          title: 'Current Repairs',
          icon: <ListIcon />
        },
        {
          segment: 'completed',
          title: 'Completed Repairs',
          icon: <QualityIcon />
        }
      ]
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
        }
      ]
    },
    {
      segment: 'dashboard/requests',
      title: 'Requests',
      icon: <AssignmentIcon />,
      children: [
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

/**
 * Get navigation for a specific user role
 */
export function getNavigationForRole(userRole, artisanTypes = []) {
  console.log('🔍 [NAV] getNavigationForRole called with:', { userRole, artisanTypes });
  
  // CLIENT role should not have access to admin panel
  if (userRole === USER_ROLES.CLIENT) {
    return [];
  }
  
  // For artisan roles, use dynamic navigation based on artisan types
  if (userRole === USER_ROLES.ARTISAN) {
    const navigation = generateArtisanNavigation(artisanTypes);
    console.log('🎯 [NAV] Generated artisan navigation:', navigation);
    return navigation;
  }
  
  const staticNavigation = ROLE_NAVIGATION[userRole] || [];
  console.log('📋 [NAV] Using static navigation for role:', userRole, staticNavigation);
  return staticNavigation;
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