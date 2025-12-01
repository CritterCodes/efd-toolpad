/**
 * Status Transition Rules for Product Publishing Workflow
 * 
 * Simplified model:
 * - Status: draft, published, archived (what artisans control)
 * - isApproved: true/false (what admins control)
 * 
 * When published with isApproved=false, product needs admin approval
 * Once isApproved=true, it stays approved forever
 */

// All possible status options
const STATUS_OPTIONS = {
  'draft': {
    label: 'Back to Draft',
    description: 'Return to draft (not published)',
    icon: 'Edit'
  },
  'published': {
    label: 'Publish',
    description: 'Make this product live on EFD (will need approval if not already approved)',
    icon: 'CloudUpload'
  },
  'archived': {
    label: 'Archive',
    description: 'Hide from view (keeps approval status)',
    icon: 'Archive'
  }
};

export const VALID_TRANSITIONS = {
  'draft': {
    transitions: Object.entries(STATUS_OPTIONS)
      .filter(([status]) => status !== 'draft')
      .map(([status, config]) => ({
        to: status,
        ...config
      })),
    artisanVisible: true
  },

  'published': {
    transitions: Object.entries(STATUS_OPTIONS)
      .filter(([status]) => status !== 'published')
      .map(([status, config]) => ({
        to: status,
        ...config
      })),
    artisanVisible: true
  },

  'archived': {
    transitions: Object.entries(STATUS_OPTIONS)
      .filter(([status]) => status !== 'archived')
      .map(([status, config]) => ({
        to: status,
        ...config
      })),
    artisanVisible: true
  }
};

/**
 * Get valid transitions for a product's current status
 * @param {string} currentStatus - Current product status
 * @param {object} product - Full product object (for conditional checks)
 * @returns {array} Array of valid transition objects
 */
export function getValidTransitions(currentStatus, product = {}) {
  const transitions = VALID_TRANSITIONS[currentStatus];
  
  if (!transitions) {
    console.warn(`Unknown status: ${currentStatus}`);
    return [];
  }

  return transitions.transitions;
}

/**
 * Check if a transition is valid
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Desired status
 * @returns {boolean} Whether transition is allowed
 */
export function isValidTransition(fromStatus, toStatus) {
  const transitions = VALID_TRANSITIONS[fromStatus];
  if (!transitions) return false;
  return transitions.transitions.some(t => t.to === toStatus);
}

/**
 * Get the transition object for a specific state change
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Desired status
 * @returns {object|null} Transition object or null if invalid
 */
export function getTransition(fromStatus, toStatus) {
  const transitions = VALID_TRANSITIONS[fromStatus];
  if (!transitions) return null;
  return transitions.transitions.find(t => t.to === toStatus) || null;
}

/**
 * All available statuses
 */
export const ALL_STATUSES = [
  'draft',
  'published',
  'archived'
];

/**
 * Status descriptions for UI display
 */
export const STATUS_DESCRIPTIONS = {
  'draft': 'Your product in progress. Not visible on EFD.',
  'published': 'Live on EFD (may need approval if not already approved).',
  'archived': 'Hidden from view, but can be republished anytime.'
};

/**
 * Check if a product needs approval
 * @param {object} product - Product object
 * @returns {boolean} True if product is published but not approved
 */
export function needsApproval(product) {
  return product.status === 'published' && product.isApproved === false;
}

