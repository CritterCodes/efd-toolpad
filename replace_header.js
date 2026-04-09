const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/admin/tasks/page.js', 'utf8');

const importStatement = "import TasksHeader from './components/TasksHeader';\n";
if (!content.includes('TasksHeader')) {
  // Add import right after the React import
  content = content.replace("import React,", importStatement + "import React,");
}

const headerRegex = /\{\/\* Header with Create Task Button \*\/\}\s*<Box sx=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 \}\}>\s*<Typography variant="h4" component="h1">\s*Tasks Management\s*<\/Typography>\s*<Stack direction="row" spacing=\{2\}>\s*<Button\s*variant="outlined"\s*startIcon=\{<MoneyIcon \/>\}\s*onClick=\{handleUpdateAllPrices\}\s*disabled=\{loading\}\s*size="large"\s*color="secondary"\s*>\s*\{loading \? 'Updating\.\.\.' : 'Update Prices'\}\s*<\/Button>\s*<Button\s*variant="contained"\s*startIcon=\{<AddIcon \/>\}\s*onClick=\{([^}]+)\}\s*size="large"\s*>\s*Create Universal Task\s*<\/Button>\s*<Button\s*variant="outlined"\s*onClick=\{handleCreateTask\}\s*size="large"\s*>\s*More Options\s*<\/Button>\s*<\/Stack>\s*<\/Box>/;

if (headerRegex.test(content)) {
  content = content.replace(headerRegex, "<TasksHeader loading={loading} handleUpdateAllPrices={handleUpdateAllPrices} handleCreateTask={handleCreateTask} />");
  fs.writeFileSync('src/app/dashboard/admin/tasks/page.js', content);
  console.log("Successfully replaced header!");
} else {
  console.log("Header replacement failed - regex didn't match.");
}
