import { INTERNAL_STATUSES } from './internalStatuses.config';
import { CLIENT_STATUSES } from './clientStatuses.config';
import { INTERNAL_TO_CLIENT_MAPPING } from './statusMappings.config';
import { STATUS_DISPLAY_INFO } from './statusDisplay.config';
import { VALID_TRANSITIONS } from './statusTransitions.config';

export class CustomTicketStatusManager {
  /**
   * Get display information for any status
   */
  static getDisplayInfo(status, isInternal = true) {
    return STATUS_DISPLAY_INFO[status] || null;
  }

  /**
   * Convert internal status to client-facing status
   */
  static getClientStatus(internalStatus) {
    return INTERNAL_TO_CLIENT_MAPPING[internalStatus] || CLIENT_STATUSES.PENDING_REVIEW;
  }

  /**
   * Get all possible next statuses for a given current status (ENHANCED)
   * This provides more flexible transitions based on phases
   */
  static getNextPossibleStatuses(currentStatus) {
    const currentInfo = STATUS_DISPLAY_INFO[currentStatus];
    if (!currentInfo) return [];

    const currentPhase = currentInfo.category;
    const possibleStatuses = new Set();

    // 1. Add strict workflow transitions (original logic)
    const strictTransitions = VALID_TRANSITIONS[currentStatus] || [];
    strictTransitions.forEach(status => possibleStatuses.add(status));

    // 2. Add all statuses from the current phase
    Object.entries(STATUS_DISPLAY_INFO).forEach(([status, info]) => {
      if (info.category === currentPhase && status !== currentStatus) {
        possibleStatuses.add(status);
      }
    });

    // 3. Add general statuses (always available)
    const generalStatuses = [
      INTERNAL_STATUSES.AWAITING_CLIENT_INFO,
      INTERNAL_STATUSES.ON_HOLD,
      INTERNAL_STATUSES.CANCELLED
    ];
    generalStatuses.forEach(status => possibleStatuses.add(status));

    // 4. Add entry points to next phases
    const phaseEntryPoints = this.getPhaseEntryPoints(currentPhase);
    phaseEntryPoints.forEach(status => possibleStatuses.add(status));

    // 5. Add entry points to previous phases (for flexibility)
    const previousPhaseEntryPoints = this.getPreviousPhaseEntryPoints(currentPhase);
    previousPhaseEntryPoints.forEach(status => possibleStatuses.add(status));

    // Convert back to array and sort logically
    return Array.from(possibleStatuses).sort((a, b) => {
      const aInfo = STATUS_DISPLAY_INFO[a];
      const bInfo = STATUS_DISPLAY_INFO[b];
      
      // Sort by category order, then by status order within category
      const categoryOrder = ['initial', 'design', 'quote', 'payment', 'preparation', 'production', 'completion', 'special'];
      const aCategoryIndex = categoryOrder.indexOf(aInfo.category);
      const bCategoryIndex = categoryOrder.indexOf(bInfo.category);
      
      if (aCategoryIndex !== bCategoryIndex) {
        return aCategoryIndex - bCategoryIndex;
      }
      
      // Within same category, sort alphabetically
      return aInfo.label.localeCompare(bInfo.label);
    });
  }

  /**
   * Get entry point statuses for the next phases
   */
  static getPhaseEntryPoints(currentPhase) {
    const phaseProgression = {
      'initial': ['design', 'quote'], // Can jump to design or directly to quote
      'design': ['quote', 'payment'], // Can move to quote or skip to payment
      'quote': ['payment', 'preparation'], // Can move to payment or preparation
      'payment': ['preparation', 'production'], // Can move to prep or production
      'preparation': ['production'], // Can move to production
      'production': ['completion'], // Can move to completion
      'completion': [], // Final phase
      'special': [] // Special statuses don't progress
    };

    const nextPhases = phaseProgression[currentPhase] || [];
    const entryPoints = [];

    nextPhases.forEach(phase => {
      // Get the first/main status of each next phase
      const phaseStatuses = Object.entries(STATUS_DISPLAY_INFO)
        .filter(([_, info]) => info.category === phase)
        .map(([status]) => status);

      if (phaseStatuses.length > 0) {
        // Add the typical entry points for each phase
        switch (phase) {
          case 'design':
            entryPoints.push(INTERNAL_STATUSES.SKETCHING);
            break;
          case 'quote':
            entryPoints.push(INTERNAL_STATUSES.PREPARING_QUOTE);
            break;
          case 'payment':
            entryPoints.push(INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT);
            break;
          case 'preparation':
            entryPoints.push(INTERNAL_STATUSES.ORDERING_MATERIALS);
            break;
          case 'production':
            entryPoints.push(INTERNAL_STATUSES.IN_PRODUCTION);
            break;
          case 'completion':
            entryPoints.push(INTERNAL_STATUSES.FINAL_PAYMENT_SENT);
            break;
        }
      }
    });

    return entryPoints;
  }

