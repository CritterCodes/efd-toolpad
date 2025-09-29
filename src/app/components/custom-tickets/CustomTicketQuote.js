/**
 * Custom Ticket Quote Component
 * Comprehensive quote builder with materials, labor, analytics - Constitutional Architecture
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
  Diamond as DiamondIcon,
  Build as BuildIcon,
  LocalShipping as ShippingIcon,
  Publish as PublishIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

export function CustomTicketQuote({ 
  ticket,
  onUpdateFinancials,
  saving = false
}) {
  const [editMode, setEditMode] = useState(true);
  const [isPublished, setIsPublished] = useState(ticket?.quote?.quotePublished || false);
  const [financialSettings, setFinancialSettings] = useState({
    customDesignFee: 100.00,
    commissionPercentage: 0.10,
    jewelerLaborRate: 45.00,
    cadDesignerRate: 50.00,
    materialMarkupPercentage: 0.30,
    shippingRate: 25.00,
    rushMultiplier: 1.5
  });
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Materials (centerstone, accent stones, mounting)
    centerstone: {
      item: ticket?.quote?.centerstone?.description || ticket?.quote?.centerstone?.item || '',
      cost: ticket?.quote?.centerstone?.cost || 0,
      markup: 0
    },
    accentStones: ticket?.quote?.accentStones || [],
    mounting: {
      item: ticket?.quote?.mounting?.description || ticket?.quote?.mounting?.item || '',
      cost: ticket?.quote?.mounting?.cost || 0,
      markup: 0
    },
    additionalMaterials: ticket?.quote?.additionalMaterials || [],
    
    // Labor Tasks
    laborTasks: ticket?.quote?.laborTasks || [],
    
    // Shipping Costs
    shippingCosts: ticket?.quote?.shippingCosts || [],
    
    // Flags
    isRush: ticket?.quote?.isRush || false,
    includeCustomDesign: ticket?.quote?.includeCustomDesign || false
  });

  // Load financial settings from admin
  useEffect(() => {
    loadFinancialSettings();
  }, []);

  const loadFinancialSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      
      if (result && result.pricing) {
        // Extract settings from the actual admin settings structure
        const adminData = result;
        
        const loadedSettings = {
          customDesignFee: adminData.financial?.customDesignFee || 100.00,
          commissionPercentage: adminData.financial?.commissionPercentage || 0.10,
          jewelerLaborRate: adminData.financial?.jewelerLaborRate || adminData.pricing?.wage || 45.00,
          cadDesignerRate: adminData.financial?.cadDesignerRate || 50.00,
          materialMarkupPercentage: adminData.financial?.materialMarkupPercentage || 
                                   (adminData.pricing?.materialMarkup ? (adminData.pricing.materialMarkup - 1) : 1.0),
          shippingRate: adminData.financial?.shippingRate || adminData.pricing?.deliveryFee || 25.00,
          rushMultiplier: adminData.financial?.rushMultiplier || adminData.pricing?.rushMultiplier || 1.5
        };
        
        // Update financial settings with processed values
        setFinancialSettings(loadedSettings);
      } else {
        console.warn('No admin settings found. Using defaults.');
      }
    } catch (error) {
      console.error('Error loading financial settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate comprehensive analytics
  const calculateAnalytics = (data, settings) => {
    if (!settings) return { total: 0, cog: 0, profit: 0, jewelerPayout: 0, cadDesignerPayout: 0, commissionPayout: 0 };

    // Material costs at cost (COG component)
    const centerstoneAtCost = parseFloat(data.centerstone.cost) || 0;
    const accentStonesAtCost = data.accentStones.reduce((sum, stone) => sum + ((parseFloat(stone.cost) || 0) * (parseFloat(stone.quantity) || 1)), 0);
    const mountingAtCost = parseFloat(data.mounting.cost) || 0;
    const additionalMaterialsAtCost = data.additionalMaterials.reduce((sum, mat) => sum + ((parseFloat(mat.cost) || 0) * (parseFloat(mat.quantity) || 1)), 0);
    const totalMaterialsAtCost = centerstoneAtCost + accentStonesAtCost + mountingAtCost + additionalMaterialsAtCost;

    // Material revenue (with markup) - matching spreadsheet formula
    const materialMarkup = settings.materialMarkupPercentage || 1.0; // Default to 100% markup (2x)
    const totalMaterialsRevenue = totalMaterialsAtCost * (1 + materialMarkup);
    const materialProfit = totalMaterialsRevenue - totalMaterialsAtCost;

    // Labor costs from tasks
    const laborTasks = data.laborTasks || [];
    const totalLaborCost = laborTasks.reduce((sum, task) => {
      const taskCost = (parseFloat(task.cost) || 0) * (parseFloat(task.quantity) || 1);
      return sum + taskCost;
    }, 0);
    const laborRevenue = totalLaborCost; // Labor is charged at cost, profit comes from materials

    // Custom design fee
    const customDesignFee = data.includeCustomDesign ? (settings.customDesignFee || 100.00) : 0;

    // Shipping costs
    const shippingCosts = data.shippingCosts || [];
    const totalShippingCost = shippingCosts.reduce((sum, shipping) => {
      const shippingCost = (parseFloat(shipping.cost) || 0);
      return sum + shippingCost;
    }, 0);

    // Debug calculation - simplified
    console.log('Quote calculation:', {
      materialsTotal: totalMaterialsAtCost,
      materialsRevenue: totalMaterialsRevenue,
      labor: totalLaborCost,
      shipping: totalShippingCost,
      customDesign: customDesignFee,
      finalTotal: totalMaterialsRevenue + totalLaborCost + totalShippingCost + customDesignFee
    });

    // Rush multiplier
    const rushMultiplier = data.isRush ? (settings.rushMultiplier || 1.5) : 1;
    const rushUpcharge = data.isRush ? ((totalMaterialsRevenue + laborRevenue) * (rushMultiplier - 1)) : 0;

    // Calculate totals
    const subtotal = totalMaterialsRevenue + laborRevenue + customDesignFee + totalShippingCost + rushUpcharge;
    const total = subtotal;

    // Analytics breakdown
    const cog = totalMaterialsAtCost + totalLaborCost + customDesignFee + totalShippingCost; // Cost of goods: materials + labor + design + shipping
    const profit = materialProfit + rushUpcharge; // Profit from material markup + rush upcharge
    const jewelerPayout = totalLaborCost; // Jeweler gets paid for labor
    const cadDesignerPayout = customDesignFee; // CAD designer gets the custom design fee
    const commissionPayout = profit * (settings.commissionPercentage || 0.10); // Commission on PROFIT only

    return {
      // Revenue breakdown
      totalMaterialsRevenue,
      laborRevenue,
      customDesignFee,
      totalShippingCost,
      rushUpcharge,
      total,

      // Cost breakdown
      totalMaterialsAtCost,
      totalLaborCost,

      // Analytics
      cog,
      profit,
      jewelerPayout,
      cadDesignerPayout,
      commissionPayout,

      // Additional metrics
      materialProfit,
      netProfit: total - cog - commissionPayout, // Total revenue minus all costs and commission
      grossMargin: total > 0 ? ((total - cog) / total * 100) : 0
    };
  };

  // Calculate analytics whenever formData or financialSettings change
  const analytics = useMemo(() => {
    return calculateAnalytics(formData, financialSettings);
  }, [formData, financialSettings]);

  const addAccentStone = () => {
    setFormData(prev => ({
      ...prev,
      accentStones: [...prev.accentStones, { description: '', cost: 0, quantity: 1 }]
    }));
  };

  const removeAccentStone = (index) => {
    setFormData(prev => ({
      ...prev,
      accentStones: prev.accentStones.filter((_, i) => i !== index)
    }));
  };

  const updateAccentStone = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      accentStones: prev.accentStones.map((stone, i) => 
        i === index ? { ...stone, [field]: value } : stone
      )
    }));
  };

  // Labor task management functions
  const addLaborTask = () => {
    setFormData(prev => ({
      ...prev,
      laborTasks: [...prev.laborTasks, { description: '', cost: 0, quantity: 1 }]
    }));
  };

  const removeLaborTask = (index) => {
    setFormData(prev => ({
      ...prev,
      laborTasks: prev.laborTasks.filter((_, i) => i !== index)
    }));
  };

  const updateLaborTask = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      laborTasks: prev.laborTasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  // Shipping cost management functions
  const addShippingCost = () => {
    setFormData(prev => ({
      ...prev,
      shippingCosts: [...prev.shippingCosts, { description: '', cost: 0 }]
    }));
  };

  const removeShippingCost = (index) => {
    setFormData(prev => ({
      ...prev,
      shippingCosts: prev.shippingCosts.filter((_, i) => i !== index)
    }));
  };

  const updateShippingCost = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      shippingCosts: prev.shippingCosts.map((shipping, i) => 
        i === index ? { ...shipping, [field]: value } : shipping
      )
    }));
  };

  const addAdditionalMaterial = () => {
    setFormData(prev => ({
      ...prev,
      additionalMaterials: [...prev.additionalMaterials, { description: '', cost: 0 }]
    }));
  };

  const removeAdditionalMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      additionalMaterials: prev.additionalMaterials.filter((_, i) => i !== index)
    }));
  };

  const updateAdditionalMaterial = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      additionalMaterials: prev.additionalMaterials.map((mat, i) => 
        i === index ? { ...mat, [field]: value } : mat
      )
    }));
  };

  const handleSave = async () => {
    if (!onUpdateFinancials) return;

    const quoteData = {
      centerstone: formData.centerstone,
      accentStones: formData.accentStones,
      mounting: formData.mounting,
      additionalMaterials: formData.additionalMaterials,
      laborTasks: formData.laborTasks,
      shippingCosts: formData.shippingCosts,
      isRush: formData.isRush,
      includeCustomDesign: formData.includeCustomDesign,
      customDesignFee: financialSettings.customDesignFee,
      quoteTotal: analytics.total,
      analytics: analytics
    };

    const saveData = {
      quote: quoteData
    };

    console.log('🔄 CustomTicketQuote.handleSave - Saving as nested quote object:', {
      quoteData,
      saveData
    });

    const result = await onUpdateFinancials(saveData);

    console.log('✅ CustomTicketQuote.handleSave - Save result:', result);

    if (result.success) {
      setEditMode(false);
    }
  };

  const handlePublishQuote = async () => {
    if (!onUpdateFinancials) return;

    const quoteData = {
      centerstone: formData.centerstone,
      accentStones: formData.accentStones,
      mounting: formData.mounting,
      additionalMaterials: formData.additionalMaterials,
      laborTasks: formData.laborTasks,
      shippingCosts: formData.shippingCosts,
      isRush: formData.isRush,
      includeCustomDesign: formData.includeCustomDesign,
      customDesignFee: financialSettings.customDesignFee,
      quoteTotal: analytics.total,
      analytics: analytics,
      quotePublished: true,
      publishedAt: new Date().toISOString()
    };

    const saveData = {
      quote: quoteData
    };

    // First save the current quote data
    const result = await onUpdateFinancials(saveData);

    if (result.success) {
      setIsPublished(true);
      setEditMode(false);
      
      // Send notification to client (optional - could be handled server-side)
      try {
        await fetch('/api/notifications/quote-published', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ticketId: ticket?.ticketID,
            quoteTotal: analytics.total 
          })
        });
      } catch (error) {
        console.log('Notification failed (non-critical):', error);
      }
    }
  };

  const handleUnpublishQuote = async () => {
    if (!onUpdateFinancials) return;

    const quoteData = {
      centerstone: formData.centerstone,
      accentStones: formData.accentStones,
      mounting: formData.mounting,
      additionalMaterials: formData.additionalMaterials,
      laborTasks: formData.laborTasks,
      shippingCosts: formData.shippingCosts,
      isRush: formData.isRush,
      includeCustomDesign: formData.includeCustomDesign,
      customDesignFee: financialSettings.customDesignFee,
      quoteTotal: analytics.total,
      analytics: analytics,
      quotePublished: false,
      publishedAt: null
    };

    const saveData = {
      quote: quoteData
    };

    const result = await onUpdateFinancials(saveData);

    if (result.success) {
      setIsPublished(false);
    }
  };

  const handleCancel = () => {
    // Reset form data from ticket
    setFormData({
      centerstone: {
        item: ticket?.quote?.centerstone?.description || ticket?.quote?.centerstone?.item || '',
        cost: ticket?.quote?.centerstone?.cost || 0,
        markup: 0
      },
      accentStones: ticket?.quote?.accentStones || [],
      mounting: {
        item: ticket?.quote?.mounting?.description || ticket?.quote?.mounting?.item || '',
        cost: ticket?.quote?.mounting?.cost || 0,
        markup: 0
      },
      additionalMaterials: ticket?.quote?.additionalMaterials || [],
      laborTasks: ticket?.quote?.laborTasks || [],
      shippingCosts: ticket?.quote?.shippingCosts || [],
      isRush: ticket?.quote?.isRush || false,
      includeCustomDesign: ticket?.quote?.includeCustomDesign || false
    });
    setEditMode(false);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading financial settings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">Quote Builder</Typography>
          {isPublished && (
            <Chip 
              icon={<VisibilityIcon />} 
              label="Published to Client" 
              color="success" 
              size="small" 
            />
          )}
        </Box>
        {!editMode ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
            >
              Edit Quote
            </Button>
            {isPublished ? (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<VisibilityIcon />}
                onClick={handleUnpublishQuote}
                disabled={saving}
              >
                Unpublish Quote
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={<PublishIcon />}
                onClick={handlePublishQuote}
                disabled={saving || analytics.total <= 0}
              >
                Publish Quote
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              Save Quote
            </Button>
            {!isPublished && (
              <Button
                variant="contained"
                color="success"
                startIcon={<PublishIcon />}
                onClick={handlePublishQuote}
                disabled={saving || analytics.total <= 0}
              >
                Save & Publish
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Materials & Labor */}
        <Grid item xs={12} md={8}>
          {/* Materials Section */}
          <Card sx={{ mb: 2 }}>
            <CardHeader 
              title="Materials" 
              avatar={<DiamondIcon color="primary" />}
            />
            <CardContent>
              {/* Centerstone */}
              <Typography variant="h6" gutterBottom>Centerstone</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    label="Centerstone Description"
                    value={formData.centerstone.item}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      centerstone: { ...prev.centerstone, item: e.target.value }
                    }))}
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Cost"
                    type="number"
                    value={formData.centerstone.cost}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[$,]/g, ''); // Remove $ and commas
                      setFormData(prev => ({
                        ...prev,
                        centerstone: { ...prev.centerstone, cost: parseFloat(value) || 0 }
                      }));
                    }}
                    size="small"
                    InputProps={{ startAdornment: '$' }}
                  />
                </Grid>
              </Grid>

              {/* Mounting */}
              <Typography variant="h6" gutterBottom>Mounting</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    label="Mounting Description"
                    value={formData.mounting.item}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      mounting: { ...prev.mounting, item: e.target.value }
                    }))}
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Cost"
                    type="number"
                    value={formData.mounting.cost}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[$,]/g, ''); // Remove $ and commas
                      setFormData(prev => ({
                        ...prev,
                        mounting: { ...prev.mounting, cost: parseFloat(value) || 0 }
                      }));
                    }}
                    size="small"
                    InputProps={{ startAdornment: '$' }}
                  />
                </Grid>
              </Grid>

              {/* Accent Stones */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6">Accent Stones</Typography>
                {editMode && (
                  <IconButton size="small" onClick={addAccentStone}>
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
              {formData.accentStones.map((stone, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 1, alignItems: 'center' }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={stone.description}
                      onChange={(e) => updateAccentStone(index, 'description', e.target.value)}
                      
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      label="Qty"
                      type="number"
                      value={stone.quantity}
                      onChange={(e) => updateAccentStone(index, 'quantity', parseInt(e.target.value) || 1)}
                      
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Cost"
                      type="number"
                      value={stone.cost}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[$,]/g, ''); // Remove $ and commas
                        updateAccentStone(index, 'cost', parseFloat(value) || 0);
                      }}
                      
                      size="small"
                      InputProps={{ startAdornment: '$' }}
                    />
                  </Grid>
                  <Grid item xs={1}>
                    {editMode && (
                      <IconButton size="small" onClick={() => removeAccentStone(index)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              ))}
            </CardContent>
          </Card>

          {/* Labor Section */}
          {/* Labor Tasks */}
          <Card sx={{ mb: 2 }}>
            <CardHeader 
              title="Labor Tasks" 
              avatar={<BuildIcon color="primary" />}
              action={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addLaborTask}
                    size="small"
                    variant="outlined"
                  >
                    Add Task
                  </Button>
                </Box>
              }
            />
            <CardContent>
              {formData.laborTasks.map((task, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: index < formData.laborTasks.length - 1 ? 2 : 0 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Task Description"
                      value={task.description}
                      onChange={(e) => updateLaborTask(index, 'description', e.target.value)}
                      
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      label="Qty"
                      type="number"
                      value={task.quantity}
                      onChange={(e) => updateLaborTask(index, 'quantity', parseInt(e.target.value) || 1)}
                      
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Cost"
                      type="number"
                      value={task.cost}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[$,]/g, ''); // Remove $ and commas
                        updateLaborTask(index, 'cost', parseFloat(value) || 0);
                      }}
                      
                      size="small"
                      InputProps={{ startAdornment: '$' }}
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton size="small" onClick={() => removeLaborTask(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              {formData.laborTasks.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No labor tasks added. Click &quot;Add Task&quot; to add production tasks.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Shipping Costs */}
          <Card>
            <CardHeader 
              title="Shipping Costs" 
              avatar={<ShippingIcon color="primary" />}
              action={
                <Button variant="outlined" size="small" onClick={addShippingCost} startIcon={<AddIcon />}>
                  Add Shipping
                </Button>
              }
            />
            <CardContent>
              {formData.shippingCosts.map((shipping, index) => (
                <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 2 }}>
                  <Grid item xs={7}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Description"
                      value={shipping.description}
                      onChange={(e) => updateShippingCost(index, 'description', e.target.value)}
                      placeholder="e.g., Supplier shipping, Client delivery"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Cost"
                      type="number"
                      value={shipping.cost}
                      onChange={(e) => updateShippingCost(index, 'cost', e.target.value)}
                      InputProps={{ startAdornment: '$' }}
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton size="small" onClick={() => removeShippingCost(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              {formData.shippingCosts.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No shipping costs added. Click &quot;Add Shipping&quot; to add supplier or delivery costs.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader title="Additional Options" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.includeCustomDesign}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeCustomDesign: e.target.checked }))}
                        
                      />
                    }
                    label={`Custom Design Fee (${financialSettings ? '$' + financialSettings.customDesignFee : '$100'})`}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isRush}
                        onChange={(e) => setFormData(prev => ({ ...prev, isRush: e.target.checked }))}
                        
                      />
                    }
                    label={`Rush Order (${financialSettings ? (financialSettings.rushMultiplier * 100 - 100).toFixed(0) : '50'}% surcharge)`}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Quote Summary & Analytics */}
        <Grid item xs={12} md={4}>
          {/* Quote Summary */}
          <Card sx={{ mb: 2 }}>
            <CardHeader 
              title="Quote Summary" 
              avatar={<CalculateIcon color="primary" />}
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Materials:</Typography>
                  <Typography variant="body2">${analytics.totalMaterialsRevenue?.toFixed(2) || '0.00'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Labor:</Typography>
                  <Typography variant="body2">${analytics.laborRevenue?.toFixed(2) || '0.00'}</Typography>
                </Box>
                {analytics.customDesignFee > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Custom Design:</Typography>
                    <Typography variant="body2">${analytics.customDesignFee?.toFixed(2)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Shipping:</Typography>
                  <Typography variant="body2">${analytics.totalShippingCost?.toFixed(2) || '0.00'}</Typography>
                </Box>
                {analytics.rushUpcharge > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="warning.main">Rush Surcharge:</Typography>
                    <Typography variant="body2" color="warning.main">${analytics.rushUpcharge?.toFixed(2)}</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">${analytics.total?.toFixed(2) || '0.00'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card>
            <CardHeader title="Analytics" />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>Cost Breakdown</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">COG (Cost of Goods):</Typography>
                  <Typography variant="body2">${analytics.cog?.toFixed(2) || '0.00'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="success.main">Gross Profit:</Typography>
                  <Typography variant="body2" color="success.main">${analytics.profit?.toFixed(2) || '0.00'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Gross Margin:</Typography>
                  <Typography variant="body2">{analytics.grossMargin?.toFixed(1) || '0.0'}%</Typography>
                </Box>

                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>Payouts</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Jeweler Payout:</Typography>
                  <Typography variant="body2">${analytics.jewelerPayout?.toFixed(2) || '0.00'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">CAD Designer:</Typography>
                  <Typography variant="body2">${analytics.cadDesignerPayout?.toFixed(2) || '0.00'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Commission:</Typography>
                  <Typography variant="body2">${analytics.commissionPayout?.toFixed(2) || '0.00'}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight="bold">Net Profit:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    ${analytics.netProfit?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CustomTicketQuote;