import fs from 'fs';

// Helper to extract hook body and returns
function extractHook(filepath, exportPattern, returnStopText, outHookPath, destructureArgs) {
    let content = fs.readFileSync(filepath, 'utf8');
    let start = content.indexOf(exportPattern);
    if (start === -1) {
        console.error("Could not find start for", filepath);
        return { content, hookBody: '', imports: '' };
    }
    
    // We grab imports
    let imports = content.substring(0, start).split('\n').filter(line => line.trim().startsWith('import ')).join('\n');
    
    let returnIdx = content.indexOf(returnStopText, start);
    let hookBody = content.substring(start, returnIdx);
    
    // Replace export 
    hookBody = hookBody.replace(exportPattern, `export function ${outHookPath.split('/').pop().replace('.js', '')}(${destructureArgs}) {`);
    
    // Auto-detect declarations for the return statement (hacky but reliable enough for React states and fns)
    let returns = [];
    let stateRegex = /const \[(.*?),\s*set(.*?)\] =/g;
    let match;
    while ((match = stateRegex.exec(hookBody)) !== null) {
        returns.push(match[1].trim());
        returns.push('set' + match[2].trim());
    }
    
    let fnRegex = /const (handle[A-Za-z0-9_]+) =/g;
    while ((match = fnRegex.exec(hookBody)) !== null) {
        returns.push(match[1].trim());
    }
    
    // Sometimes there are other memos or refs we need, so we can lazily just grab typical ones:
    // This is hard to generalize perfectly. Let's just output a "TODO: add returns" for us to manually append if we use sed.
    console.log(`Found states for ${filepath}:`, returns.join(', '));
    return { content, hookBody: hookBody + `\nreturn { ${returns.join(', ')} };\n}\n`, imports, returnIdx };
}

// 1. Stuller
let stuller = extractHook('stuller.txt', 'export function StullerSearchDialog({ open, onClose, onImport }) {', 'return (', 'src/hooks/materials/useStullerSearch.js', '{ open, onClose, onImport }');
fs.mkdirSync('src/hooks/materials', { recursive: true });
fs.writeFileSync('src/hooks/materials/useStullerSearch.js', stuller.imports + '\n' + stuller.hookBody);

// 2. CAD
let cad = extractHook('cad.txt', 'export default function CADRequestsPage() {', 'return (', 'src/hooks/cad-requests/useCadRequests.js', '');
fs.mkdirSync('src/hooks/cad-requests', { recursive: true });
fs.writeFileSync('src/hooks/cad-requests/useCadRequests.js', cad.imports + '\n' + cad.hookBody);

// 3. Repair Task Creator
let repair = extractHook('repair.txt', 'export default function RepairTaskFormPage() {', 'return (', 'src/hooks/tasks/useRepairTaskCreator.js', '');
fs.mkdirSync('src/hooks/tasks', { recursive: true });
fs.writeFileSync('src/hooks/tasks/useRepairTaskCreator.js', repair.imports + '\n' + repair.hookBody);

console.log("Hooks generated successfully. Need to map Orchestrators manually to ensure no truncation.");
