/**
 * Custom Ticket Status System - Main Export
 * Constitutional modular configuration following 300-line limits
 * 
 * UPDATED: Now imports from master status system for consistency
 */

// Import the master status system
import {
  INTERNAL_STATUSES,
  CLIENT_STATUSES,
  INTERNAL_TO_CLIENT_MAPPING,
  STATUS_DISPLAY_INFO,
  VALID_TRANSITIONS,
  CustomTicketStatusManager
} from './masterStatusSystem.js';

// Export main status definitions
export { INTERNAL_STATUSES };
export { CLIENT_STATUSES };
export { INTERNAL_TO_CLIENT_MAPPING as CLIENT_STATUS_MAPPING };

// Create backwards-compatible exports
export const CLIENT_STATUS_LABELS = Object.fromEntries(
  Object.entries(CLIENT_STATUSES).map(([key, value]) => [
    value, 
    STATUS_DISPLAY_INFO[value]?.label || value
  ])
);

export const CLIENT_STATUS_COLORS = Object.fromEntries(
  Object.entries(CLIENT_STATUSES).map(([key, value]) => [
    value, 
    STATUS_DISPLAY_INFO[value]?.color || 'default'
  ])
);

export const STATUS_DEFINITIONS = Object.fromEntries(
  Object.entries(INTERNAL_STATUSES).map(([key, value]) => [
    value,
    STATUS_DISPLAY_INFO[value] || {}
  ])
);

export const STATUS_CATEGORIES = {
  INITIAL: 'initial',
  DESIGN: 'design',
  QUOTE: 'quote', 
  PAYMENT: 'payment',
  PREPARATION: 'preparation',
  PRODUCTION: 'production',
  COMPLETION: 'completion',
  SPECIAL: 'special'
};

export const WORKFLOW_TRANSITIONS = VALID_TRANSITIONS;

// Helper functions for status management
export const getInternalStatusInfo = (status) => {
  return CustomTicketStatusManager.getDisplayInfo(status, true);
};

export const getClientStatusDisplay = (internalStatus) => {
  const clientStatus = CustomTicketStatusManager.getClientStatus(internalStatus);
  const displayInfo = CustomTicketStatusManager.getDisplayInfo(clientStatus, false);
  return {
    status: clientStatus,
    label: displayInfo?.label || 'Unknown',
    color: displayInfo?.color || 'default'
  };
};

export const getClientStatusInfo = (internalStatus) => {
  return getClientStatusDisplay(internalStatus);
};

export const getNextPossibleStatuses = (currentStatus) => {
  return CustomTicketStatusManager.getNextPossibleStatuses(currentStatus);
};

export const isValidTransition = (fromStatus, toStatus) => {
  return CustomTicketStatusManager.isValidTransition(fromStatus, toStatus);
};

export const isStatusTransitionAllowed = (fromStatus, toStatus) => {
  return isValidTransition(fromStatus, toStatus);
};

export const getAllStatuses = () => {
  return CustomTicketStatusManager.getAllInternalStatuses();
};

export const getStatusesByCategory = (category) => {
  return CustomTicketStatusManager.getStatusesByCategory(category);
};

export const getActionableStatuses = () => {
  return CustomTicketStatusManager.getActionRequiredStatuses();
};

export const getClientVisibleStatuses = () => {
  return Object.entries(STATUS_DEFINITIONS)
    .filter(([_, def]) => !def.internalOnly)
    .map(([status]) => status);
};

// For backwards compatibility - admin interface status options
export const getAdminStatuses = () => {
  return Object.entries(STATUS_DEFINITIONS).map(([value, def]) => ({
    value: value,
    label: def.label,
    category: def.category,
    icon: def.icon,
    color: def.color,
    description: def.description,
    requiresAction: def.requiresAction,
    internalOnly: def.internalOnly
  }));
};

// Re-export for backwards compatibility
export { STATUS_DEFINITIONS as statusDefinitions };
export { STATUS_CATEGORIES as statusCategories };

// Export the main manager class
export { CustomTicketStatusManager };
export default CustomTicketStatusManager;