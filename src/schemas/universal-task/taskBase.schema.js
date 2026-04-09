const Joi = require('joi');

const taskBaseFragment = {
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
    })
};

module.exports = {
  taskBaseFragment
};
