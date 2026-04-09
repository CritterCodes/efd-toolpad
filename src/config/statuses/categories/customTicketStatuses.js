import { INTERNAL_STATUSES } from '../internalStatuses.js';
import { STATUS_CATEGORIES } from '../statusCategories.js';

export const customTicketStatuses = {
[INTERNAL_STATUSES.SKETCHING]: {
    label: 'Creating Sketch',
    description: 'Creating initial design sketch',
    category: STATUS_CATEGORIES.DESIGN,
    color: 'primary',
    icon: '✏️',
    requiresAction: true,
    internalOnly: false
  },

[INTERNAL_STATUSES.SKETCH_REVIEW]: {
    label: 'Sketch Review',
    description: 'Client reviewing sketch',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'info',
    icon: '👀',
    requiresAction: false,
    internalOnly: false
  },

[INTERNAL_STATUSES.SKETCH_APPROVED]: {
    label: 'Sketch Approved',
    description: 'Sketch approved, ready for next phase',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'success',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  },

[INTERNAL_STATUSES.GENERATING_IMAGE]: {
    label: 'Generating Image',
    description: 'Creating detailed image from sketch',
    category: STATUS_CATEGORIES.DESIGN,
    color: 'primary',
    icon: '🖼️',
    requiresAction: true,
    internalOnly: false
  },

[INTERNAL_STATUSES.IMAGE_REVIEW]: {
    label: 'Image Review',
    description: 'Client reviewing generated image',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'info',
    icon: '🔍',
    requiresAction: false,
    internalOnly: false
  },

[INTERNAL_STATUSES.IMAGE_APPROVED]: {
    label: 'Image Approved',
    description: 'Image approved, ready for CAD',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'success',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  },

[INTERNAL_STATUSES.IN_CAD]: {
    label: 'CAD Design',
    description: 'Creating CAD design',
    category: STATUS_CATEGORIES.DESIGN,
    color: 'primary',
    icon: '🎨',
    requiresAction: true,
    internalOnly: false
  },

[INTERNAL_STATUSES.CAD_REVIEW]: {
    label: 'CAD Review',
    description: 'Client reviewing CAD design',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'info',
    icon: '👀',
    requiresAction: false,
    internalOnly: false
  },

[INTERNAL_STATUSES.CAD_APPROVED]: {
    label: 'CAD Approved',
    description: 'CAD design approved',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'success',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  },

[INTERNAL_STATUSES.CAD_REVISION]: {
    label: 'CAD Revision',
    description: 'Making CAD revisions',
    category: STATUS_CATEGORIES.DESIGN,
    color: 'warning',
    icon: '🔄',
    requiresAction: true,
    internalOnly: false
  },

[INTERNAL_STATUSES.PREPARING_QUOTE]: {
    label: 'Preparing Quote',
    description: 'Creating price quote',
    category: STATUS_CATEGORIES.INITIAL,
    color: 'info',
    icon: '💰',
    requiresAction: true,
    internalOnly: true
  },

[INTERNAL_STATUSES.QUOTE_SENT]: {
    label: 'Quote Sent',
    description: 'Quote sent to client',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'info',
    icon: '📨',
    requiresAction: false,
    internalOnly: false
  },

[INTERNAL_STATUSES.QUOTE_APPROVED]: {
    label: 'Quote Approved',
    description: 'Client approved quote',
    category: STATUS_CATEGORIES.APPROVAL,
    color: 'success',
    icon: '✅',
    requiresAction: false,
    internalOnly: false
  }
};
