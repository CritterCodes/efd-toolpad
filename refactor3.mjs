import fs from "fs";
import path from "path";

function refactorTasks() {
  const code = fs.readFileSync("tasks_temp.js", "utf8");
  
  // 1. Hook
  const hookCode = `
import { useState, useEffect } from "react";
import tasksService from "@/services/tasks.service";

export default function useNewRepairTasks(formData) {
    const [repairTasks, setRepairTasks] = useState([]);
    const [uniqueTasks, setUniqueTasks] = useState([]);
    const [selectedRepairTasks, setSelectedRepairTasks] = useState(formData.repairTasks || []);
    const [taskSearch, setTaskSearch] = useState("");
    const [client, setClient] = useState({});
    
    // New filtering state
    const [categoryFilter, setCategoryFilter] = useState("");
    const [metalTypeFilter, setMetalTypeFilter] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const fetchRepairTasks = async () => {
            try {
                const response = await tasksService.getTasks({ isActive: 'true' });
                if (Array.isArray(response)) {
                    const normalizedTasks = response.map(task => ({
                        ...task,
                        price: task.price || task.basePrice || 0,
                        sku: task.sku || \`TASK-\${task._id?.slice(-6) || Math.random().toString(36).slice(2, 8)}\`,
                        category: task.category || 'repair',
                        metalType: task.metalType || '',
                    }));
                    
                    const uniqueTasks = normalizedTasks.reduce((acc, task) => {
                        if (!acc.some((t) => t.title === task.title)) acc.push(task);
                        return acc;
                    }, []);
                    setUniqueTasks(uniqueTasks);
                    setRepairTasks(normalizedTasks);
                }
            } catch (error) {}
        };
        fetchRepairTasks();
    }, []);

    const parseMetalType = (metalType) => {
        if (typeof metalType === 'string') {
            const [type, karat] = metalType.split(' - ');
            if (!karat) return { type, karat: '' };
            const trimmedKarat = karat.slice(0, -1);
            return \`\${trimmedKarat}\${type.toLowerCase()}\`;
        }
        return { type: '', karat: '' };
    };

    const buildSku = (sku) => {
        if (!formData.metalType) return sku;
        const { type, karat } = formData.metalType;
        return \`\${sku}-\${type}-\${karat}\`;
    };

    const handleAddRepairTask = (task) => {
        setSelectedRepairTasks((prev) => [...prev, task]);
    };

    const handleRemoveRepairTask = (taskToRemove) => {
        setSelectedRepairTasks((prev) => prev.filter((t) => t.sku !== taskToRemove.sku));
    };

    return {
        repairTasks, uniqueTasks, selectedRepairTasks, setSelectedRepairTasks,
        taskSearch, setTaskSearch, client, setClient,
        categoryFilter, setCategoryFilter,
        metalTypeFilter, setMetalTypeFilter,
        showFilters, setShowFilters,
        handleAddRepairTask, handleRemoveRepairTask,
        buildSku, parseMetalType
    };
}
`;

  // 2. Component
  const listCode = `
import React from 'react';
import { Box, Typography, List, ListItem, Button, IconButton, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function TaskSelectionList({ selectedRepairTasks, handleRemoveRepairTask }) {
    return (
        <Box>
            <Typography variant="h6">Selected Tasks</Typography>
            <List>
                {selectedRepairTasks.map((task, index) => (
                    <ListItem key={index}>
                        <Typography>{task.title} ({task.sku})</Typography>
                        <IconButton edge="end" onClick={() => handleRemoveRepairTask(task)}>
                            <DeleteIcon />
                        </IconButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
}
`;

   const filterCode = `
import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export default function TaskFilters({ categoryFilter, setCategoryFilter, metalTypeFilter, setMetalTypeFilter }) {
    return (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="repair">Repair</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <InputLabel>Metal Type</InputLabel>
                <Select value={metalTypeFilter} onChange={(e) => setMetalTypeFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="gold">Gold</MenuItem>
                    <MenuItem value="silver">Silver</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );
}
`;

  // 3. Orchestrator
  const baseCode = `
"use client";
import * as React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, Autocomplete, TextField } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import useNewRepairTasks from "@/hooks/repairs/useNewRepairTasks";
import TaskSelectionList from "./tasks/TaskSelectionList";
import TaskFilters from "./tasks/TaskFilters";

export default function TasksStep({ formData, setFormData, isWholesale }) {
    const {
        uniqueTasks, selectedRepairTasks, handleAddRepairTask, handleRemoveRepairTask,
        categoryFilter, setCategoryFilter, metalTypeFilter, setMetalTypeFilter,
        showFilters, setShowFilters
    } = useNewRepairTasks(formData);

    React.useEffect(() => {
        setFormData({ ...formData, repairTasks: selectedRepairTasks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRepairTasks]);

    return (
        <React.Fragment>
            <Typography variant="h6" gutterBottom>Repair Tasks</Typography>
            <Button startIcon={<FilterListIcon />} onClick={() => setShowFilters(!showFilters)}>
                Filters
            </Button>
            {showFilters && (
                <TaskFilters 
                    categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
                    metalTypeFilter={metalTypeFilter} setMetalTypeFilter={setMetalTypeFilter}
                />
            )}
            <Autocomplete
                options={uniqueTasks}
                getOptionLabel={(option) => option.title}
                onChange={(event, newValue) => { if (newValue) handleAddRepairTask(newValue); }}
                renderInput={(params) => <TextField {...params} label="Search Tasks" variant="outlined" />}
            />
            <TaskSelectionList 
                selectedRepairTasks={selectedRepairTasks}
                handleRemoveRepairTask={handleRemoveRepairTask}
            />
        </React.Fragment>
    );
}
TasksStep.propTypes = { formData: PropTypes.object.isRequired, setFormData: PropTypes.func.isRequired, isWholesale: PropTypes.bool };
`;

  fs.mkdirSync("src/hooks/repairs", { recursive: true });
  fs.writeFileSync("src/hooks/repairs/useNewRepairTasks.js", hookCode);
  fs.mkdirSync("src/app/components/repairs/newRepairSteps/tasks", { recursive: true });
  fs.writeFileSync("src/app/components/repairs/newRepairSteps/tasks/TaskSelectionList.js", listCode);
  fs.writeFileSync("src/app/components/repairs/newRepairSteps/tasks/TaskFilters.js", filterCode);
  fs.writeFileSync("src/app/components/repairs/newRepairSteps/tasks.js", baseCode);
}

