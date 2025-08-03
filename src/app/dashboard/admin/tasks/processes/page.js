'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Fab from '@mui/material/Fab';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Schedule as TimeIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  Security as SecurityIcon,
  Engineering as EngineeringIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';

export default function ProcessesPage() {
  const [processes, setProcesses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState(null);
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, process: null });

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    displayName: '',
    category: '',
    laborMinutes: '',
    skillLevel: 'standard',
    equipmentCost: '',
    metalComplexity: {
      silver: '1.0',
      gold: '1.0',
      platinum: '1.0',
      mixed: '1.0'
    },
    riskLevel: 'low',
    description: '',
    safetyRequirements: [],
    isActive: true
  });

  const categories = [
    'metalwork',
    'finishing',
    'stone_work',
    'sizing',
    'prong_work',
    'engraving',
    'design',
    'assembly',
    'other'
  ];

  const skillLevels = [
    'basic',
    'standard',
    'advanced',
    'expert'
  ];

  const riskLevels = [
    'low',
    'medium',
    'high'
  ];

  const safetyOptions = [
    'ventilation',
    'eye_protection',
    'safety_glasses',
    'dust_mask',
    'magnification',
    'steady_surface',
    'heat_protection',
    'chemical_protection'
  ];

  const loadProcesses = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/repair-processes');
      
      if (!response.ok) {
        throw new Error('Failed to load processes');
      }
      
      const { processes } = await response.json();
      setProcesses(processes);
      setError(null);
    } catch (error) {
      console.error('Error loading processes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProcesses();
  }, [loadProcesses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingProcess 
        ? `/api/repair-processes?id=${editingProcess._id}` 
        : '/api/repair-processes';
      
      const method = editingProcess ? 'PUT' : 'POST';
      
      const processData = {
        ...formData,
        laborMinutes: parseInt(formData.laborMinutes),
        equipmentCost: parseFloat(formData.equipmentCost),
        metalComplexity: {
          silver: parseFloat(formData.metalComplexity.silver),
          gold: parseFloat(formData.metalComplexity.gold),
          platinum: parseFloat(formData.metalComplexity.platinum),
          mixed: parseFloat(formData.metalComplexity.mixed)
        }
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save process');
      }

      setOpenDialog(false);
      setEditingProcess(null);
      resetForm();
      loadProcesses();
    } catch (error) {
      console.error('Error saving process:', error);
      setError(error.message);
    }
  };

  const handleEdit = (process) => {
    setEditingProcess(process);
    setFormData({
      name: process.name,
      displayName: process.displayName,
      category: process.category,
      laborMinutes: process.laborMinutes.toString(),
      skillLevel: process.skillLevel,
      equipmentCost: process.equipmentCost.toString(),
      metalComplexity: {
        silver: process.metalComplexity?.silver?.toString() || '1.0',
        gold: process.metalComplexity?.gold?.toString() || '1.0',
        platinum: process.metalComplexity?.platinum?.toString() || '1.0',
        mixed: process.metalComplexity?.mixed?.toString() || '1.0'
      },
      riskLevel: process.riskLevel,
      description: process.description || '',
      safetyRequirements: process.safetyRequirements || [],
      isActive: process.isActive !== false
    });
    setOpenDialog(true);
  };

  const handleDelete = async (processId) => {
    try {
      const response = await fetch(`/api/repair-processes?id=${processId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete process');
      }

      setDeleteDialog({ open: false, process: null });
      loadProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      category: '',
      laborMinutes: '',
      skillLevel: 'standard',
      equipmentCost: '',
      metalComplexity: {
        silver: '1.0',
        gold: '1.0',
        platinum: '1.0',
        mixed: '1.0'
      },
      riskLevel: 'low',
      description: '',
      safetyRequirements: [],
      isActive: true
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setEditingProcess(null);
    setOpenDialog(true);
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getSkillColor = (skill) => {
    switch (skill) {
      case 'basic': return 'success';
      case 'standard': return 'info';
      case 'advanced': return 'warning';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <PageContainer title="Processes Management">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Processes Management">
      <Box sx={{ pb: 8 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            Repair Processes
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Add Process
          </Button>
        </Box>

        {/* Processes Grid */}
        {processes.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No processes found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Get started by adding your first process
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenDialog}
                >
                  Add Process
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {processes.map((process) => (
              <Grid item xs={12} sm={6} md={4} key={process._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: process.isActive === false ? 0.7 : 1,
                    borderLeft: process.isActive === false ? 1 : 3,
                    borderLeftColor: process.isActive === false ? 'grey.300' : 'primary.main'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                        {process.displayName}
                      </Typography>
                      <Chip
                        label={process.isActive === false ? 'Inactive' : 'Active'}
                        color={process.isActive === false ? 'default' : 'success'}
                        size="small"
                      />
                    </Box>

                    <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                      {process.description || 'No description'}
                    </Typography>

                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      <Chip
                        label={process.category}
                        variant="outlined"
                        size="small"
                        icon={<CategoryIcon />}
                      />
                      <Chip
                        label={process.skillLevel}
                        variant="outlined"
                        size="small"
                        color={getSkillColor(process.skillLevel)}
                        icon={<EngineeringIcon />}
                      />
                      <Chip
                        label={process.riskLevel}
                        variant="outlined"
                        size="small"
                        color={getRiskColor(process.riskLevel)}
                        icon={<SecurityIcon />}
                      />
                    </Box>

                    {/* Time and Cost */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {process.laborMinutes} min
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <MoneyIcon fontSize="small" color="success" />
                        <Typography variant="body2" color="success.main">
                          ${process.equipmentCost?.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Metal Complexity */}
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Metal Complexity:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        <Chip label={`Silver: ${process.metalComplexity?.silver || 1.0}x`} size="small" />
                        <Chip label={`Gold: ${process.metalComplexity?.gold || 1.0}x`} size="small" />
                        <Chip label={`Platinum: ${process.metalComplexity?.platinum || 1.0}x`} size="small" />
                      </Stack>
                    </Box>

                    {/* Safety Requirements */}
                    {process.safetyRequirements && process.safetyRequirements.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Safety Requirements:
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {process.safetyRequirements.slice(0, 3).map((req) => (
                            <Chip
                              key={req}
                              label={req.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                              color="warning"
                            />
                          ))}
                          {process.safetyRequirements.length > 3 && (
                            <Chip
                              label={`+${process.safetyRequirements.length - 3}`}
                              size="small"
                              variant="outlined"
                              color="warning"
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                  </CardContent>

                  <CardActions>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(process)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, process })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add process"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleOpenDialog}
        >
          <AddIcon />
        </Fab>

        {/* Create/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingProcess ? 'Edit Process' : 'Add New Process'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Name (ID)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    helperText="Unique identifier (e.g., soldering)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Display Name"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    helperText="User-friendly name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="Category"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Skill Level</InputLabel>
                    <Select
                      value={formData.skillLevel}
                      label="Skill Level"
                      onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                    >
                      {skillLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Labor Minutes"
                    value={formData.laborMinutes}
                    onChange={(e) => setFormData({ ...formData, laborMinutes: e.target.value })}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Equipment Cost"
                    value={formData.equipmentCost}
                    onChange={(e) => setFormData({ ...formData, equipmentCost: e.target.value })}
                    InputProps={{
                      startAdornment: '$'
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Risk Level</InputLabel>
                    <Select
                      value={formData.riskLevel}
                      label="Risk Level"
                      onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                    >
                      {riskLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Metal Complexity */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Metal Complexity Multipliers
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Silver"
                    value={formData.metalComplexity.silver}
                    onChange={(e) => setFormData({
                      ...formData,
                      metalComplexity: { ...formData.metalComplexity, silver: e.target.value }
                    })}
                    inputProps={{
                      min: 0.1,
                      max: 5.0,
                      step: 0.1
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Gold"
                    value={formData.metalComplexity.gold}
                    onChange={(e) => setFormData({
                      ...formData,
                      metalComplexity: { ...formData.metalComplexity, gold: e.target.value }
                    })}
                    inputProps={{
                      min: 0.1,
                      max: 5.0,
                      step: 0.1
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Platinum"
                    value={formData.metalComplexity.platinum}
                    onChange={(e) => setFormData({
                      ...formData,
                      metalComplexity: { ...formData.metalComplexity, platinum: e.target.value }
                    })}
                    inputProps={{
                      min: 0.1,
                      max: 5.0,
                      step: 0.1
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Mixed"
                    value={formData.metalComplexity.mixed}
                    onChange={(e) => setFormData({
                      ...formData,
                      metalComplexity: { ...formData.metalComplexity, mixed: e.target.value }
                    })}
                    inputProps={{
                      min: 0.1,
                      max: 5.0,
                      step: 0.1
                    }}
                  />
                </Grid>

                {/* Safety Requirements */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Safety Requirements
                  </Typography>
                  <Grid container spacing={1}>
                    {safetyOptions.map((option) => (
                      <Grid item xs={12} sm={6} md={4} key={option}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.safetyRequirements.includes(option)}
                              onChange={(e) => {
                                const newReqs = e.target.checked
                                  ? [...formData.safetyRequirements, option]
                                  : formData.safetyRequirements.filter(req => req !== option);
                                setFormData({ ...formData, safetyRequirements: newReqs });
                              }}
                            />
                          }
                          label={option.replace('_', ' ')}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingProcess ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, process: null })}
        >
          <DialogTitle>Delete Process</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete &quot;{deleteDialog.process?.displayName}&quot;?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, process: null })}>
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => handleDelete(deleteDialog.process._id)}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
