const fs = require('fs');
const path = require('path');

const srcFile = path.join('src', 'lib', 'roleBasedNavigation.js');
let source = fs.readFileSync(srcFile, 'utf8');

// If the file was already processed by a previous run, revert it!
if (source.includes('AST-like split complete')) {
  require('child_process').execSync('git checkout src/lib/roleBasedNavigation.js');
  source = fs.readFileSync(srcFile, 'utf8');
}


const commonIcons = `import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Handyman";
import BarChartIcon from "@mui/icons-material/Insights";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory2";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SettingsIcon from "@mui/icons-material/Settings";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HandymanIcon from "@mui/icons-material/Handyman";
import ListIcon from "@mui/icons-material/List";
import ReceivingIcon from "@mui/icons-material/Inbox";
import MoveUpIcon from "@mui/icons-material/DriveFileMove";
import PickupIcon from "@mui/icons-material/LocalShipping";
import QualityIcon from "@mui/icons-material/VerifiedUser";
import PartsIcon from "@mui/icons-material/Category";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HistoryIcon from "@mui/icons-material/History";
import DiamondIcon from "@mui/icons-material/AutoAwesome";
import RingIcon from "@mui/icons-material/FiberSmartRecord";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import BusinessIcon from "@mui/icons-material/Business";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import PaymentIcon from "@mui/icons-material/Payment";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import PrintIcon from "@mui/icons-material/Print";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
`;


function extractBlock(startRegex, openChar, closeChar) {
  const match = source.match(startRegex);
  if (!match) return { text: '', startIdx: -1, endIdx: -1 };
  
  const startIdx = match.index;
  let inString = false;
  let stringChar = '';
  let count = 0;
  let started = false;
  
  for (let i = startIdx; i < source.length; i++) {
    let c = source[i];
    
    if (inString) {
      if (c === stringChar && source[i-1] !== '\\') {
        inString = false;
      }
      continue;
    }
    
    if (c === '"' || c === "'" || c === '\`') {
      inString = true;
      stringChar = c;
      continue;
    }
    
    if (c === openChar) {
      count++;
      started = true;
    } else if (c === closeChar) {
      count--;
    }
    
    if (started && count === 0) {
      // Find end of line/statement if necessary
      let endIdx = i + 1;
      // if there's a semicolon, include it
      if (source[endIdx] === ';') endIdx++;
      
      return {
        text: source.substring(startIdx, endIdx),
        startIdx,
        endIdx
      };
    }
  }
  
  return { text: '', startIdx: -1, endIdx: -1 };
}

// Extract SHARED_NAVIGATION
const sharedBlock = extractBlock(/const SHARED_NAVIGATION \=/, '{', '}');

// Extract generateArtisanNavigation
const artisanBlock = extractBlock(/\/\*\*[\s\S]*?generateArtisanNavigation/, '{', '}');
let generateArtisanStr = artisanBlock.text;
if (!generateArtisanStr) {
   const art2 = extractBlock(/export function generateArtisanNavigation/, '{', '}');
   generateArtisanStr = art2.text;
}

// Extract ROLE_NAVIGATION
const roleNavBlock = extractBlock(/export const ROLE_NAVIGATION \=/, '{', '}');

const roleNavInnerRegex = /export const ROLE_NAVIGATION \= \{([\s\S]*)\};?/;
const roleNavInnerMatch = roleNavBlock.text.match(roleNavInnerRegex);
const roleNavInner = roleNavInnerMatch ? roleNavInnerMatch[1] : roleNavBlock.text;

const roles = ['WHOLESALER', 'ARTISAN_APPLICANT', 'ARTISAN', 'STAFF', 'DEV', 'ADMIN'];
let roleNavStrs = {};

