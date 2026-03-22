import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControlLabel,
  Switch,
  Box,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export function MaterialVariantsTable({ 
  variants, 
  handleToggleVariantActive, 
  handleEditVariant, 
  handleDeleteVariant, 
  disabled 
}) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Metal Type</TableCell>
            <TableCell>Karat</TableCell>
            <TableCell>SKU</TableCell>
            <TableCell>Unit Cost</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Updated</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variants.map((variant, index) => (
            <TableRow key={index}>
              <TableCell>
                <Chip 
                  label={variant.metalType.toUpperCase()} 
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>{variant.karat.toUpperCase()}</TableCell>
              <TableCell>{variant.sku || 'N/A'}</TableCell>
              <TableCell>${variant.unitCost.toFixed(2)}</TableCell>
              <TableCell>
                <FormControlLabel
                  control={
                    <Switch
                      checked={variant.isActive}
                      onChange={() => handleToggleVariantActive(index)}
                      disabled={disabled}
                      size="small"
                    />
                  }
                  label={variant.isActive ? 'Active' : 'Inactive'}
                />
              </TableCell>
              <TableCell>
                {variant.lastUpdated ? 
                  new Date(variant.lastUpdated).toLocaleDateString() : 
                  'N/A'
                }
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  <Tooltip title="Edit Variant">
                    <IconButton
                      size="small"
                      onClick={() => handleEditVariant(index)}
                      disabled={disabled}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Variant">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteVariant(index)}
                      disabled={disabled || variants.length <= 1}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default MaterialVariantsTable;