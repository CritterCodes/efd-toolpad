/**
 * Custom Ticket Financials Component
 * Displays and manages financial information - Constitutional Architecture
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import MaterialsTable from './MaterialsTable';
import PricingBreakdown from './PricingBreakdown';

export function CustomTicketFinancials({ 
  ticket,
  onUpdateFinancials,
  saving = false
}) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    materialCosts: ticket?.materialCosts || [],
    laborCost: ticket?.laborCost || 0,
    laborHours: ticket?.laborHours || 0,
    castingCost: ticket?.castingCost || 0,
    shippingCost: ticket?.shippingCost || 0,
    designFee: ticket?.designFee || 100,
    rushMultiplier: ticket?.isRush ? 1.5 : 1,
    depositAmount: ticket?.depositAmount || 0,
    finalAmount: ticket?.finalAmount || 0
  });

  const calculateTotals = (data) => {
    const materialTotal = data.materialCosts.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
    const laborTotal = (parseFloat(data.laborCost) || 0) * (parseFloat(data.rushMultiplier) || 1);
    const castingTotal = parseFloat(data.castingCost) || 0;
    const shippingTotal = parseFloat(data.shippingCost) || 0;
    const designTotal = parseFloat(data.designFee) || 0;
    
    const subtotal = materialTotal + laborTotal + castingTotal + shippingTotal + designTotal;
    const markup = subtotal * 0.4; // 40% markup
    const total = subtotal + markup;
    
    return {
      materials: materialTotal,
      labor: laborTotal,
      casting: castingTotal,
      shipping: shippingTotal,
      design: designTotal,
      subtotal,
      markup,
      total
    };
  };

  const totals = calculateTotals(formData);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMaterialChange = (index, field, value) => {
    const newMaterials = [...formData.materialCosts];
    newMaterials[index] = {
      ...newMaterials[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      materialCosts: newMaterials
    }));
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materialCosts: [...prev.materialCosts, { item: '', quantity: 1, unitPrice: 0, cost: 0 }]
    }));
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materialCosts: prev.materialCosts.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!onUpdateFinancials) return;

    const result = await onUpdateFinancials({
      ...formData,
      quoteTotal: totals.total,
      breakdown: totals
    });

    if (result.success) {
      setEditMode(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      materialCosts: ticket?.materialCosts || [],
      laborCost: ticket?.laborCost || 0,
      laborHours: ticket?.laborHours || 0,
      castingCost: ticket?.castingCost || 0,
      shippingCost: ticket?.shippingCost || 0,
      designFee: ticket?.designFee || 100,
      rushMultiplier: ticket?.isRush ? 1.5 : 1,
      depositAmount: ticket?.depositAmount || 0,
      finalAmount: ticket?.finalAmount || 0
    });
    setEditMode(false);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Financial Details
          </Typography>
          
          {!editMode ? (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
              size="small"
            >
              Edit Financials
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                size="small"
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                size="small"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Materials Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Materials
            </Typography>
            
            <MaterialsTable
              materials={formData.materialCosts}
              editMode={editMode}
              onMaterialChange={handleMaterialChange}
              onAddMaterial={addMaterial}
              onRemoveMaterial={removeMaterial}
            />
          </Grid>

          {/* Labor and Other Costs */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Labor & Services
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Labor Hours"
                type="number"
                value={formData.laborHours}
                onChange={(e) => handleInputChange('laborHours', e.target.value)}
                disabled={!editMode}
                size="small"
              />
              
              <TextField
                label="Labor Cost"
                type="number"
                value={formData.laborCost}
                onChange={(e) => handleInputChange('laborCost', e.target.value)}
                disabled={!editMode}
                InputProps={{ startAdornment: '$' }}
                size="small"
              />
              
              <TextField
                label="Design Fee"
                type="number"
                value={formData.designFee}
                onChange={(e) => handleInputChange('designFee', e.target.value)}
                disabled={!editMode}
                InputProps={{ startAdornment: '$' }}
                size="small"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Additional Costs
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Casting Cost"
                type="number"
                value={formData.castingCost}
                onChange={(e) => handleInputChange('castingCost', e.target.value)}
                disabled={!editMode}
                InputProps={{ startAdornment: '$' }}
                size="small"
              />
              
              <TextField
                label="Shipping Cost"
                type="number"
                value={formData.shippingCost}
                onChange={(e) => handleInputChange('shippingCost', e.target.value)}
                disabled={!editMode}
                InputProps={{ startAdornment: '$' }}
                size="small"
              />

              {ticket?.isRush && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Rush order multiplier: {formData.rushMultiplier}x applied to labor
                </Alert>
              )}
            </Box>
          </Grid>

          {/* Pricing Breakdown */}
          <Grid item xs={12}>
            <PricingBreakdown totals={totals} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default CustomTicketFinancials;