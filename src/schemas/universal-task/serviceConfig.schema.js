const Joi = require('joi');

// Service configuration schema
const serviceConfigSchema = Joi.object({
  estimatedDays: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .required()
    .messages({
      'number.min': 'estimatedDays must be at least 1',
      'number.max': 'estimatedDays must be at most 365'
    }),
  
  rushDays: Joi.number()
    .integer()
    .min(1)
    .max(Joi.ref('estimatedDays'))
    .required()
    .messages({
      'number.min': 'rushDays must be at least 1',
      'number.max': 'rushDays cannot exceed estimatedDays'
    }),
  
  rushMultiplier: Joi.number()
    .min(1)
    .max(10)
    .default(1.5)
    .messages({
      'number.min': 'rushMultiplier must be at least 1',
      'number.max': 'rushMultiplier must be at most 10'
    }),
  
  requiresApproval: Joi.boolean()
    .default(false),
  
  requiresInspection: Joi.boolean()
    .default(false),
  
  canBeBundled: Joi.boolean()
    .default(true),
  
  laborCost: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'laborCost must be non-negative',
      'number.precision': 'laborCost must have at most 2 decimal places'
    })
});

const serviceConfigFragment = {
  // Service configuration
  service: serviceConfigSchema.required()
};

module.exports = {
  serviceConfigSchema,
  serviceConfigFragment
};
