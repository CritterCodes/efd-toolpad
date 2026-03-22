import React from 'react';
import { Box, Grid, Card, CardMedia, CardContent, Typography, Checkbox, FormControlLabel, Select, MenuItem, Button } from '@mui/material';

export default function StullerProductGrid({ searchResults, selectedProducts, handleProductSelect }) {
    return () => (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Found {searchResults.length} products
        </Typography>
        <Button
          variant="contained"
          startIcon={<ImportIcon />}
          onClick={handleImport}
          disabled={selectedProducts.size === 0 || importing}
        >
          {importing ? <CircularProgress size={20} /> : `Import Selected (${selectedProducts.size})`}
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        {searchResults.map((product) => (
          <Grid item xs={12} key={product.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6">{product.name}</Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {product.description}
                    </Typography>
                    <Chip 
                      label={product.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onChange={(e) => handleProductSelect(product.id, e.target.checked)}
                      />
                    }
                    label="Import"
                  />
                </Box>
                
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      Variants ({product.variants.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>SKU</TableCell>
                            <TableCell>Metal</TableCell>
                            <TableCell>Karat</TableCell>
                            <TableCell>Cost</TableCell>
                            <TableCell>Stock</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {product.variants.map((variant, index) => (
                            <TableRow key={index}>
                              <TableCell>{variant.sku}</TableCell>
                              <TableCell>
                                {variant.metalType.charAt(0).toUpperCase() + variant.metalType.slice(1)}
                              </TableCell>
                              <TableCell>{variant.karat.toUpperCase()}</TableCell>
                              <TableCell>${variant.unitCost.toFixed(2)}</TableCell>
                              <TableCell>
                                {variant.inStock ? (
                                  <CheckIcon color="success" fontSize="small" />
                                ) : (
                                  <ErrorIcon color="error" fontSize="small" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}