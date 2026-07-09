import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import FilterListIcon from '@mui/icons-material/FilterList';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import BarChartIcon from '@mui/icons-material/BarChart';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

function MetricCard({ icon: Icon, label, value, accent }) {
    return (
        <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 2, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}` }}>
                    <Icon sx={{ color: accent || REPAIRS_UI.accent, fontSize: 22 }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>{value}</Typography>
                    <Typography sx={{ fontSize: '0.74rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function StatsCards({ products, filteredProducts, uniqueArtisansCount, cogDataCount }) {
    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
                <MetricCard icon={PendingActionsIcon} label="Pending Review" value={products.length} />
            </Grid>
            <Grid item xs={6} md={3}>
                <MetricCard icon={FilterListIcon} label="Filtered" value={filteredProducts.length} accent="#64B5F6" />
            </Grid>
            <Grid item xs={6} md={3}>
                <MetricCard icon={PeopleAltIcon} label="Artisans" value={uniqueArtisansCount} accent="#FFB74D" />
            </Grid>
            <Grid item xs={6} md={3}>
                <MetricCard icon={BarChartIcon} label="With COG Data" value={cogDataCount} accent="#66BB6A" />
            </Grid>
        </Grid>
    );
}
