export const collectionDropSchema = {
  drop: {
    type: 'object',
    description: 'Drop-specific information',
    properties: {
      theme: {
        type: 'string',
        description: 'Drop theme name'
      },
      vibes: {
        type: 'string',
        description: 'Aesthetic vibes/mood'
      },
      releaseDate: {
        type: 'date',
        description: 'When drop goes live'
      },
      targetQuantity: {
        type: 'number',
        description: 'Target number of pieces in drop'
      },
      requestId: {
        type: 'string',
        description: 'Reference to drop-request document'
      },
      sourceDropRequest: {
        type: 'object',
        description: 'Original drop request that generated this collection',
        properties: {
          theme: 'string',
          vibes: 'string',
          requirements: 'object'
        }
      }
    }
  }
};
