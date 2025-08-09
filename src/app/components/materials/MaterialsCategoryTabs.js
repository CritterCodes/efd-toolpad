/**
 * Materials Category Tabs Component
 * Tab-based navigation for material categories with counts
 */

import * as React from 'react';
import {
  Paper,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Category as CategoryIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material';

export default function MaterialsCategoryTabs({
  materialTabs,
  selectedTab,
  onTabChange
}) {
  return (
    <Paper elevation={0} sx={{ mb: 3 }}>
      <Tabs 
        value={selectedTab} 
        onChange={(e, newValue) => onTabChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {materialTabs.map((tab) => (
          <Tab 
            key={tab.value}
            value={tab.value}
            icon={
              <Badge badgeContent={tab.count} color="primary" showZero>
                {tab.value === 'all' ? <ViewModuleIcon /> : <CategoryIcon />}
              </Badge>
            }
            label={tab.label}
            iconPosition="start"
          />
        ))}
      </Tabs>
    </Paper>
  );
}
