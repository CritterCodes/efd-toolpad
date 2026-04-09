const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  try {
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
          results = results.concat(walk(file));
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx')) && !file.includes('-backup') && !file.includes('.legacy.') && !file.includes('_old') && !file.includes('-redundant') && !file.includes('-broken')) {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n').length;
          if (lines > 300) {
            results.push({file, lines});
          }
        }
      });
  } catch (e) {}
  return results;
}
const res = walk('./src');
res.sort((a, b) => b.lines - a.lines);
console.log(res.slice(0, 20).map(r => r.lines + ' ' + r.file).join('\n'));
