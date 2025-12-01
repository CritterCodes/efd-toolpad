/**
 * User Roles and Artisan Types Constants
 * Centralized definitions for all user roles and artisan type categories
 */

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  SENIOR_ARTISAN: 'senior-artisan',
  ARTISAN: 'artisan',
  WHOLESALER: 'wholesaler',
  CUSTOMER: 'customer'
};

// Artisan Types/Categories
export const ARTISAN_TYPES = {
  JEWELRY: 'jewelry',
  GEMSTONE: 'gemstone',
  CUSTOM_DESIGN: 'custom-design',
  REPAIRS: 'repairs',
  CAD_DESIGN: 'cad-design',
  WHOLESALE: 'wholesale'
};

// Role Hierarchy (for permission checks)
export const ROLE_HIERARCHY = {
  [USER_ROLES.ADMIN]: 4,
  [USER_ROLES.SENIOR_ARTISAN]: 3,
  [USER_ROLES.ARTISAN]: 2,
  [USER_ROLES.WHOLESALER]: 1,
  [USER_ROLES.CUSTOMER]: 0
};

// Permission Groups by Role
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    canApproveProducts: true,
    canRejectProducts: true,
    canPublishProducts: true,
    canCreateCollections: true,
    canDeleteCollections: true,
    canManageDrops: true,
    canViewAllProducts: true,
    canViewAllCollections: true,
    canViewAllDrops: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canExportData: true
  },
  [USER_ROLES.SENIOR_ARTISAN]: {
    canApproveProducts: false,
    canRejectProducts: false,
    canPublishProducts: false,
    canCreateCollections: true,
    canDeleteCollections: false,
    canManageDrops: false,
    canViewAllProducts: false,
    canViewAllCollections: false,
    canViewAllDrops: true,
    canManageUsers: false,
    canViewAnalytics: true,
    canExportData: false
  },
  [USER_ROLES.ARTISAN]: {
    canApproveProducts: false,
    canRejectProducts: false,
    canPublishProducts: false,
    canCreateCollections: true,
    canDeleteCollections: false,
    canManageDrops: false,
    canViewAllProducts: false,
    canViewAllCollections: false,
    canViewAllDrops: true,
    canManageUsers: false,
    canViewAnalytics: false,
    canExportData: false
  },
  [USER_ROLES.WHOLESALER]: {
    canApproveProducts: false,
    canRejectProducts: false,
    canPublishProducts: false,
    canCreateCollections: false,
    canDeleteCollections: false,
    canManageDrops: false,
    canViewAllProducts: true,
    canViewAllCollections: true,
    canViewAllDrops: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canExportData: true
  }
};