  /**
   * Get entry point statuses for previous phases (for going back)
   */
  static getPreviousPhaseEntryPoints(currentPhase) {
    const phaseProgression = {
      'design': ['initial'],
      'quote': ['initial', 'design'],
      'payment': ['quote'],
      'preparation': ['payment'],
      'production': ['preparation'],
      'completion': ['production'],
      'initial': [],
      'special': []
    };

    const previousPhases = phaseProgression[currentPhase] || [];
    const entryPoints = [];

    previousPhases.forEach(phase => {
      switch (phase) {
        case 'initial':
          entryPoints.push(INTERNAL_STATUSES.IN_CONSULTATION);
          break;
        case 'design':
          entryPoints.push(INTERNAL_STATUSES.SKETCHING);
          break;
        case 'quote':
          entryPoints.push(INTERNAL_STATUSES.PREPARING_QUOTE);
          break;
        case 'payment':
          entryPoints.push(INTERNAL_STATUSES.DEPOSIT_INVOICE_SENT);
          break;
        case 'preparation':
          entryPoints.push(INTERNAL_STATUSES.ORDERING_MATERIALS);
          break;
        case 'production':
          entryPoints.push(INTERNAL_STATUSES.IN_PRODUCTION);
          break;
      }
    });

    return entryPoints;
  }

  /**
   * Check if a status transition is valid (ENHANCED)
   * More permissive than before - allows phase-based transitions
   */
  static isValidTransition(fromStatus, toStatus) {
    // Allow any transition that appears in the possible statuses
    const possibleStatuses = this.getNextPossibleStatuses(fromStatus);
    return possibleStatuses.includes(toStatus);
  }

  /**
   * Get statuses grouped by phases for organized display
   */
  static getStatusesByPhases() {
    const phases = {
      initial: [],
      design: [],
      quote: [],
      payment: [],
      preparation: [],
      production: [],
      completion: [],
      special: []
    };

    Object.entries(STATUS_DISPLAY_INFO).forEach(([status, info]) => {
      if (phases[info.category]) {
        phases[info.category].push({
          status,
          label: info.label,
          description: info.description,
          requiresAction: info.requiresAction
        });
      }
    });

    return phases;
  }

  /**
   * Get all statuses by category
   */
  static getStatusesByCategory(category) {
    return Object.entries(STATUS_DISPLAY_INFO)
      .filter(([_, info]) => info.category === category)
      .map(([status]) => status);
  }

  /**
   * Get all statuses that require action
   */
  static getActionRequiredStatuses() {
    return Object.entries(STATUS_DISPLAY_INFO)
      .filter(([_, info]) => info.requiresAction)
      .map(([status]) => status);
  }

  /**
   * Get all internal statuses as array
   */
  static getAllInternalStatuses() {
    return Object.values(INTERNAL_STATUSES);
  }

  /**
   * Get all client statuses as array
   */
  static getAllClientStatuses() {
    return Object.values(CLIENT_STATUSES);
  }

  /**
   * Get workflow categories in order
   */
  static getWorkflowCategories() {
    return ['initial', 'design', 'quote', 'payment', 'preparation', 'production', 'completion', 'special'];
  }

  /**
   * Get current workflow stage from status
   */
  static getWorkflowStage(status) {
    const info = this.getDisplayInfo(status);
    return info?.category || 'unknown';
  }

  /**
   * Get phase-friendly name
   */
  static getPhaseName(category) {
    const phaseNames = {
      'initial': 'Initial Review',
      'design': 'Design Process',
      'quote': 'Quote & Approval',
      'payment': 'Payment Processing',
      'preparation': 'Production Preparation',
      'production': 'Production',
      'completion': 'Completion',
      'special': 'Special Actions'
    };
    return phaseNames[category] || category;
  }
}