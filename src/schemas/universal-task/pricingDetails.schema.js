const Joi = require('joi');
const { metalContextSchema, metalKeySchema } = require('./metalVariants.schema');

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

const pricingDetailsFragment = {
  // Universal pricing structure
  pricing: universalPricingSchema
};

module.exports = {
  universalPricingSchema,
  pricingDetailsFragment
};
