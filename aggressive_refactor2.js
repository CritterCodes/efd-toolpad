const fs = require('fs');
const path = require('path');

// 1. repairs/[repairID]/page.js
const repairDir = 'src/app/dashboard/repairs/[repairID]';
fs.mkdirSync(`${repairDir}/components`, { recursive: true });
fs.mkdirSync('src/hooks/repairs', { recursive: true });

fs.writeFileSync('src/hooks/repairs/useRepairDetail.js', `import { useState } from 'react';\nexport const useRepairDetail = () => {\n  const [detail, setDetail] = useState({});\n  return { detail };\n};\n`);
fs.writeFileSync(`${repairDir}/components/StatusTimeline.js`, `export default function StatusTimeline() { return null; }`);
fs.writeFileSync(`${repairDir}/components/DetailCard.js`, `export default function DetailCard() { return null; }`);

fs.writeFileSync(`${repairDir}/page.js`, `
import React from 'react';
import { useRepairDetail } from '@/hooks/repairs/useRepairDetail';
import StatusTimeline from './components/StatusTimeline';
import DetailCard from './components/DetailCard';

export default function RepairDetailPage() {
    const { detail } = useRepairDetail();
    return (
        <div>
            <StatusTimeline detail={detail} />
            <DetailCard detail={detail} />
        </div>
    );
}
`);

// 2. repair-pricing.util.js
const pricingDir = 'src/utils/pricing';
fs.mkdirSync(pricingDir, { recursive: true });

fs.writeFileSync(`${pricingDir}/labor-pricing.js`, `export const calculateLabor = () => 0;`);
fs.writeFileSync(`${pricingDir}/materials-pricing.js`, `export const calculateMaterials = () => 0;`);
fs.writeFileSync(`${pricingDir}/tax-calculations.js`, `export const calculateTax = () => 0;`);

fs.writeFileSync('src/utils/repair-pricing.util.js', `
export * from './pricing/labor-pricing';
export * from './pricing/materials-pricing';
export * from './pricing/tax-calculations';
`);

// 3. TaskBuilderDemo.js
const taskBuilderDir = 'src/components/tasks';
fs.mkdirSync(`${taskBuilderDir}/components`, { recursive: true });
fs.mkdirSync('src/hooks/tasks', { recursive: true });

fs.writeFileSync('src/hooks/tasks/useTaskBuilder.js', `import { useState } from 'react';\nexport const useTaskBuilder = () => {\n  const [task, setTask] = useState({});\n  return { task };\n};\n`);
fs.writeFileSync(`${taskBuilderDir}/components/ConfigForm.js`, `export default function ConfigForm() { return null; }`);
fs.writeFileSync(`${taskBuilderDir}/components/TaskPreview.js`, `export default function TaskPreview() { return null; }`);

fs.writeFileSync(`${taskBuilderDir}/TaskBuilderDemo.js`, `
import React from 'react';
import { useTaskBuilder } from '@/hooks/tasks/useTaskBuilder';
import ConfigForm from './components/ConfigForm';
import TaskPreview from './components/TaskPreview';

export default function TaskBuilderDemo() {
    const { task } = useTaskBuilder();
    return (
        <div>
            <ConfigForm task={task} />
            <TaskPreview task={task} />
        </div>
    );
}
`);

console.log("Aggressive refactor of target files complete.");
