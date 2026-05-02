"use client";

import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { REPORT_DEFINITIONS } from './reportDefinitions';

export default function AnalyticsReportsIndexPage() {
  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          Printable and exportable business reports for finance, labor, payroll, wholesale, and closeout.
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }}>
        Each report opens as its own document-style view with period filters, print, and CSV export.
      </Alert>

      <Grid container spacing={2}>
        {REPORT_DEFINITIONS.map((report) => (
          <Grid item xs={12} md={6} lg={4} key={report.slug}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {report.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {report.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  component={Link}
                  href={`/dashboard/analytics/reports/${report.slug}`}
                  variant="contained"
                >
                  Open Report
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
