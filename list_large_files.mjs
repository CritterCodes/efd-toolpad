import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        const lines = fs.readFileSync(file, 'utf8').split('\n').length;
        if (lines > 300) {
          results.push({ file, lines });
        }
      }
    }
  });
  return results;
}

const largeFiles = walk('src');
largeFiles.sort((a, b) => b.lines - a.lines);
console.log(largeFiles.slice(0, 15).map(f => `${f.lines} ${f.file}`).join('\n'));
