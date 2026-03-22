import React from 'react';
import { Box, Typography, Alert, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export default function StullerImportResults({ importResults }) {
    return () => (
    <Box sx={{ p: 2 }}>
      {importResults && (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully imported {importResults.success} materials
          </Alert>
          
          {importResults.failed > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Failed to import {importResults.failed} materials
            </Alert>
          )}
          
          {importResults.errors.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Import Errors ({importResults.errors.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {importResults.errors.map((error, index) => (
                    <Alert key={index} severity="error" sx={{ mb: 1 }}>
                      <strong>{error.product}:</strong> {error.error}
                    </Alert>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
          
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>Imported Materials</Typography>
            <Grid container spacing={2}>
              {importResults.imported.map((material, index) => (
                <Grid item xs={12} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1">{material.displayName}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {material.hasVariants ? `${material.variants.length} variants` : 'Single variant'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}
    </Box>
  );
}