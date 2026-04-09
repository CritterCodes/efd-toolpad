import fs from 'fs';
fs.writeFileSync('dump_artisan.txt', fs.readFileSync('src/app/components/custom-tickets/ArtisanAssignment.js', 'utf8'));
fs.writeFileSync('dump_jewelry.txt', fs.readFileSync('src/app/dashboard/products/jewelry/page.js', 'utf8'));
fs.writeFileSync('dump_schema.txt', fs.readFileSync('src/schemas/enhanced-material.schema.js', 'utf8'));
