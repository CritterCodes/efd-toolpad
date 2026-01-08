/**
 * universalTask.schema.js - Validation schemas for universal task structure
 * 
 * Joi validation schemas for universal tasks with pricing structure validation
 * and metal context compatibility checks.
 */

const Joi = require('joi');

// Metal context schema
const metalContextSchema = Joi.object({
  metalType: Joi.string()
    .valid('gold', 'silver', 'platinum', 'palladium', 'titanium', 'stainless')
    .required()
    .messages({
      'any.only': 'metalType must be one of: gold, silver, platinum, palladium, titanium, stainless'
    }),
  
  karat: Joi.string()
    .required()
    .custom((value, helpers) => {
      const { metalType } = helpers.state.ancestors[0];
      
      const validKarats = {
        gold: ['10k', '14k', '18k', '22k'],
        silver: ['sterling', 'fine'],
        platinum: ['900', '950'],
        palladium: ['500', '950'],
        titanium: ['grade1', 'grade2'],
        stainless: ['316L', '904L']
      };

      if (!validKarats[metalType] || !validKarats[metalType].includes(value)) {
        throw new Joi.ValidationError(`Invalid karat ${value} for metal type ${metalType}`);
      }

      return value;
    })
    .messages({
      'any.required': 'karat is required'
    })
});

// Metal key schema (gold_14k, silver_sterling, etc.)
const metalKeySchema = Joi.string()
  .pattern(/^(gold|silver|platinum|palladium|titanium|stainless)_(10k|14k|18k|22k|sterling|fine|900|950|500|grade1|grade2|316L|904L)$/)
  .required()
  .messages({
    'string.pattern.base': 'metalKey must be in format: metalType_karat (e.g., gold_14k, silver_sterling)'
  });

// Universal pricing schema
const universalPricingSchema = Joi.object()
  .pattern(
    metalKeySchema,
    Joi.number()
      .min(0)
      .precision(2)
      .required()
      .messages({
        'number.min': 'Price must be non-negative',
        'number.precision': 'Price must have at most 2 decimal places'
      })
  )
  .min(1)
  .required()
  .messages({
    'object.min': 'At least one metal pricing must be provided',
    'any.required': 'Universal pricing is required'
  })
  .custom((value, helpers) => {
    // Validate that all metal keys are valid combinations
    for (const metalKey of Object.keys(value)) {
      const [metalType, karat] = metalKey.split('_');
      
      try {
        metalContextSchema.validate({ metalType, karat });
      } catch (error) {
        throw new Joi.ValidationError(`Invalid metal combination in pricing: ${metalKey}`);
      }
    }
    
    return value;
  });

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

// Main universal task schema
const universalTaskSchema = Joi.object({
  // Basic task information
  name: Joi.string()
    .min(1)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.min': 'name must not be empty',
      'string.max': 'name must be at most 200 characters',
      'any.required': 'name is required'
    }),
  
  title: Joi.string()
    .min(1)
    .max(200)
    .optional()
    .trim(),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .trim()
    .messages({
      'string.max': 'description must be at most 1000 characters'
    }),
  
  // Categorization
  category: Joi.string()
    .valid('repairs', 'shanks', 'sizing', 'restoration', 'cleaning', 'settings', 'chains', 'misc')
    .required()
    .messages({
      'any.only': 'category must be one of: repairs, shanks, sizing, restoration, cleaning, settings, chains, misc'
    }),
  
  subcategory: Joi.string()
    .max(100)
    .optional()
    .trim(),
  
  // Universal task identifier
  universalTask: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'universalTask must be true for universal tasks'
    }),
  
  // Universal pricing structure
  pricing: universalPricingSchema,
  
  // Supported metals list (for quick reference)
  supportedMetals: Joi.array()
    .items(metalContextSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one supported metal must be specified'
    })
    .custom((value, helpers) => {
      const { pricing } = helpers.state.ancestors[0];
      
      if (pricing) {
        // Verify that supportedMetals matches pricing keys
        const pricingKeys = Object.keys(pricing);
        const supportedKeys = value.map(metal => `${metal.metalType}_${metal.karat}`);
        
        const missingInPricing = supportedKeys.filter(key => !pricingKeys.includes(key));
        const missingInSupported = pricingKeys.filter(key => !supportedKeys.includes(key));
        
        if (missingInPricing.length > 0) {
          throw new Joi.ValidationError(`Metals in supportedMetals but not in pricing: ${missingInPricing.join(', ')}`);
        }
        
        if (missingInSupported.length > 0) {
          throw new Joi.ValidationError(`Metals in pricing but not in supportedMetals: ${missingInSupported.join(', ')}`);
        }
      }
      
      return value;
    }),
  
  // Process selections
  processes: Joi.array()
    .items(processSelectionSchema)
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one process must be selected',
      'array.max': 'Maximum 20 processes allowed per task'
    }),
  
  // Service configuration
  service: serviceConfigSchema.required(),
  
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
});

// Task creation schema (excludes metadata)
const createUniversalTaskSchema = universalTaskSchema.fork(
  ['createdAt', 'updatedAt', 'migrationDate', '_id'], 
  (schema) => schema.forbidden()
);

// Task update schema (all fields optional except universalTask)
const updateUniversalTaskSchema = universalTaskSchema.fork(
  ['name', 'pricing', 'supportedMetals', 'processes', 'service'],
  (schema) => schema.optional()
).fork(
  ['createdAt', 'migrationDate', '_id'],
  (schema) => schema.forbidden()
);

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

// Metal context query schema
const metalContextQuerySchema = Joi.object({
  metalType: Joi.string()
    .valid('gold', 'silver', 'platinum', 'palladium', 'titanium', 'stainless')
    .required(),
  
  karat: Joi.string()
    .required()
}).concat(metalContextSchema);

module.exports = {
  universalTaskSchema,
  createUniversalTaskSchema,
  updateUniversalTaskSchema,
  pricingCalculationSchema,
  metalContextQuerySchema,
  metalContextSchema,
  metalKeySchema,
  universalPricingSchema,
  processSelectionSchema,
  serviceConfigSchema
};
