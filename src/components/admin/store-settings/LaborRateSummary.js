import {
    Alert,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    Divider
} from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';

const money = (n) => `$${Number(n).toFixed(2)}`;
const pct = (n) => `${(Number(n) * 100).toFixed(1)}%`;

/**
 * What one labor hour is charged at, for the settings being edited — THE engine's numbers
 * (useStoreSettings → pricingPreview). Labor is always the shop wage: there are no skill levels in
 * pricing (owner, 2026-09-30). What a person is PAID is their pay rate on the labor log, set on the
 * pay ladder — not here.
 */
export default function LaborRateSummary({ localSettings, preview }) {
    return (
        <Card>
            <CardHeader
                title="What a Labor Hour Is Charged"
                avatar={<CalculateIcon color="success" />}
            />
            <CardContent>
                {preview?.error ? (
                    <Alert severity="warning">{preview.error}</Alert>
                ) : preview ? (
                    <Grid container spacing={1}>
                        <Grid item xs={8}><Typography variant="body2">Shop rate (wage):</Typography></Grid>
                        <Grid item xs={4}><Typography variant="body2" align="right">{money(preview.wage)}/hr</Typography></Grid>
                        <Grid item xs={8}>
                            <Typography variant="body2">
                                Fees: administrative {pct(localSettings.administrativeFee)}, business {pct(localSettings.businessFee)}, consumables {pct(localSettings.consumablesFee)}
                            </Typography>
                        </Grid>
                        <Grid item xs={4}><Typography variant="body2" align="right">×{preview.retailMultiplier.toFixed(2)}</Typography></Grid>
                        <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                        <Grid item xs={8}><Typography variant="h6" color="success.main">Retail labor hour:</Typography></Grid>
                        <Grid item xs={4}><Typography variant="h6" color="success.main" align="right">{money(preview.retailHour)}</Typography></Grid>
                        <Grid item xs={8}><Typography variant="body2">Wholesale labor hour (×{preview.wholesaleMarkup.toFixed(2)}):</Typography></Grid>
                        <Grid item xs={4}><Typography variant="body2" align="right">{money(preview.wholesaleHour)}</Typography></Grid>
                    </Grid>
                ) : null}
            </CardContent>
        </Card>
    );
}
