const fs = require('fs');

const oldCode = fs.readFileSync('dae8c56-cad.js', 'utf8');
const startIndex = oldCode.indexOf('{/* Filters */}');
const endIndex = oldCode.indexOf('<CADApproveDialog');

let listCode = '';
if (startIndex !== -1 && endIndex !== -1) {
    listCode = oldCode.substring(startIndex, endIndex);
}

const componentTop = `import React from 'react';
import { Paper, Grid, FormControl, InputLabel, Select, MenuItem, Box, Tabs, Tab, Card, CardContent, Typography, Chip, Button, Divider, CircularProgress, Tooltip, IconButton, Avatar } from '@mui/material';
import { Upload as UploadIcon, Download as DownloadIcon, Visibility as ViewIcon, Edit as EditIcon, Check as ApproveIcon, Close as RejectIcon, AttachMoney as PriceIcon, Assessment as VolumeIcon } from '@mui/icons-material';

export default function CADRequestList({
    requests = [], statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, 
    selectedTab, setSelectedTab, handleStartDesign, setSelectedRequest, getFilteredRequests, loading, fetchCADRequests,
    getStatusColor, getPriorityColor, getTimelineColor
}) {
    return (
        <React.Fragment>
`;

const componentBottom = `
        </React.Fragment>
    );
}
`;

fs.writeFileSync('src/components/cad-requests/CADRequestList.js', componentTop + listCode + componentBottom);
console.log('Done rewritng CADRequestList.js');
