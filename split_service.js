const fs = require('fs');
const content = fs.readFileSync('src/app/api/tasks/service.js', 'utf8');

const imports = content.substring(0, content.indexOf('export class TasksService')).trim();

// Very hacky but functional regex for splitting
const methods = [...content.matchAll(/static (async )?(\w+)\(([^)]*)\)\s*\{([\s\S]*?)(?=\n\s*static |^\s*\}\s*$)/gm)];

console.log(`Found ${methods.length} methods`);

let queryMethods = [];
let mutationMethods = [];
let validationMethods = [];
let pricingMethods = [];

methods.forEach(m => {
  const name = m[2];
  if (['getTasks', 'getTaskById', 'getTaskStatistics', 'getTaskPriceForMetal', 'getTaskSupportedMetals', 'getTasksForMetalContext', 'getAllSupportedMetalKeys', 'getAllSupportedMetals'].includes(name)) {
    queryMethods.push(m[0]);
  } else if (['createTask', 'createProcessBasedTask', 'updateTask', 'deleteTask', 'bulkUpdatePricing'].includes(name)) {
    mutationMethods.push(m[0]);
  } else if (['validateTaskData', 'transformTaskForDatabase', 'transformTaskForResponse'].includes(name)) {
    validationMethods.push(m[0]);
  } else {
    pricingMethods.push(m[0]);
  }
});

fs.mkdirSync('src/app/api/tasks/services', {recursive: true});

function writeService(name, methodsArr) {
  let fileContent = imports + `\n\nexport class ${name} {\n` + methodsArr.join('\n\n') + `\n}\n`;
  fileContent = fileContent.replace(/this\./g, `${name}.`);
  // Fix nested "this." to the current class name for static methods if applicable, although facade is better.
  fs.writeFileSync(`src/app/api/tasks/services/${name}.js`, fileContent);
}

writeService('TasksQueryService', queryMethods);
writeService('TasksMutationService', mutationMethods);
writeService('TasksValidationService', validationMethods);
writeService('TasksPricingService', pricingMethods);

let facade = imports + `\n
import { TasksQueryService } from './services/TasksQueryService';
import { TasksMutationService } from './services/TasksMutationService';
import { TasksValidationService } from './services/TasksValidationService';
import { TasksPricingService } from './services/TasksPricingService';

export class TasksService {\n`;

methods.forEach(m => {
  const isAsync = m[1] ? 'async ' : '';
  const name = m[2];
  const args = m[3];
  
  let target = '';
  if (['getTasks', 'getTaskById', 'getTaskStatistics', 'getTaskPriceForMetal', 'getTaskSupportedMetals', 'getTasksForMetalContext', 'getAllSupportedMetalKeys', 'getAllSupportedMetals'].includes(name)) target = 'TasksQueryService';
  else if (['createTask', 'createProcessBasedTask', 'updateTask', 'deleteTask', 'bulkUpdatePricing'].includes(name)) target = 'TasksMutationService';
  else if (['validateTaskData', 'transformTaskForDatabase', 'transformTaskForResponse'].includes(name)) target = 'TasksValidationService';
  else target = 'TasksPricingService';

  // args might have defaults, so we need to extract parameter names for the call
  const callArgs = args.split(',').map(a => a.split('=')[0].trim()).filter(a => a).join(', ');
  
  facade += `  static ${isAsync}${name}(${args}) {\n    return ${target}.${name}(${callArgs});\n  }\n\n`;
});
facade += `}\n`;

fs.writeFileSync('src/app/api/tasks/service.js', facade);
