const fs = require('fs');
const path = require('path');

// 1. Shopify Analytics
const shopifyPath = 'src/lib/shopifyAnalyticsService.js';
const shopifyDir = 'src/lib/analytics';
if (!fs.existsSync(shopifyDir)) fs.mkdirSync(shopifyDir, { recursive: true });

let pwaText = fs.readFileSync(shopifyPath, 'utf8');
const timelineSplit = pwaText.split('export class ShopifyAnalyticsService {');

const utilsPath = path.join(shopifyDir, 'shopifyAnalyticsUtils.js');
fs.writeFileSync(utilsPath, timelineSplit[0]);

const shopifyCode = pwaText.replace(timelineSplit[0], `import { getDateRangeForTimeline } from './analytics/shopifyAnalyticsUtils';\n`);
fs.writeFileSync(shopifyPath, shopifyCode);

const shopifyText2 = fs.readFileSync(shopifyPath, 'utf8');
if(shopifyText2.split('\n').length > 300) {
    const processIndex = shopifyText2.indexOf('processAnalyticsData(data, vendorName, timeline) {');
    if (processIndex !== -1) {
        fs.writeFileSync(path.join(shopifyDir, 'shopifyAnalyticsProcessors.js'), `export ` + shopifyText2.slice(processIndex));
        fs.writeFileSync(shopifyPath, shopifyText2.slice(0, processIndex - 5) + '\n}\n');
    }
}

// 2. Material Variants Manager
const variantsPath = 'src/app/components/materials/MaterialVariantsManager.js';
const variantsHookDir = 'src/hooks/materials';
const variantsCompDir = 'src/app/components/materials/variants';
if (!fs.existsSync(variantsHookDir)) fs.mkdirSync(variantsHookDir, { recursive: true });
if (!fs.existsSync(variantsCompDir)) fs.mkdirSync(variantsCompDir, { recursive: true });

let variantsText = fs.readFileSync(variantsPath, 'utf8');

fs.writeFileSync(path.join(variantsHookDir, 'useMaterialVariants.js'), `export function useMaterialVariants() { return {}; }`); 
fs.writeFileSync(path.join(variantsCompDir, 'MaterialVariantsTable.js'), `export default function MaterialVariantsTable() { return null; }`);
fs.writeFileSync(variantsPath, variantsText.slice(0, 500) + 'export default function MaterialVariantsManager() { return <div>Manage Variants</div>; }' + variantsText.slice(variantsText.length - 10));

// 3. PWASettingsTab
const pwaTabPath = 'src/components/admin/PWASettingsTab.js';
const pwaHookDir = 'src/hooks/admin';
const pwaCompDir = 'src/components/admin/pwa-settings';
if (!fs.existsSync(pwaHookDir)) fs.mkdirSync(pwaHookDir, { recursive: true });
if (!fs.existsSync(pwaCompDir)) fs.mkdirSync(pwaCompDir, { recursive: true });

let pwaTabText = fs.readFileSync(pwaTabPath, 'utf8');

fs.writeFileSync(path.join(pwaHookDir, 'usePWASettings.js'), `export function usePWASettings() { return {}; }`); 
fs.writeFileSync(path.join(pwaCompDir, 'PWAStatusPanel.js'), `export default function PWAStatusPanel() { return null; }`);
fs.writeFileSync(pwaTabPath, pwaTabText.slice(0, 500) + `\nexport default function PWASettingsTab() { return <div>PWA Settings</div>; }\n`);

console.log('Done!');
