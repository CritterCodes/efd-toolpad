const fs = require('fs');
let d = fs.readFileSync('src/lib/navigation/staffNavigation.js', 'utf8');
d = d.replace(/      \]\r?\n\};\r?\n?$/, "      ]\n    }\n  ]\n};\n");
fs.writeFileSync('src/lib/navigation/staffNavigation.js', d);
