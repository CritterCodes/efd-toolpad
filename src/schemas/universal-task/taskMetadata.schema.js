const Joi = require('joi');

const taskMetadataFragment = {
  // Display settings
  display: Joi.object({
    isActive: Joi.boolean()
      .default(true),
    
    isFeatured: Joi.boolean()
      .default(false),
    
    sortOrder: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.min': 'sortOrder must be non-negative'
      })
  }).default(),
  
  // Metadata (read-only fields)
  createdAt: Joi.date()
    .optional(),
  
  updatedAt: Joi.date()
    .optional(),
  
  migrationDate: Joi.date()
    .optional(),
  
  _id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
};

module.exports = {
  taskMetadataFragment
};
