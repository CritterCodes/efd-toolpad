import {
    Alert,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    Divider
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

const money = (n) => `$${Number(n).toFixed(2)}`;

/**
 * A sample job — 2 hours and $25 of materials — priced by THE engine with the settings being edited
 * (useStoreSettings → pricingPreview), exactly as the counter would price it. The old card marked the
 * materials up by the deprecated material markup and showed skill-level variants; the engine does
 * neither.
 */
export default function SampleProjectExamples({ preview }) {
    const sample = preview?.sample;
    return (
        <Card>
            <CardHeader
                title="Sample Job (2 hours, $25 materials)"
                avatar={<CheckCircleIcon color="info" />}
            />
            <CardContent>
                {preview?.error ? (
                    <Alert severity="warning">{preview.error}</Alert>
                ) : sample ? (
                    <Grid container spacing={1}>
                        <Grid item xs={8}><Typography variant="body2">Labor (2 hours at the shop rate):</Typography></Grid>
                        <Grid item xs={4}><Typography variant="body2" align="right">{money(sample.laborCost)}</Typography></Grid>
                        <Grid item xs={8}><Typography variant="body2">Materials (at cost):</Typography></Grid>
                        <Grid item xs={4}><Typography variant="body2" align="right">{money(sample.materialsCost)}</Typography></Grid>
                        <Grid item xs={8}><Typography variant="body2">Base cost:</Typography></Grid>
                        <Grid item xs={4}><Typography variant="body2" align="right">{money(sample.baseCost)}</Typography></Grid>
                        <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                        <Grid item xs={8}><Typography variant="h6" color="info.main">Retail price:</Typography></Grid>
                        <Grid item xs={4}><Typography variant="h6" color="info.main" align="right">{money(sample.retail)}</Typography></Grid>
                        <Grid item xs={8}><Typography variant="body2">Wholesale price:</Typography></Grid>
                        <Grid item xs={4}><Typography variant="body2" align="right">{money(sample.wholesale)}</Typography></Grid>
                    </Grid>
                ) : null}
            </CardContent>
        </Card>
    );
}
