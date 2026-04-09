import fs from 'fs';

const src = fs.readFileSync('src/app/api/tasks/service.js', 'utf8');

let imports = [];
const lines = src.split('\n');
let classStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export class TasksService')) {
        classStart = i;
        break;
    }
    imports.push(lines[i]);
}

let codeInsideClass = lines.slice(classStart + 1, lines.length - 1).join('\n');
let methods = [];
let regex = /\bstatic\s+(async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g;
let match;
while ((match = regex.exec(codeInsideClass)) !== null) {
    let startIndex = match.index;
    let braceCount = 1;
    let i = regex.lastIndex;
    while (i < codeInsideClass.length && braceCount > 0) {
        if (codeInsideClass[i] === '{') braceCount++;
        else if (codeInsideClass[i] === '}') braceCount--;
        i++;
    }
    methods.push({
        isAsync: !!match[1],
        name: match[2],
        args: match[3],
        body: codeInsideClass.substring(startIndex, i)
    });
}

let query = [], mutation = [], validation = [], pricing = [];
for (let m of methods) {
    if (['getTasks', 'getTaskById', 'getTaskStatistics', 'getTaskPriceForMetal', 'getTaskSupportedMetals', 'getTasksForMetalContext', 'getAllSupportedMetalKeys', 'getAllSupportedMetals'].includes(m.name)) query.push(m);
    else if (['createTask', 'createProcessBasedTask', 'updateTask', 'deleteTask', 'bulkUpdatePricing'].includes(m.name)) mutation.push(m);
    else if (['validateTaskData', 'transformTaskForDatabase', 'transformTaskForResponse'].includes(m.name)) validation.push(m);
    else pricing.push(m);
}

fs.mkdirSync('src/app/api/tasks/services', { recursive: true });

function formatArgs(argStr) {
    return argStr.split(',').map(a => a.split('=')[0].trim().split(' ').pop()).filter(a => a).join(', ');
}

function writeService(name, meths) {
    let out = imports.join('\n') + `\nimport { TasksService } from '../service.js';\n\nexport class ${name} {\n`;
    for (let m of meths) {
        let source = m.body.replace(/\bthis\./g, 'TasksService.');
        out += '  ' + source + '\n\n';
    }
    out += '}\n';
    fs.writeFileSync(`src/app/api/tasks/services/${name}.js`, out);
}

writeService('TasksQueryService', query);
writeService('TasksMutationService', mutation);
writeService('TasksValidationService', validation);
writeService('TasksPricingService', pricing);

let facade = imports.join('\n') + `
import { TasksQueryService } from './services/TasksQueryService.js';
import { TasksMutationService } from './services/TasksMutationService.js';
import { TasksValidationService } from './services/TasksValidationService.js';
import { TasksPricingService } from './services/TasksPricingService.js';

export class TasksService {
`;
for (let m of methods) {
    let target = '';
    if (query.includes(m)) target = 'TasksQueryService';
    else if (mutation.includes(m)) target = 'TasksMutationService';
    else if (validation.includes(m)) target = 'TasksValidationService';
    else target = 'TasksPricingService';

    let argNames = formatArgs(m.args);
    facade += `  static ${m.isAsync ? 'async ' : ''}${m.name}(${m.args}) {\n`;
    facade += `    return ${target}.${m.name}(${argNames});\n`;
    facade += `  }\n\n`;
}
facade += '}\n';

fs.writeFileSync('src/app/api/tasks/service.js', facade);
console.log('Successfully completed!');
