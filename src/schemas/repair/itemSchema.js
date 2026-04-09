
export const itemBreakdown = {
  repairID: { type: 'string', required: true, unique: true },
  description: { type: 'string', required: true },
  isRush: { type: 'boolean', default: false },
  promiseDate: { type: 'date', required: true },
  metalType: { type: 'string', enum: ['gold', 'silver', 'platinum', 'palladium', 'stainless', 'brass', 'copper', 'titanium', 'other'] },
  goldColor: { type: 'string' },
  karat: { type: 'string' },
  isRing: { type: 'boolean', default: false },
  currentRingSize: { type: 'string' },
  desiredRingSize: { type: 'string' },
  notes: { type: 'string' },
  internalNotes: { type: 'string' },
  picture: { type: 'string' },
  beforePhotos: { type: 'array', default: [], items: { type: 'string' } },
  afterPhotos: { type: 'array', default: [], items: { type: 'string' } },
  repairTasks: { type: 'array', default: [] }
};

export const defaultItemData = {
  description: '',
  isRush: false,
  promiseDate: '',
  metalType: '',
  goldColor: '',
  karat: '',
  isRing: false,
  currentRingSize: '',
  desiredRingSize: '',
  notes: '',
  internalNotes: '',
  picture: null,
  beforePhotos: [],
  afterPhotos: []
};
