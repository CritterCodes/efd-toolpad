import React from 'react';
import { Grid, Typography, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, Box, FormGroup, FormControlLabel, Switch, IconButton, Button, Tooltip } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';


export const StullerIntegrationSection = (props) => {
    const { formData, setFormData, isVariantMode, loadingStuller, onFetchStullerData, MATERIAL_CATEGORIES, calculateRetailMargin, handlePortionChange, handleRemovePortion, handleAddPortion, PORTION_UNITS } = props;
    return (
        <>
{/* Stuller Integration Section */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Stuller Integration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isVariantMode 
            ? 'Enter a Stuller item number to find related products across different karats and metals'
            : 'Enter Stuller item number to auto-populate material data'
          }
        </Typography>
      </Grid>
      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          label="Stuller Item Number"
          value={formData.stuller_item_number || ''}
          onChange={(e) => setFormData({ ...formData, stuller_item_number: e.target.value })}
          helperText={isVariantMode 
            ? "Will search for related products to create variants"
            : "Enter Stuller item number to auto-populate material data"
          }
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <LoadingButton
          variant="outlined"
          loading={loadingStuller}
          onClick={() => onFetchStullerData(formData.stuller_item_number, isVariantMode)}
          disabled={!formData.stuller_item_number?.trim()}
          fullWidth
          sx={{ height: '56px' }}
        >
          {isVariantMode ? 'Find Variants' : 'Fetch Data'}
        </LoadingButton>
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.auto_update_pricing}
              onChange={(e) => setFormData({ ...formData, auto_update_pricing: e.target.checked })}
            />
          }
          label="Auto-update pricing from Stuller"
        />
      </Grid>

      
        </>
    );
};
