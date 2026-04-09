const fs = require('fs');
const content = fs.readFileSync('src/app/components/repairs/NewRepairForm.js', 'utf8');

const hookStart = content.indexOf('export default function NewRepairForm');
let returnIdx = content.lastIndexOf('return (');

if(returnIdx === -1) {
    returnIdx = content.lastIndexOf('return(');
}

fs.writeFileSync('repair_hook.txt', content.substring(0, returnIdx));
fs.writeFileSync('repair_render.txt', content.substring(returnIdx));
console.log("Split done.", returnIdx);
