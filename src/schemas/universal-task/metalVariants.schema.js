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

// Metal context query schema
const metalContextQuerySchema = Joi.object({
  metalType: Joi.string()
    .valid('gold', 'silver', 'platinum', 'palladium', 'titanium', 'stainless')
    .required(),
  
  karat: Joi.string()
    .required()
}).concat(metalContextSchema);

// Supported metals list fragment (for quick reference)
const supportedMetalsFragment = {
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
    })
};

module.exports = {
  metalContextSchema,
  metalKeySchema,
  metalContextQuerySchema,
  supportedMetalsFragment
};
