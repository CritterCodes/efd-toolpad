/**
 * Status Mapping Utility
 * Maps internal technical status values to user-friendly display names
 */

export const STATUS_DISPLAY_NAMES = {
  'draft': 'Draft',
  'published': 'Published',
  'archived': 'Archived'
};

export const STATUS_COLORS = {
  'draft': 'default',
  'published': 'success',
  'archived': 'warning'
};

export const APPROVAL_DISPLAY_NAMES = {
  true: 'Approved',
  false: 'Pending Review'
};

export const APPROVAL_COLORS = {
  true: 'success',
  false: 'warning'
};

/**
 * Get display name for a status value
 */
export function getStatusDisplayName(status) {
  return STATUS_DISPLAY_NAMES[status] || status;
}

/**
 * Get color for a status value
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || 'default';
}

/**
 * Format status for display in UI
 */
export function formatStatus(status) {
  return getStatusDisplayName(status);
}
