import {
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    Paper,
    Divider
} from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';

export default function LaborRateSummary({ localSettings, calculateLaborRate }) {
    return (
        <Card>
            <CardHeader 
                title="Final Labor Rates (After Fees)"
                avatar={<CalculateIcon color="success" />}
            />
            <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                    Standard Skill Level Breakdown:
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={8}>
                        <Typography variant="body2">Base Wage:</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="body2" align="right">${localSettings.wage.toFixed(2)}/hr</Typography>
                    </Grid>
                    <Grid item xs={8}>
                        <Typography variant="body2">Administrative Fee ({(localSettings.administrativeFee * 100).toFixed(1)}%):</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="body2" align="right">${(localSettings.wage * localSettings.administrativeFee).toFixed(2)}/hr</Typography>
                    </Grid>
                    <Grid item xs={8}>
                        <Typography variant="body2">Business Fee ({(localSettings.businessFee * 100).toFixed(1)}%):</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="body2" align="right">${(localSettings.wage * localSettings.businessFee).toFixed(2)}/hr</Typography>
                    </Grid>
                    <Grid item xs={8}>
                        <Typography variant="body2">Consumables Fee ({(localSettings.consumablesFee * 100).toFixed(1)}%):</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="body2" align="right">${(localSettings.wage * localSettings.consumablesFee).toFixed(2)}/hr</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={8}>
                        <Typography variant="h6" color="success.main">Standard Total:</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="h6" color="success.main" align="right">
                            ${calculateLaborRate().toFixed(2)}/hr
                        </Typography>
                    </Grid>
                </Grid>
                
                <Typography variant="subtitle2" gutterBottom>
                    All Skill Level Final Rates:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Grid container spacing={1}>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                                Basic:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                ${(calculateLaborRate() * 0.75).toFixed(2)}/hr
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                                Standard:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                ${calculateLaborRate().toFixed(2)}/hr
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                                Advanced:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                ${(calculateLaborRate() * 1.25).toFixed(2)}/hr
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                                Expert:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                ${(calculateLaborRate() * 1.5).toFixed(2)}/hr
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            </CardContent>
        </Card>
    );
}
