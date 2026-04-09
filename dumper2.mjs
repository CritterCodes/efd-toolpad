import fs from 'fs';
fs.writeFileSync('dump_tasks.txt', fs.readFileSync('src/utils/tasks.util.js', 'utf8'));
fs.writeFileSync('dump_stuller.txt', fs.readFileSync('src/app/components/materials/StullerProductsManager.js', 'utf8'));
fs.writeFileSync('dump_obj.txt', fs.readFileSync('src/components/viewers/OBJViewer.jsx', 'utf8'));
