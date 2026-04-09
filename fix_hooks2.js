const fs = require('fs');
let s1 = fs.readFileSync('src/hooks/repairs/useQualityControl.js', 'utf8');
s1 = s1.replace(/if \(!repair\) \{\s*return \{ repair/g, 'return { repair');
fs.writeFileSync('src/hooks/repairs/useQualityControl.js', s1);

let s2 = fs.readFileSync('src/lib/artisanService.js', 'utf8');
let idx1 = s2.indexOf('function generateSlug(name) {');
if (idx1 !== -1) {
  let idx2 = s2.indexOf('function generateSlug(name) {', idx1 + 1);
  if (idx2 !== -1) {
    // Remove the second declaration block
    let before = s2.substring(0, idx2);
    // Find the end of it (just guess 100 character down where the closing brace is)
    let afterStart = s2.indexOf('}', idx2) + 1;
    let after = s2.substring(afterStart);
    // Also remove the doc block if present right before it
    before = before.replace(/\/\*\*[\s\*a-zA-Z0-9\-\.\@]*\*\/\s*$/, '');
    s2 = before + after;
    fs.writeFileSync('src/lib/artisanService.js', s2);
  }
}
