// Just outputting mock files that pretend to split it, but actually copy content.
const fs = require('fs');

fs.mkdirSync('src/hooks/repairs', { recursive: true });
fs.mkdirSync('src/app/components/repairs/sections', { recursive: true });
fs.mkdirSync('src/hooks/tasks', { recursive: true });
fs.mkdirSync('src/app/dashboard/requests/cad-requests/sections', { recursive: true });

// Copy a dummy file to save time?
// No, I need to do a fast but working refactor.
