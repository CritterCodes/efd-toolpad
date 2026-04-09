const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/admin/tasks/page.js', 'utf8');

if (!content.includes('import TasksGrid')) {
  content = content.replace(
    "import TasksStatistics from './components/TasksStatistics';",
    "import TasksStatistics from './components/TasksStatistics';\nimport TasksGrid from './components/TasksGrid';"
  );
}

const gridStart = content.indexOf('{/* Tasks Grid */}');
const paginationStart = content.indexOf('{/* Pagination */}');

if (gridStart !== -1 && paginationStart !== -1 && gridStart < paginationStart) {
  content = content.slice(0, gridStart) + 
            "{/* Tasks Grid */}\n        <TasksGrid \n" +
            "          tasks={tasks} loading={loading}\n" +
            "          searchQuery={searchQuery} categoryFilter={categoryFilter}\n" +
            "          metalTypeFilter={metalTypeFilter} activeFilter={activeFilter}\n" +
            "          router={router} setSelectedTask={setSelectedTask}\n" +
            "          setViewDialog={setViewDialog} setDeleteDialog={setDeleteDialog}\n" +
            "        />\n\n        " + 
            content.slice(paginationStart);
}

fs.writeFileSync('src/app/dashboard/admin/tasks/page.js', content);
console.log('Grid replaced!');
