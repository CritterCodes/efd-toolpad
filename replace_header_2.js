const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/admin/tasks/page.js', 'utf8');

const importStatement = "import TasksHeader from './components/TasksHeader';\n";
if (!content.includes('TasksHeader')) {
  // Add import right after the React import
  content = content.replace("import React,", importStatement + "import React,");
}

const lines = content.split('\n');
const startIdx = lines.findIndex(line => line.includes('{/* Header with Create Task Button */}'));
let endIdx = -1;

if (startIdx !== -1) {
  // Find </Box> which closes this section. We expect it around +30 lines.
  for (let i = startIdx; i < startIdx + 40; i++) {
    if (lines[i] && lines[i].includes('</Box>') && lines[i-1] && lines[i-1].includes('</Stack>')) {
      endIdx = i;
      break;
    }
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1, "        <TasksHeader loading={loading} handleUpdateAllPrices={handleUpdateAllPrices} handleCreateTask={handleCreateTask} />");
  fs.writeFileSync('src/app/dashboard/admin/tasks/page.js', lines.join('\n'));
  console.log('Replaced by line indices!');
} else {
  console.log('Could not find start or end', startIdx, endIdx);
}
