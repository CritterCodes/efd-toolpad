import fs from 'fs';
const content = fs.readFileSync('src/app/api/tasks/service.js', 'utf8');
console.log(content.length)