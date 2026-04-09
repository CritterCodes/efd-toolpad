const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/admin/tasks/page.js', 'utf8');

// Add imports
if (!content.includes('import TasksFilters')) {
  content = content.replace(
    "import TasksHeader from './components/TasksHeader';",
    "import TasksHeader from './components/TasksHeader';\nimport TasksFilters from './components/TasksFilters';\nimport TasksStatistics from './components/TasksStatistics';"
  );
}

// 1. the Statistics block
const statsStart = content.indexOf('{/* Statistics */}');
const filtersStart = content.indexOf('{/* Filters */}');

if (statsStart !== -1 && filtersStart !== -1 && statsStart < filtersStart) {
  content = content.slice(0, statsStart) + 
            "{/* Statistics */}\n        <TasksStatistics statistics={statistics} />\n\n        " + 
            content.slice(filtersStart);
}

// 2. the Filters block
const filtersStart2 = content.indexOf('{/* Filters */}');
const tasksGridStart = content.indexOf('{/* Tasks Grid */}');

if (filtersStart2 !== -1 && tasksGridStart !== -1 && filtersStart2 < tasksGridStart) {
  content = content.slice(0, filtersStart2) + 
            "{/* Filters */}\n        <TasksFilters \n" +
            "          searchQuery={searchQuery} setSearchQuery={setSearchQuery}\n" +
            "          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}\n" +
            "          metalTypeFilter={metalTypeFilter} setMetalTypeFilter={setMetalTypeFilter}\n" +
            "          activeFilter={activeFilter} setActiveFilter={setActiveFilter}\n" +
            "          sortBy={sortBy} setSortBy={setSortBy}\n" +
            "          sortOrder={sortOrder} setSortOrder={setSortOrder}\n" +
            "          filters={filters}\n" +
            "        />\n\n        " + 
            content.slice(tasksGridStart);
}

fs.writeFileSync('src/app/dashboard/admin/tasks/page.js', content);
console.log('Successfully replaced filters and stats blocks');