// Dashboard Sections by Role
export const DASHBOARD_SECTIONS = {
  [USER_ROLES.ADMIN]: [
    { id: 'overview', label: 'Overview', icon: '📊', url: '/dashboard/admin/overview' },
    { id: 'pending-approval', label: 'Pending Approval', icon: '⏳', url: '/dashboard/admin/pending-approval', badge: 'count' },
    { id: 'products', label: 'Products', icon: '💎', url: '/dashboard/admin/products' },
    { id: 'cad-requests', label: 'CAD Requests', icon: '🎨', url: '/dashboard/requests/cad-requests' },
    { id: 'collections', label: 'Collections', icon: '📚', url: '/dashboard/admin/collections' },
    { id: 'drops', label: 'Drop Orchestration', icon: '🎯', url: '/dashboard/admin/drops' },
    { id: 'artisans', label: 'Artisan Management', icon: '👥', url: '/dashboard/admin/artisans' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', url: '/dashboard/admin/notifications', badge: 'count' },
    { id: 'analytics', label: 'Analytics', icon: '📈', url: '/dashboard/admin/analytics' }
  ],
  [USER_ROLES.SENIOR_ARTISAN]: [
    { id: 'overview', label: 'Dashboard', icon: '📊', url: '/dashboard/artisan/overview' },
    { id: 'products', label: 'My Products', icon: '💎', url: '/dashboard/artisan/products' },
    { id: 'collections', label: 'Collections', icon: '📚', url: '/dashboard/artisan/collections' },
    { id: 'drops', label: 'Drop Opportunities', icon: '🎯', url: '/dashboard/artisan/drops' },
    { id: 'submissions', label: 'Drop Submissions', icon: '📤', url: '/dashboard/artisan/submissions' },
    { id: 'earnings', label: 'Earnings', icon: '💰', url: '/dashboard/artisan/earnings' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', url: '/dashboard/artisan/notifications', badge: 'count' },
    { id: 'analytics', label: 'Analytics', icon: '📈', url: '/dashboard/artisan/analytics' }
  ],
  [USER_ROLES.ARTISAN]: [
    { id: 'overview', label: 'Dashboard', icon: '📊', url: '/dashboard/artisan/overview' },
    { id: 'products', label: 'My Products', icon: '💎', url: '/dashboard/artisan/products' },
    { id: 'collections', label: 'Collections', icon: '📚', url: '/dashboard/artisan/collections' },
    { id: 'drops', label: 'Drop Opportunities', icon: '🎯', url: '/dashboard/artisan/drops' },
    { id: 'submissions', label: 'Drop Submissions', icon: '📤', url: '/dashboard/artisan/submissions' },
    { id: 'earnings', label: 'Earnings', icon: '💰', url: '/dashboard/artisan/earnings' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', url: '/dashboard/artisan/notifications', badge: 'count' }
  ],
  [USER_ROLES.WHOLESALER]: [
    { id: 'overview', label: 'Dashboard', icon: '📊', url: '/dashboard/wholesaler/overview' },
    { id: 'products', label: 'Product Catalog', icon: '💎', url: '/dashboard/wholesaler/products' },
    { id: 'collections', label: 'Collections', icon: '📚', url: '/dashboard/wholesaler/collections' },
    { id: 'orders', label: 'My Orders', icon: '📦', url: '/dashboard/wholesaler/orders' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', url: '/dashboard/wholesaler/notifications', badge: 'count' }
  ]
};

// Product Statuses
export const PRODUCT_STATUSES = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending-approval',
  APPROVED: 'approved',
  REVISION_REQUESTED: 'revision-requested',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
};

// Collection Types
export const COLLECTION_TYPES = {
  CURATED: 'curated',
  ARTISAN: 'artisan',
  DROP: 'drop',
  SEASONAL: 'seasonal'
};

// Drop Statuses
export const DROP_STATUSES = {
  DRAFT: 'draft',
  OPEN: 'open',
  CLOSED: 'closed',
  IN_REVIEW: 'in-review',
  COMPLETED: 'completed'
};

// Notification Channels
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  IN_APP: 'in-app',
  PUSH: 'push'
};

// Role-Friendly Labels
export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.SENIOR_ARTISAN]: 'Senior Artisan',
  [USER_ROLES.ARTISAN]: 'Artisan',
  [USER_ROLES.WHOLESALER]: 'Wholesaler',
  [USER_ROLES.CUSTOMER]: 'Customer'
};

// Artisan Type Labels
export const ARTISAN_TYPE_LABELS = {
  [ARTISAN_TYPES.JEWELRY]: 'Jewelry',
  [ARTISAN_TYPES.GEMSTONE]: 'Gemstone',
  [ARTISAN_TYPES.CUSTOM_DESIGN]: 'Custom Design',
  [ARTISAN_TYPES.REPAIRS]: 'Repairs',
  [ARTISAN_TYPES.CAD_DESIGN]: 'CAD Design',
  [ARTISAN_TYPES.WHOLESALE]: 'Wholesale'
};

// Status Colors for UI
export const STATUS_COLORS = {
  [PRODUCT_STATUSES.DRAFT]: 'gray',
  [PRODUCT_STATUSES.PENDING_APPROVAL]: 'yellow',
  [PRODUCT_STATUSES.APPROVED]: 'blue',
  [PRODUCT_STATUSES.REVISION_REQUESTED]: 'orange',
  [PRODUCT_STATUSES.PUBLISHED]: 'green',
  [PRODUCT_STATUSES.REJECTED]: 'red',
  [PRODUCT_STATUSES.ARCHIVED]: 'slate',
  [DROP_STATUSES.DRAFT]: 'gray',
  [DROP_STATUSES.OPEN]: 'green',
  [DROP_STATUSES.CLOSED]: 'red',
  [DROP_STATUSES.IN_REVIEW]: 'yellow',
  [DROP_STATUSES.COMPLETED]: 'blue'
};

// Helper Functions
export const getRoleLabel = (role) => ROLE_LABELS[role] || 'Unknown Role';
export const getArtisanTypeLabel = (type) => ARTISAN_TYPE_LABELS[type] || type;
export const getRoleHierarchyLevel = (role) => ROLE_HIERARCHY[role] || -1;
export const canUserDoAction = (userRole, action) => {
  const permissions = ROLE_PERMISSIONS[userRole] || {};
  return permissions[action] || false;
};
export const getDashboardSections = (role) => DASHBOARD_SECTIONS[role] || [];
export const getStatusColor = (status) => STATUS_COLORS[status] || 'gray';
