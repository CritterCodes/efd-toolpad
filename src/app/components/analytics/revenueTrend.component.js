"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RevenueTrendAnalytics({ data = [] }) {
  const chartData = Array.isArray(data) ? data : [];

  return (
    <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 3 }}>
      <Typography variant="h6" fontWeight="bold">Revenue Trend</Typography>
      <Divider sx={{ my: 1.5 }} />
      {chartData.length < 1 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No data for selected range</Typography>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }} width={64} />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Legend />
            <Bar dataKey="retail" name="Retail" fill="#0088FE" radius={[3, 3, 0, 0]} />
            <Bar dataKey="wholesale" name="Wholesale" fill="#00C49F" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

RevenueTrendAnalytics.propTypes = {
  data: PropTypes.array,
};
