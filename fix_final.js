const fs = require('fs');
let qc = fs.readFileSync('src/hooks/repairs/useQualityControl.js', 'utf8');

// I will just replace the entire header
qc = "'use client';\n" + qc.replace(/import \{ useState, useEffect \} from 'react';\nimport \{ useRouter \} from 'next\/navigation';\n\n"use client";\n/g, '').replace(/'use client';\n'use client';\n/g, "'use client';\n");
fs.writeFileSync('src/hooks/repairs/useQualityControl.js', qc);

let s2 = fs.readFileSync('src/lib/artisanService.js', 'utf8');
const regex = /\/\*\*\s*\*\s*Generate a unique slug[\s\S]*?function generateSlug\(name\) \{(?:[^{}]*|\{[^{}]*\})*\}/g;
s2 = s2.replace(regex, '');
// And just in case there's another duplicate left over:
let count = 0;
s2 = s2.replace(/function generateSlug/g, (match) => {
  count++;
  if (count > 1) return 'function generateSlugDuplicate';
  return match;
});
fs.writeFileSync('src/lib/artisanService.js', s2);
