/**
 * Analytics Carousel Component
 * Shopify-style analytics with multiple chart views and adjustable timelines
 * Connects to real Shopify data via vendor analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    IconButton,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { TIMELINE_OPTIONS } from '@/lib/shopifyAnalyticsService';

const CHART_CONFIGS = [
    {
        key: 'productsSold',
        title: 'Products Sold',
        color: '#2563eb',
        dataKey: 'value',
        formatValue: (value) => value?.toString() || '0',
        formatTooltip: (value) => [`${value} products`, 'Products Sold']
    },
    {
        key: 'revenue',
        title: 'Revenue',
        color: '#16a34a',
        dataKey: 'value',
        formatValue: (value) => `$${(value || 0).toLocaleString()}`,
        formatTooltip: (value) => [`$${value?.toLocaleString()}`, 'Revenue']
    },
    {
        key: 'profileViews',
        title: 'Profile Views',
        color: '#dc2626',
        dataKey: 'value',
        formatValue: (value) => value?.toString() || '0',
        formatTooltip: (value) => [`${value} views`, 'Profile Views']
    }
];

export default function AnalyticsCarousel() {
    const [currentChart, setCurrentChart] = useState(0);
    const [timeline, setTimeline] = useState('last_30_days');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const currentConfig = CHART_CONFIGS[currentChart];

    // Fetch analytics data
    const fetchAnalytics = async (selectedTimeline) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`/api/artisan/stats?timeline=${selectedTimeline}`);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch analytics');
            }
            
            console.log('📊 [ANALYTICS CAROUSEL] Received data:', result);
            setAnalyticsData(result); // Use result directly, not result.data
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial load and timeline changes
    useEffect(() => {
        fetchAnalytics(timeline);
    }, [timeline]);

    // Navigate between charts
    const nextChart = () => {
        setCurrentChart((prev) => (prev + 1) % CHART_CONFIGS.length);
    };

    const prevChart = () => {
        setCurrentChart((prev) => (prev - 1 + CHART_CONFIGS.length) % CHART_CONFIGS.length);
    };

    // Calculate percentage change
    const calculateChange = (data) => {
        if (!data || data.length < 2) return 0;
        
        const latest = data[data.length - 1]?.[currentConfig.dataKey] || 0;
        const previous = data[data.length - 2]?.[currentConfig.dataKey] || 0;
        
        if (previous === 0) return latest > 0 ? 100 : 0;
        return ((latest - previous) / previous * 100).toFixed(1);
    };

    // Get current metric value
    const getCurrentValue = () => {
        if (!analyticsData?.timeSeries?.[currentConfig.key]) return 0;
        
        const data = analyticsData.timeSeries[currentConfig.key];
        const total = data.reduce((sum, item) => sum + (item[currentConfig.dataKey] || 0), 0);
        return total;
    };

    // Format chart data for Recharts
    const getChartData = () => {
        if (!analyticsData?.timeSeries?.[currentConfig.key]) return [];
        
        return analyticsData.timeSeries[currentConfig.key].map(item => ({
            ...item,
            dateDisplay: new Date(item.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            })
        }));
    };

    const chartData = getChartData();
    const change = calculateChange(chartData);
    const currentValue = getCurrentValue();

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                        <CircularProgress />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Alert severity="error">
                        {error}
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ minHeight: 480 }}>
            <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={prevChart} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                        
                        <Box>
                            <Typography variant="h6" component="h3">
                                {currentConfig.title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Typography variant="h4" color="primary" fontWeight="bold">
                                    {currentConfig.formatValue(currentValue)}
                                </Typography>
                                {change !== 0 && (
                                    <Chip
                                        icon={change > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                        label={`${change > 0 ? '+' : ''}${change}%`}
                                        size="small"
                                        color={change > 0 ? 'success' : 'error'}
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Box>
                        </Box>
                        
                        <IconButton onClick={nextChart} size="small">
                            <ArrowForwardIcon />
                        </IconButton>
                    </Box>

                    {/* Timeline Selector */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={timeline}
                            onChange={(e) => setTimeline(e.target.value)}
                            displayEmpty
                        >
                            {TIMELINE_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Chart Indicators */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                    {CHART_CONFIGS.map((_, index) => (
                        <Box
                            key={index}
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: index === currentChart ? 'primary.main' : 'grey.300',
                                cursor: 'pointer'
                            }}
                            onClick={() => setCurrentChart(index)}
                        />
                    ))}
                </Box>

                {/* Chart */}
                <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="dateDisplay" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#666' }}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#666' }}
                                tickFormatter={currentConfig.formatValue}
                            />
                            <Tooltip 
                                formatter={currentConfig.formatTooltip}
                                labelStyle={{ color: '#333' }}
                                contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    border: '1px solid #ccc',
                                    borderRadius: 8
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey={currentConfig.dataKey}
                                stroke={currentConfig.color}
                                strokeWidth={3}
                                dot={{ fill: currentConfig.color, strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: currentConfig.color, strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>

                {/* Metadata */}
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        {analyticsData?.vendor && `Vendor: ${analyticsData.vendor} • `}
                        Timeline: {TIMELINE_OPTIONS.find(opt => opt.value === timeline)?.label}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}