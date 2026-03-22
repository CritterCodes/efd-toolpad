import {
    Card,
    CardContent,
    CardHeader,
    Typography,
    TextField,
    Grid,
    Paper,
    InputAdornment
} from '@mui/material';
import { Schedule as ClockIcon } from '@mui/icons-material';

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
                            Skill-Based Hourly Wages
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Set the base wage for standard skill level. Other levels are calculated automatically:
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Base Hourly Wage (Standard Skill)"
                            type="number"
                            value={localSettings.wage}
                            onChange={(e) => handleSettingChange('wage', e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                inputProps: { min: 0, step: 0.01 }
                            }}
                            helperText="Base hourly wage before fees (used for Standard skill level)"
                        />
                    </Grid>
                    
                    {/* Skill Level Preview */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Skill Level Wages (Before Fees):
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        Basic (75%):
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        ${(localSettings.wage * 0.75).toFixed(2)}/hr
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        Standard (100%):
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        ${localSettings.wage.toFixed(2)}/hr
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        Advanced (125%):
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        ${(localSettings.wage * 1.25).toFixed(2)}/hr
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        Expert (150%):
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        ${(localSettings.wage * 1.5).toFixed(2)}/hr
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                    
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Administrative Fee"
                            type="number"
                            value={(localSettings.administrativeFee * 100).toFixed(1)}
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
                            value={(localSettings.businessFee * 100).toFixed(1)}
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
                            value={(localSettings.consumablesFee * 100).toFixed(1)}
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
