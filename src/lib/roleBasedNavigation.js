/**
 * Role-Based Navigation System
 * Defines navigation menus for different user roles and includes role switching for devs/admins
 */
import { USER_ROLES } from './unifiedUserService';
import { generateArtisanNavigation } from './navigation/artisanNavigation';
import { wholesalerNavigation } from './navigation/wholesalerNavigation';
import { artisanApplicantNavigation } from './navigation/artisanApplicantNavigation';
import { artisanNavigationConfig } from './navigation/artisanNavigationConfig';
import { affiliateNavigation } from './navigation/affiliateNavigation';
import { staffNavigation } from './navigation/staffNavigation';
import { devNavigation } from './navigation/devNavigation';
import { adminNavigation } from './navigation/adminNavigation';

export const ROLE_NAVIGATION = {
  ...wholesalerNavigation,
  ...artisanApplicantNavigation,
  ...artisanNavigationConfig,
  ...affiliateNavigation,
  ...staffNavigation,
  ...devNavigation,
  ...adminNavigation
};

/**
 * Get navigation for a specific user role
 */
export function getNavigationForRole(userRole, artisanTypes = []) {
  console.log('� [NAV] getNavigationForRole called with:', { userRole, artisanTypes });
  
  // CLIENT role should not have access to admin panel
  if (userRole === USER_ROLES.CLIENT) {
    return [];
  }

  // For artisan roles, use dynamic navigation based on artisan types
  if (userRole === USER_ROLES.ARTISAN) {
    const navigation = generateArtisanNavigation(artisanTypes);
    console.log('� [NAV] Generated artisan navigation:', navigation);
    return navigation;
  }

  const staticNavigation = ROLE_NAVIGATION[userRole] || [];
  console.log('� [NAV] Using static navigation for role:', userRole, staticNavigation);
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
    USER_ROLES.AFFILIATE,
    USER_ROLES.STAFF,
    USER_ROLES.DEV,
    USER_ROLES.ADMIN
  ];
}

export { generateArtisanNavigation };
