
export const taskBreakdown = {
  tasks: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        taskId: { type: 'string', description: 'Reference to tasks collection' },
        title: { type: 'string', required: true },
        description: { type: 'string' },
        quantity: { type: 'number', default: 1, min: 1 },
        price: { type: 'number', default: 0, min: 0 },
        sku: { type: 'string' },
        category: { type: 'string' }
      }
    },
    description: 'Predefined tasks/services to be performed'
  },
  processes: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        processId: { type: 'string', description: 'Reference to processes collection' },
        displayName: { type: 'string', required: true },
        description: { type: 'string' },
        quantity: { type: 'number', default: 1, min: 1 },
        price: { type: 'number', default: 0, min: 0 },
        laborHours: { type: 'number', default: 0 },
        skillLevel: { type: 'string', enum: ['basic', 'standard', 'advanced', 'expert'] }
      }
    },
    description: 'Individual processes to be performed'
  },
  materials: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        materialId: { type: 'string', description: 'Reference to materials collection' },
        name: { type: 'string', required: true },
        description: { type: 'string' },
        quantity: { type: 'number', default: 1, min: 0 },
        price: { type: 'number', default: 0, min: 0 },
        unitType: { type: 'string', enum: ['piece', 'gram', 'ounce', 'inch', 'foot'] },
        category: { type: 'string' }
      }
    },
    description: 'Materials to be used'
  },
  customLineItems: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        description: { type: 'string', required: true },
        quantity: { type: 'number', default: 1, min: 1 },
        price: { type: 'number', default: 0, min: 0 }
      }
    }
  }
};

export const defaultTaskData = {
  tasks: [],
  processes: [],
  materials: [],
  customLineItems: [],
  repairTasks: []
};
