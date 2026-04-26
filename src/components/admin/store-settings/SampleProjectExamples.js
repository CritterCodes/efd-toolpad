import {
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    Paper,
    Divider
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

export default function SampleProjectExamples({ sampleProject, calculateLaborRate }) {
    return (
        <Card>
            <CardHeader 
                title="Sample Project Examples (2hr, $25 materials)"
                avatar={<CheckCircleIcon color="info" />}
            />
            <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                    Standard Skill Level (2 hours):
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={8}>
                        <Typography variant="body2">Labor (2 hours):</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="body2" align="right">${sampleProject.laborCost.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={8}>
                        <Typography variant="body2">Materials (marked up):</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="body2" align="right">${sampleProject.materialTotal.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={8}>
                        <Typography variant="h6" color="info.main">Standard Total:</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="h6" color="info.main" align="right">
                            ${sampleProject.total.toFixed(2)}
                        </Typography>
                    </Grid>
                </Grid>
                
                <Typography variant="subtitle2" gutterBottom>
                    All Skill Levels (2 hours + materials):
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Grid container spacing={1}>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                                Basic:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="info.main">
                                ${((calculateLaborRate() * 0.75) * 2 + sampleProject.materialTotal).toFixed(2)}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                                Standard:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="info.main">
                                ${sampleProject.total.toFixed(2)}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                                Advanced:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="info.main">
                                ${((calculateLaborRate() * 1.25) * 2 + sampleProject.materialTotal).toFixed(2)}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Typography variant="body2" color="text.secondary">
                                Expert:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="info.main">
                                ${((calculateLaborRate() * 1.5) * 2 + sampleProject.materialTotal).toFixed(2)}
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            </CardContent>
        </Card>
    );
}
