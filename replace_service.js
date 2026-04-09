const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/admin/tasks/create/page.js', 'utf8');

const anchor = 'Service Settings</Typography>';
const anchorIdx = code.indexOf(anchor);

if (anchorIdx !== -1) {
  const startIdx = code.lastIndexOf('<Grid item xs={12}>', anchorIdx);
  const endIdx = code.indexOf('{/* Display Settings */}', startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    const block = code.substring(startIdx, endIdx);
    fs.writeFileSync('service_block.txt', block);
    code = code.replace(block, '<ServiceSettingsSection formData={formData} setFormData={setFormData} />\n\n            ');
    code = code.replace("import { MaterialsSelectionSection } from \"./components/MaterialsSelectionSection\";", 
        "import { MaterialsSelectionSection } from \"./components/MaterialsSelectionSection\";\nimport { ServiceSettingsSection } from \"./components/ServiceSettingsSection\";");
    fs.writeFileSync('src/app/dashboard/admin/tasks/create/page.js', code);
    console.log('Replaced Service Settings');
  }
}
