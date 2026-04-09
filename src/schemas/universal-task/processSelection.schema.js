const Joi = require('joi');

// Process selection schema
const processSelectionSchema = Joi.object({
  processId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'processId must be a valid MongoDB ObjectId'
    }),
  
  quantity: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'quantity must be at least 1',
      'number.integer': 'quantity must be an integer'
    })
});

const processesFragment = {
  // Process selections
  processes: Joi.array()
    .items(processSelectionSchema)
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one process must be selected',
      'array.max': 'Maximum 20 processes allowed per task'
    })
};

// Pricing calculation input schema
const pricingCalculationSchema = Joi.object({
  processes: Joi.array()
    .items(processSelectionSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one process is required for pricing calculation'
    }),
  
  laborCost: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .default(0)
});

module.exports = {
  processSelectionSchema,
  processesFragment,
  pricingCalculationSchema
};
