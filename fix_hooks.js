const fs = require('fs');

try {
  let s = fs.readFileSync('src/hooks/repairs/useQualityControl.js', 'utf8');
  s = s.replace(/    if \(\!repair\) \{\n            return \{ repair/, '    return { repair');
  if (!s.endsWith('}\n')) s += '\n}\n';
  fs.writeFileSync('src/hooks/repairs/useQualityControl.js', s);
} catch (e) {}

const files = [
  'src/hooks/cad-requests/useCadRequests.js',
  'src/hooks/requests/useCadRequests.js',
  'src/hooks/repairs/useRepairDetail.js',
  'src/app/dashboard/cad-requests/page.js',
  'src/app/dashboard/requests/cad-requests/page.js',
  'src/app/dashboard/repairs/[repairID]/page.js',
  'src/app/dashboard/repairs/quality-control/[repairID]/page.js'
];
for(const f of files) {
  if(fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes("'use client'") && !content.includes('"use client"')) {
      fs.writeFileSync(f, "'use client';\n" + content);
    }
  }
}
