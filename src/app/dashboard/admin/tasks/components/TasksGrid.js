import React from 'react';
import { 
  Grid, Card, CardContent, Box, Typography, Button, 
  Chip, CardActions, Tooltooltip, IconButton, Tooltip 
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

export default function TasksGrid({ 
  tasks, loading, 
  searchQuery, categoryFilter, metalTypeFilter, activeFilter, 
  router, setSelectedTask, setViewDialog, setDeleteDialog, onDuplicate
}) {
  const getEffectiveIsActive = (task) => {
    if (typeof task?.isActive === 'boolean') return task.isActive;
    if (typeof task?.display?.isActive === 'boolean') return task.display.isActive;
    return true;
  };

  if (tasks && tasks.length === 0 && !loading) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <BuildIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No tasks found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {searchQuery || categoryFilter || metalTypeFilter || activeFilter !== ''
                ? 'Try adjusting your filters or search terms'
                : 'Get started by creating your first task'
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/dashboard/admin/tasks/create')}
            >
              Create Universal Task
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      {tasks && tasks.map((task) => (
        (() => {
          const isTaskActive = getEffectiveIsActive(task);
          return (
        <Grid item xs={12} sm={6} md={4} key={task._id}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              opacity: isTaskActive ? 1 : 0.7,
              borderLeft: isTaskActive ? 3 : 1,
              borderLeftColor: isTaskActive ? 'primary.main' : 'grey.300'
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                  {task.title}
                </Typography>
                <Box display="flex" gap={0.5}>
                  <Chip
                    label={isTaskActive ? 'Active' : 'Inactive'}
                    color={isTaskActive ? 'success' : 'default'}
                    size="small"
                  />
                  {task.isUniversal && (
                    <Chip
                      label="Universal"
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>

              <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                {task.description}
              </Typography>

              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip
                  label={task.category}
                  variant="outlined"
                  size="small"
                  icon={<CategoryIcon />}
                />
                {task.subcategory && (
                  <Chip
                    label={task.subcategory}
                    variant="outlined"
                    size="small"
                    color="secondary"
                  />
                )}
                {task.metalType && (
                  <Chip
                    label={task.metalType}
                    variant="outlined"
                    size="small"
                    color="secondary"
                  />
                )}
              </Box>

              {/* Pricing — computed at runtime per metal context */}
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" align="center" gap={0.5}>
                  <MoneyIcon fontSize="small" color="success" />
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Computed at checkout
                  </Typography>
                </Box>

                {task.laborHours > 0 && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {task.laborHours}h
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Service Information */}
              {task.service && (
                <Box mt={2} pt={1} borderTop={1} borderColor="divider">
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Est. {task.service.estimatedDays} days
                    </Typography>
                    {task.service.requiresApproval && (
                      <Chip label="Approval Required" size="small" color="warning" variant="outlined" />
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>

            <CardActions>
              <Tooltip title="View Details">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedTask(task);
                    setViewDialog(true);
                  }}
                >
                  <ViewIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Duplicate Task">
                <IconButton
                  size="small"
                  color="info"
                  onClick={() => onDuplicate && onDuplicate(task._id)}
                >
                  <DuplicateIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Edit Task">
                <IconButton
                  size="small"
                  onClick={() => router.push(`/dashboard/admin/tasks/edit/${task._id}`)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete Task Permanently">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeleteDialog({
                    open: true,
                    task,
                    hardDelete: true
                  })}
                >
                  <DeleteForeverIcon />
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        </Grid>
          );
        })()
      ))}
    </Grid>
  );
}
