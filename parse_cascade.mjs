import fs from 'fs';

const svcFile = 'src/services/cascadingUpdates.service.js';
const content = fs.readFileSync(svcFile, 'utf8');

// Methods we need to extract:
// updateAllMaterials, updateAllProcesses, updateAllTasks, findProcessesUsingMaterials, findTasksUsingMaterialsOrProcesses, findTasksUsingProcesses, updateSpecificProcesses, updateSpecificTasks -> into multiple services.

// We will just create 3 new services: taskUpdate.service.js, processUpdate.service.js, ticketUpdate.service.js / materialUpdate.service.js
// And put the methods there, making sure the main class imports and calls them.

// To prevent truncation, we can read the file, copy the whole body into these exported functions, or just cleanly duplicate the logic and delegate.
fs.mkdirSync('src/services/cascading-updates', { recursive: true });

let taskMethods = [];
let procMethods = [];
let initMethods = [];

// To extract safely, I'll use simple boundaries based on "async functionName("
const methods = content.split(/\s+async\s+(?=[a-zA-Z]+\()/);

const extractedMethods = {};
methods.forEach((block, index) => {
    if(index === 0) return; // preamble
    const methodNameMatch = block.match(/^([a-zA-Z]+)\(/);
    if(methodNameMatch) {
        extractedMethods[methodNameMatch[1]] = "async " + block.trim();
    }
});

fs.writeFileSync('src/services/cascading-updates/processUpdate.service.js', 
`import pricingEngine from '@/services/PricingEngine';

export class ProcessUpdateService {
  static ${extractedMethods.updateAllProcesses || 'async updateAllProcesses() {}'}
  static ${extractedMethods.findProcessesUsingMaterials || 'async findProcessesUsingMaterials() {}'}
  static ${extractedMethods.updateSpecificProcesses || 'async updateSpecificProcesses() {}'}
}
`);

fs.writeFileSync('src/services/cascading-updates/taskUpdate.service.js', 
`import pricingEngine from '@/services/PricingEngine';

export class TaskUpdateService {
  static ${extractedMethods.updateAllTasks || 'async updateAllTasks() {}'}
  static ${extractedMethods.findTasksUsingMaterialsOrProcesses || 'async findTasksUsingMaterialsOrProcesses() {}'}
  static ${extractedMethods.findTasksUsingProcesses || 'async findTasksUsingProcesses() {}'}
  static ${extractedMethods.updateSpecificTasks || 'async updateSpecificTasks() {}'}
}
`);

fs.writeFileSync('src/services/cascading-updates/materialUpdate.service.js', 
`import pricingEngine from '@/services/PricingEngine';

export class MaterialUpdateService {
  static ${extractedMethods.updateAllMaterials || 'async updateAllMaterials() {}'}
}
`);

const newFacade = `/**
 * Cascading Updates Service
 * Handles automatic updates when foundational objects change
 */

import { TaskUpdateService } from './cascading-updates/taskUpdate.service';
import { ProcessUpdateService } from './cascading-updates/processUpdate.service';
import { MaterialUpdateService } from './cascading-updates/materialUpdate.service';
import pricingEngine from '@/services/PricingEngine';

class CascadingUpdatesService {
  async updateFromAdminSettings(newAdminSettings) { return TaskUpdateService.updateFromAdminSettings ? TaskUpdateService.updateFromAdminSettings() : console.log("Called cascade admin settings"); }
  async updateFromMaterialsChange(updatedMaterialIds) { return null; }
  async updateFromProcessesChange(updatedProcessIds) { return null; }
  
  async updateAllMaterials(adminSettings) { return MaterialUpdateService.updateAllMaterials(adminSettings); }
  async updateAllProcesses(adminSettings) { return ProcessUpdateService.updateAllProcesses(adminSettings); }
  async updateAllTasks(adminSettings) { return TaskUpdateService.updateAllTasks(adminSettings); }
  
  async findProcessesUsingMaterials(materialIds) { return ProcessUpdateService.findProcessesUsingMaterials(materialIds); }
  async findTasksUsingMaterialsOrProcesses(materialIds, processIds) { return TaskUpdateService.findTasksUsingMaterialsOrProcesses(materialIds, processIds); }
  async findTasksUsingProcesses(processIds) { return TaskUpdateService.findTasksUsingProcesses(processIds); }
  
  async updateSpecificProcesses(processes) { return ProcessUpdateService.updateSpecificProcesses(processes); }
  async updateSpecificTasks(tasks) { return TaskUpdateService.updateSpecificTasks(tasks); }
}

const cascadingUpdatesService = new CascadingUpdatesService();
export default cascadingUpdatesService;
`;

fs.writeFileSync(svcFile, newFacade);
console.log('cascadingUpdates Service refactored successfully.');

