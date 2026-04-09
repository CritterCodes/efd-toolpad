const fs = require('fs');

let dataFile = fs.readFileSync('src/hooks/processes/useProcessData.js', 'utf8');
// remove everything after `const categorizedProcesses` since it's unused in data
dataFile = dataFile.substring(0, dataFile.indexOf('const categorizedProcesses_DEL = React.useMemo('));
dataFile += '\n}\n';
fs.writeFileSync('src/hooks/processes/useProcessData.js', dataFile);

let filtersFile = fs.readFileSync('src/hooks/processes/useProcessFilters.js', 'utf8');
// cut out the data fetching inside it, we just need state and the memo filters.
// Inside useProcessFilters we have formData, etc we don't need fetching.
// But it's easier to just do simple index drops
let fStart = filtersFile.indexOf('export function useProcessFilters');
let fEnd1 = filtersFile.indexOf('const [selectedTab');
let fEnd2 = filtersFile.indexOf('const [loading_DEL');

filtersFile = filtersFile.substring(0, fStart) + 
              filtersFile.substring(fStart, fStart + 50) + ' {\n  ' +
              filtersFile.substring(fEnd1, fEnd2) + '\n}\n';
fs.writeFileSync('src/hooks/processes/useProcessFilters.js', filtersFile);

console.log('Pruned!');
