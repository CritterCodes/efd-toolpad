import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent
} from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';

export default function ProcessTaskCalculations({ pricePreview }) {
  if (!pricePreview || Object.keys(pricePreview).length === 0) {
    return null;
  }

  return (
    <Card sx={{ bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CalculateIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" color="primary">
            Price Preview
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Process Labor: <strong>{pricePreview?.totalLaborHours || 0} hours</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Process Cost: <strong>${pricePreview?.totalProcessCost || 0}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Material Cost: <strong>${pricePreview?.totalMaterialCost || 0}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Marked-up Materials: <strong>${pricePreview?.markedUpMaterialCost || 0}</strong>
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Base Cost: <strong>${pricePreview?.baseCost || 0}</strong>
            </Typography>
            <Typography variant="h6" color="success.main">
              Retail Price: <strong>${pricePreview?.retailPrice || 0}</strong>
            </Typography>
            <Typography variant="body1" color="info.main">
              Wholesale Price: <strong>${pricePreview?.wholesalePrice || 0}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Business Multiplier: {pricePreview?.businessMultiplier || 1}x
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}