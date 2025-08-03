'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Fab from '@mui/material/Fab';
import Menu from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  Category as CategoryIcon,
  Settings as SettingsIcon,
  Archive as ArchiveIcon,
  Build as BuildIcon,
  DeleteForever as DeleteForeverIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useRouter } from 'next/navigation';

export default function TasksPage() {
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [statistics, setStatistics] = React.useState(null);
  const [filters, setFilters] = React.useState(null);
  
  // Pagination
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [metalTypeFilter, setMetalTypeFilter] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState('title');
  const [sortOrder, setSortOrder] = React.useState('asc');
  
  // Dialogs
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, task: null, hardDelete: false });
  const [selectedTask, setSelectedTask] = React.useState(null);
  const [viewDialog, setViewDialog] = React.useState(false);
  
  // Task dropdown menu
  const [taskMenuAnchor, setTaskMenuAnchor] = React.useState(null);
  const taskMenuOpen = Boolean(taskMenuAnchor);
  
  const router = useRouter();
  const limit = 12;

  const loadTasks = React.useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);
      if (metalTypeFilter && metalTypeFilter !== 'all') params.append('metalType', metalTypeFilter);
      if (activeFilter !== '') params.append('isActive', activeFilter);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/tasks/crud?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tasks');
      }
      
      setTasks(data.tasks);
      setTotalPages(data.pagination.totalPages);
      setStatistics(data.statistics);
      setFilters(data.filters);
      setError(null);
      
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter, metalTypeFilter, activeFilter, sortBy, sortOrder]);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleDelete = async (taskId, hardDelete = false) => {
    try {
      const response = await fetch(`/api/tasks/crud`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, hardDelete })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete task');
      }

      setDeleteDialog({ open: false, task: null, hardDelete: false });
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError(error.message);
    }
  };

  const handleCreateTask = (event) => {
    setTaskMenuAnchor(event.currentTarget);
  };

  const handleCloseTaskMenu = () => {
    setTaskMenuAnchor(null);
  };

  if (loading && tasks.length === 0) {
    return (
      <PageContainer title="Task Management">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Task Management">
      <Box sx={{ pb: 8 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Statistics */}
        {statistics && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BuildIcon color="primary" />
                    <Box>
                      <Typography variant="h4" component="div">
                        {statistics.total}
                      </Typography>
                      <Typography color="text.secondary">
                        Total Tasks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <MoneyIcon sx={{ color: 'green' }} />
                    <Box>
                      <Typography variant="h4" component="div">
                        ${statistics.averagePrice?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography color="text.secondary">
                        Average Price
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CategoryIcon color="secondary" />
                    <Box>
                      <Typography variant="h4" component="div">
                        {statistics.categories}
                      </Typography>
                      <Typography color="text.secondary">
                        Categories
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ArchiveIcon color="action" />
                    <Box>
                      <Typography variant="h4" component="div">
                        {statistics.inactive}
                      </Typography>
                      <Typography color="text.secondary">
                        Inactive
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {filters?.categories?.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Metal Type</InputLabel>
                <Select
                  value={metalTypeFilter}
                  label="Metal Type"
                  onChange={(e) => setMetalTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All Metals</MenuItem>
                  <MenuItem value="gold">Gold</MenuItem>
                  <MenuItem value="silver">Silver</MenuItem>
                  <MenuItem value="platinum">Platinum</MenuItem>
                  <MenuItem value="mixed">Mixed</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={activeFilter}
                  label="Status"
                  onChange={(e) => setActiveFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="title">Title</MenuItem>
                  <MenuItem value="basePrice">Price</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                  <MenuItem value="createdAt">Created</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Order</InputLabel>
                <Select
                  value={sortOrder}
                  label="Order"
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <MenuItem value="asc">A-Z</MenuItem>
                  <MenuItem value="desc">Z-A</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Tasks Grid */}
        {tasks.length === 0 && !loading ? (
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
                  onClick={handleCreateTask}
                >
                  Create Task
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {tasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task._id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: task.isActive ? 1 : 0.7,
                    borderLeft: task.isActive ? 3 : 1, 
                    borderLeftColor: task.isActive ? 'primary.main' : 'grey.300'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                        {task.title}
                      </Typography>
                      <Chip 
                        label={(task.display?.isActive ?? task.isActive) ? 'Active' : 'Inactive'}
                        color={(task.display?.isActive ?? task.isActive) ? 'success' : 'default'}
                        size="small"
                      />
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
                      {task.metalType && (
                        <Chip 
                          label={task.metalType}
                          variant="outlined"
                          size="small"
                          color="secondary"
                        />
                      )}
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" align="center" gap={0.5}>
                        <MoneyIcon fontSize="small" color="success" />
                        <Typography variant="h6" color="success.main">
                          ${(task.pricing?.retailPrice || task.basePrice)?.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                      
                      {(task.pricing?.totalLaborHours || task.laborHours) && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <TimeIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {task.pricing?.totalLaborHours || task.laborHours}h
                          </Typography>
                        </Box>
                      )}
                    </Box>
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
                    
                    <Tooltip title="Edit Task">
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/dashboard/admin/tasks/edit/${task._id}`)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title={(task.display?.isActive ?? task.isActive) ? "Archive Task" : "Delete Task"}>
                      <IconButton
                        size="small"
                        color={(task.display?.isActive ?? task.isActive) ? "warning" : "error"}
                        onClick={() => setDeleteDialog({ 
                          open: true, 
                          task, 
                          hardDelete: !(task.display?.isActive ?? task.isActive)
                        })}
                      >
                        {(task.display?.isActive ?? task.isActive) ? <ArchiveIcon /> : <DeleteForeverIcon />}
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}

        {/* Floating Action Button with Dropdown */}
        <Fab
          color="primary"
          aria-label="create task"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleCreateTask}
        >
          <AddIcon />
        </Fab>

        {/* Task Creation Menu */}
        <Menu
          anchorEl={taskMenuAnchor}
          open={taskMenuOpen}
          onClose={handleCloseTaskMenu}
          PaperProps={{
            sx: { minWidth: '200px' }
          }}
        >
          <MenuItem onClick={() => {
            handleCloseTaskMenu();
            router.push('/dashboard/admin/tasks/create');
          }}>
            <BuildIcon sx={{ mr: 1 }} />
            Basic Task
          </MenuItem>
          <MenuItem onClick={() => {
            handleCloseTaskMenu();
            router.push('/dashboard/admin/tasks/process-based');
          }}>
            <SettingsIcon sx={{ mr: 1 }} />
            Process-Based Task
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => {
            handleCloseTaskMenu();
            router.push('/dashboard/admin/tasks/materials');
          }}>
            <CategoryIcon sx={{ mr: 1 }} />
            Manage Materials
          </MenuItem>
          <MenuItem onClick={() => {
            handleCloseTaskMenu();
            router.push('/dashboard/admin/tasks/processes');
          }}>
            <SettingsIcon sx={{ mr: 1 }} />
            Manage Processes
          </MenuItem>
        </Menu>

        {/* View Dialog */}
        <Dialog
          open={viewDialog}
          onClose={() => setViewDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          {selectedTask && (
            <>
              <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h5" component="div">
                      {selectedTask.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTask.sku || 'No SKU'} • Short Code: {selectedTask.shortCode || 'N/A'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip 
                      label={selectedTask.display?.isActive ? 'Active' : 'Inactive'}
                      color={selectedTask.display?.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    {selectedTask.display?.isFeatured && (
                      <Chip label="Featured" color="primary" size="small" />
                    )}
                  </Stack>
                </Box>
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={3}>
                  {/* Basic Information */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                          Basic Information
                        </Typography>
                        
                        {selectedTask.description && (
                          <>
                            <Typography variant="subtitle2" gutterBottom>Description</Typography>
                            <Typography paragraph>{selectedTask.description}</Typography>
                          </>
                        )}
                        
                        <Typography variant="subtitle2" gutterBottom>Category</Typography>
                        <Typography paragraph sx={{ textTransform: 'capitalize' }}>
                          {selectedTask.category}
                          {selectedTask.subcategory && ` • ${selectedTask.subcategory}`}
                        </Typography>
                        
                        {selectedTask.metalType && (
                          <>
                            <Typography variant="subtitle2" gutterBottom>Metal Type</Typography>
                            <Typography paragraph sx={{ textTransform: 'capitalize' }}>
                              {selectedTask.metalType.replace('_', ' ')}
                              {selectedTask.karat && ` (${selectedTask.karat})`}
                            </Typography>
                          </>
                        )}
                        
                        <Typography variant="subtitle2" gutterBottom>Created</Typography>
                        <Typography>
                          {new Date(selectedTask.createdAt).toLocaleDateString()} by {selectedTask.createdBy || 'Unknown'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Pricing Information */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="success.main">
                          Pricing Information
                        </Typography>
                        
                        {selectedTask.pricing ? (
                          <>
                            <Typography variant="subtitle2" gutterBottom>Retail Price</Typography>
                            <Typography variant="h4" color="success.main" gutterBottom>
                              ${selectedTask.pricing.retailPrice?.toFixed(2) || selectedTask.basePrice?.toFixed(2) || '0.00'}
                            </Typography>
                            
                            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Wholesale</Typography>
                                <Typography variant="h6">
                                  ${selectedTask.pricing.wholesalePrice?.toFixed(2) || '0.00'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Base Cost</Typography>
                                <Typography variant="h6">
                                  ${selectedTask.pricing.baseCost?.toFixed(2) || '0.00'}
                                </Typography>
                              </Box>
                            </Stack>
                            
                            <Typography variant="subtitle2" gutterBottom>Cost Breakdown</Typography>
                            <Box sx={{ pl: 1 }}>
                              <Typography variant="body2">
                                Labor: {selectedTask.pricing.totalLaborHours || selectedTask.laborHours || 0} hours
                              </Typography>
                              <Typography variant="body2">
                                Process Cost: ${selectedTask.pricing.totalProcessCost?.toFixed(2) || '0.00'}
                              </Typography>
                              <Typography variant="body2">
                                Material Cost: ${selectedTask.pricing.totalMaterialCost?.toFixed(2) || selectedTask.materialCost?.toFixed(2) || '0.00'}
                              </Typography>
                              <Typography variant="body2">
                                Business Multiplier: {selectedTask.pricing.businessMultiplier?.toFixed(2) || 'N/A'}x
                              </Typography>
                            </Box>
                          </>
                        ) : (
                          <>
                            <Typography variant="subtitle2" gutterBottom>Base Price</Typography>
                            <Typography variant="h4" color="success.main" gutterBottom>
                              ${selectedTask.basePrice?.toFixed(2) || '0.00'}
                            </Typography>
                            
                            {selectedTask.laborHours && (
                              <>
                                <Typography variant="subtitle2" gutterBottom>Labor Hours</Typography>
                                <Typography paragraph>{selectedTask.laborHours} hours</Typography>
                              </>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Processes */}
                  {selectedTask.processes && selectedTask.processes.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="info.main">
                            Processes ({selectedTask.processes.length})
                          </Typography>
                          <Stack spacing={1}>
                            {selectedTask.processes.map((process, index) => (
                              <Box key={index} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2">
                                  {process.displayName || process.processName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {process.quantity || 1}x • {process.calculatedLaborHours || process.baseLaborHours || 0}hrs • 
                                  ${process.calculatedProcessCost || process.baseProcessCost || 0}
                                  {process.skillLevel && ` • ${process.skillLevel}`}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* Materials */}
                  {selectedTask.materials && selectedTask.materials.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="warning.main">
                            Materials ({selectedTask.materials.length})
                          </Typography>
                          <Stack spacing={1}>
                            {selectedTask.materials.map((material, index) => (
                              <Box key={index} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2">
                                  {material.displayName || material.materialName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {material.quantity || 1}x • ${material.unitCost || material.costPerPortion || 0} each
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* Service & Workflow */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="secondary.main">
                          Service Details
                        </Typography>
                        
                        {selectedTask.service && (
                          <Box sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Est. Days</Typography>
                                <Typography variant="body2">{selectedTask.service.estimatedDays || 'N/A'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Rush Days</Typography>
                                <Typography variant="body2">{selectedTask.service.rushDays || 'N/A'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Skill Level</Typography>
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                  {selectedTask.service.skillLevel || 'N/A'}
                                </Typography>
                              </Box>
                            </Stack>
                            
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                              {selectedTask.service.requiresApproval && (
                                <Chip label="Requires Approval" size="small" color="warning" />
                              )}
                              {selectedTask.service.requiresInspection && (
                                <Chip label="Requires Inspection" size="small" color="info" />
                              )}
                              {selectedTask.service.canBeBundled && (
                                <Chip label="Can Bundle" size="small" color="success" />
                              )}
                            </Stack>
                          </Box>
                        )}

                        {selectedTask.workflow && (
                          <>
                            <Typography variant="subtitle2" gutterBottom>Workflow</Typography>
                            <Box sx={{ pl: 1 }}>
                              {selectedTask.workflow.departments && (
                                <Typography variant="body2">
                                  Departments: {selectedTask.workflow.departments.join(', ')}
                                </Typography>
                              )}
                              {selectedTask.workflow.equipmentNeeded && selectedTask.workflow.equipmentNeeded.length > 0 && (
                                <Typography variant="body2">
                                  Equipment: {selectedTask.workflow.equipmentNeeded.join(', ')}
                                </Typography>
                              )}
                              {selectedTask.workflow.qualityChecks && selectedTask.workflow.qualityChecks.length > 0 && (
                                <Typography variant="body2">
                                  QC: {selectedTask.workflow.qualityChecks.join(', ')}
                                </Typography>
                              )}
                            </Box>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Analytics & Status */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Analytics & Status
                        </Typography>
                        
                        {selectedTask.analytics && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Usage Stats</Typography>
                            <Box sx={{ pl: 1 }}>
                              <Typography variant="body2">
                                Times Used: {selectedTask.analytics.timesUsed || 0}
                              </Typography>
                              {selectedTask.analytics.averageCompletionTime && (
                                <Typography variant="body2">
                                  Avg. Completion: {selectedTask.analytics.averageCompletionTime}
                                </Typography>
                              )}
                              {selectedTask.analytics.profitMargin && (
                                <Typography variant="body2">
                                  Profit Margin: {selectedTask.analytics.profitMargin}%
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}

                        <Typography variant="subtitle2" gutterBottom>System Info</Typography>
                        <Box sx={{ pl: 1 }}>
                          <Typography variant="body2">
                            Version: {selectedTask.version || 1}
                          </Typography>
                          <Typography variant="body2">
                            Pricing Version: {selectedTask.pricingVersion || 'N/A'}
                          </Typography>
                          <Typography variant="body2">
                            Updated: {new Date(selectedTask.updatedAt).toLocaleDateString()}
                          </Typography>
                          {selectedTask.isArchived && (
                            <Typography variant="body2" color="warning.main">
                              Status: Archived
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setViewDialog(false)}>
                  Close
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setViewDialog(false);
                    router.push(`/dashboard/admin/tasks/edit/${selectedTask._id}`);
                  }}
                >
                  Edit Task
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, task: null, hardDelete: false })}
        >
          <DialogTitle>
            {deleteDialog.hardDelete ? 'Delete Task Permanently' : 'Archive Task'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to {deleteDialog.hardDelete ? 'permanently delete' : 'archive'} &quot;{deleteDialog.task?.title}&quot;?
            </Typography>
            {!deleteDialog.hardDelete && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Archived tasks can be restored later.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, task: null, hardDelete: false })}>
              Cancel
            </Button>
            <Button
              color={deleteDialog.hardDelete ? 'error' : 'warning'}
              variant="contained"
              onClick={() => handleDelete(deleteDialog.task._id, deleteDialog.hardDelete)}
            >
              {deleteDialog.hardDelete ? 'Delete Permanently' : 'Archive'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
