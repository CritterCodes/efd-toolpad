"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function RepairStatusAnalytics({ data = [] }) {
  const statusCounts = Array.isArray(data) ? data.filter((entry) => entry.count > 0) : [];
  const COLORS = [
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28AFF", "#FF6680", "#82CA9D",
  ];

  return (
    <Card
      sx={{
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: 3,
        textAlign: 'center',
        maxWidth: 400,
        height: 300,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="h6" fontWeight="bold">
        Repair Status Breakdown
      </Typography>
      <Divider />
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {statusCounts.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusCounts}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={90}
                dataKey="count"
                nameKey="label"
              >
                {statusCounts.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Typography>No data available</Typography>
        )}
      </Box>
    </Card>
  );
}

RepairStatusAnalytics.propTypes = {
  data: PropTypes.array,
};
