// User roles and their hierarchy
export const USER_ROLES = {
  CLIENT: 'client',
  WHOLESALER: 'wholesaler',
  ARTISAN_APPLICANT: 'artisan-applicant',
  ARTISAN: 'artisan',
  STAFF: 'staff',
  DEV: 'dev',
  ADMIN: 'admin'
};

// User status values
export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
};

// Authentication providers
export const AUTH_PROVIDERS = {
  GOOGLE: 'google',
  EMAIL: 'email'
};

// Permission definitions for each role
export const ROLE_PERMISSIONS = {
  [USER_ROLES.CLIENT]: {
    efdShop: true,
    efdAdmin: false,
    adminSettings: false,
    userManagement: false,
    orderManagement: false,
    repairManagement: false,
    inventoryManagement: false,
    analyticsView: false
  },
  [USER_ROLES.WHOLESALER]: {
    efdShop: true,
    efdAdmin: true,
    adminSettings: false,
    userManagement: false,
    orderManagement: true,
    repairManagement: false,
    inventoryManagement: true,
    analyticsView: true
  },
  [USER_ROLES.ARTISAN_APPLICANT]: {
    efdShop: true,
    efdAdmin: true,
    adminSettings: false,
    userManagement: false,
    orderManagement: false,
    repairManagement: true,
    inventoryManagement: false,
    analyticsView: false
  },
  [USER_ROLES.ARTISAN]: {
    efdShop: true,
    efdAdmin: true,
    adminSettings: false,
    userManagement: false,
    orderManagement: true,
    repairManagement: true,
    inventoryManagement: true,
    analyticsView: true
  },
  [USER_ROLES.STAFF]: {
    efdShop: false,
    efdAdmin: true,
    adminSettings: false,
    userManagement: true,
    orderManagement: true,
    repairManagement: true,
    inventoryManagement: true,
    analyticsView: true
  },
  [USER_ROLES.DEV]: {
    efdShop: false,
    efdAdmin: true,
    adminSettings: true,
    userManagement: true,
    orderManagement: true,
    repairManagement: true,
    inventoryManagement: true,
    analyticsView: true
  },
  [USER_ROLES.ADMIN]: {
    efdShop: false,
    efdAdmin: true,
    adminSettings: true,
    userManagement: true,
    orderManagement: true,
    repairManagement: true,
    inventoryManagement: true,
    analyticsView: true
  }
};
