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
                        label={task.isActive ? 'Active' : 'Inactive'}
                        color={task.isActive ? 'success' : 'default'}
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
                          ${task.basePrice?.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                      
                      {task.laborHours && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <TimeIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {task.laborHours}h
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
                    
                    <Tooltip title={task.isActive ? "Archive Task" : "Delete Task"}>
                      <IconButton
                        size="small"
                        color={task.isActive ? "warning" : "error"}
                        onClick={() => setDeleteDialog({ 
                          open: true, 
                          task, 
                          hardDelete: !task.isActive 
                        })}
                      >
                        {task.isActive ? <ArchiveIcon /> : <DeleteForeverIcon />}
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
          maxWidth="md"
          fullWidth
        >
          {selectedTask && (
            <>
              <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  {selectedTask.title}
                  <Chip 
                    label={selectedTask.isActive ? 'Active' : 'Inactive'}
                    color={selectedTask.isActive ? 'success' : 'default'}
                  />
                </Box>
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Description</Typography>
                    <Typography paragraph>{selectedTask.description}</Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>Category</Typography>
                    <Typography paragraph>{selectedTask.category}</Typography>
                    
                    {selectedTask.metalType && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>Metal Type</Typography>
                        <Typography paragraph>{selectedTask.metalType}</Typography>
                      </>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
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
                    
                    <Typography variant="subtitle2" gutterBottom>Created</Typography>
                    <Typography paragraph>
                      {new Date(selectedTask.createdAt).toLocaleDateString()}
                    </Typography>
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
