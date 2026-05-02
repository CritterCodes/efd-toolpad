/**
 * RepairPayrollBatch Schema
 * Frozen weekly payout record for one jeweler in one pay week.
 */
export const repairPayrollBatchSchema = {
  batchID: {
    type: 'string',
    required: true,
    unique: true,
    description: 'Unique payroll batch identifier'
  },
  userID: {
    type: 'string',
    required: true,
    description: 'Jeweler userID for this payroll batch'
  },
  userName: {
    type: 'string',
    required: true,
    description: 'Jeweler display name snapshot'
  },
  weekStart: {
    type: 'date',
    required: true,
    description: 'Monday at 00:00:00.000 for the payout week'
  },
  weekEnd: {
    type: 'date',
    required: true,
    description: 'Sunday at 23:59:59.999 for the payout week'
  },
  status: {
    type: 'string',
    enum: ['draft', 'finalized', 'paid', 'void'],
    default: 'draft',
    description: 'Payroll lifecycle state'
  },
  laborHours: {
    type: 'number',
    default: 0,
    description: 'Frozen total credited hours for included labor logs'
  },
  laborPay: {
    type: 'number',
    default: 0,
    description: 'Frozen total payout value for included labor logs'
  },
  repairsWorked: {
    type: 'number',
    default: 0,
    description: 'Distinct repairs included in the batch'
  },
  entryCount: {
    type: 'number',
    default: 0,
    description: 'Number of labor log entries included'
  },
  logIDs: {
    type: 'array',
    default: [],
    description: 'Included repairLaborLog identifiers'
  },
  paidAt: {
    type: 'date',
    description: 'Timestamp when the batch was marked paid'
  },
  paymentMethod: {
    type: 'string',
    default: '',
    description: 'Cash, check, ACH, Zelle, Venmo, or another admin-entered method'
  },
  paymentReference: {
    type: 'string',
    default: '',
    description: 'Optional reference like check number or transaction ID'
  },
  notes: {
    type: 'string',
    default: '',
    description: 'Admin notes stored with the payout batch'
  },
  createdBy: {
    type: 'string',
    default: '',
    description: 'Admin userID who created the batch'
  },
  createdAt: {
    type: 'date',
    default: () => new Date(),
    description: 'Creation timestamp'
  },
  updatedAt: {
    type: 'date',
    default: () => new Date(),
    description: 'Last update timestamp'
  }
};
