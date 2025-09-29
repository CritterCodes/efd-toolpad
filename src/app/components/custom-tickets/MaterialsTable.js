/**
 * Materials Table Component
 * Displays and edits materials list - Constitutional Architecture
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Button,
  Typography,
  Box
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export function MaterialsTable({ 
  materials = [],
  editMode = false,
  onMaterialChange,
  onAddMaterial,
  onRemoveMaterial
}) {
  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!editMode && materials.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No materials specified
      </Typography>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Total</TableCell>
              {editMode && <TableCell width="50"></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {materials.map((material, index) => (
              <TableRow key={index}>
                <TableCell>
                  {editMode ? (
                    <TextField
                      size="small"
                      value={material.item || ''}
                      onChange={(e) => onMaterialChange(index, 'item', e.target.value)}
                      placeholder="Material name"
                    />
                  ) : (
                    material.item || 'Unnamed material'
                  )}
                </TableCell>
                <TableCell>
                  {editMode ? (
                    <TextField
                      size="small"
                      type="number"
                      value={material.quantity || 1}
                      onChange={(e) => {
                        const qty = parseFloat(e.target.value) || 1;
                        onMaterialChange(index, 'quantity', qty);
                        onMaterialChange(index, 'cost', qty * (material.unitPrice || 0));
                      }}
                    />
                  ) : (
                    material.quantity || 1
                  )}
                </TableCell>
                <TableCell>
                  {editMode ? (
                    <TextField
                      size="small"
                      type="number"
                      value={material.unitPrice || 0}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0;
                        onMaterialChange(index, 'unitPrice', price);
                        onMaterialChange(index, 'cost', (material.quantity || 1) * price);
                      }}
                      InputProps={{ startAdornment: '$' }}
                    />
                  ) : (
                    formatCurrency(material.unitPrice)
                  )}
                </TableCell>
                <TableCell>
                  {formatCurrency((material.quantity || 1) * (material.unitPrice || 0))}
                </TableCell>
                {editMode && (
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onRemoveMaterial(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {editMode && (
        <Button
          startIcon={<AddIcon />}
          onClick={onAddMaterial}
          size="small"
          sx={{ mt: 1 }}
        >
          Add Material
        </Button>
      )}
    </Box>
  );
}

export default MaterialsTable;