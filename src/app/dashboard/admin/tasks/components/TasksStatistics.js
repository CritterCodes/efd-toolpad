import React from 'react';
import { Grid, Card, CardContent, Box, Typography } from '@mui/material';
import { 
  Build as BuildIcon, 
  AttachMoney as MoneyIcon, 
  Category as CategoryIcon, 
  Archive as ArchiveIcon 
} from '@mui/icons-material';

export default function TasksStatistics({ statistics }) {
  if (!statistics) return null;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1}>
              <BuildIcon color="primary" />
              <Box>
                <Typography variant="h4" component="div">
                  {statistics.total}
                </Typography>
                <Typography color="text.secondary">
                  Total Tasks
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1}>
              <MoneyIcon sx={{ color: 'green' }} />
              <Box>
                <Typography variant="h4" component="div">
                  ${statistics.averagePrice?.toFixed(2) || '0.00'}
                </Typography>
                <Typography color="text.secondary">
                  Average Price
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1}>
              <CategoryIcon color="secondary" />
              <Box>
                <Typography variant="h4" component="div">
                  {statistics.categories}
                </Typography>
                <Typography color="text.secondary">
                  Categories
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1}>
              <ArchiveIcon color="action" />
              <Box>
                <Typography variant="h4" component="div">
                  {statistics.inactive}
                </Typography>
                <Typography color="text.secondary">
                  Inactive
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
