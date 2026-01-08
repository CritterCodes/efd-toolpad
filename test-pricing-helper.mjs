/**
 * Test Helper - Loads ES6 modules for testing
 */

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load ES6 module from .js file
 */
export async function loadESModule(relativePath) {
  const fullPath = resolve(__dirname, relativePath);
  const fileUrl = pathToFileURL(fullPath).href;
  return await import(fileUrl);
}