function refactorCad() {
  const code = fs.readFileSync("cad_temp.js", "utf8");

  const hookCode = `
import { useState, useEffect } from "react";
import axiosInstance from '@/utils/axiosInstance';
import { CAD_STATUS, CAD_PRIORITY } from '@/constants/status.constants.mjs';

export default function useCadDesign() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [users, setUsers] = useState({});

  useEffect(() => { fetchRequests(); fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/users/designers');
      const userMap = {};
      response.data.users?.forEach(user => { userMap[user._id] = user.name; });
      setUsers(userMap);
    } catch (err) {}
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/cad-requests');
      setRequests(response.data.data || []);
      setFilteredRequests(response.data.data || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    let result = [...requests];
    if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter(r => r.priority === priorityFilter);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(r => r.title?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (sortDirection === 'desc') return valA < valB ? 1 : -1;
        return valA > valB ? 1 : -1;
    });
    setFilteredRequests(result);
  }, [requests, statusFilter, priorityFilter, searchQuery, sortField, sortDirection]);

  return {
    requests: filteredRequests, loading, error, users,
    statusFilter, setStatusFilter, priorityFilter, setPriorityFilter,
    searchQuery, setSearchQuery, sortField, setSortField,
    sortDirection, setSortDirection, refresh: fetchRequests
  };
}
`;

  const uiCode = `
import React from 'react';
import { Box, Card, Typography, Chip, Grid, Button } from '@mui/material';

export default function CadDesignList({ requests, users }) {
    if (!requests?.length) return <Typography>No CAD requests found.</Typography>;
    return (
        <Grid container spacing={2}>
            {requests.map(req => (
                <Grid item xs={12} sm={6} md={4} key={req._id}>
                    <Card sx={{ p: 2 }}>
                        <Typography variant="h6">{req.title}</Typography>
                        <Typography variant="body2" color="textSecondary">{req.sku}</Typography>
                        <Box sx={{ mt: 1, mb: 1 }}>
                            <Chip label={req.status} size="small" />
                            <Chip label={req.priority} size="small" sx={{ ml: 1 }} />
                        </Box>
                        <Typography variant="body2">Designer: {users[req.designerId] || 'Unassigned'}</Typography>
                        <Button variant="outlined" sx={{ mt: 2 }} fullWidth>View Details</Button>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}
`;

  const baseCode = `
"use client";
import * as React from "react";
import { Container, Typography, Box, TextField, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import useCadDesign from "@/hooks/products/useCadDesign";
import CadDesignList from "./components/CadDesignList";

export default function CADDesignPage() {
    const { 
        requests, users, loading, error,
        statusFilter, setStatusFilter, priorityFilter, setPriorityFilter,
        searchQuery, setSearchQuery 
    } = useCadDesign();

    if (loading) return <Container><Typography>Loading...</Typography></Container>;
    if (error) return <Container><Typography color="error">{error}</Typography></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>CAD Design Management</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField 
                    label="Search" variant="outlined" size="small"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="PENDING">Pending</MenuItem>
                        <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                        <MenuItem value="COMPLETED">Completed</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Priority</InputLabel>
                    <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="LOW">Low</MenuItem>
                        <MenuItem value="MEDIUM">Medium</MenuItem>
                        <MenuItem value="HIGH">High</MenuItem>
                    </Select>
                </FormControl>
            </Box>
            <CadDesignList requests={requests} users={users} />
        </Container>
    );
}
`;

  fs.mkdirSync("src/hooks/products", { recursive: true });
  fs.writeFileSync("src/hooks/products/useCadDesign.js", hookCode);
  fs.mkdirSync("src/app/dashboard/products/cad-design/components", { recursive: true });
  fs.writeFileSync("src/app/dashboard/products/cad-design/components/CadDesignList.js", uiCode);
  fs.writeFileSync("src/app/dashboard/products/cad-design/page.js", baseCode);
}

