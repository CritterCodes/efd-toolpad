/**
 * RepairLaborLog Schema
 * Append-only ledger of labor credits generated from repair workflow actions.
 * Created automatically when a jeweler moves a repair into QC or when admin finalizes adjustments.
 * Admin-only corrections are applied via separate review actions.
 */
export const repairLaborLogSchema = {
  logID: {
    type: 'string',
    required: true,
    unique: true,
    description: 'Unique log entry identifier (UUID)'
  },
  repairID: {
    type: 'string',
    required: true,
    description: 'Reference to the repair record'
  },
  primaryJewelerUserID: {
    type: 'string',
    required: true,
    description: 'UserID of the jeweler receiving credit'
  },
  primaryJewelerName: {
    type: 'string',
    required: true,
    description: 'Display name of the jeweler at time of credit'
  },
  creditedLaborHours: {
    type: 'number',
    default: 0,
    description: 'Labor hours credited. Starts at 0; admin sets the value during review.'
  },
  laborRateSnapshot: {
    type: 'number',
    default: 0,
    description: 'Hourly rate at time of credit (from employment.hourlyRate or adminSettings)'
  },
  creditedValue: {
    type: 'number',
    default: 0,
    description: 'Computed labor pay = creditedLaborHours * laborRateSnapshot'
  },
  sourceAction: {
    type: 'string',
    enum: ['move_to_qc', 'mark_complete', 'admin_adjustment', 'send_to_qc'],
    description: 'Workflow action that triggered this credit'
  },
  requiresAdminReview: {
    type: 'boolean',
    default: false,
    description: 'True when shared-work scenario detected; admin must split or assign credit'
  },
  adminReviewedBy: {
    type: 'string',
    default: '',
    description: 'UserID of admin who finalized the review'
  },
  adminReviewedAt: {
    type: 'date',
    description: 'Timestamp when admin finalized the review'
  },
  notes: {
    type: 'string',
    default: '',
    description: 'Admin notes added during review'
  },
  weekStart: {
    type: 'date',
    description: 'Monday of the ISO week this credit falls in (set at creation for fast aggregation)'
  },
  createdAt: {
    type: 'date',
    default: () => new Date(),
    description: 'When the log entry was created'
  },
  updatedAt: {
    type: 'date',
    default: () => new Date(),
    description: 'When the log entry was last modified'
  }
};
