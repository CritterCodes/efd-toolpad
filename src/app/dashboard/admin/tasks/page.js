'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TasksHeader from './components/TasksHeader';
import TasksStatistics from './components/TasksStatistics';
import TasksFilters from './components/TasksFilters';
import TasksGrid from './components/TasksGrid';
import { TASKS_UI } from './components/tasksUi';

export default function TasksPage() {
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [statistics, setStatistics] = React.useState(null);
  const [filters, setFilters] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [metalTypeFilter, setMetalTypeFilter] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState('title');
  const [sortOrder, setSortOrder] = React.useState('asc');
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, task: null, hardDelete: false });
  const [selectedTask, setSelectedTask] = React.useState(null);
  const [viewDialog, setViewDialog] = React.useState(false);
  const [taskMenuAnchor, setTaskMenuAnchor] = React.useState(null);

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

      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load tasks');

      setTasks(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setStatistics(data.statistics || null);
      setFilters(data.filters || null);
      setError(null);
    } catch (loadError) {
      console.error('Error loading tasks:', loadError);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter, metalTypeFilter, activeFilter, sortBy, sortOrder]);

  React.useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleDelete = async (taskId, hardDelete = false) => {
    try {
      const response = await fetch('/api/tasks', {
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
    } catch (deleteError) {
      console.error('Error deleting task:', deleteError);
      setError(deleteError.message);
    }
  };

  const handleDuplicate = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/duplicate`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to duplicate task');
      await loadTasks();
    } catch (duplicateError) {
      console.error('Error duplicating task:', duplicateError);
      setError(duplicateError.message);
    }
  };

  const handleUpdateAllPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tasks/update-prices', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to update prices');
      await loadTasks();
    } catch (updateError) {
      console.error('Error updating all prices:', updateError);
      setError(updateError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && (!tasks || tasks.length === 0)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10, '& .MuiDialog-paper': { backgroundColor: TASKS_UI.bgPanel, color: TASKS_UI.textPrimary, border: `1px solid ${TASKS_UI.border}`, boxShadow: TASKS_UI.shadow, backgroundImage: 'none' } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TasksHeader loading={loading} handleUpdateAllPrices={handleUpdateAllPrices} handleCreateTask={(event) => setTaskMenuAnchor(event.currentTarget)} />
        <TasksStatistics statistics={statistics} />
        <TasksFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          metalTypeFilter={metalTypeFilter}
          setMetalTypeFilter={setMetalTypeFilter}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          filters={filters}
        />
        <TasksGrid
          tasks={tasks}
          loading={loading}
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          metalTypeFilter={metalTypeFilter}
          activeFilter={activeFilter}
          router={router}
          setSelectedTask={setSelectedTask}
          setViewDialog={setViewDialog}
          setDeleteDialog={setDeleteDialog}
          onDuplicate={handleDuplicate}
        />

        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination page={page} count={totalPages} onChange={(_, value) => setPage(value)} color="standard" sx={{ '& .MuiPaginationItem-root': { color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border }, '& .Mui-selected': { backgroundColor: `${TASKS_UI.bgCard} !important`, borderColor: `${TASKS_UI.accent} !important` } }} />
          </Box>
        )}

        <Menu anchorEl={taskMenuAnchor} open={Boolean(taskMenuAnchor)} onClose={() => setTaskMenuAnchor(null)} PaperProps={{ sx: { backgroundColor: TASKS_UI.bgCard, color: TASKS_UI.textPrimary, border: `1px solid ${TASKS_UI.border}`, boxShadow: TASKS_UI.shadow } }}>
          <MenuItem onClick={() => { setTaskMenuAnchor(null); router.push('/dashboard/admin/tasks/create'); }}><AddIcon fontSize="small" sx={{ mr: 1.25 }} />Create Universal Task</MenuItem>
          <MenuItem onClick={() => { setTaskMenuAnchor(null); router.push('/dashboard/admin/tasks/ai-builder'); }}><AutoAwesomeIcon fontSize="small" sx={{ mr: 1.25 }} />AI Builder</MenuItem>
          <MenuItem onClick={() => { setTaskMenuAnchor(null); router.push('/dashboard/admin/tasks/tools-machinery'); }}><PrecisionManufacturingIcon fontSize="small" sx={{ mr: 1.25 }} />Tools and Machinery</MenuItem>
        </Menu>

        <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
          {selectedTask && (
            <>
              <DialogTitle sx={{ borderBottom: `1px solid ${TASKS_UI.border}`, color: TASKS_UI.textHeader }}>
                {selectedTask.title}
              </DialogTitle>
              <DialogContent sx={{ pt: 2.5 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary, mb: 2 }}>{selectedTask.description || 'No description provided.'}</Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      <Chip label={selectedTask.category || 'No category'} size="small" variant="outlined" sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />
                      {selectedTask.subcategory && <Chip label={selectedTask.subcategory} size="small" variant="outlined" sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />}
                      {selectedTask.isUniversal && <Chip label="Universal" size="small" variant="outlined" sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }} />}
                    </Box>
                    <Typography variant="subtitle2" sx={{ color: TASKS_UI.textHeader, mb: 1 }}>Task Details</Typography>
                    <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>Metal Type: {selectedTask.metalType || selectedTask.baseMetal || 'Universal'}</Typography>
                    <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>Labor Hours: {selectedTask.laborHours || 0}</Typography>
                    <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>Updated: {selectedTask.updatedAt ? new Date(selectedTask.updatedAt).toLocaleDateString() : 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Box sx={{ backgroundColor: TASKS_UI.bgCard, border: `1px solid ${TASKS_UI.border}`, borderRadius: 2, p: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: TASKS_UI.textHeader, mb: 1 }}>Pricing</Typography>
                      <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>Retail: {typeof selectedTask.price === 'number' ? `$${selectedTask.price.toFixed(2)}` : 'Computed at runtime'}</Typography>
                      <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>Base Price: {typeof selectedTask.basePrice === 'number' ? `$${selectedTask.basePrice.toFixed(2)}` : 'N/A'}</Typography>
                      <Divider sx={{ my: 1.5, borderColor: TASKS_UI.border }} />
                      <Typography variant="subtitle2" sx={{ color: TASKS_UI.textHeader, mb: 1 }}>System</Typography>
                      <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>Version: {selectedTask.version || 1}</Typography>
                      <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary }}>Pricing Version: {selectedTask.pricingVersion || 'N/A'}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions sx={{ borderTop: `1px solid ${TASKS_UI.border}`, px: 3, py: 2 }}>
                <Button onClick={() => setViewDialog(false)} sx={{ color: TASKS_UI.textSecondary }}>Close</Button>
                <Button variant="outlined" onClick={() => { setViewDialog(false); router.push(`/dashboard/admin/tasks/edit/${selectedTask._id}`); }} sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}>Edit Task</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, task: null, hardDelete: false })} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ borderBottom: `1px solid ${TASKS_UI.border}`, color: TASKS_UI.textHeader }}>
            {deleteDialog.hardDelete ? 'Delete Task Permanently' : 'Archive Task'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Typography sx={{ color: TASKS_UI.textPrimary }}>
              Are you sure you want to {deleteDialog.hardDelete ? 'permanently delete' : 'archive'} "{deleteDialog.task?.title}"?
            </Typography>
            {!deleteDialog.hardDelete && (
              <Typography variant="body2" sx={{ color: TASKS_UI.textSecondary, mt: 1 }}>
                Archived tasks can be restored later.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ borderTop: `1px solid ${TASKS_UI.border}`, px: 3, py: 2 }}>
            <Button onClick={() => setDeleteDialog({ open: false, task: null, hardDelete: false })} sx={{ color: TASKS_UI.textSecondary }}>Cancel</Button>
            <Button variant="outlined" onClick={() => handleDelete(deleteDialog.task._id, deleteDialog.hardDelete)} sx={{ color: TASKS_UI.textPrimary, borderColor: TASKS_UI.border, backgroundColor: TASKS_UI.bgCard }}>
              {deleteDialog.hardDelete ? 'Delete Permanently' : 'Archive'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
}
