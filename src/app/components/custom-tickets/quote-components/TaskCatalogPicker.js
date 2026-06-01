import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton, Button, Box, Typography,
  CircularProgress, Chip, InputAdornment
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';

/**
 * Task Catalog Picker
 * Lets an admin add bench operations (set stones, clean up casting, size, polish…)
 * from the shared `tasks` collection into a custom quote's labor section.
 *
 * Option A (locked): a picked task contributes its computed BENCH LABOR COST
 * (pricing.laborCost, computed on read by the server) into the quote — that cost
 * lands in the COG bucket and receives the quote's ×cogMarkup like all labor.
 */
export function TaskCatalogPicker({ open, onClose, onPick }) {
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ isActive: 'true', limit: '50' });
        if (search.trim()) params.set('search', search.trim());
        const res = await fetch(`/api/tasks?${params.toString()}`);
        const json = await res.json();
        if (!cancelled) setTasks(json?.data || []);
      } catch (e) {
        if (!cancelled) setError('Failed to load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250); // light debounce
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, search]);

  const handlePick = (task) => {
    const laborCost = task?.pricing?.laborCost ?? 0;
    const hours = task?.pricing?.totalLaborHours ?? task?.laborHours ?? 0;
    onPick({
      description: task.title,
      cost: laborCost,         // bench labor cost → COG (gets ×cogMarkup)
      quantity: 1,
      hours,
      taskId: task.id || task._id,
      source: 'task-catalog',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Add from Task Catalog
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          autoFocus
          size="small"
          placeholder="Search operations (set stones, casting, size…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        )}
        {error && <Typography color="error" variant="body2">{error}</Typography>}

        {!loading && !error && tasks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No tasks found.
          </Typography>
        )}

        <List dense>
          {tasks.map((task) => {
            const laborCost = task?.pricing?.laborCost ?? 0;
            const hours = task?.pricing?.totalLaborHours ?? task?.laborHours ?? 0;
            return (
              <ListItem key={task.id || task._id} divider>
                <ListItemText
                  primary={task.title}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                      {task.category && <Chip label={task.category} size="small" variant="outlined" />}
                      <Typography component="span" variant="caption" color="text.secondary">
                        Labor cost ${laborCost.toFixed(2)}{hours ? ` · ${hours}h` : ''}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => handlePick(task)}>
                    Add
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskCatalogPicker;
