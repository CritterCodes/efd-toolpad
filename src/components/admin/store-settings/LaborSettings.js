import {
    Card,
    CardContent,
    CardHeader,
    Typography,
    TextField,
    Grid,
    InputAdornment
} from '@mui/material';
import { Schedule as ClockIcon } from '@mui/icons-material';

// A fraction shown as a percent input — blank when the setting is missing, never a made-up 0.
const pctValue = (v, digits) => (v === '' || v == null || Number.isNaN(Number(v)) ? '' : (Number(v) * 100).toFixed(digits));

export default function LaborSettings({ localSettings, handleSettingChange }) {
    return (
        <Card>
            <CardHeader 
                title="Labor Settings"
                avatar={<ClockIcon color="primary" />}
            />
            <CardContent>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            Shop Rate
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Every labor hour on every job is priced at this rate. There are no skill levels in pricing;
                            what a person is paid is their pay rate on the pay ladder.
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Shop Rate (per labor hour)"
                            type="number"
                            value={localSettings.wage}
                            onChange={(e) => handleSettingChange('wage', e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                inputProps: { min: 0, step: 0.01 }
                            }}
                            helperText="What a labor hour costs before fees — the pricing input for every task"
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Administrative Fee"
                            type="number"
                            value={pctValue(localSettings.administrativeFee, 1)}
                            onChange={(e) => handleSettingChange('administrativeFee', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                inputProps: { min: 0, max: 100, step: 0.1 }
                            }}
                            helperText="Percentage of wage for administrative overhead"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Business Fee"
                            type="number"
                            value={pctValue(localSettings.businessFee, 1)}
                            onChange={(e) => handleSettingChange('businessFee', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                inputProps: { min: 0, max: 100, step: 0.1 }
                            }}
                            helperText="Percentage of wage for business operations"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Consumables Fee"
                            type="number"
                            value={pctValue(localSettings.consumablesFee, 1)}
                            onChange={(e) => handleSettingChange('consumablesFee', e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                inputProps: { min: 0, max: 100, step: 0.1 }
                            }}
                            helperText="Percentage of wage for consumables and supplies"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
