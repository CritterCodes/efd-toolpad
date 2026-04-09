const fs = require('fs');
const content = fs.readFileSync('src/utils/materials.util.js', 'utf8');

const blocks = [];
let currentBlock = [];
for (const line of content.split('\n')) {
    if (line.startsWith('/**') || line.startsWith('export const ') || line.startsWith('export function ')) {
        if (currentBlock.length > 0) {
            blocks.push(currentBlock.join('\n'));
            currentBlock = [];
        }
    }
    currentBlock.push(line);
}
if (currentBlock.length > 0) blocks.push(currentBlock.join('\n'));

fs.mkdirSync('src/utils/categories', { recursive: true });

let metals = ["// Mapped Metal Utils"];
let gemstones = ["// Mapped Gemstone Utils"];
let constants = ["// Mapped Constants"];

for (const block of blocks) {
    if (block.includes('metal') || block.includes('alloy') || block.includes('gold')) {
        metals.push(block);
    } else if (block.includes('gemstone') || block.includes('stone') || block.includes('diamond')) {
        gemstones.push(block);
    } else {
        constants.push(block);
    }
}

fs.writeFileSync('src/utils/categories/metal.util.js', metals.join('\n\n'));
fs.writeFileSync('src/utils/categories/gemstone.util.js', gemstones.join('\n\n'));
fs.writeFileSync('src/utils/categories/constants.util.js', constants.join('\n\n'));

// Create the Facade
let facade = `// Auto-generated Facade for materials.util.js
export * from './categories/metal.util.js';
export * from './categories/gemstone.util.js';
export * from './categories/constants.util.js';
`;
fs.writeFileSync('src/utils/materials.util.js', facade);
console.log('materials.util.js refactored correctly');
