import React from 'react';
import {
  Grid,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Build as BuildIcon,
  Add as AddIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  AccessTime as TimeIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  DeleteForever as DeleteForeverIcon,
  ContentCopy as DuplicateIcon
} from '@mui/icons-material';
import { TASKS_UI } from './tasksUi';

export default function TasksGrid({
  tasks,
  loading,
  searchQuery,
  categoryFilter,
  metalTypeFilter,
  activeFilter,
  router,
  setSelectedTask,
  setViewDialog,
  setDeleteDialog,
  onDuplicate
}) {
  const getEffectiveIsActive = (task) => {
    if (typeof task?.isActive === 'boolean') return task.isActive;
    if (typeof task?.display?.isActive === 'boolean') return task.display.isActive;
    return true;
  };

  if (tasks && tasks.length === 0 && !loading) {
    return (
      <Box sx={{ backgroundColor: TASKS_UI.bgPanel, border: `1px solid ${TASKS_UI.border}`, borderRadius: 3, boxShadow: TASKS_UI.shadow, p: 4, textAlign: 'center' }}>
        <BuildIcon sx={{ fontSize: 56, color: TASKS_UI.textMuted, mb: 2 }} />
        <Typography variant="h6" sx={{ color: TASKS_UI.textHeader, mb: 1 }}>
          No tasks found
        </Typography>
        <Typography sx={{ color: TASKS_UI.textSecondary, mb: 2 }}>
          {searchQuery || categoryFilter || metalTypeFilter || activeFilter !== ''
            ? 'Adjust the filters or search terms and try again.'
            : 'Create the first task to start building the catalog.'}
        </Typography>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => router.push('/dashboard/admin/tasks/create')} sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}>
          Create Task
        </Button>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {tasks && tasks.map((task) => {
        const isTaskActive = getEffectiveIsActive(task);
        const price = typeof task.price === 'number' ? task.price : task.basePrice;
        return (
          <Grid item xs={12} sm={6} lg={4} key={task._id}>
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: TASKS_UI.bgPanel,
                border: '1px solid',
                borderColor: TASKS_UI.border,
                borderLeft: '2px solid',
                borderLeftColor: isTaskActive ? TASKS_UI.accent : TASKS_UI.border,
                borderRadius: 3,
                boxShadow: TASKS_UI.shadow,
                opacity: isTaskActive ? 1 : 0.78,
                overflow: 'hidden'
              }}
            >
              <Box sx={{ p: 2.25, flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1} gap={1}>
                  <Typography variant="h6" component="h2" sx={{ color: TASKS_UI.textHeader, fontSize: '1.15rem', lineHeight: 1.3 }}>
                    {task.title}
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
                    <Chip label={isTaskActive ? 'Active' : 'Inactive'} size="small" variant="outlined" sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />
                    {task.isUniversal && <Chip label="Universal" size="small" variant="outlined" sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />}
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary, mb: 2 }}>
                  {task.description || 'No description provided.'}
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  <Chip label={task.category} variant="outlined" size="small" icon={<CategoryIcon />} sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />
                  {task.subcategory && <Chip label={task.subcategory} variant="outlined" size="small" sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />}
                  {task.metalType && <Chip label={task.metalType} variant="outlined" size="small" sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />}
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={task.service ? 2 : 0}>
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <MoneyIcon sx={{ color: TASKS_UI.accent, fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: TASKS_UI.textPrimary, fontWeight: 600 }}>
                      {typeof price === 'number' ? `$${price.toFixed(2)}` : 'Computed at runtime'}
                    </Typography>
                  </Box>
                  {task.laborHours > 0 && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <TimeIcon sx={{ color: TASKS_UI.textMuted, fontSize: 16 }} />
                      <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>
                        {task.laborHours}h
                      </Typography>
                    </Box>
                  )}
                </Box>

                {task.service && (
                  <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: TASKS_UI.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>
                      Est. {task.service.estimatedDays} days
                    </Typography>
                    {task.service.requiresApproval && (
                      <Chip label="Approval Required" size="small" variant="outlined" sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />
                    )}
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 1, borderTop: '1px solid', borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}>
                <Tooltip title="View Details"><IconButton size="small" onClick={() => { setSelectedTask(task); setViewDialog(true); }} sx={{ color: TASKS_UI.textSecondary }}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Duplicate Task"><IconButton size="small" onClick={() => onDuplicate && onDuplicate(task._id)} sx={{ color: TASKS_UI.textSecondary }}><DuplicateIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Edit Task"><IconButton size="small" onClick={() => router.push(`/dashboard/admin/tasks/edit/${task._id}`)} sx={{ color: TASKS_UI.textSecondary }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Delete Task Permanently"><IconButton size="small" onClick={() => setDeleteDialog({ open: true, task, hardDelete: true })} sx={{ color: TASKS_UI.textSecondary }}><DeleteForeverIcon fontSize="small" /></IconButton></Tooltip>
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
