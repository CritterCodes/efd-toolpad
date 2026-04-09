import fs from 'fs';

const txt = fs.readFileSync('dump_tasks.txt', 'utf8');

const constantsStart = txt.indexOf('export const TASK_CATEGORIES = [');
const formattersStart = txt.indexOf('export const formatPrice = (price) => {');
const helpersStart = txt.indexOf('export const calculateTaskCost = (task, adminSettings = null) => {');

const preamble = txt.substring(0, constantsStart);
const constantsContent = txt.substring(constantsStart, formattersStart);
const formattersContent = txt.substring(formattersStart, helpersStart);
const helpersContent = txt.substring(helpersStart);

fs.mkdirSync('src/utils/tasks-parts', { recursive: true });

fs.writeFileSync('src/utils/tasks-parts/tasks.constants.js', 
  preamble + constantsContent
);

fs.writeFileSync('src/utils/tasks-parts/tasks.formatters.js', 
  "import { TASK_CATEGORIES, TASK_METAL_TYPES, TASK_SKILL_LEVELS } from './tasks.constants';\n" + formattersContent
);

fs.writeFileSync('src/utils/tasks-parts/tasks.helpers.js', 
  helpersContent
);

const mainIndex = `/**
 * Tasks Utilities
 * Constants, formatters, and helper functions for task management
 */

export * from './tasks-parts/tasks.constants';
export * from './tasks-parts/tasks.formatters';
export * from './tasks-parts/tasks.helpers';
`;

fs.writeFileSync('src/utils/tasks.util.js', mainIndex);
console.log('tasks.util.js split correctly.');
