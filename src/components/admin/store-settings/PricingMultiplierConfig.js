import {
    Card,
    CardContent,
    CardHeader,
    Typography,
    TextField,
    Grid,
    InputAdornment
} from '@mui/material';
import { 
    AttachMoney as DollarSignIcon, 
    Calculate as CalculateIcon 
} from '@mui/icons-material';

export default function PricingMultiplierConfig({ localSettings, handleSettingChange }) {
    return (
        <Grid container spacing={3}>
            {/* Material Settings */}
            <Grid item xs={12}>
                <Card>
                    <CardHeader 
                        title="Material Settings"
                        avatar={<DollarSignIcon color="primary" />}
                    />
                    <CardContent>
                        <TextField
                            fullWidth
                            label="Material Markup Multiplier"
                            type="number"
                            value={localSettings.materialMarkup}
                            onChange={(e) => handleSettingChange('materialMarkup', e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">×</InputAdornment>,
                                inputProps: { min: 1, step: 0.1 }
                            }}
                            helperText="Multiply material costs by this amount"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Current markup: {((localSettings.materialMarkup - 1) * 100).toFixed(1)}% above cost
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            {/* Additional Pricing Settings */}
            <Grid item xs={12}>
                <Card>
                    <CardHeader 
                        title="Additional Pricing"
                        avatar={<CalculateIcon color="primary" />}
                    />
                    <CardContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Rush Job Multiplier"
                                    type="number"
                                    value={localSettings.rushMultiplier}
                                    onChange={(e) => handleSettingChange('rushMultiplier', e.target.value)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">×</InputAdornment>,
                                        inputProps: { min: 1, step: 0.1 }
                                    }}
                                    helperText="Multiplier for rush jobs (e.g., 1.5 = 50% markup)"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Delivery Fee"
                                    type="number"
                                    value={localSettings.deliveryFee}
                                    onChange={(e) => handleSettingChange('deliveryFee', e.target.value)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                        inputProps: { min: 0, step: 0.01 }
                                    }}
                                    helperText="Fixed fee for delivery services"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Tax Rate"
                                    type="number"
                                    value={(localSettings.taxRate * 100).toFixed(3)}
                                    onChange={(e) => handleSettingChange('taxRate', e.target.value)}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                        inputProps: { min: 0, max: 100, step: 0.001 }
                                    }}
                                    helperText="Tax rate applied to taxable items"
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}
