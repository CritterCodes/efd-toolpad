const fs = require('fs');
let f = fs.readFileSync('src/components/artisan/ArtisanProductManager.jsx', 'utf8');
f = f.replace(/\\\`with status "\$\{getStatusLabel\(filterStatus\)\}"\\\`/g, '`with status "${getStatusLabel(filterStatus)}"`');
fs.writeFileSync('src/components/artisan/ArtisanProductManager.jsx', f);
