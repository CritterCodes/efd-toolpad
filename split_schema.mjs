import fs from 'fs';

const txt = fs.readFileSync('dump_schema.txt', 'utf8');

const imports = txt.substring(0, txt.indexOf('export const MaterialVariantSchema = {'));

const startVariant = txt.indexOf('export const MaterialVariantSchema = {');
const startEnhanced = txt.indexOf('export const EnhancedMaterialSchema = {');
const startValidation = txt.indexOf('export const MaterialValidation = {');
const startHelpers = txt.indexOf('export const MaterialHelpers = {');

const variantSchemaContent = txt.substring(startVariant, startEnhanced - 1);
const enhancedContent = txt.substring(startEnhanced, startValidation - 1);
const validationContent = txt.substring(startValidation, startHelpers - 1);
const helpersContent = txt.substring(startHelpers);

fs.mkdirSync('src/schemas/material-parts', { recursive: true });
fs.writeFileSync('src/schemas/material-parts/material-variant.schema.js', variantSchemaContent);
fs.writeFileSync('src/schemas/material-parts/material-validation.js', validationContent);
fs.writeFileSync('src/schemas/material-parts/material-helpers.js', helpersContent);

// Write back to main file
const newMainContent = `// Extracted and modularized schema
import { MaterialVariantSchema } from './material-parts/material-variant.schema.js';
import { MaterialValidation } from './material-parts/material-validation.js';
import { MaterialHelpers } from './material-parts/material-helpers.js';

${enhancedContent}

export { MaterialVariantSchema, MaterialValidation, MaterialHelpers };
`;

fs.writeFileSync('src/schemas/enhanced-material.schema.js', newMainContent);
console.log('Schema splitted.');
