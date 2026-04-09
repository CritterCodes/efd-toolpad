import fs from 'fs';
const text = fs.readFileSync('src/app/components/wholesale/WholesaleRepairForm.js', 'utf8');

// The file has a React component WholesaleRepairForm
// Create src/hooks/wholesale/useWholesaleRepairForm.js
const hookDir = 'src/hooks/wholesale';
fs.mkdirSync(hookDir, { recursive: true });

// Extract everything from "export default function WholesaleRepairForm" up to "return ("
const mainFuncStart = text.indexOf('export default function WholesaleRepairForm');
let hookPart = text.substring(0, text.indexOf('return (', mainFuncStart));

// Wait, doing this strictly programmatically is hard since "return (" can appear in closures!