for (let i = 0; i < roles.length; i++) {
  const role = roles[i];
  const nextRole = roles[i+1];
  const startStr = `\\[USER_ROLES\\.${role}\\]: \\[\n`;
  
  if (nextRole) {
    const endStr = `\\[USER_ROLES\\.${nextRole}\\]: \\[\n`;
    const regex = new RegExp(`(\\[USER_ROLES\\.${role}\\]: \\[[\\s\\S]*?)(?=(?:\\n\\s*\\/\\/.*?\\n\\s*)*${endStr})`);
    const match = roleNavInner.match(regex);
    if (match) {
        roleNavStrs[role] = match[1].trim();
    } else {
        // Fallback
        const fallbackRegex = new RegExp(`\\[USER_ROLES\\.${role}\\]: \\[[\\s\\S]*?\\]`);
        const fbMatch = roleNavInner.match(fallbackRegex);
        if (fbMatch) roleNavStrs[role] = fbMatch[0];
    }
  } else {
    // For ADMIN, we need to extract everything until the end of ROLE_NAVIGATION
    // Extracting an array `[` to `]` using a counter parser for `[`
    const adminStartIdx = roleNavInner.indexOf(`[USER_ROLES.ADMIN]:`);
    let count = 0;
    let started = false;
    let endIdx = -1;
    for(let j = adminStartIdx; j < roleNavInner.length; j++) {
       if (roleNavInner[j] === '[') {
           started = true;
           count++;
       } else if (roleNavInner[j] === ']') {
           count--;
       }
       if (started && count === 0) {
           endIdx = j+1;
           break;
       }
    }
    roleNavStrs[role] = roleNavInner.substring(adminStartIdx, endIdx);
  }

  // Remove trailing comma
  if (roleNavStrs[role] && roleNavStrs[role].endsWith(',')) {
     roleNavStrs[role] = roleNavStrs[role].slice(0, -1);
  }
}

// Gather remaining helper functions
const getNavigationForRoleBlock = extractBlock(/(\/\*\*[\s\S]*?)?export function getNavigationForRole/, '{', '}');
const canAccessAdminBlock = extractBlock(/(\/\*\*[\s\S]*?)?export function canAccessAdmin/, '{', '}');
const getEffectiveRoleBlock = extractBlock(/(\/\*\*[\s\S]*?)?export function getEffectiveRole/, '{', '}');
const getAvailableRolesForSwitchingBlock = extractBlock(/(\/\*\*[\s\S]*?)?export function getAvailableRolesForSwitching/, '{', '}');


const navDir = path.join('src', 'lib', 'navigation');
if (!fs.existsSync(navDir)) {
  fs.mkdirSync(navDir, { recursive: true });
}


fs.writeFileSync(path.join(navDir, 'sharedNavigation.js'), 
`import DashboardIcon from "@mui/icons-material/Dashboard";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsIcon from "@mui/icons-material/Settings";

// Shared Navigation components
export ${sharedBlock.text}\n`);

fs.writeFileSync(path.join(navDir, 'artisanNavigation.js'), 
`import React from "react";
import { USER_ROLES } from "@/config/constants";
${commonIcons}
import { SHARED_NAVIGATION } from "./sharedNavigation";

// NOTE: Ensure to have these mappings or update them if needed!
// Assuming these were in scope previously or imported at top
// We just add standard imports to fix any build warnings if needed
// Or dynamic imports if we are using them.

${generateArtisanStr}
`);


const createRoleFile = (roleKey, moduleName) => {
  fs.writeFileSync(path.join(navDir, `${moduleName}.js`), 
`import React from "react";
import { USER_ROLES } from "@/config/constants";
${commonIcons}
import { SHARED_NAVIGATION } from "./sharedNavigation";

export const ${moduleName} = {
  ${roleNavStrs[roleKey]}
};
`);
};

createRoleFile('WHOLESALER', 'wholesalerNavigation');
createRoleFile('ARTISAN_APPLICANT', 'artisanApplicantNavigation');
createRoleFile('ARTISAN', 'artisanNavigationConfig');
createRoleFile('STAFF', 'staffNavigation');
createRoleFile('DEV', 'devNavigation');
createRoleFile('ADMIN', 'adminNavigation');

const mainCode = `import React from "react";
/**
 * Role-Based Navigation System
 * Defines navigation menus for different user roles and includes role switching for devs/admins
 */
import { USER_ROLES } from "@/config/constants";
import { generateArtisanNavigation } from "./navigation/artisanNavigation";
import { wholesalerNavigation } from "./navigation/wholesalerNavigation";
import { artisanApplicantNavigation } from "./navigation/artisanApplicantNavigation";
import { artisanNavigationConfig } from "./navigation/artisanNavigationConfig";
import { staffNavigation } from "./navigation/staffNavigation";
import { devNavigation } from "./navigation/devNavigation";
import { adminNavigation } from "./navigation/adminNavigation";

${commonIcons}

export const ROLE_NAVIGATION = {
  ...wholesalerNavigation,
  ...artisanApplicantNavigation,
  ...artisanNavigationConfig,
  ...staffNavigation,
  ...devNavigation,
  ...adminNavigation
};

${getNavigationForRoleBlock.text}

${canAccessAdminBlock.text}

${getEffectiveRoleBlock.text}

${getAvailableRolesForSwitchingBlock.text}
`;

fs.writeFileSync(srcFile, mainCode);
console.log('Fixed execution!');
