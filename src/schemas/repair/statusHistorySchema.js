
export const statusBreakdown = {
  status: {
    type: 'string',
    default: 'pending',
    enum: ['pending', 'in-progress', 'waiting', 'quality-control', 'completed', 'ready', 'picked-up', 'cancelled']
  },
  assignedJeweler: { type: 'string', default: '' },
  partsOrderedBy: { type: 'string', default: '' },
  partsOrderedDate: { type: 'date' },
  completedBy: { type: 'string', default: '' },
  qcBy: { type: 'string', default: '' },
  qcDate: { type: 'date' },
  createdAt: { type: 'date', default: () => new Date() },
  updatedAt: { type: 'date', default: () => new Date() },
  completedAt: { type: 'date' },
  pickedUpAt: { type: 'date' },
  assignedTo: { type: 'string' }
};

export const defaultStatusData = {
  status: 'pending',
  assignedJeweler: '',
  partsOrderedBy: '',
  partsOrderedDate: null,
  qcBy: '',
  qcDate: null,
  assignedTo: '',
  completedBy: ''
};
