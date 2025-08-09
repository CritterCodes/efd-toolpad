/**
 * Category tabs component for processes
 * Provides tab-based navigation with count badges
 */

import * as React from 'react';
import {
  Paper,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  ViewModule as ViewModuleIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

export function ProcessesCategoryTabs({
  processTabs,
  selectedTab,
  onTabChange
}) {
  const getIcon = (iconType) => {
    switch (iconType) {
      case 'ViewModule':
        return <ViewModuleIcon />;
      case 'Category':
      default:
        return <CategoryIcon />;
    }
  };

  return (
    <Paper elevation={0} sx={{ mb: 3 }}>
      <Tabs 
        value={selectedTab} 
        onChange={(e, newValue) => onTabChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {processTabs.map((tab) => (
          <Tab 
            key={tab.value}
            value={tab.value}
            icon={
              <Badge badgeContent={tab.count} color="primary" showZero>
                {getIcon(tab.icon)}
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