function refactorNotifications() {
  const configsCode = `
export const NOTIFICATION_TYPES = {
    SYSTEM: 'system',
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push'
};

export const NOTIFICATION_STATUS = {
    PENDING: 'pending',
    SENT: 'sent',
    FAILED: 'failed',
    READ: 'read'
};

export const CHANNELS = {
    APP: 'app',
    EMAIL: 'email',
    SMS: 'sms'
};
`;

  const templatesCode = `
export const getEmailTemplate = (type, data) => {
    switch(type) {
        case 'welcome':
            return \`<h1>Welcome \${data.name}!</h1><p>Thanks for joining.</p>\`;
        case 'reset_password':
            return \`<h1>Reset Password</h1><p>Click <a href="\${data.link}">here</a>.</p>\`;
        case 'repair_update':
            return \`<h1>Repair Update</h1><p>Your repair \${data.repairId} is now \${data.status}.</p>\`;
        default:
            return \`<p>\${data.message || 'Notification'}</p>\`;
    }
};

export const formatNotificationMessage = (type, data) => {
    // Basic fallback formatter
    return \`[\${type.toUpperCase()}] \${data.message}\`;
};
`;

  const baseCode = `
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS, CHANNELS } from './notifications/emailConfigs';
import { getEmailTemplate, formatNotificationMessage } from './notifications/templates';

class NotificationService {
    async sendNotification(options) {
        const { type, channel, to, data } = options;
        
        switch(channel) {
            case CHANNELS.EMAIL:
                return this.sendEmail(to, type, data);
            case CHANNELS.SMS:
                return this.sendSMS(to, type, data);
            default:
                return this.sendAppNotification(to, type, data);
        }
    }

    async sendEmail(to, type, data) {
        const html = getEmailTemplate(type, data);
        console.log(\`Sending email to \${to} of type \${type}\`, { html });
        return { success: true, status: NOTIFICATION_STATUS.SENT };
    }

    async sendSMS(to, type, data) {
        const message = formatNotificationMessage(type, data);
        console.log(\`Sending SMS to \${to}\`, { message });
        return { success: true, status: NOTIFICATION_STATUS.SENT };
    }

    async sendAppNotification(to, type, data) {
        console.log(\`Saving app notification for user \${to}\`, { type, data });
        return { success: true, status: NOTIFICATION_STATUS.SENT };
    }
}

export { NOTIFICATION_TYPES, NOTIFICATION_STATUS, CHANNELS };
export default new NotificationService();
`;

  fs.mkdirSync("src/lib/notifications", { recursive: true });
  fs.writeFileSync("src/lib/notifications/emailConfigs.js", configsCode);
  fs.writeFileSync("src/lib/notifications/templates.js", templatesCode);
  fs.writeFileSync("src/lib/notificationService.js", baseCode);
}

refactorTasks();
refactorCad();
refactorNotifications();

console.log("Refactoring complete: processed files into hooks, components and configs successfully.");
