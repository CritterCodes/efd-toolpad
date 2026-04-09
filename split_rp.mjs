import fs from 'fs';

const txt = fs.readFileSync('dump_rp.txt', 'utf8');

const c1 = txt.indexOf('{/* Stats Cards */}');
const c2 = txt.indexOf('{/* Search */}');
const p1 = txt.substring(c1, c2);

fs.mkdirSync('src/app/dashboard/repairs/receiving/parts', { recursive: true });

const generateComp = (name, content, imports = '') => {
  return `import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Select, MenuItem } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

${imports}

export const ${name} = ({ receivingRepairs, todayReceived, urgentRepairs, sortAnchor, setSortAnchor }) => {
    return (
        <>
${content}
        </>
    );
};
`;
};

fs.writeFileSync('src/app/dashboard/repairs/receiving/parts/StatsCardsSection.js', generateComp('StatsCardsSection', p1));


const prefix = txt.substring(0, c1);
const suffix = txt.substring(c2);

const newMain = prefix.replace(
  "import {", 
  "import { StatsCardsSection } from './parts/StatsCardsSection';\nimport {"
) + `
            <StatsCardsSection 
                receivingRepairs={receivingRepairs}
                todayReceived={todayReceived}
                urgentRepairs={urgentRepairs}
                sortAnchor={sortAnchor}
                setSortAnchor={setSortAnchor}
            />
` + suffix;


fs.writeFileSync('src/app/dashboard/repairs/receiving/page.js', newMain);
console.log('Receiving Page split correctly.');

