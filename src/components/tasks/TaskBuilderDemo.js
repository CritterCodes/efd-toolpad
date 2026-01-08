/**
 * TaskBuilderDemo.js - Complete demo showing universal task builder integration
 * 
 * This demonstrates how to integrate all the universal task components
 * with your existing process-based task builder UI patterns.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';

// Universal components
import { UniversalTaskBuilder, useUniversalTaskPricing } from './UniversalTaskBuilder';
import { UniversalProcessSelector } from './ProcessSelector';
import { UniversalTaskList } from './TaskList';
import { TaskService } from '../../services/TaskService';
import { PricingService } from '../../services/PricingService';

export default function TaskBuilderDemo() {
  // Demo data
  const [tasks, setTasks] = useState([]);
  const [availableProcesses, setAvailableProcesses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // UI State
  const [showTaskBuilder, setShowTaskBuilder] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Load demo data
  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = async () => {
    setLoading(true);
    try {
      // Load tasks and processes
      const [tasksResponse, processesResponse] = await Promise.all([
        TaskService.getTasks(),
        fetch('/api/processes').then(r => r.json())
      ]);

      setTasks(tasksResponse.tasks || []);
      setAvailableProcesses(processesResponse.processes || []);
    } catch (error) {
      console.error('Error loading demo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowTaskBuilder(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setShowTaskBuilder(true);
  };

  const handleDeleteTask = async (task) => {
    if (window.confirm(`Delete task "${task.name}"?`)) {
      try {
        await TaskService.deleteTask(task._id);
        setTasks(tasks.filter(t => t._id !== task._id));
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleTaskSave = async (taskData) => {
    try {
      let savedTask;
      
      if (selectedTask) {
        // Update existing task
        savedTask = await TaskService.updateTask(selectedTask._id, taskData);
        setTasks(tasks.map(t => t._id === selectedTask._id ? savedTask : t));
      } else {
        // Create new task
        savedTask = await TaskService.createTask(taskData);
        setTasks([...tasks, savedTask]);
      }

      setShowTaskBuilder(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  return (
    <UniversalTaskBuilder>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container justifyContent="space-between" alignItems="center">
              <Grid item>
                <Typography variant="h4" gutterBottom>
                  Universal Task Builder Demo
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Complete integration example preserving your existing UI patterns
                </Typography>
              </Grid>
              
              <Grid item>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTask}
                  size="large"
                >
                  Create Universal Task
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Demo Info */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              🎯 **Integration Demo Features:**
            </Typography>
            <Typography variant="body2" component="div">
              • **Metal Context Selector** - Choose metal type & karat at the top<br/>
              • **Universal Pricing** - See pricing for all metals, highlighted for current context<br/>
              • **Process Selection** - Your existing drag/drop UI enhanced with universal pricing<br/>
              • **Task Management** - Filter and sort tasks by metal compatibility<br/>
              • **Seamless Integration** - Drop-in components that preserve your existing patterns
            </Typography>
          </Alert>

          {/* Task List */}
          <UniversalTaskList
            tasks={tasks}
            loading={loading}
            onTaskEdit={handleEditTask}
            onTaskDelete={handleDeleteTask}
            itemsPerPage={10}
          />

          {/* Task Builder Dialog */}
          <TaskBuilderDialog
            open={showTaskBuilder}
            onClose={() => setShowTaskBuilder(false)}
            onSave={handleTaskSave}
            availableProcesses={availableProcesses}
            initialTask={selectedTask}
          />
        </Box>
      </Container>
    </UniversalTaskBuilder>
  );
}

// Task Builder Dialog Component
function TaskBuilderDialog({ 
  open, 
  onClose, 
  onSave, 
  availableProcesses = [],
  initialTask = null 
}) {
  const { calculatePricing, universalPricing, loading } = useUniversalTaskPricing();
  const [activeStep, setActiveStep] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'repairs',
    subcategory: '',
    processes: [],
    service: {
      estimatedDays: 3,
      rushDays: 1,
      requiresApproval: true
    }
  });

  // Initialize form with existing task data
  useEffect(() => {
    if (initialTask) {
      setFormData({
        name: initialTask.name || '',
        description: initialTask.description || '',
        category: initialTask.category || 'repairs',
        subcategory: initialTask.subcategory || '',
        processes: initialTask.processes || [],
        service: initialTask.service || {
          estimatedDays: 3,
          rushDays: 1,
          requiresApproval: true
        }
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'repairs',
        subcategory: '',
        processes: [],
        service: {
          estimatedDays: 3,
          rushDays: 1,
          requiresApproval: true
        }
      });
    }
  }, [initialTask, open]);

  // Calculate pricing when processes change
  useEffect(() => {
    if (formData.processes.length > 0) {
      calculatePricing({ processes: formData.processes });
    }
  }, [formData.processes, calculatePricing]);

  const handleProcessesChange = (newProcesses) => {
    setFormData({
      ...formData,
      processes: newProcesses
    });
  };

  const handleSave = () => {
    if (!universalPricing && formData.processes.length > 0) {
      alert('Please wait for pricing calculation to complete');
      return;
    }

    const taskData = {
      ...formData,
      pricing: universalPricing,
      universalTask: true,
      supportedMetals: universalPricing ? 
        Object.keys(universalPricing).map(metalKey => {
          const [metalType, karat] = metalKey.split('_');
          return { metalType, karat };
        }) : []
    };

    onSave(taskData);
  };

  const steps = ['Basic Info', 'Process Selection', 'Review & Save'];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5">
          {initialTask ? 'Edit Task' : 'Create Universal Task'}
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ minHeight: 400 }}>
        {activeStep === 0 && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Task Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
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
              
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <MenuItem value="repairs">Repairs</MenuItem>
                    <MenuItem value="shanks">Shanks</MenuItem>
                    <MenuItem value="sizing">Sizing</MenuItem>
                    <MenuItem value="restoration">Restoration</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ mt: 2 }}>
            <UniversalProcessSelector
              availableProcesses={availableProcesses}
              selectedProcesses={formData.processes}
              onProcessesChange={handleProcessesChange}
            />
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Task Summary
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography><strong>Name:</strong> {formData.name}</Typography>
                  <Typography><strong>Category:</strong> {formData.category}</Typography>
                  <Typography><strong>Processes:</strong> {formData.processes.length}</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Universal Pricing
                  </Typography>
                  {universalPricing ? (
                    <>
                      <Typography>
                        <strong>Metal Combinations:</strong> {Object.keys(universalPricing).length}
                      </Typography>
                      <Typography>
                        <strong>Price Range:</strong> {
                          (() => {
                            const stats = PricingService.calculatePricingStats(universalPricing);
                            return `${stats.formattedMin} - ${stats.formattedMax}`;
                          })()
                        }
                      </Typography>
                    </>
                  ) : (
                    <Typography color="text.secondary">
                      {loading ? 'Calculating...' : 'No pricing data'}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Button onClick={onClose}>
          Cancel
        </Button>
        
        <Box>
          {activeStep > 0 && (
            <Button 
              onClick={() => setActiveStep(activeStep - 1)}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
          )}
          
          {activeStep < steps.length - 1 ? (
            <Button 
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={activeStep === 0 && !formData.name}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!formData.name || (formData.processes.length > 0 && loading)}
            >
              {loading ? 'Calculating...' : 'Save Task'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
