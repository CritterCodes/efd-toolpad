const fs = require('fs');
const content = fs.readFileSync('src/components/admin/IntegrationsTab.js', 'utf8');
console.log(content.slice(0, 500));
