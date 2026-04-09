import React from 'react';
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography, Chip, IconButton } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

export const StullerProductsTable = ({ 
  stullerProducts, 
  defaultMarkupRate,
  formatCurrency, 
  handleDeleteProduct,
  calculateStullerCostPerPortion,
  calculateMarkedUpCostPerPortion,
  getMetalTypeColor,
  formatMetalTypeDisplay
}) => {
  return (
    <>
<TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Number</TableCell>
                <TableCell>Metal Type</TableCell>
                <TableCell>Karat</TableCell>
                <TableCell>Stuller Price</TableCell>
                <TableCell>Marked-up Price</TableCell>
                <TableCell>Raw Cost/Portion</TableCell>
                <TableCell>Final Cost/Portion</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stullerProducts.map((product) => {
                const resolvedMarkupRate = parseFloat(product.markupRate) || parseFloat(defaultMarkupRate) || 1.5;
                const resolvedMarkedUpPrice = (parseFloat(product.markedUpPrice) > 0)
                  ? parseFloat(product.markedUpPrice)
                  : ((parseFloat(product.stullerPrice) || 0) * resolvedMarkupRate);

                return (
                <TableRow key={product.id}>
                  <TableCell>{product.stullerItemNumber}</TableCell>
                  <TableCell>
                    {product.metalType ? (
                      <Chip
                        label={formatMetalTypeDisplay(product.metalType)}
                        size="small"
                        color={getMetalTypeColor(product.metalType)}
                      />
                    ) : (
                      <Chip
                        label="N/A"
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {product.karat ? (
                      product.karat
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(product.stullerPrice || 0)}</TableCell>
                  <TableCell>
                    <strong>{formatCurrency(resolvedMarkedUpPrice)}</strong>
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      ({resolvedMarkupRate}x markup)
                    </Typography>
                  </TableCell>
                  <TableCell>{formatCurrency(calculateStullerCostPerPortion(product.stullerPrice || 0))}</TableCell>
                  <TableCell>
                    <strong>{formatCurrency(calculateMarkedUpCostPerPortion(resolvedMarkedUpPrice))}</strong>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteProduct(product.id)}
                      title="Remove Product"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
    </>
  );
};
