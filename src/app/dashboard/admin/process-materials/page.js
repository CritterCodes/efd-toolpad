'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Build as BuildIcon,
  Science as ScienceIcon,
  Add as AddIcon
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ProcessMaterialsManager() {
  const [tabValue, setTabValue] = useState(0);
  const [processes, setProcesses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [processesRes, materialsRes] = await Promise.all([
        fetch('/api/repair-processes'),
        fetch('/api/repair-materials')
      ]);

      if (processesRes.ok) {
        const processesData = await processesRes.json();
        setProcesses(processesData.processes || []);
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        setMaterials(materialsData.materials || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load process and material data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getSkillLevelColor = (level) => {
    const colors = {
      'basic': 'success',
      'standard': 'primary', 
      'advanced': 'warning',
      'expert': 'error'
    };
    return colors[level] || 'default';
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error',
      'critical': 'error'
    };
    return colors[level] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading process and material data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Process & Materials Manager
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Manage repair processes and materials for accurate process-based pricing.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BuildIcon sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {processes.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Repair Processes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScienceIcon sx={{ mr: 2, color: 'secondary.main', fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="secondary" fontWeight="bold">
                      {materials.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Repair Materials
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              icon={<BuildIcon />} 
              label="Repair Processes" 
              iconPosition="start"
            />
            <Tab 
              icon={<ScienceIcon />} 
              label="Repair Materials" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Repair Processes ({processes.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Individual processes that make up repair tasks, with labor time and equipment costs.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              disabled
              sx={{ mb: 2 }}
            >
              Add Process (Coming Soon)
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Process Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Labor Time</TableCell>
                  <TableCell>Equipment Cost</TableCell>
                  <TableCell>Skill Level</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell>Metal Complexity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processes.map((process) => (
                  <TableRow key={process._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {process.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {process.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={process.category} 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>{process.laborMinutes} min</TableCell>
                    <TableCell>${process.equipmentCost}</TableCell>
                    <TableCell>
                      <Chip 
                        label={process.skillLevel} 
                        size="small" 
                        color={getSkillLevelColor(process.skillLevel)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={process.riskLevel} 
                        size="small" 
                        color={getRiskLevelColor(process.riskLevel)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Object.entries(process.metalComplexity || {}).map(([metal, multiplier]) => (
                          <Chip
                            key={metal}
                            label={`${metal}: ${multiplier}x`}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Repair Materials ({materials.length})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Consumable materials used in repair processes, with unit costs and metal compatibility.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              disabled
              sx={{ mb: 2 }}
            >
              Add Material (Coming Soon)
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Material Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Unit Cost</TableCell>
                  <TableCell>Unit Type</TableCell>
                  <TableCell>Compatible Metals</TableCell>
                  <TableCell>Supplier</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {material.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {material.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={material.category} 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>${material.unitCost}</TableCell>
                    <TableCell>{material.unitType}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {material.compatibleMetals.map((metal) => (
                          <Chip
                            key={metal}
                            label={metal}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {material.supplier}
                      </Typography>
                      {material.sku && (
                        <Typography variant="caption" color="text.secondary">
                          SKU: {material.sku}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'info.50', borderRadius: 1 }}>
          <Typography variant="h6" color="info.main" gutterBottom>
            💡 Getting Started
          </Typography>
          <Typography variant="body2" color="text.secondary">
            1. <strong>Seed Data</strong>: Import initial processes and materials from <code>seed-data.json</code><br/>
            2. <strong>Test Builder</strong>: Try the Process-Based Task Builder to create your first task<br/>
            3. <strong>Customize</strong>: Add your own processes and materials for your specific repair needs
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
