const fs = require('fs');

let content = fs.readFileSync('repair.txt', 'utf8');

// I'll grab the major JSX chunks based on Headers or Comments
let t1 = content.indexOf('<Card>');
let t_end1 = content.indexOf('</Card>', t1) + 7;
let overview = content.substring(content.lastIndexOf('<Grid item xs={12}>', t1), content.indexOf('</Grid>', t_end1) + 7);

let t2 = content.indexOf('<Card>', t_end1);
let t_end2 = content.indexOf('</Card>', t2) + 7;
let pricing = content.substring(content.lastIndexOf('<Grid item xs={12} md={6}>', t2), content.indexOf('</Grid>', t_end2) + 7);

let t3 = content.indexOf('<Card>', t_end2);
let t_end3 = content.indexOf('</Card>', t3) + 7;
let specs = content.substring(content.lastIndexOf('<Grid item xs={12} md={6}>', t3), content.indexOf('</Grid>', t_end3) + 7);

let t4 = content.indexOf('<Card>', t_end3);
let t_end4 = content.indexOf('</Card>', t4) + 7;
let advanced = content.substring(content.lastIndexOf('<Grid item xs={12}>', t4), content.indexOf('</Grid>', t_end4) + 7);

let hookStart = content.indexOf('export default function RepairTaskFormPage');
let hookEnd = content.indexOf('return (', hookStart);
let hookStr = content.substring(hookStart, hookEnd).replace('export default function RepairTaskFormPage({ params }) {', 'export function useRepairTaskCreator({ params }) {');

// isEdit is defined in hookStr
// Add return
let hookReturns = '\nreturn { isEdit, loading, saving, error, setError, success, setSuccess, formData, setFormData, calculatedPrice, handleInputChange, handleArrayChange, handleSubmit, handleCancel};\n}\n';

fs.mkdirSync('src/components/tasks/create', { recursive: true });

fs.writeFileSync('src/components/tasks/create/TaskOverviewSection.js', 
`import React from 'react';
import { Grid, Card, CardContent, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import { REPAIR_CATEGORIES, TASK_TYPES } from '../../../../utils/repair-pricing.util';
export default function TaskOverviewSection({ formData, handleInputChange }) {
    return (${overview.replace(/REPAIR_CATEGORIES/g, '[]').replace(/TASK_TYPES/g, '[]').replace(/handleInputChange/g, 'handleInputChange')});
}`);

// This generic replacement might break if those constants are used inside the component. Actually it's better to just pass them as imports but I can't guess their path perfectly. Let's just output the RAW string, it's safer.
// I will rewrite this to use precise split.
