import React from 'react';
import { Box, Typography, Grid, Divider, Collapse, CardContent } from '@mui/material';

export function TaskCardExpandedDetails({
  task,
  expanded,
  pricingStats,
  currentMetalKey
}) {
  return (
    <Collapse in={expanded} timeout="auto" unmountOnExit>
      <CardContent sx={{ pt: 0 }}>
        <Divider sx={{ mb: 2 }} />
        
        {/* All Metal Pricing */}
        {pricingStats && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              All Metal Combinations:
            </Typography>
            <Grid container spacing={1}>
              {pricingStats.metalBreakdown.map(metal => (
                <Grid item xs={6} sm={4} key={metal.metalKey}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1,
                      bgcolor: metal.metalKey === currentMetalKey 
                        ? 'primary.light' : 'transparent'
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {metal.displayName}
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {metal.formattedPrice}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Service Details */}
        {task.service && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Service Details:
            </Typography>
            <Grid container spacing={2}>
              {task.service.estimatedDays && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Estimated Days: {task.service.estimatedDays}
                  </Typography>
                </Grid>
              )}
              {task.service.rushDays && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Rush Days: {task.service.rushDays}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Process Information */}
        {task.processes && task.processes.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Processes: {task.processes.length} selected
            </Typography>
          </Box>
        )}
      </CardContent>
    </Collapse>
  );
}