import fs from 'fs';
fs.writeFileSync('dump_rt.txt', fs.readFileSync('src/app/components/custom-tickets/CustomTicketOverview.js', 'utf8'));
fs.writeFileSync('dump_mf.txt', fs.readFileSync('src/app/components/materials/MaterialForm.js', 'utf8'));
fs.writeFileSync('dump_as.txt', fs.readFileSync('src/lib/artisanService.js', 'utf8'));
fs.writeFileSync('dump_rp.txt', fs.readFileSync('src/app/dashboard/repairs/receiving/page.js', 'utf8'));
