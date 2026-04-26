"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

function buildMonthlyData(repairs) {
  const months = {};
  repairs.forEach(r => {
    if (!r.createdAt) return;
    const key = format(new Date(r.createdAt), 'MMM yy');
    if (!months[key]) months[key] = { month: key, retail: 0, wholesale: 0, _ts: new Date(r.createdAt).getTime() };
    const cost = parseFloat(r.totalCost) || 0;
    if (r.isWholesale) months[key].wholesale += cost;
    else months[key].retail += cost;
  });
  return Object.values(months)
    .sort((a, b) => a._ts - b._ts)
    .map(({ _ts, ...rest }) => ({
      ...rest,
      retail: Math.round(rest.retail * 100) / 100,
      wholesale: Math.round(rest.wholesale * 100) / 100,
    }));
}

const dollarFormatter = v => `$${v.toFixed(2)}`;

export default function RevenueTrendAnalytics({ repairs = [] }) {
  const validRepairs = Array.isArray(repairs) ? repairs : [];
  const data = buildMonthlyData(validRepairs);

  return (
    <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 3 }}>
      <Typography variant="h6" fontWeight="bold">Revenue Trend</Typography>
      <Divider sx={{ my: 1.5 }} />
      {data.length < 1 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No data for selected range</Typography>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 12 }} width={64} />
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
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
  repairs: PropTypes.array,
};
